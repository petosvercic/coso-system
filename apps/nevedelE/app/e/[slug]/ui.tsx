"use client";

import { useEffect, useMemo, useState } from "react";

type Edition = {
  title?: string;
  engine?: { locale?: string };
  content?: any;
};

type EngineItem = {
  id?: string;
  title?: string;
  value?: number;
  text?: string;
};

type EngineCategory = {
  key?: string;
  title?: string;
  items?: EngineItem[];
};

type EngineResult = {
  categories?: EngineCategory[];
};

const PREPAY_CATS = 3;
const PREPAY_ITEMS_WITH_ANSWER = 3;

function makeRid(slug: string) {
  return `${slug}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBirthDate(s: string) {
  const t = (s || "").trim();

  // ISO input from <input type="date">
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
  edition,
}: {
  slug: string;
  edition: Edition;
}) {
  const c = edition?.content ?? {};
  const locale = edition?.engine?.locale ?? "sk";
  const storageKey = useMemo(() => `coso:rid:${slug}`, [slug]);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rid, setRid] = useState("");
  const [result, setResult] = useState<EngineResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const existing = localStorage.getItem(storageKey);
    const next = existing || makeRid(slug);
    localStorage.setItem(storageKey, next);
    setRid(next);
  }, [slug, storageKey]);

  // Stripe return
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) return;

    const effectiveRid =
      url.searchParams.get("rid") ||
      rid ||
      localStorage.getItem(storageKey);

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
          name: name.trim() || undefined,
          birthDate: iso,
          locale,
        }),
      });

      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "COMPUTE_FAILED");
      setResult(j.result);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function onCheckout() {
    setErr("");
    const effectiveRid =
      rid || localStorage.getItem(storageKey) || makeRid(slug);

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

      const j = await res.json();
      if (!j?.url) throw new Error("CHECKOUT_FAILED");
      window.location.href = j.url;
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setBusy(null);
    }
  }

  const cats = result?.categories ?? [];
  const visibleCats = paid ? cats : cats.slice(0, PREPAY_CATS);

  return (
    <main style={{ padding: 24, maxWidth: 980 }}>
      <h1>{edition?.title ?? slug}</h1>

      <input
        placeholder="Meno"
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

      {visibleCats.map((cat, ci) => (
        <section key={ci}>
          <h3>{cat.title}</h3>
          {cat.items?.map((it, ti) => {
            const show = paid || ti < PREPAY_ITEMS_WITH_ANSWER;
            return (
              <div key={ti}>
                <strong>{it.title}</strong>
                {show ? <p>{it.text}</p> : <em>🔒 Zamknuté</em>}
              </div>
            );
          })}
        </section>
      ))}

      {!paid && result && (
        <button onClick={onCheckout} disabled={!!busy}>
          Odomknúť
        </button>
      )}
    </main>
  );
}
