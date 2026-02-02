export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type Edition = { slug: string; title: string; content: Record<string, any> };

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const edition: Edition | null =
      body && typeof body === "object" && body !== null && "edition" in (body as any)
        ? (body as any).edition
        : null;

    if (!edition || typeof edition !== "object") {
      return NextResponse.json({ ok: false, error: "MISSING_EDITION" }, { status: 400 });
    }

    if (typeof edition.slug !== "string" || !edition.slug.trim())
      return NextResponse.json({ ok: false, error: "MISSING_SLUG" }, { status: 400 });
    if (typeof edition.title !== "string" || !edition.title.trim())
      return NextResponse.json({ ok: false, error: "MISSING_TITLE" }, { status: 400 });
    if (!edition.content || typeof edition.content !== "object" || Array.isArray(edition.content))
      return NextResponse.json({ ok: false, error: "MISSING_CONTENT_OBJECT" }, { status: 400 });

    const owner = env("GITHUB_OWNER");
    const repo = env("GITHUB_REPO");
    const token = env("GITHUB_TOKEN");

    const workflow = process.env.GITHUB_WORKFLOW ?? "factory.yml";
    const ref = process.env.GITHUB_REF ?? "main";

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ref,
        inputs: { edition_json: JSON.stringify(edition) },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "GITHUB_DISPATCH_FAILED", status: res.status, message: text.slice(0, 500) },
        { status: 500 }
      );
    }

    const runUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflow}`;
    return NextResponse.json({ ok: true, runUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: String(e?.message ?? e) }, { status: 500 });
  }
}
