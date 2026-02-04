export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Stripe from "stripe";
import { kvSet } from "../../../../lib/kv";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const KEY = (rid: string) => `paid:${rid}`;
const TTL = 60 * 60 * 24 * 30; // 30 dní

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!sig || !whsec) return new Response("missing signature/secret", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // minimal: mark rid as paid
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const rid = (session.metadata?.rid || "").trim();
    if (rid) {
      await kvSet(KEY(rid), { paid: true, at: Date.now(), source: "webhook" }, TTL);
    }
  }

  return new Response("ok", { status: 200 });
}