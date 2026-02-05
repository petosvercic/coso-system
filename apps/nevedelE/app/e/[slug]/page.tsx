export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import EditionClient from "./ui";

function readJsonNoBom(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function findEditionFile(slug: string): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "editions", `${slug}.json`),
    path.join(cwd, "..", "..", "packages", "coso-factory", "editions", `${slug}.json`),
    path.join(cwd, "..", "..", "editions", `${slug}.json`),
    path.join(cwd, "..", "..", "..", "packages", "coso-factory", "editions", `${slug}.json`),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch {}
  }
  return null;
}

export default function EditionPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug;
  if (!slug) return notFound();

  const file = findEditionFile(slug);
  if (!file) return notFound();

  const edition = readJsonNoBom(file);

  return <EditionClient slug={slug} edition={edition} />;
}