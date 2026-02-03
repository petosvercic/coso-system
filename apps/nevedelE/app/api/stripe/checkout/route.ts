export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("MISSING_STRIPE_SECRET_KEY");
  return new Stripe(key);
}

function safeReturnTo(x: unknown) {
  if (typeof x !== "string") return null;
  const s = x.trim();
  // allow only same-origin path
  if (!s.startsWith("/")) return null;
  // avoid open redirects to //evil.com
  if (s.startsWith("//")) return null;
  return s;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | null
      | { rid?: unknown; priceId?: unknown; returnTo?: unknown };

    const rid = typeof body?.rid === "string" ? body.rid : null;
    const priceId = typeof body?.priceId === "string" ? body.priceId : (process.env.STRIPE_PRICE_ID ?? null);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;
    const returnTo = safeReturnTo(body?.returnTo) ?? "/";

    if (!rid) return NextResponse.json({ ok: false, error: "MISSING_RID" }, { status: 400 });
    if (!priceId) return NextResponse.json({ ok: false, error: "MISSING_PRICE_ID" }, { status: 500 });
    if (!appUrl) return NextResponse.json({ ok: false, error: "MISSING_APP_URL" }, { status: 500 });

    const stripe = getStripe();

    // IMPORTANT: return to the edition route, not the home page
    const success = `${appUrl}${returnTo}?rid=${encodeURIComponent(rid)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancel  = `${appUrl}${returnTo}?rid=${encodeURIComponent(rid)}&canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success,
      cancel_url: cancel,
      metadata: { rid },
      client_reference_id: rid,
    });

    if (!session.url) return NextResponse.json({ ok: false, error: "NO_CHECKOUT_URL" }, { status: 500 });
    return NextResponse.json({ ok: true, url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}