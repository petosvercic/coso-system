type EnvValidation = {
  ok: boolean;
  missing: string[];
};

const TRUE = new Set(["1", "true", "yes", "on", "enabled", "y", "t"]);
const FALSE = new Set(["0", "false", "no", "off", "disabled", "n", "f"]);

function requireEnv(keys: string[], label: string): EnvValidation {
  const missing = keys.filter((k) => !(process.env[k] || "").trim());
  return { ok: missing.length === 0, missing };
}

export function getAppUrl() {
  const fromPublic = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (fromPublic) return fromPublic;

  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  if (typeof window === "undefined") {
    console.warn("[env] NEXT_PUBLIC_APP_URL not set; using fallback app URL http://localhost:3000");
  }
  return "http://localhost:3000";
}

export function isEnabled(key: string, fallback = false): boolean {
  const raw = process.env[key];
  if (raw == null) return fallback;

  const value = String(raw).trim().toLowerCase();
  if (TRUE.has(value)) return true;
  if (FALSE.has(value)) return false;

  return fallback;
}

export function paymentsEnabled(): boolean {
  return isEnabled("PAYMENTS_ENABLED", false);
}

/**
 * Called from app/layout.tsx.
 * Keep this cheap: it should not crash dev/preview unless truly broken.
 */
export function assertServerEnv(): void {
  // Minimal "server must-have" envs. Add more only if code truly requires them.
  const v = requireEnv(["GOLD_TOKEN_SECRET"], "server");
  if (!v.ok) {
    // In production we want hard fail, in preview/dev we only warn.
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[env] Missing required server env: ${v.missing.join(", ")}`);
    }
    console.warn(`[env] Missing required server env (non-prod): ${v.missing.join(", ")}`);
  }
}

/**
 * Used by Stripe routes/pages. If payments are disabled, do NOT throw.
 * If enabled, require Stripe envs.
 */
export function assertPaymentsEnv(): void {
  if (!paymentsEnabled()) return;

  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID",
    "STRIPE_PUBLISHABLE_KEY",
  ];

  const v = requireEnv(required, "payments");
  if (!v.ok) {
    throw new Error(`[env] Payments enabled but missing env: ${v.missing.join(", ")}`);
  }
}
