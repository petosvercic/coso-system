"use client";

import { useMemo, useState } from "react";

type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function buildPrompt(editions: EditionIndexEntry[]) {
  const deployed = editions
    .map((e) => `- ${e.slug}: ${e.title}${e.createdAt ? ` (${e.createdAt})` : ""}`)
    .join("\n");

  return [
    "ROLE: Si generator edícií pre COSO Factory.",
    "",
    "KONTEXT PRODUKTU:",
    "- Každá edícia je jedna stránka /e/<slug>.",
    "- User vyplní meno (voliteľné) a dátum narodenia (YYYY-MM-DD).",
    "- Engine vypočíta výsledok pre zadaný subject.",
    "- Bez platby ukážeme iba teaser (napr. score + krátky preview). Plné výsledky sú za paywallom.",
    "- Platba prebieha cez Stripe checkout.",
    "",
    "VÝSTUP:",
    "Vráť presne 1 JSON objekt (bez markdown, bez komentárov).",
    "",
    "SCHÉMA (MUSÍ SEDIEŤ):",
    "{",
    '  "slug": "lowercase-hyphen-slug (3-64 chars, unique)",',
    '  "title": "Ľudský názov edície",',
    '  "engine": {',
    '    "subject": "String ktorý pôjde do engine inputu ako subject",',
    '    "locale": "sk"',
    "  },",
    '  "content": {',
    '    "heroTitle": "…",',
    '    "heroSubtitle": "…",',
    '    "intro": { "title": "…", "text": "…" },',
    '    "form": {',
    '      "title": "…",',
    '      "nameLabel": "…",',
    '      "birthDateLabel": "…",',
    '      "submitLabel": "…" ',
    "    },",
    '    "result": {',
    '      "teaserTitle": "…",',
    '      "teaserNote": "…",',
    '      "unlockHint": "…" ',
    "    },",
    '    "paywall": {',
    '      "headline": "…",',
    '      "bullets": ["…","…","…"],',
    '      "cta": "…" ',
    "    }",
    "  }",
    "}",
    "",
    "PRAVIDLÁ:",
    "- slug musí byť unikátny (pozri zoznam nasadených edícií nižšie).",
    "- Téma edície nesmie byť 1:1 kópia už nasadenej edície.",
    "- Texty píš po slovensky, stručné, jasné, bez cringe marketingu.",
    "- bullets max 3, každá do 10 slov.",
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

    // slug/title
    if (typeof obj.slug !== "string" || !obj.slug.trim()) return { ok: false, error: "MISSING_SLUG" };
    if (typeof obj.title !== "string" || !obj.title.trim()) return { ok: false, error: "MISSING_TITLE" };

    const slug = obj.slug.trim();
    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) return { ok: false, error: "BAD_SLUG", details: slug };
    if (editions.some((e) => e.slug === slug)) return { ok: false, error: "DUPLICATE_SLUG", details: slug };

    // engine
    if (!obj.engine || typeof obj.engine !== "object" || Array.isArray(obj.engine))
      return { ok: false, error: "MISSING_ENGINE_OBJECT" };
    if (typeof obj.engine.subject !== "string" || !obj.engine.subject.trim())
      return { ok: false, error: "MISSING_ENGINE_SUBJECT" };
    if (obj.engine.locale !== "sk") return { ok: false, error: "ENGINE_LOCALE_MUST_BE_SK" };

    // content
    if (!obj.content || typeof obj.content !== "object" || Array.isArray(obj.content))
      return { ok: false, error: "MISSING_CONTENT_OBJECT" };

    const c = obj.content;
    if (typeof c.heroTitle !== "string" || !c.heroTitle.trim()) return { ok: false, error: "MISSING_HERO_TITLE" };
    if (typeof c.heroSubtitle !== "string" || !c.heroSubtitle.trim()) return { ok: false, error: "MISSING_HERO_SUBTITLE" };

    if (!c.intro || typeof c.intro !== "object" || Array.isArray(c.intro)) return { ok: false, error: "MISSING_INTRO" };
    if (typeof c.intro.title !== "string" || !c.intro.title.trim()) return { ok: false, error: "MISSING_INTRO_TITLE" };
    if (typeof c.intro.text !== "string" || !c.intro.text.trim()) return { ok: false, error: "MISSING_INTRO_TEXT" };

    if (!c.form || typeof c.form !== "object" || Array.isArray(c.form)) return { ok: false, error: "MISSING_FORM" };
    for (const k of ["title", "nameLabel", "birthDateLabel", "submitLabel"] as const) {
      if (typeof c.form[k] !== "string" || !c.form[k].trim()) return { ok: false, error: `MISSING_FORM_${k}` };
    }

    if (!c.result || typeof c.result !== "object" || Array.isArray(c.result)) return { ok: false, error: "MISSING_RESULT_COPY" };
    for (const k of ["teaserTitle", "teaserNote", "unlockHint"] as const) {
      if (typeof c.result[k] !== "string" || !c.result[k].trim()) return { ok: false, error: `MISSING_RESULT_${k}` };
    }

    if (!c.paywall || typeof c.paywall !== "object" || Array.isArray(c.paywall)) return { ok: false, error: "MISSING_PAYWALL" };
    if (typeof c.paywall.headline !== "string" || !c.paywall.headline.trim())
      return { ok: false, error: "MISSING_PAYWALL_HEADLINE" };
    if (!Array.isArray(c.paywall.bullets) || c.paywall.bullets.length < 1) return { ok: false, error: "MISSING_PAYWALL_BULLETS" };
    if (c.paywall.bullets.length > 3) return { ok: false, error: "PAYWALL_BULLETS_MAX_3" };
    if (typeof c.paywall.cta !== "string" || !c.paywall.cta.trim()) return { ok: false, error: "MISSING_PAYWALL_CTA" };

    return {
      ok: true,
      obj: {
        ...obj,
        slug,
        title: obj.title.trim(),
        engine: { subject: obj.engine.subject.trim(), locale: "sk" },
      },
    };
  }

  async function onCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus({ kind: "ok", msg: "Prompt skopírovaný." });
    } catch {
      setStatus({ kind: "err", msg: "Kopírovanie zlyhalo. Ctrl+C funguje ako vždy." });
    }
  }

  async function onDispatch() {
    const v = validateLocal(editionJson);
    if (!v.ok) {
      setStatus({ kind: "err", msg: `Neplatný JSON: ${v.error}${(v as any).details ? ` (${(v as any).details})` : ""}` });
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
        Prompt je pevný. Mení sa len sekcia NASADENÉ EDÍCIE, aby si nerobil kópie.
      </p>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>1) Prompt pre LLM</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={20}
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
          placeholder='Sem vlož čistý JSON objekt podľa promptu…'
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
