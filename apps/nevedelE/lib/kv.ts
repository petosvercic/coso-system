type KVJson = any;

function getKvEnv() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";

  return { url, token };
}

async function kvFetch(path: string, init?: RequestInit) {
  const { url, token } = getKvEnv();
  if (!url || !token) return null;

  const res = await fetch(\\\\, {
    ...init,
    headers: {
      Authorization: \Bearer \\,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const j = await res.json().catch(() => null);
  return j;
}

export async function kvGet<T = KVJson>(key: string): Promise<T | null> {
  const j = await kvFetch(\/get/\\);
  if (!j) return null;
  // Upstash returns: { result: "..." } or { result: null }
  const raw = j.result;
  if (raw == null) return null;
  try { return JSON.parse(raw) as T; } catch { return raw as T; }
}

export async function kvSet(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  const ttl = ttlSeconds ? \?EX=\\ : "";
  const j = await kvFetch(\/set/\/\\\, { method: "POST" });
  return Boolean(j && (j.result === "OK" || j.result === true));
}