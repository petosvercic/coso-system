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

const TEASER_CATS = 1;
const TEASER_ITEMS = 4;

function teaserOf(result: EngineResult): EngineResult {
  const cats = (result.categories ?? []).slice(0, TEASER_CATS).map((c) => ({
    ...c,
    items: (c.items ?? []).slice(0, TEASER_ITEMS),
  }));
  return { categories: cats };
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
  const c = edition?.content ?? {};

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<EngineResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const visibleResult = useMemo(() => {
    if (!result) return null;
    return paid ? result : teaserOf(result);
  }, [result, paid]);

  // 1) on mount: restore paid from KV (and session_id verification if present)
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");

    const run = async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("rid", rid);
        if (sessionId) qs.set("session_id", sessionId);

        const r = await fetch(`/api/pay/status?${qs.toString()}`, { cache: "no-store" });
        const j = await r.json();

        if (j?.paid) setPaid(true);

        // clean session_id from URL after verify
        if (sessionId) {
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.toString());
        }
      } catch (e: any) {
        // ignore; paid remains false
      }
    };

    run();
  }, [rid]);

  const compute = async () => {
    setStatus(null);
    setLoading(true);
    try {
      const r = await fetch("/api/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: { name: name || undefined, birthDate },
          editionSlug: slug,
          locale: edition?.engine?.locale ?? "sk",
          rid,
        }),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? "COMPUTE_FAILED");

      setResult(j?.result ?? null);
    } catch (e: any) {
      setStatus(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  const goPay = async () => {
    setStatus(null);
    try {
      const returnTo = `${window.location.origin}/e/${encodeURIComponent(slug)}?rid=${encodeURIComponent(rid)}`;
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rid, returnTo }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? "CHECKOUT_FAILED");
      window.location.href = j.url;
    } catch (e: any) {
      setStatus(String(e?.message ?? e));
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10">
          <div className="text-xs uppercase tracking-widest text-neutral-400 mb-3">edícia</div>
          <h1 className="text-4xl font-semibold leading-tight">{edition?.title ?? slug}</h1>
          {c?.heroSubtitle ? (
            <p className="mt-3 text-neutral-300/80 leading-relaxed">{c.heroSubtitle}</p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Meno (voliteľné)</label>
              <input
                className="w-full rounded-xl bg-neutral-950/60 border border-neutral-800 px-3 py-2 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Meno"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300 mb-1">Dátum narodenia</label>
              <input
                className="w-full rounded-xl bg-neutral-950/60 border border-neutral-800 px-3 py-2 outline-none"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>

            <button
              className="rounded-xl bg-white text-black px-4 py-2 font-semibold disabled:opacity-50"
              onClick={compute}
              disabled={loading || !birthDate}
            >
              {loading ? "Počítam…" : "Vyhodnotiť"}
            </button>
          </div>

          {status ? <div className="mt-4 text-sm text-red-300">{status}</div> : null}
          <div className="mt-4 text-xs text-neutral-500">RID: {rid}</div>
        </section>

        <section className="mt-10">
          {!visibleResult ? (
            <div className="text-neutral-400">Najprv sprav výpočet.</div>
          ) : (
            <div className="space-y-10">
              {visibleResult.categories?.map((cat, ci) => (
                <div key={cat.key ?? ci} className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
                  <h2 className="text-xl font-semibold mb-5">{cat.title ?? `Kategória ${ci + 1}`}</h2>
                  <div className="space-y-6">
                    {(cat.items ?? []).map((item, ti) => (
                      <article key={item.id ?? ti} className="border-l border-neutral-700 pl-4">
                        <div className="flex items-baseline justify-between gap-4">
                          <h3 className="text-base font-semibold text-neutral-100">{item.title ?? `Položka ${ti + 1}`}</h3>
                          {typeof item.value === "number" ? (
                            <span className="text-xs text-neutral-400">score: {item.value}</span>
                          ) : null}
                        </div>
                        {item.text ? (
                          <p className="mt-2 text-sm leading-relaxed text-neutral-200/80">{item.text}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>

                  {!paid ? (
                    <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                      <div className="text-sm text-neutral-200 font-semibold">Pokračovanie je zamknuté</div>
                      <div className="text-xs text-neutral-400 mt-1">
                        Toto je iba ukážka. Po odomknutí uvidíš kompletný výstup.
                      </div>
                      <button
                        className="mt-3 rounded-xl bg-white text-black px-4 py-2 font-semibold"
                        onClick={goPay}
                      >
                        Odomknúť výstup
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}