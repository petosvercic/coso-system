export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rid = url.searchParams.get("rid");

    if (!rid) {
      return NextResponse.json({ ok: false, error: "MISSING_RID" }, { status: 400 });
    }

    const flag = await kv.get<string>(`paid:${rid}`);
    const paid = flag === "1";

    return NextResponse.json({ ok: true, rid, paid }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
