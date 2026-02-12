// apps/nevedelE/lib/env.ts

export function getAppUrl() {
  const fromPublic = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (fromPublic) return fromPublic;

  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  if (typeof window === "undefined") {
    console.warn(
      "[env] NEXT_PUBLIC_APP_URL not set; using fallback app URL http://localhost:3000",
    );
  }
  return "http://localhost:3000";
}

type EnvValidation = {
  ok: boolean;
  missing: string[];
};

const ALWAYS_REQUIRED = ["NEXT_PUBLIC_APP_URL"] as const;

const PAYMENTS_REQUIRED = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "STRIPE_PUBLISHABLE_KEY",
] as const;

function isEnabled(name: string): boolean {
  return (process.env[name] ?? "false").toLowerCase() === "true";
}

export function shouldEnablePayments(): boolean {
  return isEnabled("PAYMENTS_ENABLED") || isEnabled("NEXT_PUBLIC_PAYMENTS_ENABLED");
}

export function shouldEnableTelemetry(): boolean {
  return isEnabled("TELEMETRY_ENABLED") || isEnabled("NEXT_PUBLIC_TELEMETRY_ENABLED");
}

/**
 * In build/preview environments we don't want to hard-crash just because
 * payment envs are missing. We validate and return missing keys.
 */
export function validateEnv(): EnvValidation {
  const missing: string[] = [];

  // If NEXT_PUBLIC_APP_URL isn't set, we still can run on Vercel using VERCEL_URL fallback at runtime.
  // So we treat it as "recommended", not hard-required.
  // (Keeping the list for documentation.)
  void ALWAYS_REQUIRED;

  if (shouldEnablePayments()) {
    for (const key of PAYMENTS_REQUIRED) {
      if (!(process.env[key] || "").trim()) missing.push(key);
    }
  }

  return { ok: missing.length === 0, missing };
}

export function assertPaymentsEnv() {
  const v = validateEnv();
  if (shouldEnablePayments() && !v.ok) {
    throw new Error(
      `[env] Missing required env vars for payments: ${v.missing.join(", ")}`,
    );
  }
}
