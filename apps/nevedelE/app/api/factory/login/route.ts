export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const token = process.env.FACTORY_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "FACTORY_TOKEN_MISSING" }, { status: 500 });

  const body = await req.json().catch(() => null) as null | { token?: unknown };
  const provided = typeof body?.token === "string" ? body.token : null;

  if (!provided || provided !== token) {
    return NextResponse.json({ ok: false, error: "BAD_TOKEN" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("factory", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30d
  });
  return res;
}