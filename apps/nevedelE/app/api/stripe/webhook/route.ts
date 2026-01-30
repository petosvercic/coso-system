export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { kv } from "@vercel/kv";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("MISSING_STRIPE_SECRET_KEY");
  return new Stripe(key);
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ ok: false, error: "MISSING_STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ ok: false, error: "MISSING_STRIPE_SIGNATURE" }, { status: 400 });
    }

    const rawBody = await req.text();
    const stripe = getStripe();

    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const rid = session.metadata?.rid ?? session.client_reference_id ?? null;

      if (rid && typeof rid === "string") {
        await kv.set(`paid:${rid}`, "1");
        if (session.id) await kv.set(`session:${session.id}`, rid);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    // Stripe expects 2xx when accepted; 4xx when failed verification
    return NextResponse.json(
      { ok: false, error: "WEBHOOK_ERROR", message: String(e?.message ?? e) },
      { status: 400 }
    );
  }
}
