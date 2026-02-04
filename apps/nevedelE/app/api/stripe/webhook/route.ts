import Stripe from "stripe";
import { kvSet } from "../../../../lib/kv";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const TTL = 60 * 60 * 24 * 30; // 30 dní
const KEY = (rid: string) => `paid:${rid}`;

export async function POST(req: Request) {
  const whsec = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!whsec) return new Response("STRIPE_WEBHOOK_SECRET_MISSING", { status: 500 });

  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    return new Response(`Webhook signature verification failed: ${err?.message || "BAD_SIGNATURE"}`, { status: 400 });
  }

  // Nám stačí vyriešiť checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const rid =
      (session.metadata && (session.metadata as any).rid) ||
      (session.client_reference_id || null);

    if (rid) {
      await kvSet(KEY(rid), { paid: true, at: Date.now(), sessionId: session.id }, TTL);
    }
  }

  return new Response("ok");
}