"use client";
import { useMemo, useState } from "react";

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
    '    \"categories\": [',
    '      {',
    '        \"key\": \"cat-1\",',
    '        \"title\": \"Názov kategórie\",',
    '        \"pool\": [',
    '          {',
    '            \"id\": \"cat1_t01\",',
    '            \"title\": \"Názov tasku\",',
    '            \"metricKey\": \"short_metric_key\",',
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
    "PRAVIDLÁ:",
    "- slug musí byť unikátny (pozri zoznam nasadených edícií nižšie).",
    "- nepoužívaj vulgárnosti ani hate.",
    "- content píš po slovensky.",
    "- MUSÍŠ vytvoriť presne 5 kategórií.",
    "- Každá kategória MUSÍ mať pool presne 50 taskov.",
    "- Každý task MUSÍ mať 3 varianty (lte/between/gte) a musia dávať zmysel pre daný task.",
    "- ids musia byť unikátne v rámci edície.",
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


  function validateLocal(raw: string) {
    const cleaned = raw.trim().replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, "");
    let obj: any;
    try {
      obj = JSON.parse(cleaned);
    } catch (e: any) {
      return { ok: false, error: "INVALID_JSON", details: String(e?.message ?? e) };
    }

    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, error: "NOT_OBJECT" };
    if (typeof obj.slug !== "string" || !obj.slug.trim()) return { ok: false, error: "MISSING_SLUG" };
    if (typeof obj.title !== "string" || !obj.title.trim()) return { ok: false, error: "MISSING_TITLE" };
    if (!obj.content || typeof obj.content !== "object" || Array.isArray(obj.content))
      return { ok: false, error: "MISSING_CONTENT_OBJECT" };

    const slug = obj.slug.trim();
    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) return { ok: false, error: "BAD_SLUG", details: slug };
    if (editions.some((e) => e.slug === slug)) return { ok: false, error: "DUPLICATE_SLUG", details: slug };

    return { ok: true, obj: { ...obj, slug, title: obj.title.trim() } };
  }

  async function onCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus({ kind: "ok", msg: "Prompt skopírovaný." });
    } catch {
      setStatus({ kind: "err", msg: "Kopírovanie zlyhalo. Skús Ctrl+C ako človek z roku 2007." });
    }
  }

  async function onDispatch() {
    const v = validateLocal(editionJson);
    if (!v.ok) {
      setStatus({ kind: "err", msg: `Neplatný JSON: ${v.error}${v.details ? ` (${v.details})` : ""}` });
      return;
    }

    setStatus({ kind: "idle", msg: "Spúšťam factory workflow…" });

    const res = await fetch("/api/factory/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ edition: v.obj }),
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
    <main className="min-h-screen p-6 bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-3xl mx-auto rounded-2xl bg-neutral-900 p-6 border border-neutral-800 shadow-xl">
        <h1 className="text-2xl font-semibold mb-2">Factory Builder</h1>
        <p className="text-neutral-400">
          Prompt je pevný (šablóna). Jediné čo sa mení je zoznam nasadených edícií, aby sa nerobili kópie.
        </p>

        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-2">1) Prompt pre LLM</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={18}
            className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 outline-none focus:border-neutral-600 font-mono text-neutral-100"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              className="rounded-xl bg-neutral-100 text-neutral-950 px-3 py-2 font-semibold"
              onClick={/* onCopyPrompt */}
            >
              Copy prompt
            </button>
            <button
              className="rounded-xl bg-neutral-100 text-neutral-950 px-3 py-2 font-semibold"
              onClick={() => setPrompt(basePrompt)}
            >
              Reset prompt
            </button>
            <a href="/list" className="underline text-neutral-300">pozrieť edície</a>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-2">2) Vlož LLM JSON a postav edíciu</h2>
          <textarea
            value={editionJson}
            onChange={(e) => setEditionJson(e.target.value)}
            rows={12}
            placeholder='Sem vlož čistý JSON objekt: { "slug": "...", "title": "...", "content": {...} }'
            className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 outline-none focus:border-neutral-600 font-mono text-neutral-100"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              className="rounded-xl bg-neutral-100 text-neutral-950 px-3 py-2 font-semibold"
              onClick={() => {
                const v = validateLocal(editionJson);
                setStatus(v.ok ? { kind: "ok", msg: "JSON vyzerá validne." } : { kind: "err", msg: `Neplatný JSON: ${v.error}` });
              }}
            >
              Validate
            </button>
            <button
              className="rounded-xl bg-neutral-100 text-neutral-950 px-3 py-2 font-semibold"
              onClick={/* onDispatch */}
            >
              Dispatch build
            </button>
          </div>

          {status.msg && (
            <p
              className={`mt-3 p-3 rounded-xl border ${
                status.kind === "err"
                  ? "border-red-500 text-red-300"
                  : status.kind === "ok"
                  ? "border-green-500 text-green-300"
                  : "border-neutral-700 text-neutral-300"
              }`}
            >
              <strong>{status.kind === "err" ? "Error" : status.kind === "ok" ? "OK" : "Info"}:</strong> {status.msg}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}