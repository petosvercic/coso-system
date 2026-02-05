import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // build / chýbajúce env → nepadni
  if (!url || !token) return null;

  return new Redis({ url, token });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rid = (url.searchParams.get("rid") ?? "").trim();
  const slug = (url.searchParams.get("slug") ?? "").trim();

  if (!rid) {
    return NextResponse.json({ paid: false }, { status: 200 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ paid: false }, { status: 200 });
  }

  const key = slug ? `paid:${rid}:${slug}` : `paid:${rid}`;
  const v = await redis.get<string>(key);

  return NextResponse.json({ paid: v === "1" || v === "true" }, { status: 200 });
}
