export type EditionPayload = {
  slug: string;
  title: string;
  content: Record<string, any>;
  [k: string]: any;
};

function sanitizeRaw(raw: string) {
  return String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B\u200C\u200D\u2060]/g, "")
    .trim();
}

function unwrapCodeFence(input: string) {
  const fence = input.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  return fence ? fence[1].trim() : input;
}

function extractJSONObject(input: string) {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return input;
  return input.slice(start, end + 1);
}


function slugify(input: string) {
  const base = String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const clipped = base.slice(0, 64);
  if (/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(clipped)) return clipped;
  return "generated-edition";
}

function normalizeGroupsFixture(out: any) {
  if (!Array.isArray(out?.groups) || out?.tasks) return out;

  const groups = out.groups.filter((g: any) => typeof g === "string" && g.trim());
  const baseTasks = Array.isArray(out?.tasks) ? out.tasks : [];

  out.categories = groups.map((g: string, idx: number) => ({
    id: `cat-${idx + 1}`,
    title: g,
    tasks: baseTasks,
  }));

  return out;
}

function fallbackContent(title: string) {
  return {
    heroTitle: title,
    heroSubtitle: "Personalizovaný prehľad",
    intro: { title: "Úvod", text: "Vyplň krátky formulár a získaj výsledok." },
    form: { title: "Vyhodnotenie", nameLabel: "Meno", birthDateLabel: "Dátum narodenia", submitLabel: "Vyhodnotiť" },
    result: { teaserTitle: "Náhľad", teaserNote: "Zobrazený je len teaser.", unlockHint: "Odomkni celý výsledok." },
    paywall: {
      headline: "Odomkni celý výsledok",
      bullets: ["Všetky kategórie", "Plný text", "Personalizované výstupy"],
      cta: "Pokračovať na platbu",
    },
  };
}

function normalizeFixture(obj: any) {
  const out = normalizeGroupsFixture({ ...obj });

  if (!out.tasks && Array.isArray(out.categories)) {
    out.tasks = {
      pickPerCategory: 25,
      categories: out.categories.map((cat: any, cidx: number) => {
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : [];
        return {
          key: String(cat?.id || cat?.key || `cat-${cidx + 1}`),
          title: String(cat?.title || `Kategória ${cidx + 1}`),
          pool: tasks.map((t: any, tidx: number) => {
            const v = t?.variants || {};
            return {
              id: String(t?.id || `t${cidx + 1}-${tidx + 1}`),
              title: String(t?.title || `Úloha ${tidx + 1}`),
              metricKey: String(t?.metricKey || t?.id || `m_${cidx + 1}_${tidx + 1}`),
              variants: [
                { when: { lte: 33 }, text: String(v?.lte || "") },
                { when: { between: [34, 66] }, text: String(v?.between || "") },
                { when: { gte: 67 }, text: String(v?.gte || "") },
              ],
            };
          }),
        };
      }),
    };
  }

  if (!out.title || typeof out.title !== "string" || !out.title.trim()) {
    if (Array.isArray(out.groups) && out.groups.length > 0) {
      out.title = String(out.groups[0] || "").trim() || "Generovaná edícia";
    } else if (Array.isArray(out.categories) && out.categories.length > 0) {
      out.title = String(out.categories[0]?.title || "").trim() || "Generovaná edícia";
    } else {
      out.title = "Generovaná edícia";
    }
  }

  if (!out.slug || typeof out.slug !== "string" || !out.slug.trim()) {
    out.slug = slugify(out.title || "generated-edition");
  }

  if (!out.content || typeof out.content !== "object" || Array.isArray(out.content)) {
    out.content = fallbackContent(String(out.title || out.slug || "Edícia"));
  }

  if (!out.engine || typeof out.engine !== "object") {
    out.engine = { subject: String(out.slug || "edition").replace(/-/g, "_"), locale: "sk" };
  }

  return out;
}

export function normalizeEditionJsonRaw(raw: string) {
  const base = sanitizeRaw(raw);
  const noFence = unwrapCodeFence(base);
  return extractJSONObject(noFence).trim();
}

export function normalizeEditionJsonForBuilder(raw: string) {
  const normalized = normalizeEditionJsonRaw(raw);
  try {
    const parsed = JSON.parse(normalized);
    const shaped = normalizeFixture(parsed);
    return JSON.stringify(shaped, null, 2);
  } catch {
    return normalized;
  }
}

export function validateEditionJson(raw: string, existingSlugs: string[] = []) {
  const normalized = normalizeEditionJsonRaw(raw);
  let obj: any;

  try {
    obj = JSON.parse(normalized);
  } catch (e: any) {
    return {
      ok: false as const,
      error: "INVALID_JSON",
      details: String(e?.message ?? e),
      debug: {
        rawStart: String(raw ?? "").slice(0, 120),
        normalizedStart: normalized.slice(0, 120),
        foundRootKeys: [],
      },
    };
  }

  obj = normalizeFixture(obj);
  const foundRootKeys = obj && typeof obj === "object" && !Array.isArray(obj) ? Object.keys(obj) : [];

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false as const, error: "NOT_OBJECT", debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  }
  if (typeof obj.slug !== "string" || !obj.slug.trim()) {
    return { ok: false as const, error: "MISSING_SLUG", debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  }
  if (typeof obj.title !== "string" || !obj.title.trim()) {
    return { ok: false as const, error: "MISSING_TITLE", debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  }
  if (!obj.content || typeof obj.content !== "object" || Array.isArray(obj.content)) {
    return { ok: false as const, error: "MISSING_CONTENT_OBJECT", debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  }

  const slug = obj.slug.trim();
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
    return { ok: false as const, error: "BAD_SLUG", details: slug, debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  }
  if (existingSlugs.includes(slug)) {
    return { ok: false as const, error: "DUPLICATE_SLUG", details: slug, debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  }

  return { ok: true as const, obj: { ...obj, slug, title: obj.title.trim() } as EditionPayload };
}
