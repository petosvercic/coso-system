"use client";
import { useMemo, useState } from "react";
import { normalizeEditionJsonForBuilder, normalizeEditionJsonRaw, validateEditionJson } from "../../lib/edition-json";
        
type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function buildPrompt(editions: EditionIndexEntry[]) {
  const deployed = editions
    .map((e) => `- ${e.slug}: ${e.title}${e.createdAt ? ` (${e.createdAt})` : ""}`)
    .join("\n");

  return [
    "ROLE: Si content generator pre COSO edĂ­cie (task-based, paywall).",
    "",
    "CIEÄ˝:",
    "- Vygeneruj NOVĂš edĂ­ciu pre rovnakĂş web-app ĹˇablĂłnu.",
    "- MusĂ­ to byĹĄ unikĂˇtna edĂ­cia (Ĺľiadne kĂłpie).",
    "",
    "DOMĂ‰NA (doplnenie):",
    "- Pri taskoch konzistentne pokry aj spĂˇnok/regenerĂˇciu: ĹˇlofĂ­k, power nap, NSDR, meditĂˇcia, ticho, oÄŤi zatvorenĂ©, mikropauzy.",
    "",
    "VĂťSTUP:",
    "VrĂˇĹĄ presne 1 JSON objekt (bez markdown).",
    "SchĂ©ma (MUSĂŤĹ  dodrĹľaĹĄ):",
    "{",
    '  \"slug\": \"lowercase-hyphen-slug (3-64 chars, unique)\",',
    '  \"title\": \"Ä˝udskĂ˝ nĂˇzov edĂ­cie\",',
    '  \"engine\": { \"subject\": \"snake_case_subject\", \"locale\": \"sk\" },',
    '  \"content\": {',
    '    \"heroTitle\": \"â€¦\",',
    '    \"heroSubtitle\": \"â€¦\",',
    '    \"intro\": { \"title\": \"â€¦\", \"text\": \"â€¦\" },',
    '    \"form\": { \"title\": \"â€¦\", \"nameLabel\": \"â€¦\", \"birthDateLabel\": \"â€¦\", \"submitLabel\": \"â€¦\" },',
    '    \"result\": { \"teaserTitle\": \"â€¦\", \"teaserNote\": \"â€¦\", \"unlockHint\": \"â€¦\" },',
    '    \"paywall\": { \"headline\": \"â€¦\", \"bullets\": [\"â€¦\"], \"cta\": \"â€¦\" }',
    "  },",
    '  \"tasks\": {',
    '    \"pickPerCategory\": 25,',
    '    \"categories\": [ ... 5 kategĂłriĂ­, kaĹľdĂˇ presne 50 taskov ... ]',
    "  }",
    "}",
    "",
    "PRAVIDLĂ:",
    "- slug musĂ­ byĹĄ unikĂˇtny (pozri zoznam nasadenĂ˝ch edĂ­ciĂ­ niĹľĹˇie).",
    "- content pĂ­Ĺˇ po slovensky.",
    "- MUSĂŤĹ  vytvoriĹĄ presne 5 kategĂłriĂ­.",
    "- KaĹľdĂˇ kategĂłria MUSĂŤ maĹĄ pool presne 50 taskov.",
    "- KaĹľdĂ˝ task MUSĂŤ maĹĄ 3 varianty (lte/between/gte).",
    "",
    "NASADENĂ‰ EDĂŤCIE (nesmieĹˇ zopakovaĹĄ slug ani tĂ©mu 1:1):",
    deployed || "- (zatiaÄľ niÄŤ)",
    "",
    "ZADAJ NOVĂš EDĂŤCIU:",
  ].join("\n");
}

