import { kvGet } from "../../../../lib/kv";

export const runtime = "nodejs";

const KEY = (rid: string) => `paid:${rid}`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rid = (url.searchParams.get("rid") || "").trim();
  const sessionId = (url.searchParams.get("session_id") || "").trim();

  // keď už je rid označený ako paid v KV, prežije to refresh
  if (rid) {
    const cached = await kvGet<{ paid?: boolean }>(KEY(rid));
    if (cached?.paid) return Response.json({ ok: true, paid: true, source: "kv" });
  }

  // bez session_id to nevie nič overiť (a webhook je primárny zdroj pravdy)
  if (!sessionId) {
    return Response.json({ ok: false, error: "MISSING_SESSION_ID" }, { status: 400 });
  }

  return Response.json({ ok: true, paid: false, source: "no_kv" });
}
