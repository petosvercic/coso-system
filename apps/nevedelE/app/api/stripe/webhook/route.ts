import Stripe from "stripe";
import { kvSet } from "../../../../lib/kv";

export const runtime = "nodejs";

const KEY = (rid: string) => `paid:${rid}`;
const TTL = 60 * 60 * 24 * 30; // 30 dní

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY || "";
  const whsec = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!secret || !whsec) {
    return new Response("STRIPE_WEBHOOK_NOT_CONFIGURED", { status: 500 });
  }

  const stripe = new Stripe(secret, { apiVersion: "2025-01-27.acacia" as any });

  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // minimalne potrebujeme len session.completed -> nastav paid
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const rid = String((session.metadata as any)?.rid || "").trim();
    if (rid) {
      await kvSet(KEY(rid), { paid: true, at: Date.now() }, TTL);
    }
  }

  return Response.json({ ok: true });
}
