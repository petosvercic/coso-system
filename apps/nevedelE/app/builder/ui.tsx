"use client";
import { useMemo, useState } from "react";
import { normalizeEditionJsonForBuilder, normalizeEditionJsonRaw, validateEditionJson } from "../../lib/edition-json";
        
type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function buildPrompt(existingSlugs: string[]) {
  const deployed = existingSlugs.map((s) => `- ${s}`).join("\n");
  return [
    "ROLE: Si content generator pre COSO edÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­cie (task-based, paywall).",
    "",
    "CIEĂ„â€šĂ˘â‚¬ĹľÄ‚â€ąÄąÄ„:",
    "- Vygeneruj NOVÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă‹â€ˇ edÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­ciu pre rovnakÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…ÄąĹź web-app Ä‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡ablÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă˘â‚¬Ĺˇnu.",
    "- MusÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­ to byÄ‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľ unikÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡tna edÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­cia (Ä‚â€žĂ„â€¦Ä‚â€žĂ„Äľiadne kÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă˘â‚¬Ĺˇpie).",
    "",
    "DOMÄ‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬Ă‚Â°NA (doplnenie):",
    "- Pri taskoch konzistentne pokry aj spÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡nok/regenerÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡ciu: Ä‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡lofÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­k, power nap, NSDR, meditÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡cia, ticho, oĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤i zatvorenÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â©, mikropauzy.",
    "",
    "VÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă„â€žSTUP:",
    "VrÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡Ä‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľ presne 1 JSON objekt (bez markdown).",
    "SchÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â©ma (MUSÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă‚Â¤Ä‚â€žĂ„â€¦Ä‚â€šĂ‚Â  dodrÄ‚â€žĂ„â€¦Ä‚â€žĂ„ÄľaÄ‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľ):",
    "{",
    '  \"slug\": \"lowercase-hyphen-slug (3-64 chars, unique)\",',
    '  \"title\": \"Ă„â€šĂ˘â‚¬ĹľÄ‚â€ąÄąÄ„udskÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąÄąÄ„ nÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡zov edÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­cie\",',
    '  \"engine\": { \"subject\": \"snake_case_subject\", \"locale\": \"sk\" },',
    '  \"content\": {',
    '    \"heroTitle\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\",',
    '    \"heroSubtitle\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\",',
    '    \"intro\": { \"title\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\", \"text\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\" },',
    '    \"form\": { \"title\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\", \"nameLabel\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\", \"birthDateLabel\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\", \"submitLabel\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\" },',
    '    \"result\": { \"teaserTitle\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\", \"teaserNote\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\", \"unlockHint\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\" },',
    '    \"paywall\": { \"headline\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\", \"bullets\": [\"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\"], \"cta\": \"Ă„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦\" }',
    "  },",
    '  \"tasks\": {',
    '    \"pickPerCategory\": 25,',
    '    \"categories\": [ ... 5 kategÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă˘â‚¬ĹˇriÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­, kaÄ‚â€žĂ„â€¦Ä‚â€žĂ„ÄľdÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡ presne 50 taskov ... ]',
    "  }",
    "}",
    "",
    "PRAVIDLÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â:",
    "- slug musÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­ byÄ‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľ unikÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡tny (pozri zoznam nasadenÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąÄąÄ„ch edÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­ciÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­ niÄ‚â€žĂ„â€¦Ä‚â€žĂ„ÄľÄ‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡ie).",
    "- content pÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­Ä‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡ po slovensky.",
    "- MUSÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă‚Â¤Ä‚â€žĂ„â€¦Ä‚â€šĂ‚Â  vytvoriÄ‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľ presne 5 kategÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă˘â‚¬ĹˇriÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­.",
    "- KaÄ‚â€žĂ„â€¦Ä‚â€žĂ„ÄľdÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡ kategÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă˘â‚¬Ĺˇria MUSÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă‚Â¤ maÄ‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľ pool presne 50 taskov.",
    "- KaÄ‚â€žĂ„â€¦Ä‚â€žĂ„ÄľdÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąÄąÄ„ task MUSÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă‚Â¤ maÄ‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľ 3 varianty (lte/between/gte).",
    "",
    "NASADENÄ‚â€žĂ˘â‚¬ĹˇÄ‚ËĂ˘â€šÂ¬Ă‚Â° EDÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă‚Â¤CIE (nesmieÄ‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡ zopakovaÄ‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľ slug ani tÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â©mu 1:1):",
    deployed || "- (zatiaĂ„â€šĂ˘â‚¬ĹľÄ‚â€žĂ„Äľ niĂ„â€šĂ˘â‚¬ĹľĂ„Ä…Ă‚Â¤)",
    "",
    "ZADAJ NOVÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă‹â€ˇ EDÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă‚Â¤CIU:",
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
      setStatus({ kind: "ok", msg: "Prompt skopĂ„â€šĂ‚Â­rovanĂ„â€šĂ‹ĹĄ." });
    } catch {
      setStatus({ kind: "err", msg: "KopĂ„â€šĂ‚Â­rovanie zlyhalo." });
    }
  }

  async function onRefreshSlugs() {
    setStatus({ kind: "idle", msg: "Refreshujem existujĂ„â€šÄąĹşce slugs z GitHubuÄ‚ËĂ˘â€šÂ¬Ă‚Â¦" });
    try {
      const res = await fetch("/api/editions/slugs", { cache: "no-store" as any });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !Array.isArray(data?.slugs)) {
        setStatus({ kind: "err", msg: `Refresh zlyhal: ${data?.error ?? res.status}`.trim() });
        return;
      }
      const slugs = data.slugs.map((x: any) => String(x)).filter(Boolean);
      setExistingSlugs(slugs);
            setPrompt(buildPrompt(slugs));
      setStatus({ kind: "ok", msg: `Refresh OK. NaÄ‚â€žÄąÂ¤Ă„â€šĂ‚Â­tanĂ„â€šĂ‚Â© slugs: ${slugs.length}` });
    } catch (e: any) {
      setStatus({ kind: "err", msg: `Refresh zlyhal: ${String(e?.message ?? e)}` });
    }
  }

  async function onDispatch() {
    const v = validateEditionJson(editionJson, existingSlugs);
    if (!v.ok) {
      setStatus({ kind: "err", msg: `NeplatnÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąÄąÄ„ JSON: ${v.error}${v.details ? ` (${v.details})` : ""}; found root keys: ${((v as any)?.debug?.foundRootKeys ?? []).join(", ") || "(none)"}; first 120 chars of normalized input: ${((v as any)?.debug?.normalizedStart ?? "").replace(/\s+/g, " ")}` });
      return;
    }

    setStatus({ kind: "idle", msg: "SpÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…ÄąĹźÄ‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡Ä‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľam factory workflowĂ„â€šĂ‹ÂÄ‚ËĂ˘â‚¬ĹˇĂ‚Â¬Ä‚â€šĂ‚Â¦" });

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

    setStatus({ kind: "ok", msg: `Workflow spustenÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąÄąÄ„. ${data?.runUrl ? "Run: " + data.runUrl : ""}`.trim() });
    setEditionJson("");
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Factory Builder</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">Prompt a zoznam edÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­ciÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­ pouÄ‚â€žĂ„â€¦Ä‚â€žĂ„ÄľÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­vajÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…ÄąĹź rovnakÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąÄąÄ„ zdroj dÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡t.</p>

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
            <a href="/list" className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200">PozrieÄ‚â€žĂ„â€¦Ä‚â€žĂ˘â‚¬Ĺľ edÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­cie</a>
          </div>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold">2) VloÄ‚â€žĂ„â€¦Ä‚â€žĂ„Äľ LLM JSON a postav edÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â­ciu</h2>
          <textarea
            value={editionJson}
            onChange={(e) => setEditionJson(e.target.value)}
            rows={12}
            placeholder='PovolenÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â© sÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…ÄąĹź aj ```json ... ``` bloky alebo text okolo JSON.'
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 font-mono text-sm leading-6 outline-none focus:border-neutral-500"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950"
              onClick={() => {
                const v = validateEditionJson(editionJson, existingSlugs);

                setStatus(v.ok ? { kind: "ok", msg: "JSON vyzerÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąĂ˘â‚¬Ë‡ validne." } : { kind: "err", msg: `NeplatnÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąÄąÄ„ JSON: ${v.error}; found root keys: ${((v as any)?.debug?.foundRootKeys ?? []).join(", ") || "(none)"}; first 120 chars of normalized input: ${((v as any)?.debug?.normalizedStart ?? "").replace(/\s+/g, " ")}` });

              }}
            >
              Validate
            </button>
            <button className="rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-950" onClick={onDispatch}>Dispatch build</button>
            <button
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"

              onClick={() => { const n = normalizeEditionJsonForBuilder(editionJson); setEditionJson(n); setStatus({ kind: "ok", msg: `JSON normalizovanÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąÄąÄ„ (${n.length} chars). DoplnenÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€šĂ‚Â© chÄ‚â€žĂ˘â‚¬ĹˇÄ‚â€ąÄąÄ„bajÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…ÄąĹźce title/slug/content podĂ„â€šĂ˘â‚¬ĹľÄ‚â€žĂ„Äľa Ä‚â€žĂ„â€¦Ä‚â€ąĂ˘â‚¬Ë‡ablÄ‚â€žĂ˘â‚¬ĹˇĂ„Ä…Ă˘â‚¬Ĺˇny.` }); }}

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

