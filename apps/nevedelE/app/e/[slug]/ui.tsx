"use client";

import { useEffect, useMemo, useState } from "react";

type Edition = {
  title?: string;
  engine?: { locale?: string };
  content?: any;
};

type EngineItem = { id?: string; title?: string; value?: number; text?: string };
type EngineCategory = { key?: string; title?: string; items?: EngineItem[] };
type EngineResult = { categories?: EngineCategory[] };

const PREPAY_CATS = 3;
const PREPAY_ITEMS_WITH_ANSWER = 3;

function makeRid(slug: string) {
  return ${slug}--;
}

function normalizeBirthDate(s: string) {
  const t = (s || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  const m = t.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return ${yyyy}--;
  }
  return null;
}

export default function EditionClient({ slug, edition }: { slug: string; edition: Edition }) {
  const c = edition?.content ?? {};
  const locale = edition?.engine?.locale ?? "sk";
  const storageKey = useMemo(() => coso:rid:, [slug]);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rid, setRid] = useState<string>("");
  const [result, setResult] = useState<EngineResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    const existing = localStorage.getItem(storageKey);
    const next = existing || makeRid(slug);
    localStorage.setItem(storageKey, next);
    setRid(next);
  }, [slug, storageKey]);

  // Handle Stripe return
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    const urlRid = url.searchParams.get("rid");
    if (!sessionId) return;

    const effectiveRid = urlRid || rid || localStorage.getItem(storageKey) || null;
    if (!effectiveRid) return;

    setBusy("Overujem platbu…");
    fetch(/api/pay/status?session_id=&rid=)
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j?.paid) setPaid(true);
      })
      .finally(() => {
        setBusy(null);
        url.searchParams.delete("session_id");
        url.searchParams.delete("canceled");
        url.searchParams.delete("rid");
        window.history.replaceState({}, "", url.toString());
      });
  }, [rid, storageKey]);

  async function onCompute() {
    setErr("");
    const iso = normalizeBirthDate(birthDate);
    if (!iso) {
      setErr("Zadaj dátum narodenia.");
      return;
    }

    setBusy("Počítam…");
    try {
      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          editionSlug: slug,
          name: name.trim() ? name.trim() : undefined,
          birthDate: iso,
          locale,
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "COMPUTE_FAILED");
      setResult(j.result as EngineResult);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function onCheckout() {
    setErr("");
    const effectiveRid = rid || localStorage.getItem(storageKey) || makeRid(slug);
    localStorage.setItem(storageKey, effectiveRid);
    setRid(effectiveRid);

    document.getElementById("paywall-box")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setBusy("Presmerúvam na platbu…");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rid: effectiveRid,
          returnTo: /e/,
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok || !j?.url) {
        const msg = (j?.error ?? "CHECKOUT_FAILED") + (j?.message ? (": " + j.message) : "");
        throw new Error(msg);
      }
      window.location.href = j.url;
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setBusy(null);
    }
  }

  const cats = Array.isArray(result?.categories) ? result!.categories! : [];
  const visibleCats = paid ? cats : cats.slice(0, PREPAY_CATS);

  const S = {
    page: {
      minHeight: "100vh",
      background: "#0b0f19",
      color: "#e9eefb",
    } as const,
    wrap: {
      maxWidth: 980,
      margin: "0 auto",
      padding: "56px 20px 96px",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      lineHeight: 1.55,
    } as const,
    topNav: { marginBottom: 18, opacity: 0.9 } as const,
    pillLink: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      color: "#e9eefb",
      textDecoration: "none",
    } as const,
    hero: { marginTop: 18, marginBottom: 24 } as const,
    h1: { fontSize: 44, lineHeight: 1.1, margin: 0, letterSpacing: "-0.02em" } as const,
    sub: { marginTop: 12, maxWidth: 760, opacity: 0.75, fontSize: 16 } as const,
    card: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 16,
      padding: 18,
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    } as const,
    cardTitle: { margin: 0, fontSize: 18, letterSpacing: "-0.01em" } as const,
    muted: { opacity: 0.75 } as const,
    grid2: { display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 12 } as const,
    label: { fontSize: 12, opacity: 0.75, marginBottom: 6 } as const,
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.25)",
      color: "#e9eefb",
      outline: "none",
    } as const,
    btn: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.10)",
      color: "#e9eefb",
      cursor: "pointer",
      fontWeight: 650,
    } as const,
    btnPrimary: {
      background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(147,51,234,0.9))",
      border: "1px solid rgba(255,255,255,0.14)",
    } as const,
    err: { color: "#ff6b6b", marginTop: 10 } as const,
    ok: { opacity: 0.8, marginTop: 10 } as const,
    sectionGap: { marginTop: 18 } as const,
    catTitle: { fontSize: 14, opacity: 0.75, marginBottom: 10 } as const,
    itemCard: {
      padding: 14,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.22)",
    } as const,
    itemHead: { display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" as const } as const,
    itemH: { fontWeight: 750 } as const,
    itemVal: { opacity: 0.75, fontSize: 12 } as const,
    lock: { margin: "8px 0 0", opacity: 0.65, fontSize: 14 } as const,
    debug: { marginTop: 18, opacity: 0.55, fontSize: 12 } as const,
  };

  return (
    <div style={S.page}>
      <main style={S.wrap}>
        <div style={S.topNav}>
          <a href="/list" style={S.pillLink}>← späť na edície</a>
        </div>

        <header style={S.hero}>
          <h1 style={S.h1}>{edition?.title ?? slug}</h1>
          <p style={S.sub}>{c?.heroSubtitle ?? ""}</p>
        </header>

        <section style={{ ...S.card, ...S.sectionGap }}>
          <h2 style={S.cardTitle}>{c?.intro?.title ?? "Ako to funguje"}</h2>
          <p style={{ marginBottom: 0, marginTop: 10, ...S.muted }}>{c?.intro?.text ?? ""}</p>
        </section>

        <section style={{ ...S.card, ...S.sectionGap }}>
          <h2 style={S.cardTitle}>{c?.form?.title ?? "Vstup"}</h2>

          <div style={S.grid2}>
            <label>
              <div style={S.label}>{c?.form?.nameLabel ?? "Meno (voliteľné)"}</div>
              <input value={name} onChange={(e) => setName(e.target.value)} style={S.input} />
            </label>

            <label>
              <div style={S.label}>{c?.form?.birthDateLabel ?? "Dátum narodenia"}</div>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={S.input} />
            </label>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onCompute} disabled={Boolean(busy)} style={{ ...S.btn, ...S.btnPrimary }}>
              {c?.form?.submitLabel ?? "Vypočítať"}
            </button>

            {!paid && result ? (
              <button onClick={onCheckout} disabled={Boolean(busy)} style={S.btn}>
                {c?.paywall?.cta ?? "Pokračovať"}
              </button>
            ) : null}
          </div>

          {err ? <p style={S.err}>{err}</p> : null}
          {busy ? <p style={S.ok}>{busy}</p> : null}
        </section>

        {result ? (
          <section style={{ ...S.card, ...S.sectionGap }}>
            <h2 style={S.cardTitle}>{paid ? "Výsledok" : (c?.result?.teaserTitle ?? "Náhľad")}</h2>

            {visibleCats.length ? (
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                {visibleCats.map((cat, ci) => {
                  const items = Array.isArray(cat.items) ? cat.items : [];
                  return (
                    <div key={cat.key ?? ci} style={{ ...S.itemCard, background: "rgba(0,0,0,0.18)" }}>
                      <div style={S.catTitle}>{cat.title ?? Kategória }</div>

                      <div style={{ display: "grid", gap: 12 }}>
                        {items.map((it, ti) => {
                          const showAnswer = paid || ti < PREPAY_ITEMS_WITH_ANSWER;
                          return (
                            <div key={it.id ?? ${ci}-} style={S.itemCard}>
                              <div style={S.itemHead}>
                                <div style={S.itemH}>{it.title ?? Task }</div>
                                {typeof it.value === "number" ? (
                                  <div style={S.itemVal}><strong>Hodnota:</strong> {it.value}</div>
                                ) : null}
                              </div>

                              {showAnswer ? (
                                <p style={{ margin: "10px 0 0", fontSize: 15, opacity: 0.95 }}>{it.text ?? "—"}</p>
                              ) : (
                                <p style={S.lock}>🔒 Skryté (zobrazí sa po platbe)</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={S.err}>Compute vrátil výsledok bez categories.</p>
            )}

            {!paid ? (
              <div id="paywall-box" style={{ marginTop: 16, ...S.itemCard }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{c?.paywall?.headline ?? "Pokračovanie"}</h3>
                <ul style={{ marginTop: 10, opacity: 0.9 }}>
                  {(c?.paywall?.bullets ?? []).slice(0, 8).map((b: string, idx: number) => (
                    <li key={idx} style={{ marginTop: 6 }}>{b}</li>
                  ))}
                </ul>
                <button onClick={onCheckout} disabled={Boolean(busy)} style={{ ...S.btn, ...S.btnPrimary }}>
                  {c?.paywall?.cta ?? "Pokračovať"}
                </button>
                {busy ? <p style={S.ok}>{busy}</p> : null}
                {err ? <p style={S.err}>{err}</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <p style={S.debug}>
          debug: rid=<code>{rid}</code> | paid=<code>{String(paid)}</code>
        </p>
      </main>
    </div>
  );
}