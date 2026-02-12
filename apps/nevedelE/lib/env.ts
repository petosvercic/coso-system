export function getAppUrl() {
  const fromPublic = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (fromPublic) return fromPublic;

  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  if (typeof window === "undefined") {
    console.warn("[env] NEXT_PUBLIC_APP_URL not set; using fallback app URL http://localhost:3000");
  }
  return "http://localhost:3000";
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

export function paymentsEnabled(): boolean {
  return isEnabled("PAYMENTS_ENABLED");
}

export function telemetryEnabled(): boolean {
  return isEnabled("TELEMETRY_ENABLED");
}

export function validateServerEnv(): EnvValidation {
  const required = [...ALWAYS_REQUIRED, ...(paymentsEnabled() ? PAYMENTS_REQUIRED : [])];
  const missing = required.filter((key) => !process.env[key]);
  return { ok: missing.length === 0, missing: [...missing] };
}

export function assertServerEnv(): void {
  const result = validateServerEnv();
  if (!result.ok) {
    throw new Error(`[env] Missing required environment variables: ${result.missing.join(", ")}`);
  }
}

export function assertPaymentsEnv(): EnvValidation {
  if (!paymentsEnabled()) return { ok: true, missing: [] };

  const required = ["NEXT_PUBLIC_APP_URL", ...PAYMENTS_REQUIRED];
  const missing = required.filter((key) => !process.env[key]);
  return { ok: missing.length === 0, missing: [...missing] };
}
export function getAppUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (!raw) throw new Error("[env] Missing NEXT_PUBLIC_APP_URL");
  return raw.replace(/\/+$/, "");
}
