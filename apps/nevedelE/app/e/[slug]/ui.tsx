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
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
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
  edition,
}: {
  slug: string;
  edition: Edition;
}) {
  const c = edition?.content ?? {};
  const locale = edition?.engine?.locale ?? "sk";

  const ridKey = useMemo(() => `coso:rid:${slug}`, [slug]);
  const inputKey = useMemo(() => `coso:input:${slug}`, [slug]);
  const autoComputedRef = useRef(false);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rid, setRid] = useState("");
  const [result, setResult] = useState<EngineResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  // RID init
  useEffect(() => {
    const existing = localStorage.getItem(ridKey);
    const next = existing || makeRid(slug);
    localStorage.setItem(ridKey, next);
    setRid(next);
  }, [slug, ridKey]);

  // restore input
  useEffect(() => {
    try {
      const raw = localStorage.getItem(inputKey);
      if (!raw) return;
      const j = JSON.parse(raw);
      if (typeof j?.name === "string") setName(j.name);
      if (typeof j?.birthDate === "string") setBirthDate(j.birthDate);
    } catch {}
  }, [inputKey]);

  // Stripe return
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    const urlRid = url.searchParams.get("rid");
    if (!sessionId) return;

    const effectiveRid = urlRid || rid || localStorage.getItem(ridKey);
    if (!effectiveRid) return;

    setBusy("Overujem platbu…");
    fetch(
      `/api/pay/status?session_id=${encodeURIComponent(
        sessionId
      )}&rid=${encodeURIComponent(effectiveRid)}`
    )
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
  }, [rid, ridKey]);

  // auto compute after payment
  useEffect(() => {
    if (!paid) return;
    if (result) return;
    if (busy) return;
    if (autoComputedRef.current) return;

    try {
      const raw = localStorage.getItem(inputKey);
      if (!raw) return;
      const j = JSON.parse(raw);
      const n = String(j?.name ?? "");
      const d = String(j?.birthDate ?? "");
      if (!d) return;

      setName(n);
      setBirthDate(d);
      autoComputedRef.current = true;
      onCompute();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid]);

  async function onCompute() {
    setErr("");
    const iso = normalizeBirthDate(birthDate);
    if (!iso) {
      setErr("Zadaj dátum narodenia.");
      return;
    }

    try {
      localStorage.setItem(
        inputKey,
        JSON.stringify({ name: name ?? "", birthDate: birthDate ?? "" })
      );
    } catch {}

    setBusy("Počítam…");
    try {
      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          editionSlug: slug,
          name: name.trim() || undefined,
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

    try {
      localStorage.setItem(
        inputKey,
        JSON.stringify({ name: name ?? "", birthDate: birthDate ?? "" })
      );
    } catch {}

    const effectiveRid = rid || localStorage.getItem(ridKey) || makeRid(slug);
    localStorage.setItem(ridKey, effectiveRid);
    setRid(effectiveRid);

    document
      .getElementById("paywall-box")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

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
        throw new Error(j?.error ?? "CHECKOUT_FAILED");
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
    <main style={{ padding: 24, maxWidth: 980, fontFamily: "system-ui" }}>
      <p>
        <a href="/list">späť na edície</a>
      </p>

      <h1>{edition?.title ?? slug}</h1>
      <p>{c?.heroSubtitle ?? ""}</p>

      <section>
        <h2>{c?.form?.title ?? "Vstup"}</h2>

        <input
          placeholder="Meno (voliteľné)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />

        <button onClick={onCompute} disabled={!!busy}>
          Vypočítať
        </button>

        {err && <p style={{ color: "crimson" }}>{err}</p>}
        {busy && <p>{busy}</p>}
      </section>

      {result && (
        <section>
          <h2>{paid ? "Výsledok" : "Náhľad"}</h2>

          {visibleCats.map((cat, ci) => (
            <div key={ci}>
              <h3>{cat.title}</h3>
              {(cat.items ?? []).map((it, ti) => {
                const show = paid || ti < PREPAY_ITEMS_WITH_ANSWER;
                return (
                  <div key={ti}>
                    <strong>{it.title}</strong>{" "}
                    {show ? it.text : "🔒 Zamknuté"}
                  </div>
                );
              })}
            </div>
          ))}

          {!paid && (
            <div id="paywall-box">
              <button onClick={onCheckout} disabled={!!busy}>
                Odomknúť
              </button>
            </div>
          )}
        </section>
      )}

      <p style={{ fontSize: 12, opacity: 0.6 }}>
        debug: rid=<code>{rid}</code> | paid=<code>{String(paid)}</code>
      </p>
    </main>
  );
}
