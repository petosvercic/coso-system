import fs from "node:fs";
import path from "node:path";

type EditionIndexEntry = {
  slug: string;
  title: string;
  createdAt?: string;
import fs from "node:fs";
import path from "node:path";

type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function readJsonNoBom(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

export default function ListPage() {
  const idxPath = path.join(process.cwd(), "data", "editions.json");
  let editions: EditionIndexEntry[] = [];
  try {
    const idx = readJsonNoBom(idxPath);
    editions = Array.isArray(idx?.editions) ? idx.editions : [];
  } catch {
    editions = [];
  }

  return (
    <main className="min-h-screen p-6 bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-2xl mx-auto rounded-2xl bg-neutral-900 p-6 border border-neutral-800 shadow-xl">
        <h1 className="text-xl font-semibold mb-3">Edície (nasadené weby)</h1>
        <p className="text-neutral-500 mb-4">index: {idxPath}</p>

        {editions.length === 0 ? (
          <p className="text-neutral-400">Zatial nič. Keď workflow pridá edíciu, objaví sa tu.</p>
        ) : (
          <ul className="space-y-2">
            {editions.map((e) => (
              <li key={e.slug}>
                <a href={`/e/${encodeURIComponent(e.slug)}`} className="text-neutral-100 underline">{e.title}</a>{" "}
                <small className="text-neutral-500">
                  ({e.slug}{e.createdAt ? `, ${e.createdAt}` : ""})
                </small>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6">
          <a href="/" className="underline text-neutral-300">späť</a>
        </p>
      </div>
    </main>
  );
}
