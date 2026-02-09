export function paymentsEnabled(): boolean {
  return (process.env.PAYMENTS_ENABLED ?? "false").toLowerCase() === "true";
}

export function assertPaymentsEnv(): { ok: boolean; missing: string[] } {
  if (!paymentsEnabled()) return { ok: true, missing: [] };

  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID",
    "NEXT_PUBLIC_APP_URL",
    "STRIPE_PUBLISHABLE_KEY",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  return { ok: missing.length === 0, missing: [...missing] };
}