export default function BuilderClient({ editions }: { editions: EditionIndexEntry[] }) {
  const [existingSlugs, setExistingSlugs] = useState<string[]>(editions.map((e) => e.slug));
  const basePrompt = useMemo(() => buildPrompt(existingSlugs), [existingSlugs]);
  const [prompt, setPrompt] = useState(basePrompt);
  const [editionJson, setEditionJson] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; msg: string }>({ kind: "idle", msg: "" });

  async function onCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus({ kind: "ok", msg: "Prompt skopĂ­rovanĂ˝." }
  async function onRefreshSlugs() {
    setStatus({ kind: "idle", msg: "Refreshujem existujúce slugs z GitHubu…" });
    try {
      const res = await fetch("/api/editions/slugs", { cache: "no-store" as any });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !Array.isArray(data?.slugs)) {
        setStatus({ kind: "err", msg: `Refresh zlyhal: ${data?.error ?? res.status}`.trim() });
        return;
      }
      const slugs = data.slugs.map((x: any) => String(x)).filter(Boolean);
      setExistingSlugs(slugs);
      const p = buildPrompt(slugs);
      setPrompt(p);
      setStatus({ kind: "ok", msg: `Refresh OK. Načítané slugs: ${slugs.length}` });
    } catch (e: any) {
      setStatus({ kind: "err", msg: `Refresh zlyhal: ${String(e?.message ?? e)}` });
    }
  }
);
    } catch {
      setStatus({ kind: "err", msg: "KopĂ­rovanie zlyhalo." });
    }
  }

  async function onDispatch() {
    const v = validateEditionJson(editionJson, existingSlugs);
    if (!v.ok) {
      setStatus({ kind: "err", msg: `NeplatnĂ˝ JSON: ${v.error}${v.details ? ` (${v.details})` : ""}; found root keys: ${((v as any)?.debug?.foundRootKeys ?? []).join(", ") || "(none)"}; first 120 chars of normalized input: ${((v as any)?.debug?.normalizedStart ?? "").replace(/\s+/g, " ")}` });
      return;
    }

    setStatus({ kind: "idle", msg: "SpĂşĹˇĹĄam factory workflowâ€¦" });

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

    setStatus({ kind: "ok", msg: `Workflow spustenĂ˝. ${data?.runUrl ? "Run: " + data.runUrl : ""}`.trim() });
    setEditionJson("");
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Factory Builder</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">Prompt a zoznam edĂ­ciĂ­ pouĹľĂ­vajĂş rovnakĂ˝ zdroj dĂˇt.</p>

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
            <button className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950" onClick={onRefreshSlugs}>Refresh</button>
            <button className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950" onClick={() => setPrompt(basePrompt)}>Reset prompt</button>
            <a href="/list" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200">PozrieĹĄ edĂ­cie</a>
          </div>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold">2) VloĹľ LLM JSON a postav edĂ­ciu</h2>
          <textarea
            value={editionJson}
            onChange={(e) => setEditionJson(e.target.value)}
            rows={12}
            placeholder='PovolenĂ© sĂş aj ```json ... ``` bloky alebo text okolo JSON.'
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 font-mono text-sm leading-6 outline-none focus:border-neutral-500"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950"
              onClick={() => {
                const v = validateEditionJson(editionJson, existingSlugs);

                setStatus(v.ok ? { kind: "ok", msg: "JSON vyzerĂˇ validne." } : { kind: "err", msg: `NeplatnĂ˝ JSON: ${v.error}; found root keys: ${((v as any)?.debug?.foundRootKeys ?? []).join(", ") || "(none)"}; first 120 chars of normalized input: ${((v as any)?.debug?.normalizedStart ?? "").replace(/\s+/g, " ")}` });

              }}
            >
              Validate
            </button>
            <button className="rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-950" onClick={onDispatch}>Dispatch build</button>
            <button
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"

              onClick={() => { const n = normalizeEditionJsonForBuilder(editionJson); setEditionJson(n); setStatus({ kind: "ok", msg: `JSON normalizovanĂ˝ (${n.length} chars). DoplnenĂ© chĂ˝bajĂşce title/slug/content podÄľa ĹˇablĂłny.` }); }}

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


