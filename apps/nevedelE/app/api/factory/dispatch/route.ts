// apps/nevedelE/app/api/factory/dispatch/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateEditionJson } from "../../../../lib/edition-json";
import { listEditions, persistEditionLocally } from "../../../../lib/editions-store";

function resolveRepoParts() {
  const repoRaw = (process.env.GITHUB_REPO || "").trim();
  const ownerRaw = (process.env.GITHUB_OWNER || "").trim();

  if (ownerRaw && repoRaw) return { owner: ownerRaw, repo: repoRaw };

  if (repoRaw.includes("/")) {
    const [owner, repo] = repoRaw.split("/", 2);
    if (owner && repo) return { owner, repo };
  }
  return null;
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") || "local").toLowerCase();

  const json = await req.json().catch(() => null);
  const parsed = validateEditionJson(json);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error, issues: parsed.issues },
      { status: 400 },
    );
  }

  const edition = parsed.value;

  if (mode === "local") {
    const persisted = await persistEditionLocally(edition);
    return NextResponse.json({ ok: true, mode: "local", persisted });
  }

  if (mode === "list") {
    const items = await listEditions();
    return NextResponse.json({ ok: true, mode: "list", items });
  }

  if (mode === "github") {
    const parts = resolveRepoParts();
    if (!parts) {
      return NextResponse.json(
        { ok: false, error: "Missing repo config: set GITHUB_OWNER + GITHUB_REPO (or GITHUB_REPO=owner/repo)" },
        { status: 400 },
      );
    }

    // Placeholder: if you later want to persist to GitHub, implement here.
    return NextResponse.json({
      ok: false,
      mode: "github",
      error: "GitHub mode not implemented in this route yet.",
      repo: parts,
    });
  }

  return NextResponse.json(
    { ok: false, error: `Unknown mode: ${mode}` },
    { status: 400 },
  );
}
