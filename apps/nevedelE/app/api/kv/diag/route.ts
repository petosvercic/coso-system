export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

function pick(...vals: (string | undefined)[]) {
  for (const v of vals) {
    const t = (v ?? "").trim();
    if (t) return t;
  }
  return "";
}

export async function GET() {
  const REST_URL = pick(
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    process.env.UPSTASH_REDIS_REST_API_URL,
    process.env.UPSTASH_REDIS_REST_URL
  );

  const REST_TOKEN = pick(
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
    process.env.UPSTASH_REDIS_REST_API_TOKEN,
    process.env.UPSTASH_REDIS_REST_TOKEN
  );

  const probeKey = "diag:ping";
  const probeVal = String(Date.now());

  try {
    await kv.set(probeKey, probeVal, 60);
    const got = await kv.get<string>(probeKey);

    return NextResponse.json({
      ok: true,
      hasUrl: Boolean(REST_URL),
      hasToken: Boolean(REST_TOKEN),
      wrote: probeVal,
      read: got,
      match: got === probeVal
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      hasUrl: Boolean(REST_URL),
      hasToken: Boolean(REST_TOKEN),
      error: String(e?.message ?? e)
    }, { status: 500 });
  }
}