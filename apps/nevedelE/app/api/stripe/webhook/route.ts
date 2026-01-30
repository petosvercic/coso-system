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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // keď nechceš webhooky, môžeš túto env ani nemať
      return NextResponse.json({ ok: true, skipped: "NO_WEBHOOK_SECRET" }, { status: 200 });
    }

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ ok: false, error: "MISSING_STRIPE_SIGNATURE" }, { status: 400 });
    }

    const rawBody = await req.text();
    const stripe = getStripe();

    // Len over podpis. Nič neukladáme.
    stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "WEBHOOK_ERROR", message: String(e?.message ?? e) },
      { status: 400 }
    );
  }
}
