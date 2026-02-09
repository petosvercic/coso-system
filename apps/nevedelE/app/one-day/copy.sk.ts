import packAJson from "./content/packs/pack-a.json";
import packBJson from "./content/packs/pack-b.json";
import { validateCopy } from "./constraints";
import { validateMeaningPool, type MeaningState } from "./meaning-states";
import { SPACE_BUDGET, warnImpulseSpaceBudget } from "./space-budget";
import type { JsonContentPack, JsonMeaningState, OneDayContentPack } from "./content-pack.types";
import type { DayType } from "./session";

const SPECTRUM_LABELS: OneDayContentPack["spectrum"] = {
  A: { leftLabel: "Ľahké", rightLabel: "Ťažké", ariaLabel: "Spektrum Ľahké až Ťažké" },
  B: { leftLabel: "Stojaté", rightLabel: "Pohyblivé", ariaLabel: "Spektrum Stojaté až Pohyblivé" },
};

const DEFAULT_FALLBACK_PACK: OneDayContentPack = {
  impulses: { LIGHT: ["Dnes."], NEUTRAL: ["Dnes."], HEAVY: ["Dnes."] },
  spectrum: SPECTRUM_LABELS,
  meaningStates: [
    {
      id: "S3",
      title: "vyvážené",
      body: "Nič nevyčnieva.\nVeci držia pokope.\nDeň stojí sám.",
      applicableSpectra: ["A", "B"],
      preferredZones: ["MID"],
    },
  ],
};

let hasLoggedProdValidationFailure = false;

function parseMeaningState(entry: JsonMeaningState): MeaningState {
  return {
    id: entry.id,
    title: entry.title,
    body: entry.body.join("\n"),
    applicableSpectra: entry.spectra,
    preferredZones: entry.zones,
  };
}

function toRuntimePack(raw: JsonContentPack): OneDayContentPack {
  return {
    impulses: raw.impulses,
    spectrum: SPECTRUM_LABELS,
    meaningStates: raw.meaningStates.map(parseMeaningState),
  };
}

function getSelectedRawPack(): JsonContentPack {
  const selected = (process.env.NEXT_PUBLIC_CONTENT_PACK ?? process.env.CONTENT_PACK ?? "pack-a").toLowerCase();
  return selected === "pack-b" ? (packBJson as JsonContentPack) : (packAJson as JsonContentPack);
}

function validatePack(pack: OneDayContentPack): string[] {
  const errors: string[] = [];

  (Object.keys(pack.impulses) as DayType[]).forEach((dayType) => {
    pack.impulses[dayType].forEach((impulse, index) => {
      warnImpulseSpaceBudget(impulse, `impulse.${dayType}.${index}`);
      const result = validateCopy(impulse);
      if (!result.ok) {
        errors.push(...result.errors.map((error) => `impulse.${dayType}.${index}: ${error}`));
      }
    });
  });

  pack.meaningStates.forEach((state) => {
    const titleWords = state.title.trim().split(/\s+/).filter(Boolean).length;
    if (titleWords > SPACE_BUDGET.RESULT_TITLE_MAX_WORDS) {
      errors.push(`${state.id}.title exceeds title budget`);
    }

    if (state.body.length > SPACE_BUDGET.RESULT_TEXT_MAX_CHARS) {
      errors.push(`${state.id}.body exceeds text budget`);
    }
  });

  const meaningValidation = validateMeaningPool(pack.meaningStates);
  if (!meaningValidation.ok) errors.push(...meaningValidation.errors);

  return errors;
}

export function getValidatedContentPack(): OneDayContentPack {
  const runtimePack = toRuntimePack(getSelectedRawPack());
  const errors = validatePack(runtimePack);

  if (errors.length === 0) return runtimePack;

  if (process.env.NODE_ENV !== "production") {
    throw new Error(`[one-day] Invalid content pack detected:\n${errors.join("\n")}`);
  }

  if (!hasLoggedProdValidationFailure) {
    hasLoggedProdValidationFailure = true;
    console.error("[one-day] Invalid content pack in production. Using safe fallback copy.", errors);
  }

  return DEFAULT_FALLBACK_PACK;
}

export function getImpulseCopy(pack: OneDayContentPack, dayType: DayType, index: number): string {
  const pool = pack.impulses[dayType];
  return pool[index] ?? pool[0];
}
