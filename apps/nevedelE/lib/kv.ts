type UpstashEnv = {
  url: string;
  token: string;
};

function getUpstash(): UpstashEnv {
  // Vercel Storage connector niekedy vytvorí tieto:
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_KV_URL ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN ||
    "";

  if (!url || !token) {
    throw new Error("UPSTASH_ENV_MISSING");
  }
  return { url, token };
}

async function upstash(cmd: string, ...args: string[]) {
  const { url, token } = getUpstash();
  const u = new URL(url.replace(/\/+$/, "") + "/" + [cmd, ...args].map(encodeURIComponent).join("/"));
  const res = await fetch(u.toString(), {
    method: "POST",
    headers: {
      Authorization: \Bearer \\,
      "Content-Type": "application/json",
    },
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error ?? "UPSTASH_CALL_FAILED");
  return j;
}

export async function kvGet(key: string): Promise<string | null> {
  const j = await upstash("get", key);
  // Upstash REST vracia { result: "..." } alebo { result: null }
  return (j?.result ?? null) as any;
}

export async function kvSet(key: string, value: string, ttlSeconds?: number) {
  if (ttlSeconds && ttlSeconds > 0) {
    await upstash("setex", key, String(ttlSeconds), value);
  } else {
    await upstash("set", key, value);
  }
}