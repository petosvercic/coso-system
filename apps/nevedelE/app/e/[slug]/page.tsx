import { redirect } from "next/navigation";
import EditionClient from "./ui";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type Edition = {
  title?: string;
  engine?: { locale?: string };
  content?: any;
};

function readJsonNoBom(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function findEditionJson(slug: string) {
  // try repo root editions first, then app-local editions
  const candidates = [
    path.join(process.cwd(), "editions", `${slug}.json`),
    path.join(process.cwd(), "apps", "nevedelE", "editions", `${slug}.json`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function makeRid(slug: string) {
  // stable enough; only generated once per "first entry" then persisted in URL
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${slug}-${Date.now()}`;
}

export default function Page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { rid?: string; session_id?: string };
}) {
  const slug = params.slug;
  const rid = searchParams?.rid;

  // IMPORTANT: ensure rid is always present in URL (survives refresh + stripe return)
  if (!rid) {
    const nextRid = makeRid(slug);
    redirect(`/e/${encodeURIComponent(slug)}?rid=${encodeURIComponent(nextRid)}`);
  }

  const editionPath = findEditionJson(slug);
  if (!editionPath) {
    redirect("/list");
  }

  const edition = readJsonNoBom(editionPath) as Edition;

  return <EditionClient slug={slug} rid={rid} edition={edition} />;
}