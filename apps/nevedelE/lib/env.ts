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
