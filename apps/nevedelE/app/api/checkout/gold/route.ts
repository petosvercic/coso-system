import Stripe from "stripe";
import { NextResponse } from "next/server";

function paymentsEnabled() {
  return (process.env.PAYMENTS_ENABLED ?? "false").toLowerCase() === "true";
}

export async function POST() {
  if (!paymentsEnabled()) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_GOLD_PRICE_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (!secret || !price) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Foundation rule: payment must never alter result truth; Gold is optional depth only.
  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    success_url: `${baseUrl}/gold/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/gold/cancel`,
    allow_promotion_codes: false,
  });

  return NextResponse.json({ sessionUrl: session.url });
}
