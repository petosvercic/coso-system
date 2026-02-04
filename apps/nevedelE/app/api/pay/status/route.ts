import Stripe from "stripe";
import { kvGet, kvSet } from "../../../../lib/kv";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

const TTL = 60 * 60 * 24 * 30; // 30 dní
const KEY = (rid: string) => `paid:${rid}`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const rid = url.searchParams.get("rid");

  // 1) Refresh path: len rid -> KV
  if (rid && !sessionId) {
    const cached = await kvGet<{ paid?: boolean }>(KEY(rid));
    return Response.json({ ok: true, paid: Boolean(cached?.paid), source: "kv" });
  }

  // 2) Return from Stripe: session_id + rid -> Stripe verify + KV
  if (!sessionId) return Response.json({ ok: false, error: "MISSING_SESSION_ID" }, { status: 400 });
  if (!rid) return Response.json({ ok: false, error: "MISSING_RID" }, { status: 400 });

  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = (s.payment_status === "paid");

    if (paid) {
      await kvSet(KEY(rid), { paid: true, at: Date.now(), sessionId }, TTL);
    }

    return Response.json({ ok: true, paid, source: "stripe" });
  } catch (e: any) {
    return Response.json({ ok: false, error: "STATUS_FAILED", message: String(e?.message ?? e) }, { status: 500 });
  }
}