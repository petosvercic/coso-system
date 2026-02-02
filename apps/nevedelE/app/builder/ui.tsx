"use client";

import { useMemo, useState } from "react";

type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function buildPrompt(editions: EditionIndexEntry[]) {
  const deployed = editions
    .map((e) => `- ${e.slug}: ${e.title}${e.createdAt ? ` (${e.createdAt})` : ""}`)
    .join("\n");

  return [
    "ROLE: Si content generator pre COSO edície.",
    "",
    "CIEĽ:",
    "- Vygeneruj NOVÚ edíciu pre rovnakú web-app šablónu.",
    "- Musí to byť unikátna edícia (žiadne kópie).",
    "",
    "VÝSTUP:",
    "Vráť presne 1 JSON objekt (bez markdown).",
    "Schéma:",
    "{",
    '  \"slug\": \"lowercase-hyphen-slug (3-64 chars, unique)\",',
    '  \"title\": \"Ľudský názov edície\",',
    '  \"content\": {',
    '    \"heroTitle\": \"…\",',
    '    \"heroSubtitle\": \"…\",',
    '    \"items\": [ { \"title\": \"…\", \"text\": \"…\" } ],',
    '    \"paywall\": { \"headline\": \"…\", \"bullets\": [\"…\"], \"cta\": \"…\" }',
    "  }",
    "}",
    "",
    "PRAVIDLÁ:",
    "- slug musí byť unikátny (pozri zoznam nasadených edícií nižšie).",
    "- nepoužívaj vulgárnosti ani hate.",
    "- content píš po slovensky.",
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
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; msg: string }>({
    kind: "idle",
    msg: "",
  });

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
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 980 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Factory Builder</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Prompt je pevný (šablóna). Jediné čo sa mení je zoznam nasadených edícií, aby sa nerobili kópie.
      </p>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>1) Prompt pre LLM</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={18}
          style={{ width: "100%", padding: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onCopyPrompt}>Copy prompt</button>
          <button onClick={() => setPrompt(basePrompt)}>Reset prompt</button>
          <a href="/list">pozrieť edície</a>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>2) Vlož LLM JSON a postav edíciu</h2>
        <textarea
          value={editionJson}
          onChange={(e) => setEditionJson(e.target.value)}
          rows={12}
          placeholder='Sem vlož čistý JSON objekt: { "slug": "...", "title": "...", "content": {...} }'
          style={{ width: "100%", padding: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const v = validateLocal(editionJson);
              setStatus(v.ok ? { kind: "ok", msg: "JSON vyzerá validne." } : { kind: "err", msg: `Neplatný JSON: ${v.error}` });
            }}
          >
            Validate
          </button>
          <button onClick={onDispatch}>Dispatch build</button>
        </div>

        {status.msg ? (
          <p style={{ marginTop: 10, padding: 10, border: "1px solid #ccc" }}>
            <strong>{status.kind === "err" ? "Error" : status.kind === "ok" ? "OK" : "Info"}:</strong> {status.msg}
          </p>
        ) : null}
      </section>
    </main>
  );
}
