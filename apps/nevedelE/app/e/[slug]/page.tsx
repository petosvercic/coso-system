import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { notFound, redirect } from "next/navigation";
import EditionClient from "./ui";

export const dynamic = "force-dynamic";

type Edition = any;

function readJsonNoBom(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

export default function EditionPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { rid?: string };
}) {
  const slug = String(params?.slug ?? "");
  if (!slug) notFound();

  const rid = (searchParams?.rid ?? "").trim();
  if (!rid) {
    const newRid = crypto.randomUUID();
    redirect(`/e/${encodeURIComponent(slug)}?rid=${encodeURIComponent(newRid)}`);
  }

  const edPath = path.join(process.cwd(), "data", "editions", `${slug}.json`);
  if (!fs.existsSync(edPath)) notFound();

  const edition: Edition = readJsonNoBom(edPath);

  return <EditionClient slug={slug} rid={rid} edition={edition} />;
}
