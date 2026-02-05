"use client";

import { useEffect, useMemo, useState } from "react";

type EngineInput = {
  subject?: string;
  birthDate?: string;
};

type EngineResult = {
  categories?: Array<{
    id?: string;
    title?: string;
    items?: Array<{
      id?: string;
      title?: string;
      value?: number;
      text?: string;
    }>;
  }>;
};

type Edition = {
  title?: string;
  engine?: { subject?: string; locale?: string };
  content?: any;
};

const TEASER_CATS = 3;
const TEASER_ITEMS = 3;

function KEY_INPUT(rid: string) {
  return `coso:input:${rid}`;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeBirthDate(s: string) {
  // podpor: "YYYY-MM-DD" alebo "DD.MM.YYYY" alebo "DD. MM. YYYY"
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(s.trim())) return s.trim();

  const m = s.match(/^\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function teaserOf(result: EngineResult | null): EngineResult | null {
  if (!result?.categories?.length) return result;
  const cats = result.categories.slice(0, TEASER_CATS).map((c) => ({
    ...c,
    items: (c.items ?? []).slice(0, TEASER_ITEMS),
  }));
  return { ...result, categories: cats };
}

async function fetchEdition(slug: string): Promise<Edition> {
  const res = await fetch(`/api/edition?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`edition fetch failed (${res.status})`);
  return res.json();
}

async function compute(slug: string, subject: string, birthDateIso: string): Promise<EngineResult> {
  // ✅ kontrakt: subject string + birthDate string
  const body = {
    slug,
    subject,
    birthDate: birthDateIso,
  };

  const res = await fetch(`/api/compute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`compute failed (${res.status}) ${msg}`);
  }
  return res.json();
}

export default function EditionUI({ slug, rid }: { slug: string; rid: string }) {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<EngineResult | null>(null);
  const [paid, setPaid] = useState(false);

  // načítaj edíciu + prefill inputov z localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ed = await fetchEdition(slug);
        if (!mounted) return;
        setEdition(ed);

        const saved = safeJsonParse<EngineInput>(localStorage.getItem(KEY_INPUT(rid)));
        setName(saved?.subject ?? "");
        setBirth(saved?.birthDate ?? "");
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Chyba pri načítaní edície.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug, rid]);

  // zisti pay status
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/pay/status?rid=${encodeURIComponent(rid)}&slug=${encodeURIComponent(slug)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { paid?: boolean };
        if (!mounted) return;
        setPaid(Boolean(data?.paid));
      } catch {
        // ignor
      }
    })();
    return () => {
      mounted = false;
    };
  }, [rid, slug]);

  const visibleResult = useMemo(() => {
    if (!result) return null;
    return paid ? result : teaserOf(result);
  }, [paid, result]);

  async function onCompute() {
    setError(null);

    const birthIso = normalizeBirthDate(birth);
    if (!birthIso) {
      setError('Zadaj dátum ako "YYYY-MM-DD" alebo "DD. MM. YYYY".');
      return;
    }

    const subject = name.trim();
    if (!subject) {
      setError("Zadaj meno (subject).");
      return;
    }

    // ✅ ulož presne kontrakt tvar
    const input: EngineInput = { subject, birthDate: birthIso };
    localStorage.setItem(KEY_INPUT(rid), JSON.stringify(input));

    setLoading(true);
    try {
      const r = await compute(slug, subject, birthIso);
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Compute zlyhal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 44, margin: "0 0 8px" }}>{edition?.title ?? "Edícia"}</h1>
      <p style={{ marginTop: 0, opacity: 0.7 }}>{paid ? "Odomknuté" : "Ukážka pred paywallom"}</p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
        <input
          placeholder="Meno"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 6, minWidth: 220 }}
        />
        <input
          placeholder="DD. MM. YYYY"
          value={birth}
          onChange={(e) => setBirth(e.target.value)}
          style={{ padding: 6, minWidth: 160 }}
        />
        <button onClick={onCompute} disabled={loading} style={{ padding: "6px 12px" }}>
          {loading ? "Počítam..." : "Vypočítať"}
        </button>
      </div>

      {error && <p style={{ color: "crimson", marginTop: 12, whiteSpace: "pre-wrap" }}>{error}</p>}

      {visibleResult && (
        <section style={{ marginTop: 24 }}>
          {(visibleResult.categories ?? []).map((c, i) => (
            <div key={c.id ?? i} style={{ marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 6px" }}>{c.title ?? c.id ?? "Kategória"}</h2>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(c.items ?? []).map((it, j) => (
                  <li key={it.id ?? j} style={{ marginBottom: 8 }}>
                    <b>{it.title ?? it.id ?? "Item"}</b>
                    {typeof it.value === "number" ? <> (score: {it.value})</> : null}
                    <div style={{ opacity: 0.85 }}>{it.text}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {!paid && (
            <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
              <b>Pokračovanie je zamknuté.</b>
              <div style={{ opacity: 0.75, marginTop: 6 }}>
                Po odomknutí sa zobrazí celý obsah a po refreshi to ostane odomknuté.
              </div>
              <div style={{ marginTop: 10 }}>
                <a href={`/api/stripe/checkout?rid=${encodeURIComponent(rid)}&slug=${encodeURIComponent(slug)}`}>
                  Pokračovať na platbu
                </a>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
