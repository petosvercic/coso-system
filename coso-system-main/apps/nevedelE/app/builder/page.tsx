import fs from "node:fs";
import path from "node:path";
import BuilderClient from "./ui";

type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function readJsonNoBom(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

export default function BuilderPage() {
  const idxPath = path.join(process.cwd(), "data", "editions.json");

  let editions: EditionIndexEntry[] = [];
  try {
    const idx = readJsonNoBom(idxPath);
    editions = Array.isArray(idx?.editions) ? idx.editions : [];
  } catch {
    editions = [];
  }

  return <BuilderClient editions={editions} />;
}
