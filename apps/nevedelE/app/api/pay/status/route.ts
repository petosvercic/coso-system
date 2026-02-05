import { NextResponse } from "next/server";
import { getRedis } from "../../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rid = (url.searchParams.get("rid") ?? "").trim();
  const slug = (url.searchParams.get("slug") ?? "").trim();

  if (!rid) {
    return NextResponse.json({ paid: false }, { status: 200 });
  }

  const redis = getRedis();

  // počas build-u alebo bez env – NESMIE PADNÚŤ
  if (!redis) {
    return NextResponse.json({ paid: false }, { status: 200 });
  }

  const key = slug ? `paid:${rid}:${slug}` : `paid:${rid}`;
  const v = await redis.get<string>(key);

  return NextResponse.json({ paid: v === "1" || v === "true" }, { status: 200 });
}
