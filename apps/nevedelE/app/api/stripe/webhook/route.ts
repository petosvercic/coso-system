import Stripe from "stripe";
import { headers } from "next/headers";
import { kvSet } from "@/lib/kv";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-01-27.acacia" });

const KEY = (rid: string) => \paid:\\;
const TTL = 60 * 60 * 24 * 30; // 30 dní

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("WEBHOOK_SECRET_MISSING", { status: 400 });

  const sig = (await headers()).get("stripe-signature");
  if (!sig) return new Response("SIGNATURE_MISSING", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return new Response(\Webhook Error: \\, { status: 400 });
  }

  try {
    // Najstabilnejšie: checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const rid =
        (session.client_reference_id ?? "") ||
        (session.metadata?.rid ?? "");

      if (rid) {
        await kvSet(KEY(rid), "1", TTL);
      }
    }

    return new Response("ok");
  } catch (e: any) {
    return new Response(String(e?.message ?? e), { status: 500 });
  }
}