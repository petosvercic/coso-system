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
  if (["1", "true", "yes", "on", "enabled"].includes(value)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(value)) return false;

  return fallback;
}

export function paymentsEnabled(): boolean {
  return isEnabled("PAYMENTS_ENABLED", false);
}
