import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import EditionClient from "./ui";

function readJsonNoBom(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

export const dynamic = "force-dynamic";

export default async function EditionPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const p: any = await (params as any);
  const slug = String(p?.slug ?? "");

  const edPath = path.join(process.cwd(), "data", "editions", `${slug}.json`);
  if (!slug || !fs.existsSync(edPath)) notFound();

  const edition = readJsonNoBom(edPath);

  return <EditionClient slug={slug} edition={edition} />;
}