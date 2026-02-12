"use client";
import { useMemo, useState } from "react";
import { normalizeEditionJsonForBuilder, normalizeEditionJsonRaw, validateEditionJson } from "../../lib/edition-json";
        
type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function buildPrompt(_editions: EditionIndexEntry[]) {
  return [
    "ROLE:",
    "Si content generator pre COSO edície.",
    "Výstup je priamy vstup do COSO buildera.",
    "Builder NEtransformuje význam. Len validuje schému a uloží JSON.",
    "",
    "KRITICKÉ PRAVIDLO:",
    "Ak nedodržíš presný tvar a počty, edícia sa nepostaví.",
    "",
    "CIEĽ:",
    "Vygeneruj NOVÚ unikátnu edíciu.",
    "",
    "DOMÉNA:",
    "Tasky musia konzistentne pokrývať:",
    "- spánok",
    "- šlofík",
    "- power nap",
    "- NSDR",
    "- ticho",
    "- zavreté oči",
    "- mikropauzy",
    "- regeneráciu nervového systému",
    "- mentálnu hygienu",
    "- stabilizáciu energie",
    "",
    "VÝSTUP:",
    "Vráť PRESNE 1 JSON objekt.",
    "Žiadny markdown.",
    "Žiadne komentáre.",
    "Žiadny text mimo JSON.",
    "",
    "KANONICKÁ SCHÉMA (NEPORUŠITEĽNÁ):",
    "",
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
    '    \"categories\": [',
    '      {',
    '        \"key\": \"regeneracia\",',
    '        \"title\": \"Regenerácia a nervový systém\",',
    '        \"pool\": [',
    '          {',
    '            \"id\": \"r01\",',
    '            \"title\": \"Text tasku\",',
    '            \"metricKey\": \"metric_key_snake_case\",',
    '            \"variants\": [',
    '              { \"when\": { \"lte\": 33 }, \"text\": \"…\" },',
    '              { \"when\": { \"between\": [34, 66] }, \"text\": \"…\" },',
    '              { \"when\": { \"gte\": 67 }, \"text\": \"…\" }',
    '            ]',
    '          }',
    '        ]',
    '      }',
    '    ]',
    '  }',
    "}",
    "",
    "TVRDÉ OBMEDZENIA:",
    "",
    "1. Musí byť presne 5 kategórií.",
    "2. Každá kategória musí mať presne 50 taskov v \"pool\".",
    "3. Každý task musí mať presne 3 varianty.",
    "4. Každý variant musí mať presne jednu podmienku:",
    "   - lte",
    "   - between (pole dvoch čísel)",
    "   - gte",
    "5. pickPerCategory musí byť presne 25.",
    "6. Žiadne prázdne texty.",
    "7. Žiadne placeholdery typu \"...\" vo finálnom výstupe.",
    "8. Žiadne ďalšie polia navyše.",
    "9. Nepoužívaj kľúč \"tasks\" vo vnútri kategórie — iba \"pool\".",
    "10. Slug nesmie byť rovnaký ako:",
    "   - plna-test-edicia-001",
    "   - demo-odomykanie",
    "   - test-001",
    "   - test-002",
    "",
    "NEOPTIMALIZUJ POČTY.",
    "NESKRACUJ.",
    "NEZLUČUJ TASKY.",
    "NEPRIDÁVAJ VYSVETLENIA.",
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
      setStatus({ kind: "err", msg: `Neplatný JSON: ${v.error}${v.details ? ` (${v.details})` : ""}; found root keys: ${((v as any)?.debug?.foundRootKeys ?? []).join(", ") || "(none)"}; first 120 chars of normalized input: ${((v as any)?.debug?.normalizedStart ?? "").replace(/\s+/g, " ")}` });
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

                setStatus(v.ok ? { kind: "ok", msg: "JSON vyzerá validne." } : { kind: "err", msg: `Neplatný JSON: ${v.error}; found root keys: ${((v as any)?.debug?.foundRootKeys ?? []).join(", ") || "(none)"}; first 120 chars of normalized input: ${((v as any)?.debug?.normalizedStart ?? "").replace(/\s+/g, " ")}` });

              }}
            >
              Validate
            </button>
            <button className="rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-950" onClick={onDispatch}>Dispatch build</button>
            <button
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"

              onClick={() => { const n = normalizeEditionJsonForBuilder(editionJson); setEditionJson(n); setStatus({ kind: "ok", msg: `JSON normalizovaný (${n.length} chars). Doplnené chýbajúce title/slug/content podľa šablóny.` }); }}

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
