"use client";

import { useEffect, useMemo, useState } from "react";

type Edition = {
  slug: string;
  title: string;
  engine?: { locale?: "sk" | "cz" | "en"; subject?: string };
  content?: {
    heroTitle?: string;
    heroSubtitle?: string;
    intro?: { title?: string; text?: string };
    form?: { title?: string; nameLabel?: string; birthDateLabel?: string; submitLabel?: string };
    result?: { teaserTitle?: string; teaserNote?: string; unlockHint?: string };
    paywall?: { headline?: string; bullets?: string[]; cta?: string };
  };
};

type ComputeItem = { id: string; title: string; value: number; text: string };
type ComputeCategory = { key: string; title: string; items: ComputeItem[] };

type ComputeResult = {
  subject: string;
  score: number;
  seedHash: number;
  categories: ComputeCategory[];
};

function mkRid(slug: string, name: string, birthDate: string) {
  // Good enough: deterministic-ish without storing server state.
  // Real uniqueness still comes from Stripe session_id.
  return `${slug}:${birthDate}:${name}`.slice(0, 120);
}

export default function EditionClient({ edition }: { edition: Edition }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ComputeResult | null>(null);

  const [paid, setPaid] = useState(false);
  const [checkingPay, setCheckingPay] = useState(false);

  const urlParams = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""), []);
  const sessionId = typeof window !== "undefined" ? urlParams.get("session_id") : null;
  const ridFromUrl = typeof window !== "undefined" ? urlParams.get("rid") : null;

  // Check payment status if we have a session_id in the URL
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        setCheckingPay(true);
        const qs = new URLSearchParams({ session_id: sessionId });
        if (ridFromUrl) qs.set("rid", ridFromUrl);
        const res = await fetch(`/api/pay/status?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.ok && data?.paid) setPaid(true);
      } finally {
        if (!cancelled) setCheckingPay(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, ridFromUrl]);

  async function onCompute() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          editionSlug: edition.slug,
          subject: edition.engine?.subject ?? edition.slug,
          locale: edition.engine?.locale ?? "sk",
          name: name.trim() || undefined,
          birthDate,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error ?? `Compute zlyhal (${res.status})`);
        return;
      }

      const r = data.result as any;
      if (!r || !Array.isArray(r.categories)) {
        setErr("Tento slug ešte nemá tasky v edícii. (Je to len obsahová edícia.)");
        return;
      }
      setResult({
        subject: String(r.subject ?? ""),
        score: Number(r.score ?? 0),
        seedHash: Number(r.seedHash ?? 0),
        categories: r.categories as ComputeCategory[],
      });
    } finally {
      setLoading(false);
    }
  }

  async function onCheckout() {
    if (!result) return;
    const rid = ridFromUrl || mkRid(edition.slug, name.trim(), birthDate);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rid, returnTo: window.location.pathname }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !data?.url) {
      setErr(data?.error ?? `Checkout zlyhal (${res.status})`);
      return;
    }
    window.location.href = data.url;
  }

  // Gating rules
  const visibleCategoryCount = paid ? 5 : 3;
  const visibleAnswerPerCategory = paid ? 25 : 3; // show answers for first 3 tasks per visible category

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 980 }}>
      <p style={{ marginBottom: 12 }}>
        <a href="/list">späť na edície</a>
      </p>

      <h1 style={{ fontSize: 34, marginBottom: 6 }}>{edition.content?.heroTitle ?? edition.title}</h1>
      <p style={{ opacity: 0.75, marginTop: 0 }}>{edition.content?.heroSubtitle ?? null}</p>

      {edition.content?.intro ? (
        <section style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>{edition.content.intro.title ?? ""}</h2>
          <p style={{ marginTop: 0, opacity: 0.85 }}>{edition.content.intro.text ?? ""}</p>
        </section>
      ) : null}

      <section style={{ marginTop: 18, padding: 14, border: "1px solid #ddd" }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>{edition.content?.form?.title ?? "Zadaj údaje"}</h2>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{edition.content?.form?.nameLabel ?? "Meno (voliteľné)"}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{edition.content?.form?.birthDateLabel ?? "Dátum narodenia"}</span>
            <input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} type="date" />
          </label>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onCompute} disabled={loading || !birthDate}>
            {loading ? "Počítam…" : edition.content?.form?.submitLabel ?? "Vypočítať"}
          </button>
          {checkingPay ? <span style={{ opacity: 0.7 }}>Overujem platbu…</span> : null}
          {paid ? <span style={{ opacity: 0.7 }}>✅ Odomknuté</span> : null}
        </div>
        {err ? (
          <p style={{ marginTop: 10, color: "#b00" }}>
            {err}
          </p>
        ) : null}
      </section>

      {result ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>{edition.content?.result?.teaserTitle ?? "Výsledok"}</h2>
          <p style={{ marginTop: 0, opacity: 0.75 }}>{edition.content?.result?.teaserNote ?? ""}</p>

          <div style={{ opacity: 0.65, fontSize: 13, marginBottom: 10 }}>
            score: <code>{result.score}</code> | subject: <code>{result.subject}</code>
          </div>

          {(result.categories ?? []).slice(0, visibleCategoryCount).map((cat) => (
            <div key={cat.key} style={{ marginTop: 16, padding: 12, border: "1px solid #eee" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{cat.title}</h3>
              <ol style={{ marginTop: 10 }}>
                {cat.items.map((it, idx) => {
                  const showAnswer = paid || idx < visibleAnswerPerCategory;
                  return (
                    <li key={it.id} style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600 }}>{it.title}</div>
                      {showAnswer ? (
                        <div style={{ marginTop: 4, opacity: 0.9 }}>
                          <div style={{ fontSize: 13, opacity: 0.75 }}>hodnota: {it.value}</div>
                          <div>{it.text}</div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 4, opacity: 0.65 }}>🔒 Odomkni pre odpoveď</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}

          {!paid ? (
            <section style={{ marginTop: 20, padding: 14, border: "1px solid #ddd" }}>
              <h3 style={{ margin: 0 }}>{edition.content?.paywall?.headline ?? "Odomkni celý výsledok"}</h3>
              {Array.isArray(edition.content?.paywall?.bullets) ? (
                <ul style={{ marginTop: 10 }}>
                  {edition.content?.paywall?.bullets?.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}
              <button onClick={onCheckout} style={{ marginTop: 10 }}>
                {edition.content?.paywall?.cta ?? "Odomknúť"}
              </button>
              {edition.content?.result?.unlockHint ? (
                <p style={{ marginTop: 10, opacity: 0.75 }}>{edition.content.result.unlockHint}</p>
              ) : null}
            </section>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
