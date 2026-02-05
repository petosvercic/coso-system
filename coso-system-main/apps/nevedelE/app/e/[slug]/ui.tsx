"use client";

import { useEffect, useMemo, useState } from "react";

type EngineItem = { id?: string; title?: string; value?: number; text?: string };
type EngineCategory = { key?: string; title?: string; items?: EngineItem[] };
type EngineResult = { categories?: EngineCategory[] };

type Edition = {
  title?: string;
  engine?: { locale?: string };
  content?: any;
};

function normalizeBirthDate(s: string) {
  const t = (s || "").trim();
  if (!t) return "";
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(t)) {
    const [dd, mm, yyyy] = t.split(".");
    return `${yyyy}-${mm}-${dd}`;
  }
  return t;
}

function makeRid(slug: string) {
  // Stabilné per device + slug
  const key = `coso:device`;
  let dev = "";
  try {
    dev = localStorage.getItem(key) || "";
    if (!dev) {
      // @ts-ignore
      dev = (globalThis.crypto?.randomUUID?.() ?? "") || "";
      if (!dev) dev = Math.random().toString(16).slice(2) + Date.now().toString(16);
      localStorage.setItem(key, dev);
    }
  } catch {
    dev = Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
  return `${slug}:${dev}`;
}

export default function EditionClient({ slug, edition }: { slug: string; edition: Edition }) {
  const c = edition?.content ?? {};

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [rid, setRid] = useState("");
  const [paid, setPaid] = useState(false);

  const [result, setResult] = useState<EngineResult | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // RID init: URL -> localStorage -> generate
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ridFromUrl = (url.searchParams.get("rid") || "").trim();
      const key = `coso:rid:${slug}`;

      if (ridFromUrl) {
        localStorage.setItem(key, ridFromUrl);
        setRid(ridFromUrl);
        return;
      }

      const cached = (localStorage.getItem(key) || "").trim();
      if (cached) {
        setRid(cached);
        return;
      }

      const fresh = makeRid(slug);
      localStorage.setItem(key, fresh);
      setRid(fresh);
    } catch {
      setRid(makeRid(slug));
    }
  }, [slug]);

  // Restore result (aby refresh nezmazal výsledok)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`coso:result:${slug}`);
      if (raw) setResult(JSON.parse(raw));
    } catch {}
  }, [slug]);

  // Payment verify (return zo Stripe aj bežný refresh)
  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const sessionId = (url.searchParams.get("session_id") || "").trim();
        const ridFromUrl = (url.searchParams.get("rid") || "").trim();
        const effectiveRid = (ridFromUrl || rid || "").trim();
        if (!effectiveRid) return;

        // návrat zo Stripe
        if (sessionId) {
          const r = await fetch(
            `/api/pay/status?session_id=${encodeURIComponent(sessionId)}&rid=${encodeURIComponent(effectiveRid)}`,
            { cache: "no-store" }
          );
          const json = await r.json();
          if (json?.paid) setPaid(true);

          // vyčisti session_id z URL
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.toString());
          return;
        }

        // refresh: check KV podľa rid
        const r = await fetch(`/api/pay/status?rid=${encodeURIComponent(effectiveRid)}`, { cache: "no-store" });
        const json = await r.json();
        if (json?.paid) setPaid(true);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [rid, slug]);

  const visible = useMemo(() => {
    if (!result?.categories?.length) return null;
    if (paid) return result;

    // TEASER: 1 kategória, 1 item s textom
    const cats = result.categories.slice(0, 1).map((cat) => ({
      ...cat,
      items: (cat.items ?? []).map((it, idx) => ({
        ...it,
        text: idx === 0 ? it.text : "",
      })),
    }));

    return { categories: cats } as EngineResult;
  }, [result, paid]);

  async function onCompute() {
    setErr(null);

    const bd = normalizeBirthDate(birthDate);
    if (!bd) {
      setErr("Zadaj dátum narodenia.");
      return;
    }

    try {
      const r = await fetch("/api/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          name: (name || "").trim() || null,
          birthDate: bd,
        }),
      });

      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || "COMPUTE_FAILED");

      setResult(json);
      localStorage.setItem(`coso:result:${slug}`, JSON.stringify(json));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }

  async function onCheckout() {
    setErr(null);
    setPayBusy(true);

    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rid,
          slug,
          returnTo: `/e/${slug}`,
        }),
      });

      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || "CHECKOUT_FAILED");
      if (!json?.url) throw new Error("MISSING_CHECKOUT_URL");

      window.location.href = json.url;
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setPayBusy(false);
    }
  }

  return (
    <div className="wrap">
      <style>{`
        .wrap { max-width: 980px; margin: 0 auto; padding: 56px 18px 120px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #111; }
        .hero { margin-bottom: 28px; }
        .title { font-size: 44px; letter-spacing: -0.03em; margin: 0 0 10px; }
        .sub { margin: 0; opacity: .72; max-width: 720px; font-size: 16px; line-height: 1.6; }
        .card { border: 1px solid #e7e7e7; border-radius: 16px; padding: 18px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
        .grid { display: grid; gap: 14px; }
        .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .input { padding: 10px 12px; border: 1px solid #ddd; border-radius: 10px; font-size: 14px; }
        .btn { padding: 10px 14px; border-radius: 10px; border: 1px solid #111; background: #111; color: white; cursor: pointer; }
        .btn.secondary { background: white; color: #111; border-color: #ddd; }
        .btn:disabled { opacity: .6; cursor: not-allowed; }
        .err { color: #b00020; font-weight: 600; }
        .sectionTitle { font-size: 18px; margin: 0 0 10px; }
        .cat { padding: 14px; border: 1px solid #eee; border-radius: 14px; background: #fafafa; }
        .cat h2 { margin: 0 0 10px; font-size: 16px; }
        .item { padding: 12px; border-radius: 12px; background: #fff; border: 1px solid #eee; }
        .item h3 { margin: 0 0 6px; font-size: 15px; }
        .meta { font-size: 12px; opacity: .6; margin-bottom: 8px; }
        .locked { opacity: .55; }
        .pay { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .badge { font-size: 12px; opacity: .55; }
      `}</style>

      <div className="hero">
        <h1 className="title">{edition?.title ?? slug}</h1>
        <p className="sub">{c?.heroSubtitle ?? ""}</p>
      </div>

      <div className="grid">
        <div className="card">
          <div className="row">
            <input className="input" placeholder="Meno (voliteľné)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="YYYY-MM-DD alebo dd.mm.rrrr" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            <button className="btn" onClick={onCompute}>Vyhodnotiť</button>
            <span className="badge">paid: {String(paid)}</span>
          </div>
          {err ? <div style={{ marginTop: 10 }} className="err">{err}</div> : null}
        </div>

        {visible?.categories?.length ? (
          <div className="card">
            <div className="pay">
              <div>
                <div className="sectionTitle">Výsledok</div>
                {!paid ? <div style={{ opacity: 0.75, fontSize: 13 }}>Zobrazený je len teaser. Zvyšok sa sprístupní po platbe.</div> : null}
              </div>

              {!paid ? (
                <button className="btn secondary" disabled={payBusy || !rid} onClick={onCheckout}>
                  {payBusy ? "Presmerovávam..." : "Pokračovať na platbu"}
                </button>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.75 }}>Sprístupnené</div>
              )}
            </div>

            <div style={{ height: 14 }} />

            <div className="grid">
              {visible.categories!.map((cat, ci) => (
                <div className="cat" key={cat.key ?? ci}>
                  <h2>{cat.title ?? `Kategória ${ci + 1}`}</h2>
                  <div className="grid">
                    {(cat.items ?? []).map((it, idx) => {
                      const locked = !paid && idx !== 0;
                      return (
                        <div className={`item ${locked ? "locked" : ""}`} key={it.id ?? idx}>
                          <h3>{it.title ?? `Položka ${idx + 1}`}</h3>
                          {typeof it.value === "number" ? <div className="meta">Hodnota: {it.value}</div> : null}
                          {locked ? <div>Skryté. Sprístupní sa po platbe.</div> : <div>{it.text ?? ""}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card" style={{ opacity: 0.75 }}>
            Výsledok zatiaľ nie je vygenerovaný.
          </div>
        )}
      </div>
    </div>
  );
}