export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { compute } from "coso-engine";
import { EngineInputSchema } from "coso-contract";
import { computeEditionResult, loadEdition } from "../../../lib/edition-runtime";

// This route supports 2 modes:
// 1) legacy: pass EngineInput -> returns coso-engine EngineResult
// 2) edition: pass { editionSlug, subject, birthDate, name?, locale? } -> returns 5x25 categories (if edition.tasks exists)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    // Accept either:
    // 1) { input: <EngineInput> }
    // 2) <EngineInput>
    // 3) { editionSlug, subject, birthDate, name?, locale? }
    const candidate =
      body && typeof body === "object" && body !== null && "input" in (body as any)
        ? (body as any).input
        : body;

    // Optional edition mode
    const editionSlug =
      candidate && typeof candidate === "object" && candidate !== null
        ? (candidate as any).editionSlug
        : null;

    const parsed = (EngineInputSchema as any).safeParse
      ? (EngineInputSchema as any).safeParse(candidate)
      : { success: true, data: (EngineInputSchema as any).parse(candidate) };

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INPUT", details: parsed.error?.issues ?? parsed.error ?? null },
        { status: 400 }
      );
    }

    // Always compute the base engine result (seed/score/verdict)
    const base = await compute(parsed.data);

    // If editionSlug provided AND edition has tasks.categories, return the edition-shaped result
    if (typeof editionSlug === "string" && editionSlug.trim()) {
      const ed = loadEdition(editionSlug.trim());
      if (ed?.tasks?.categories?.length) {
        const edResult = computeEditionResult({
          edition: ed,
          birthDate: parsed.data.birthDate,
          name: parsed.data.name,
          locale: parsed.data.locale,
        });

        return NextResponse.json(
          {
            ok: true,
            result: {
              ...edResult,
              // keep base result for debugging and backwards compat
              base,
            },
          },
          { status: 200 }
        );
      }
    }

    // Legacy fallback
    return NextResponse.json({ ok: true, result: base }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
