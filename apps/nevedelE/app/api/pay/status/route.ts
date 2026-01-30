export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("MISSING_STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    const rid = url.searchParams.get("rid"); // optional, but recommended

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "MISSING_SESSION_ID" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";

    const sessionRid = session.metadata?.rid ?? session.client_reference_id ?? null;
    const ridOk = !rid || (typeof sessionRid === "string" && sessionRid === rid);

    return NextResponse.json(
      {
        ok: true,
        paid: Boolean(paid && ridOk),
        rid: rid ?? (typeof sessionRid === "string" ? sessionRid : null),
        session_id: sessionId,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
