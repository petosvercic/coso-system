"use client";
import { useMemo, useState } from "react";
import { normalizeEditionJsonRaw, validateEditionJson } from "../../lib/edition-json";

type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function buildPrompt(editions: EditionIndexEntry[]) {
  const deployed = editions
    .map((e) => `- ${e.slug}: ${e.title}${e.createdAt ? ` (${e.createdAt})` : ""}`)
    .join("\n");

  return [
    "ROLE: Si content generator pre COSO edície (task-based, paywall).",
    "",
    "CIEĽ:",
    "- Vygeneruj NOVÚ edíciu pre rovnakú web-app šablónu.",
    "- Musí to byť unikátna edícia (žiadne kópie).",
    "",
    "DOMÉNA (doplnenie):",
    "- Pri taskoch konzistentne pokry aj spánok/regeneráciu: šlofík, power nap, NSDR, meditácia, ticho, oči zatvorené, mikropauzy.",
    "",
    "VÝSTUP:",
    "Vráť presne 1 JSON objekt (bez markdown).",
    "Schéma (MUSÍŠ dodržať):",
    "{",
    '  \"slug\": \"lowercase-hyphen-slug (3-64 chars, unique)\",',
    '  \"title\": \"Ľudský názov edície\",',
    '  \"engine\": { \"subject\": \"snake_case_subject\", \"locale\": \"sk\" },',
    '  \"content\": {',
    '    \"heroTitle\": \"…\",',
    '    \"heroSubtitle\": \"…\",',
    '    \"intro\": { \"title\": \"…\", \"text\": \"…\" },',
    '    \"form\": { \"title\": \"…\", \"nameLabel\": \"…\", \"birthDateLabel\": \"…\", \"submitLabel\": \"…\" },',
    '    \"result\": { \"teaserTitle\": \"…\", \"teaserNote\": \"…\", \"unlockHint\": \"…\" },',
    '    \"paywall\": { \"headline\": \"…\", \"bullets\": [\"…\"], \"cta\": \"…\" }',
    "  },",
    '  \"tasks\": {',
    '    \"pickPerCategory\": 25,',
    '    \"categories\": [ ... 5 kategórií, každá presne 50 taskov ... ]',
    "  }",
    "}",
    "",
    "PRAVIDLÁ:",
    "- slug musí byť unikátny (pozri zoznam nasadených edícií nižšie).",
    "- content píš po slovensky.",
    "- MUSÍŠ vytvoriť presne 5 kategórií.",
    "- Každá kategória MUSÍ mať pool presne 50 taskov.",
    "- Každý task MUSÍ mať 3 varianty (lte/between/gte).",
    "",
    "NASADENÉ EDÍCIE (nesmieš zopakovať slug ani tému 1:1):",
    deployed || "- (zatiaľ nič)",
    "",
    "ZADAJ NOVÚ EDÍCIU:",
  ].join("\n");
}

export default function BuilderClient({ editions }: { editions: EditionIndexEntry[] }) {
  const basePrompt = useMemo(() => buildPrompt(editions), [editions]);
  const [prompt, setPrompt] = useState(basePrompt);
  const [editionJson, setEditionJson] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; msg: string }>({ kind: "idle", msg: "" });

  async function onCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus({ kind: "ok", msg: "Prompt skopírovaný." });
    } catch {
      setStatus({ kind: "err", msg: "Kopírovanie zlyhalo." });
    }
  }

  async function onDispatch() {
    const v = validateEditionJson(editionJson, editions.map((e) => e.slug));
    if (!v.ok) {
      setStatus({ kind: "err", msg: `Neplatný JSON: ${v.error}${v.details ? ` (${v.details})` : ""}` });
      return;
    }

    setStatus({ kind: "idle", msg: "Spúšťam factory workflow…" });

    const res = await fetch("/api/factory/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ edition: v.obj, rawEditionJson: editionJson }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setStatus({ kind: "err", msg: `Dispatch zlyhal: ${data?.error ?? res.status} ${data?.message ?? ""}`.trim() });
      return;
    }

    setStatus({ kind: "ok", msg: `Workflow spustený. ${data?.runUrl ? "Run: " + data.runUrl : ""}`.trim() });
    setEditionJson("");
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Factory Builder</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">Prompt a zoznam edícií používajú rovnaký zdroj dát.</p>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold">1) Prompt pre LLM</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={18}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 font-mono text-sm leading-6 outline-none focus:border-neutral-500"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            <button className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950" onClick={onCopyPrompt}>Copy prompt</button>
            <button className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950" onClick={() => setPrompt(basePrompt)}>Reset prompt</button>
            <a href="/list" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200">Pozrieť edície</a>
          </div>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold">2) Vlož LLM JSON a postav edíciu</h2>
          <textarea
            value={editionJson}
            onChange={(e) => setEditionJson(e.target.value)}
            rows={12}
            placeholder='Povolené sú aj ```json ... ``` bloky alebo text okolo JSON.'
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 font-mono text-sm leading-6 outline-none focus:border-neutral-500"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950"
              onClick={() => {
                const v = validateEditionJson(editionJson, editions.map((e) => e.slug));
                setStatus(v.ok ? { kind: "ok", msg: "JSON vyzerá validne." } : { kind: "err", msg: `Neplatný JSON: ${v.error}` });
              }}
            >
              Validate
            </button>
            <button className="rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-950" onClick={onDispatch}>Dispatch build</button>
            <button
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
              onClick={() => setEditionJson(normalizeEditionJsonRaw(editionJson))}
            >
              Normalize JSON
            </button>
          </div>

          {status.msg && (
            <p className={`mt-3 rounded-xl border p-3 text-sm ${status.kind === "err" ? "border-red-500 text-red-300" : status.kind === "ok" ? "border-green-500 text-green-300" : "border-neutral-700 text-neutral-300"}`}>
              <strong>{status.kind === "err" ? "Error" : status.kind === "ok" ? "OK" : "Info"}:</strong> {status.msg}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
