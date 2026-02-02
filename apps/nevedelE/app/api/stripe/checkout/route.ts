export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("MISSING_STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as null | { rid?: unknown; priceId?: unknown; returnTo?: unknown };

    const rid = typeof body?.rid === "string" ? body.rid : null;
    const priceId =
      typeof body?.priceId === "string" ? body.priceId : process.env.STRIPE_PRICE_ID ?? null;

    // Optional: let the client tell us where to come back (e.g. /e/<slug>)
    const returnTo = typeof body?.returnTo === "string" ? body.returnTo : "/";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;

    if (!rid) {
      return NextResponse.json({ ok: false, error: "MISSING_RID" }, { status: 400 });
    }
    if (!priceId) {
      return NextResponse.json({ ok: false, error: "MISSING_PRICE_ID" }, { status: 500 });
    }
    if (!appUrl) {
      return NextResponse.json({ ok: false, error: "MISSING_APP_URL" }, { status: 500 });
    }

    const stripe = getStripe();

    const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}${safeReturnTo}?rid=${encodeURIComponent(rid)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${safeReturnTo}?rid=${encodeURIComponent(rid)}&canceled=1`,
      metadata: { rid },
      client_reference_id: rid,
    });

    if (!session.url) {
      return NextResponse.json({ ok: false, error: "NO_CHECKOUT_URL" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
