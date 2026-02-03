import { Redis } from "@upstash/redis";

function pick(...vals: (string | undefined)[]) {
  for (const v of vals) {
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

// Prefer explicit REST API envs (Vercel Storage integration)
// Fallback to UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN if you used older style.
const url = pick(
  process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  process.env.UPSTASH_REDIS_REST_API_URL,
  process.env.UPSTASH_REDIS_REST_URL
);

const token = pick(
  process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  process.env.UPSTASH_REDIS_REST_API_TOKEN,
  process.env.UPSTASH_REDIS_REST_TOKEN
);

export const kv = url && token ? new Redis({ url, token }) : null;

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!kv) return null;
  return (await kv.get<T>(key)) ?? null;
}

export async function kvSet<T>(key: string, value: T, ttlSeconds?: number) {
  if (!kv) return;
  if (ttlSeconds && ttlSeconds > 0) {
    await kv.set(key, value as any, { ex: ttlSeconds });
  } else {
    await kv.set(key, value as any);
  }
}
