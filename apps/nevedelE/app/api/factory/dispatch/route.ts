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



function ghHeaders(token: string) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
    "content-type": "application/json",
  };
}

async function ghGetContent(args: { owner: string; repo: string; token: string; path: string; ref: string }) {
  const u = `https://api.github.com/repos/${args.owner}/${args.repo}/contents/${args.path}?ref=${encodeURIComponent(args.ref)}`;
  const res = await fetch(u, { headers: ghHeaders(args.token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GITHUB_CONTENT_GET_FAILED:${res.status}`);
  const json: any = await res.json();
  const content = typeof json?.content === "string" ? Buffer.from(json.content.replace(/\n/g, ""), "base64").toString("utf8") : "";
  return { sha: String(json?.sha || ""), content };
}

async function ghPutContent(args: {
  owner: string;
  repo: string;
  token: string;
  path: string;
  ref: string;
  message: string;
  content: string;
  sha?: string;
}) {
  const u = `https://api.github.com/repos/${args.owner}/${args.repo}/contents/${args.path}`;
  const body: any = {
    message: args.message,
    branch: args.ref,
    content: Buffer.from(args.content, "utf8").toString("base64"),
  };
  if (args.sha) body.sha = args.sha;

  const res = await fetch(u, {
    method: "PUT",
    headers: ghHeaders(args.token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GITHUB_CONTENT_PUT_FAILED:${res.status}:${text.slice(0, 200)}`);
  }
}

async function persistEditionInGithub(args: { owner: string; repo: string; token: string; ref: string; edition: any }) {
  const now = new Date().toISOString();
  const edition = { ...args.edition, createdAt: args.edition.createdAt || now };
  const slug = String(edition.slug);

  const idxPath = "apps/nevedelE/data/editions.json";
  const edPath = `apps/nevedelE/data/editions/${slug}.json`;

  const idxCurrent = await ghGetContent({ ...args, path: idxPath });
  const idxSha = idxCurrent?.sha;
  let idx: any = { editions: [] };

  if (idxCurrent?.content) {
    try {
      idx = JSON.parse(idxCurrent.content.replace(/^﻿/, ""));
    } catch {
      idx = { editions: [] };
    }
  }
  if (!Array.isArray(idx.editions)) idx.editions = [];
  if (!idx.editions.some((e: any) => e?.slug === slug)) {
    idx.editions.unshift({ slug, title: String(edition.title || slug), createdAt: edition.createdAt });
  }

  await ghPutContent({
    ...args,
    path: idxPath,
    sha: idxSha,
    message: `chore(factory): update index for ${slug}`,
    content: JSON.stringify(idx, null, 2) + "\n",
  });

  const existingEdition = await ghGetContent({ ...args, path: edPath });
  await ghPutContent({
    ...args,
    path: edPath,
    sha: existingEdition?.sha,
    message: `chore(factory): add edition ${slug}`,
    content: JSON.stringify(edition, null, 2) + "\n",
  });
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
    const rawEditionJsonInput = (body as any)?.rawEditionJson;
    const rawEditionJson = typeof rawEditionJsonInput === "string" ? rawEditionJsonInput : rawEditionJsonInput ? JSON.stringify(rawEditionJsonInput) : "";
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
      const isTooLarge = res.status === 422 && /inputs are too large/i.test(text);

      if (isTooLarge) {
        try {
          await persistEditionInGithub({ owner, repo, token, ref, edition });
          return NextResponse.json(
            {
              ok: true,
              slug: edition.slug,
              mode: "github-contents-fallback",
              message: "Workflow inputs too large; persisted directly via GitHub Contents API.",
            },
            { status: 200 }
          );
        } catch (e: any) {
          return NextResponse.json(
            {
              ok: false,
              error: "GITHUB_FALLBACK_PERSIST_FAILED",
              status: res.status,
              message: `${text.slice(0, 300)} | fallback: ${String(e?.message ?? e)}`,
            },
            { status: 500 }
          );
        }
      }

      return NextResponse.json(
        { ok: false, error: "GITHUB_DISPATCH_FAILED", status: res.status, message: text.slice(0, 500) },
        { status: 500 }
      );
    }

    const runUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflow}`;
    return NextResponse.json({ ok: true, runUrl, slug: edition.slug, mode: "workflow-dispatch" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: String(e?.message ?? e) }, { status: 500 });
  }
}
