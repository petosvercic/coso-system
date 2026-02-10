export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateEditionJson } from "../../../../lib/edition-json";
import { listEditions, persistEditionLocally } from "../../../../lib/editions-store";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}


export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const rawEditionJson = String((body as any)?.rawEditionJson ?? "");
    const editionInBody = (body as any)?.edition;

    const validated = validateEditionJson(
      rawEditionJson || JSON.stringify(editionInBody ?? {}),
      listEditions().map((e) => e.slug)
    );

    if (!validated.ok) {
      console.error("dispatch validation failed", {
        error: validated.error,
        details: (validated as any).details,
        debug: (validated as any).debug,
      });
      return NextResponse.json({ ok: false, error: validated.error, details: (validated as any).details }, { status: 400 });
    }

    const edition = validated.obj;

    try {
      persistEditionLocally(edition);
    } catch (e: any) {
      console.warn("local persist skipped", String(e?.message ?? e));
    }

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
      body: JSON.stringify({ ref, inputs: { edition_json: JSON.stringify(edition) } }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "GITHUB_DISPATCH_FAILED", status: res.status, message: text.slice(0, 500) },
        { status: 500 }
      );
    }

    const runUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflow}`;
    return NextResponse.json({ ok: true, runUrl, slug: edition.slug }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: String(e?.message ?? e) }, { status: 500 });
  }
}
