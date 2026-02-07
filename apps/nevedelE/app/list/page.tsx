import fs from "node:fs";
import path from "node:path";

type EditionIndexEntry = {
  slug: string;
  title: string;
  createdAt?: string;
};

function readJsonNoBom(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
}

export default function Page() {
  const base = path.join(process.cwd(), "data", "editions");
  const editions: EditionIndexEntry[] = fs.existsSync(base)
    ? fs.readdirSync(base)
        .filter(f => f.endsWith(".json"))
        .map(f => {
          const j = readJsonNoBom(path.join(base, f));
          return { slug: f.replace(/\.json$/, ""), title: j.title || f };
        })
    : [];

  return (
    <main style={{ padding: 24 }}>
      <h1>Edície</h1>
      <ul>
        {editions.map(e => (
          <li key={e.slug}>
            <a href={`/e/${e.slug}`}>{e.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}