import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type EditionIndexEntry = {
  slug: string;
  title: string;
  createdAt?: string;
};

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
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Edície (nasadené weby)</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>index: {idxPath}</p>

      {editions.length === 0 ? (
        <p style={{ opacity: 0.75 }}>Zatiaľ nič. Keď Builder pridá edíciu, objaví sa tu.</p>
      ) : (
        <ul style={{ lineHeight: 1.8 }}>
          {editions.map((e) => (
            <li key={e.slug}>
              <a href={\/e/\\}>{e.title}</a>{" "}
              <small style={{ opacity: 0.7 }}>
                ({e.slug}{e.createdAt ? \, \\ : ""})
              </small>
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: 16 }}>
        <a href="/">späť</a>
      </p>
    </main>
  );
}