export const dynamic = "force-dynamic";

import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { validateEditionJson } from "../../../../lib/edition-json";
import { getDataPaths, listEditions } from "../../../../lib/editions-store";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function persistEditionLocally(edition: any) {
  const { indexPath, editionsDir } = getDataPaths();
  fs.mkdirSync(editionsDir, { recursive: true });

  const now = new Date().toISOString();
  const normalizedEdition = { ...edition, createdAt: edition.createdAt || now };
  const edPath = path.join(editionsDir, `${edition.slug}.json`);
  fs.writeFileSync(edPath, JSON.stringify(normalizedEdition, null, 2) + "\n", "utf8");

  let idx: any = { editions: [] };
  if (fs.existsSync(indexPath)) {
    idx = JSON.parse(fs.readFileSync(indexPath, "utf8").replace(/^\uFEFF/, ""));
  }
  if (!Array.isArray(idx.editions)) idx.editions = [];

  if (!idx.editions.some((e: any) => e?.slug === edition.slug)) {
    idx.editions.unshift({ slug: edition.slug, title: edition.title, createdAt: normalizedEdition.createdAt });
  }

  fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2) + "\n", "utf8");
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
      return NextResponse.json({ ok: false, error: validated.error, details: (validated as any).details, debug: (validated as any).debug }, { status: 400 });
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
