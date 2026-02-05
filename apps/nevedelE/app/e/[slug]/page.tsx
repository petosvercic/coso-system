import { notFound } from "next/navigation";
import EditionClient from "./ui";
import path from "node:path";
import fs from "node:fs";

export const dynamic = "force-dynamic";

function loadEdition(slug: string) {
  const base = process.cwd();
  const p1 = path.join(base, "apps/nevedelE/editions", `${slug}.json`);
  const p2 = path.join(base, "editions", `${slug}.json`);

  const file = fs.existsSync(p1) ? p1 : fs.existsSync(p2) ? p2 : null;
  if (!file) return null;

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export default function Page({ params }: { params: { slug: string } }) {
  const edition = loadEdition(params.slug);
  if (!edition) notFound();

  return <EditionClient slug={params.slug} edition={edition} />;
}
