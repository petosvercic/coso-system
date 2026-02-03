import Stripe from "stripe";
import { headers } from "next/headers";
import { kvSet } from "@/lib/kv";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;

  if (!whsec) return new Response("STRIPE_WEBHOOK_SECRET missing", { status: 500 });
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    return new Response(\Webhook signature verification failed: \\, { status: 400 });
  }

  // minimal: we only need to mark rid as paid
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    const rid =
      (session.metadata && (session.metadata as any).rid) ||
      (session.client_reference_id || "") ||
      "";

    if (rid) {
      // 30 days TTL
      await kvSet(\paid:\\, { paid: true, ts: Date.now() }, 60 * 60 * 24 * 30);
    }
  }

  return Response.json({ ok: true });
}