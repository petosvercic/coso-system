"use client";

import { useEffect, useMemo, useState } from "react";

type Edition = {
  slug?: string;
  title?: string;
  engine?: { subject?: string; locale?: "sk" | "cz" | "en" };
  content?: any;
  tasks?: any;
};

type EngineItem = { id?: string; title?: string; value?: number; text?: string };
type EngineCategory = { key?: string; title?: string; items?: EngineItem[] };
type EngineResult = { categories?: EngineCategory[] };

function makeRid(slug: string) {
  return `${slug}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function EditionClient({ slug, edition }: { slug: string; edition: Edition }) {
  const c = edition?.content ?? {};
  const locale = edition?.engine?.locale ?? "sk";

  const PREPAY_CATS = 3;
  const PREPAY_ITEMS_WITH_ANSWER = 3;

  const storageKey = useMemo(() => `coso:rid:${slug}`, [slug]);

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

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    const urlRid = url.searchParams.get("rid");
    if (!sessionId) return;

    const effectiveRid = urlRid || rid || localStorage.getItem(storageKey) || null;
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
  }, [rid, storageKey]);

  async function onCompute() {
    setErr("");
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setErr("Dátum narodenia musí byť YYYY-MM-DD.");
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
          birthDate,
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
      if (!res.ok || !j?.ok || !j?.url) throw new Error(j?.error ?? "CHECKOUT_FAILED");
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
        <h2 style={{ marginTop: 0 }}>{c?.intro?.title ?? "Úvod"}</h2>
        <p style={{ marginBottom: 0 }}>{c?.intro?.text ?? ""}</p>
      </section>

      <section style={{ marginTop: 18, padding: 14, border: "1px solid #ddd" }}>
        <h2 style={{ marginTop: 0 }}>{c?.form?.title ?? "Zadaj údaje"}</h2>

        <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <label>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{c?.form?.nameLabel ?? "Meno (voliteľné)"}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </label>

          <label>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              {c?.form?.birthDateLabel ?? "Dátum narodenia (YYYY-MM-DD)"}
            </div>
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              placeholder="1990-01-01"
              style={{ width: "100%", padding: 10 }}
            />
          </label>

          <button onClick={onCompute} disabled={Boolean(busy)} style={{ padding: 12 }}>
            {c?.form?.submitLabel ?? "Vypočítať"}
          </button>
        </div>

        {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
        {busy ? <p style={{ opacity: 0.8 }}>{busy}</p> : null}
      </section>

      {result ? (
        <section style={{ marginTop: 18, padding: 14, border: "1px solid #ddd" }}>
          <h2 style={{ marginTop: 0 }}>{paid ? "Výsledok" : (c?.result?.teaserTitle ?? "Náhľad výsledku")}</h2>
          {!paid ? <p style={{ opacity: 0.85 }}>{c?.result?.teaserNote ?? ""}</p> : null}

          {visibleCats.length ? (
            <div style={{ display: "grid", gap: 14 }}>
              {visibleCats.map((cat, ci) => {
                const items = Array.isArray(cat.items) ? cat.items : [];
                return (
                  <div key={cat.key ?? ci} style={{ padding: 12, border: "1px solid #eee" }}>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>{cat.title ?? `Kategória ${ci + 1}`}</div>

                    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                      {items.map((it, ti) => {
                        const showAnswer = paid || ti < PREPAY_ITEMS_WITH_ANSWER;
                        return (
                          <div key={it.id ?? `${ci}-${ti}`} style={{ padding: 10, border: "1px solid #f0f0f0" }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 700 }}>{it.title ?? `Task ${ti + 1}`}</div>
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
            <p style={{ color: "crimson" }}>
              Compute vrátil výsledok bez `categories`. To znamená, že `/api/compute` ešte nerobí 5×25.
            </p>
          )}

          {!paid ? (
            <div style={{ marginTop: 14, padding: 12, background: "#f6f6f6", border: "1px solid #e4e4e4" }}>
              <h3 style={{ marginTop: 0 }}>{c?.paywall?.headline ?? "Odomkni plnú verziu"}</h3>
              <ul>
                {(c?.paywall?.bullets ?? []).slice(0, 3).map((b: string, idx: number) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
              <p style={{ opacity: 0.8 }}>{c?.result?.unlockHint ?? ""}</p>
              <button onClick={onCheckout} disabled={Boolean(busy)} style={{ padding: 12 }}>
                {c?.paywall?.cta ?? "Odomknúť"}
              </button>
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