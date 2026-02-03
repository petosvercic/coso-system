import { kvGet } from "../../../../lib/kv";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rid = url.searchParams.get("rid")?.trim() || "";
  const sessionId = url.searchParams.get("session_id")?.trim() || "";

  // 1) Fast path: if rid is already paid in KV -> done (works after refresh)
  if (rid) {
    const cached = await kvGet<{ paid?: boolean }>(`paid:${rid}`);
    if (cached?.paid) return Response.json({ ok: true, paid: true, source: "kv" });
  }

  // If no rid in KV and no session_id provided, caller can't be verified
  if (!sessionId) {
    return Response.json({ ok: false, error: "MISSING_SESSION_ID" }, { status: 400 });
  }

  // Minimal fallback: we can say "not paid" here.
  // (Payment confirmation is primarily done via webhook writing into KV.)
  return Response.json({ ok: true, paid: false, source: "no_kv" });
}
