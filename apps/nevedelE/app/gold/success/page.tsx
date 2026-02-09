import crypto from "node:crypto";
import Stripe from "stripe";
import { createTranslator, detectLanguage } from "../../one-day/localization";

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

function signToken(sessionId: string): string {
  const secret = process.env.GOLD_TOKEN_SECRET ?? "local-gold-token-secret";
  return crypto.createHmac("sha256", secret).update(sessionId).digest("hex").slice(0, 24);
}

export default async function GoldSuccessPage({ searchParams }: Props) {
  const t = createTranslator(detectLanguage());
  const { session_id: sessionId } = await searchParams;

  let token: string | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (sessionId && stripeKey && (process.env.PAYMENTS_ENABLED ?? "false").toLowerCase() === "true") {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      // Foundation rule: token grants optional depth only; it never changes result truth.
      token = signToken(sessionId);
    }
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-xl text-center text-neutral-800">
        <h1 className="text-2xl font-semibold lowercase">{t("gold.success.title")}</h1>
        <p className="mt-4 text-base">{t("gold.success.text")}</p>
        {token ? <p className="mt-3 text-xs text-neutral-500">token: {token}</p> : null}
      </div>
    </main>
  );
}
