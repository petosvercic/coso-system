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
  return \\-\-\\;
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
    return \\-\-\\;
  }
  return null;
}

export default function EditionClient({ slug, edition }: { slug: string; edition: Edition }) {
  const c = edition?.content ?? {};
  const locale = edition?.engine?.locale ?? "sk";

  const storageRidKey = useMemo(() => \coso:rid:\\, [slug]);
  const storageInputKey = useMemo(() => \coso:input:\\, [slug]);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rid, setRid] = useState<string>("");
  const [result, setResult] = useState<EngineResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");

  const autoComputeOnce = useRef(false);

  function persistInput(n: string, b: string) {
    try {
      localStorage.setItem(storageInputKey, JSON.stringify({ name: n ?? "", birthDate: b ?? "" }));
    } catch {}
  }

  function loadInput() {
    try {
      const raw = localStorage.getItem(storageInputKey);
      if (!raw) return null;
      const j = JSON.parse(raw);
      return { name: String(j?.name ?? ""), birthDate: String(j?.birthDate ?? "") };
    } catch {
      return null;
    }
  }

  // RID init
  useEffect(() => {
    const existing = localStorage.getItem(storageRidKey);
    const next = existing || makeRid(slug);
    localStorage.setItem(storageRidKey, next);
    setRid(next);
  }, [slug, storageRidKey]);

  // Load last input (so po refreshi nie je prázdno)
  useEffect(() => {
    const inp = loadInput();
    if (inp) {
      setName(inp.name);
      setBirthDate(inp.birthDate);
    }
  }, [storageInputKey]);

  async function computeWith(n: string, b: string) {
    setErr("");
    const iso = normalizeBirthDate(b);
    if (!iso) { setErr("Zadaj dátum narodenia."); return; }

    setBusy("Počítam…");
    try {
      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          editionSlug: slug,
          name: n.trim() ? n.trim() : undefined,
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

  async function onCompute() {
    persistInput(name, birthDate);
    await computeWith(name, birthDate);
  }

  // Stripe return: verify payment, set paid, then auto-compute from stored input
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    const urlRid = url.searchParams.get("rid");
    if (!sessionId) return;

    const effectiveRid = urlRid || rid || localStorage.getItem(storageRidKey) || null;
    if (!effectiveRid) return;

    setBusy("Overujem platbu…");
    fetch(\/api/pay/status?session_id=\&rid=\\)
      .then((r) => r.json())
      .then(async (j) => {
        if (j?.ok && j?.paid) {
          setPaid(true);

          // auto compute using stored input (or current state)
          const inp = loadInput();
          const n = inp?.name ?? name;
          const b = inp?.birthDate ?? birthDate;
          if (n || b) {
            await computeWith(n, b);
          }
        }
      })
      .finally(() => {
        setBusy(null);
        url.searchParams.delete("session_id");
        url.searchParams.delete("canceled");
        url.searchParams.delete("rid");
        window.history.replaceState({}, "", url.toString());
      });
  }, [rid, storageRidKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // After refresh: if we already have rid, ask server if paid=true (KV) and auto-compute once
  useEffect(() => {
    const effectiveRid = rid || localStorage.getItem(storageRidKey) || null;
    if (!effectiveRid) return;

    fetch(\/api/pay/status?rid=\\)
      .then((r) => r.json())
      .then(async (j) => {
        if (j?.ok && j?.paid) {
          setPaid(true);
          if (!autoComputeOnce.current && !result) {
            autoComputeOnce.current = true;
            const inp = loadInput();
            const n = inp?.name ?? name;
            const b = inp?.birthDate ?? birthDate;
            if (n || b) {
              await computeWith(n, b);
            }
          }
        }
      })
      .catch(() => {});
  }, [rid]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onCheckout() {
    setErr("");
    const effectiveRid = rid || localStorage.getItem(storageRidKey) || makeRid(slug);
    localStorage.setItem(storageRidKey, effectiveRid);
    setRid(effectiveRid);

    // store input so we can auto compute after returning from Stripe
    persistInput(name, birthDate);

    document.getElementById("paywall-box")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setBusy("Presmerúvam na platbu…");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rid: effectiveRid,
          returnTo: \/e/\\,
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
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 980 }}>
      <p style={{ marginBottom: 12 }}>
        <a href="/list">späť na edície</a>
      </p>

      <h1 style={{ fontSize: 34, marginBottom: 8 }}>{edition?.title ?? slug}</h1>
      <p style={{ opacity: 0.75, marginTop: 0 }}>{c?.heroSubtitle ?? ""}</p>

      <section style={{ marginTop: 18, padding: 14, border: "1px solid #ddd" }}>
        <h2 style={{ marginTop: 0 }}>{c?.intro?.title ?? "Ako to funguje"}</h2>
        <p style={{ marginBottom: 0 }}>{c?.intro?.text ?? ""}</p>
      </section>

      <section style={{ marginTop: 18, padding: 14, border: "1px solid #ddd" }}>
        <h2 style={{ marginTop: 0 }}>{c?.form?.title ?? "Vstup"}</h2>

        <div style={{ display: "grid", gap: 10, maxWidth: 720, gridTemplateColumns: "1fr 1fr" }}>
          <label>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{c?.form?.nameLabel ?? "Meno (voliteľné)"}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </label>

          <label>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{c?.form?.birthDateLabel ?? "Dátum narodenia"}</div>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </label>
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={onCompute} disabled={Boolean(busy)} style={{ padding: 12 }}>
            {c?.form?.submitLabel ?? "Vypočítať"}
          </button>
        </div>

        {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
        {busy ? <p style={{ opacity: 0.8 }}>{busy}</p> : null}
      </section>

      {result ? (
        <section style={{ marginTop: 18, padding: 14, border: "1px solid #ddd" }}>
          <h2 style={{ marginTop: 0 }}>{paid ? "Výsledok" : (c?.result?.teaserTitle ?? "Náhľad")}</h2>

          {visibleCats.length ? (
            <div style={{ display: "grid", gap: 14 }}>
              {visibleCats.map((cat, ci) => {
                const items = Array.isArray(cat.items) ? cat.items : [];
                return (
                  <div key={cat.key ?? ci} style={{ padding: 12, border: "1px solid #eee" }}>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>{cat.title ?? \Kategória \\}</div>

                    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                      {items.map((it, ti) => {
                        const showAnswer = paid || ti < PREPAY_ITEMS_WITH_ANSWER;
                        return (
                          <div key={it.id ?? \\-\\} style={{ padding: 10, border: "1px solid #f0f0f0" }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 700 }}>{it.title ?? \Task \\}</div>
                              {typeof it.value === "number" ? (
                                <div style={{ opacity: 0.7, fontSize: 13 }}>
                                  <strong>Hodnota:</strong> {it.value}
                                </div>
                              ) : null}
                            </div>

                            {showAnswer ? (
                              <p style={{ margin: "8px 0 0" }}>{it.text ?? "—"}</p>
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
            <div id="paywall-box" style={{ marginTop: 14, padding: 12, background: "#f6f6f6", border: "1px solid #e4e4e4" }}>
              <h3 style={{ marginTop: 0 }}>{c?.paywall?.headline ?? "Odomkni celý výsledok"}</h3>
              <ul>
                {(c?.paywall?.bullets ?? []).slice(0, 8).map((b: string, idx: number) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
              <button onClick={onCheckout} disabled={Boolean(busy)} style={{ padding: 12 }}>
                {c?.paywall?.cta ?? "Odomknúť"}
              </button>
              {busy ? <p style={{ marginTop: 10, opacity: 0.8 }}>{busy}</p> : null}
              {err ? <p style={{ marginTop: 10, color: "crimson" }}>{err}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <p style={{ marginTop: 18, opacity: 0.6, fontSize: 12 }}>
        debug: rid=<code>{rid}</code> | paid=<code>{String(paid)}</code>
      </p>
    </main>
  );
}