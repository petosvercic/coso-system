"use client";

import { useEffect, useMemo, useState } from "react";

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
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

export default function EditionClient({ slug, edition }: any) {
  const storageKey = useMemo(() => `coso:rid:${slug}`, [slug]);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rid, setRid] = useState("");
  const [result, setResult] = useState<any>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const existing = localStorage.getItem(storageKey);
    const next = existing || makeRid(slug);
    localStorage.setItem(storageKey, next);
    setRid(next);
  }, [slug, storageKey]);

  useEffect(() => {
    if (!rid) return;
    fetch(`/api/pay/status?rid=${encodeURIComponent(rid)}`)
      .then(r => r.json())
      .then(j => {
        if (j?.paid) {
          setPaid(true);
          if (j?.result) setResult(j.result);
        }
      })
      .catch(() => {});
  }, [rid]);

  async function onCompute() {
    setErr("");
    const iso = normalizeBirthDate(birthDate);
    if (!iso) {
      setErr("Zadaj dátum narodenia.");
      return;
    }

    setBusy("Počítam…");
    try {
      const r = await fetch("/api/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ editionSlug: slug, name, birthDate: iso }),
      });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || "COMPUTE_FAILED");
      setResult(j.result);
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setBusy(null);
    }
  }

  async function onCheckout() {
    setBusy("Presmerúvam na platbu…");
    const r = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rid, returnTo: `/e/${slug}` }),
    });
    const j = await r.json();
    if (j?.url) window.location.href = j.url;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>{edition?.title || slug}</h1>

      {!result && (
        <>
          <input placeholder="Meno" value={name} onChange={e => setName(e.target.value)} />
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
          <button onClick={onCompute}>Vypočítať</button>
        </>
      )}

      {busy && <p>{busy}</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {result && (
        <>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          {!paid && <button onClick={onCheckout}>Odomknúť</button>}
        </>
      )}
    </main>
  );
}