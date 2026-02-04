"use client";

import { useEffect, useMemo, useState } from "react";

type Edition = {
  title?: string;
  engine?: { locale?: string };
};

type EngineResult = {
  ok?: boolean;
  rid?: string;
  result?: {
    categories?: Array<{
      id: string;
      title: string;
      items?: Array<{ id: string; title: string; value?: number; text?: string }>;
    }>;
  };
  error?: string;
};

type SavedRun = {
  rid: string;
  slug: string;
  name: string;
  birthDate: string;
  result: EngineResult | null;
  ts: number;
};

const LS_KEY = (rid: string) => `coso:run:${rid}`;

function makeRid(slug: string) {
  return `${slug}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBirthDate(s: string) {
  // expects yyyy-mm-dd (input[type=date])
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function EditionUI({ slug, edition }: { slug: string; edition: Edition }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [rid, setRid] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EngineResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- restore rid from URL or create one (keeps it stable across refresh)
  useEffect(() => {
    const url = new URL(window.location.href);
    const urlRid = url.searchParams.get("rid");
    const effectiveRid = urlRid || makeRid(slug);

    if (!urlRid) {
      url.searchParams.set("rid", effectiveRid);
      window.history.replaceState({}, "", url.toString());
    }
    setRid(effectiveRid);

    // restore saved run (inputs + result)
    try {
      const raw = localStorage.getItem(LS_KEY(effectiveRid));
      if (raw) {
        const saved = JSON.parse(raw) as SavedRun;
        if (saved?.birthDate) setBirthDate(saved.birthDate);
        if (typeof saved?.name === "string") setName(saved.name);
        if (saved?.result) setResult(saved.result);
      }
    } catch {}
  }, [slug]);

  // --- helper: persist state to localStorage
  function persist(next: Partial<SavedRun>) {
    if (!rid) return;
    try {
      const raw = localStorage.getItem(LS_KEY(rid));
      const prev = raw ? (JSON.parse(raw) as SavedRun) : null;
      const merged: SavedRun = {
        rid,
        slug,
        name: prev?.name ?? name,
        birthDate: prev?.birthDate ?? birthDate,
        result: prev?.result ?? result,
        ts: Date.now(),
        ...prev,
        ...next,
      };
      localStorage.setItem(LS_KEY(rid), JSON.stringify(merged));
    } catch {}
  }

  // --- verify paid on:
  // A) return from Stripe (session_id present)
  // B) refresh (rid only)
  useEffect(() => {
    if (!rid) return;

    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");

    async function run() {
      try {
        if (sessionId) {
          const r = await fetch(`/api/pay/status?rid=${encodeURIComponent(rid)}&session_id=${encodeURIComponent(sessionId)}`, {
            cache: "no-store",
          });
          const j = await r.json();
          if (j?.paid) setPaid(true);

          // remove session_id from URL (so refresh doesn't re-verify forever)
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.toString());
        } else {
          const r = await fetch(`/api/pay/status?rid=${encodeURIComponent(rid)}`, { cache: "no-store" });
          const j = await r.json();
          if (j?.paid) setPaid(true);
        }
      } catch {
        // ignore, user can still proceed
      }
    }

    run();
  }, [rid]);

  async function compute() {
    setErr(null);
    if (!rid) return;

    const bd = normalizeBirthDate(birthDate);
    if (!bd) {
      setErr("Zadaj dátum narodenia.");
      return;
    }

    setLoading(true);
    try {
      persist({ name, birthDate: bd });

      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rid,
          subject: { name: name || undefined, birthDate: bd },
          edition: { slug },
        }),
      });

      const json = (await res.json()) as EngineResult;
      setResult(json);
      persist({ result: json });

      if (!json?.ok) {
        setErr(json?.error || "Compute failed");
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  const cats = useMemo(() => {
    const c = result?.result?.categories || [];
    return c;
  }, [result]);

  const TEASER_CATS = 3; // koľko kategórií ukážeš pred paywall
  const TEASER_ITEMS = 3; // koľko itemov v kategórii ukážeš pred paywall

  return (
    <main style={{ maxWidth: 920, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h1 style={{ fontSize: 44, margin: "0 0 16px 0" }}>{edition?.title || "Edícia"}</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18 }}>
        <input
          placeholder="Meno"
          value={name}
          onChange={(e) => { setName(e.target.value); persist({ name: e.target.value }); }}
          style={{ padding: "6px 8px" }}
        />
        <input
          type="date"
          value={birthDate}
          onChange={(e) => { setBirthDate(e.target.value); persist({ birthDate: e.target.value }); }}
          style={{ padding: "6px 8px" }}
        />
        <button onClick={compute} disabled={loading} style={{ padding: "6px 12px", cursor: "pointer" }}>
          {loading ? "Počítam..." : "Vypočítať"}
        </button>
      </div>

      {err ? <div style={{ color: "crimson", marginBottom: 14 }}>{err}</div> : null}

      {/* RESULTS */}
      {cats.length > 0 ? (
        <section>
          {(paid ? cats : cats.slice(0, TEASER_CATS)).map((cat) => (
            <div key={cat.id} style={{ margin: "18px 0" }}>
              <h2 style={{ fontSize: 24, margin: "0 0 8px 0" }}>{cat.title}</h2>

              {(cat.items || []).map((it, idx) => {
                const locked = !paid && idx >= TEASER_ITEMS;
                if (locked) return null;

                return (
                  <div key={it.id} style={{ margin: "10px 0 14px 0" }}>
                    <div style={{ fontWeight: 700 }}>{it.title}</div>
                    <div style={{ opacity: 0.9, lineHeight: 1.5 }}>{it.text}</div>
                  </div>
                );
              })}

              {!paid && (cat.items?.length || 0) > TEASER_ITEMS ? (
                <div style={{ opacity: 0.6, fontStyle: "italic" }}>
                  … ďalšie položky sú za paywallom
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {/* PAYWALL CTA */}
      {result?.ok && !paid ? (
        <section style={{ marginTop: 22, padding: 14, border: "1px solid #ddd", borderRadius: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            Chceš plné výsledky?
          </div>
          <form
            action="/api/stripe/checkout"
            method="POST"
            onSubmit={(e) => {
              // keep saved state right before redirect
              persist({ name, birthDate: birthDate });
            }}
          >
            <input type="hidden" name="rid" value={rid || ""} />
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" style={{ padding: "8px 14px", cursor: "pointer" }}>
              Pokračovať na platbu
            </button>
          </form>
        </section>
      ) : null}

      {/* DEBUG (keep it small, not the whole JSON dump) */}
      <div style={{ marginTop: 18, opacity: 0.5, fontSize: 12 }}>
        debug: rid={rid} | paid={String(paid)}
      </div>
    </main>
  );
}