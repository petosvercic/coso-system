import Stripe from "stripe";
import { kvGet, kvSet } from "@/lib/kv";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id") || "";
  const rid = url.searchParams.get("rid") || "";

  // 1) Fast path: if rid is already paid in KV -> done (works after refresh)
  if (rid) {
    const cached = await kvGet<{ paid?: boolean }>(\paid:\\);
    if (cached?.paid) return Response.json({ ok: true, paid: true, source: "kv" });
  }

  // 2) If no session_id, we can't verify via Stripe. Return whatever we know.
  if (!sessionId) {
    return Response.json({ ok: true, paid: false, source: "none" });
  }

  // 3) Verify Stripe session
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = s.payment_status === "paid" || Boolean((s as any).paid);

    // Try to infer rid from Stripe metadata if not provided
    const inferredRid =
      rid ||
      ((s.metadata as any)?.rid as string) ||
      (s.client_reference_id || "");

    if (paid && inferredRid) {
      await kvSet(\paid:\\, { paid: true, ts: Date.now(), session_id: sessionId }, 60 * 60 * 24 * 30);
    }

    return Response.json({ ok: true, paid, source: "stripe", rid: inferredRid || null });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "STATUS_FAILED" }, { status: 500 });
  }
}