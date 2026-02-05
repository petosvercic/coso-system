"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  return `${slug}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBirthDate(s: string) {
  const t = (s || "").trim();

  // input[type=date] gives ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  // fallback: 08. 02. 1991 / 08.02.1991
  const m = t.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

export default function EditionClient({
  slug,
  rid,
  edition,
}: {
  slug: string;
  rid: string;
  edition: Edition;
}) {
 {
  const c = edition?.content ?? {};
  const locale = edition?.engine?.locale ?? "sk";

  const storageRidKey = useMemo(() => `coso:rid:${slug}`, [slug]);
  const storageStateKey = useMemo(() => `coso:state:${slug}`, [slug]);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rid, setRid] = useState<string>("");
  const [result, setResult] = useState<EngineResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");

  const autoComputeOnce = useRef(false);

  // ----- restore rid + saved state -----
  useEffect(() => {
    const existingRid = localStorage.getItem(storageRidKey);
    const nextRid = existingRid || makeRid(slug);
    localStorage.setItem(storageRidKey, nextRid);
    setRid(nextRid);

    // restore state (name, birthDate, result)
    try {
      const raw = localStorage.getItem(storageStateKey);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s?.name === "string") setName(s.name);
        if (typeof s?.birthDate === "string") setBirthDate(s.birthDate);
        if (s?.result && typeof s.result === "object") setResult(s.result as EngineResult);
      }
    } catch {}
  }, [slug, storageRidKey, storageStateKey]);

  // persist state
  useEffect(() => {
    try {
      localStorage.setItem(storageStateKey, JSON.stringify({ name, birthDate, result }));
    } catch {}
  }, [name, birthDate, result, storageStateKey]);

  // ----- on refresh: ask server "is this rid paid?" (KV) -----
  useEffect(() => {
    const effectiveRid = rid || localStorage.getItem(storageRidKey);
    if (!effectiveRid) return;

    fetch(`/api/pay/status?rid=${encodeURIComponent(effectiveRid)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j?.paid) setPaid(true);
      })
      .catch(() => {});
  }, [rid, storageRidKey]);

  // ----- handle Stripe return (session_id) -----
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    const urlRid = url.searchParams.get("rid");
    if (!sessionId) return;

    const effectiveRid = urlRid || rid || localStorage.getItem(storageRidKey) || null;
    if (!effectiveRid) return;

    setBusy("Overujem platbu…");
    fetch(`/api/pay/status?session_id=${encodeURIComponent(sessionId)}&rid=${encodeURIComponent(effectiveRid)}`)
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
  }, [rid, storageRidKey]);

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

  // auto compute once (keď už mám údaje) aby po návrate/refreši nebolo treba klikať
  useEffect(() => {
    if (autoComputeOnce.current) return;
    if (result) return;
    const iso = normalizeBirthDate(birthDate);
    if (!iso) return;
    autoComputeOnce.current = true;
    onCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthDate, result]);

  async function onCheckout() {
    setErr("");
    const effectiveRid = rid || localStorage.getItem(storageRidKey) || makeRid(slug);
    localStorage.setItem(storageRidKey, effectiveRid);
    setRid(effectiveRid);

    document.getElementById("paywall-box")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setBusy("Presmerúvam na platbu…");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rid: effectiveRid,
          returnTo: `/e/${slug}`,
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

  return (
    <main
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: "56px 20px 120px",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
        lineHeight: 1.6,
        color: "#111",
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <a href="/list" style={{ fontSize: 14, color: "#444", textDecoration: "none" }}>← späť na edície</a>

        <h1 style={{ fontSize: 42, lineHeight: 1.12, margin: "18px 0 10px", letterSpacing: "-0.02em" }}>
          {edition?.title ?? slug}
        </h1>

        <p style={{ margin: 0, fontSize: 16, opacity: 0.75, maxWidth: 720 }}>
          {c?.heroSubtitle ?? ""}
        </p>
      </header>

      <section style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 16, padding: 18 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{c?.form?.title ?? "Vstup"}</h2>

        <div style={{ display: "grid", gap: 12, marginTop: 14, gridTemplateColumns: "1fr 1fr" }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{c?.form?.nameLabel ?? "Meno (voliteľné)"}</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            />
          </label>

          <label>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{c?.form?.birthDateLabel ?? "Dátum narodenia"}</div>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            />
          </label>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={onCompute}
            disabled={Boolean(busy)}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {c?.form?.submitLabel ?? "Vypočítať"}
          </button>

          <span style={{ fontSize: 13, opacity: 0.65 }}>
            {busy ? busy : (paid ? "Odomknuté" : "Náhľad")}
          </span>
        </div>

        {err ? <p style={{ color: "crimson", marginTop: 10 }}>{err}</p> : null}
      </section>

      {result ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 18, margin: "18px 0 10px" }}>
            {paid ? "Výsledok" : (c?.result?.teaserTitle ?? "Náhľad")}
          </h2>

          {visibleCats.length ? (
            <div style={{ display: "grid", gap: 16 }}>
              {visibleCats.map((cat, ci) => {
                const items = Array.isArray(cat.items) ? cat.items : [];
                return (
                  <div key={cat.key ?? ci} style={{ border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
                    <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>
                      {cat.title ?? `Kategória ${ci + 1}`}
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {items.map((it, ti) => {
                        const showAnswer = paid || ti < PREPAY_ITEMS_WITH_ANSWER;
                        return (
                          <div key={it.id ?? `${ci}-${ti}`} style={{ border: "1px solid #f0f0f0", borderRadius: 14, padding: 14 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 800 }}>{it.title ?? `Položka ${ti + 1}`}</div>
                              {typeof it.value === "number" ? (
                                <div style={{ opacity: 0.7, fontSize: 13 }}>
                                  <strong>Hodnota:</strong> {it.value}
                                </div>
                              ) : null}
                            </div>

                            {showAnswer ? (
                              <p style={{ margin: "8px 0 0", fontSize: 16 }}>{it.text ?? "—"}</p>
                            ) : (
                              <p style={{ margin: "8px 0 0", opacity: 0.6 }}>🔒 Zamknuté (odkryje sa po platbe)</p>
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
            <p style={{ color: "crimson" }}>Compute vrátil výsledok bez categories.</p>
          )}

          {!paid ? (
            <div
              id="paywall-box"
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 16,
                border: "1px solid #e7e7e7",
                background: "#f7f7f7",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 10 }}>{c?.paywall?.headline ?? "Pokračovanie"}</h3>

              <ul style={{ margin: "0 0 12px 18px" }}>
                {(c?.paywall?.bullets ?? []).slice(0, 8).map((b: string, idx: number) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>

              <button
                onClick={onCheckout}
                disabled={Boolean(busy)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #111",
                  background: "white",
                  color: "#111",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {c?.paywall?.cta ?? "Pokračovať"}
              </button>

              {busy ? <p style={{ marginTop: 10, opacity: 0.8 }}>{busy}</p> : null}
              {err ? <p style={{ marginTop: 10, color: "crimson" }}>{err}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <p style={{ marginTop: 18, opacity: 0.55, fontSize: 12 }}>
        debug: rid=<code>{rid}</code> | paid=<code>{String(paid)}</code>
      </p>
    </main>
  );
}