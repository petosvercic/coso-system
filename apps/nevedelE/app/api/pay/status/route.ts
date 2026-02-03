import { NextResponse } from "next/server";
import Stripe from "stripe";
import { kvGet, kvSet } from "@/lib/kv";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-01-27.acacia" });

const KEY = (rid: string) => \paid:\\;
const TTL = 60 * 60 * 24 * 30; // 30 dní

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    const rid = url.searchParams.get("rid") || "";

    if (!rid && !sessionId) {
      return NextResponse.json({ ok: false, error: "MISSING_RID_OR_SESSION_ID" }, { status: 400 });
    }

    // 1) Refresh flow: iba rid -> pozri do KV
    if (!sessionId && rid) {
      const v = await kvGet(KEY(rid));
      const paid = v === "1";
      return NextResponse.json({ ok: true, paid });
    }

    // 2) Return from Stripe: session_id (+ rid) -> over a zapíš do KV
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "MISSING_SESSION_ID" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === "paid" ||
      (session.status === "complete" && session.payment_status !== "unpaid");

    // rid z parametra alebo zo session metadata/client_reference_id
    const effectiveRid =
      rid ||
      (session.client_reference_id ?? "") ||
      (session.metadata?.rid ?? "");

    if (paid && effectiveRid) {
      await kvSet(KEY(effectiveRid), "1", TTL);
    }

    return NextResponse.json({ ok: true, paid, rid: effectiveRid || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}