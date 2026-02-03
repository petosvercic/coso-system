import Stripe from "stripe";
import { kvSet } from "../../../../lib/kv";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
  const whsec = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!stripeSecret || !whsec) {
    return new Response("STRIPE_WEBHOOK_NOT_CONFIGURED", { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2025-01-27.acacia" as any });

  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // We care mainly about checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // We stored rid into metadata in checkout route (should exist)
    const rid = String((session.metadata as any)?.rid || "").trim();
    if (rid) {
      // Mark as paid for 30 days (or longer if you want)
      await kvSet(`paid:${rid}`, { paid: true, at: Date.now() }, 60 * 60 * 24 * 30);
    }
  }

  return Response.json({ ok: true });
}
