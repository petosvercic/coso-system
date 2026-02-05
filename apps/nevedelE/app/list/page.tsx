import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type Entry = { slug: string; title?: string };

export default function ListPage() {
  const base = process.cwd();
  const dir = path.join(base, "apps/nevedelE/editions");

  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.endsWith(".json"))
    : [];

  const items: Entry[] = files.map(f => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    return { slug: f.replace(".json", ""), title: j.title };
  });

  return (
    <main style={{ padding: 40 }}>
      <h1>Edície</h1>
      <ul>
        {items.map(e => (
          <li key={e.slug}>
            <a href={`/e/${e.slug}`}>{e.title ?? e.slug}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
