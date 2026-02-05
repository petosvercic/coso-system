export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "node:fs";
import path from "node:path";

type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function readJsonNoBom(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function findEditionsDir(): string | null {
  const cwd = process.cwd(); // na Verceli typicky apps/nevedelE
  const candidates = [
    path.join(cwd, "editions"),
    path.join(cwd, "..", "..", "packages", "coso-factory", "editions"),
    path.join(cwd, "..", "..", "editions"),
    path.join(cwd, "..", "..", "..", "packages", "coso-factory", "editions"),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {}
  }
  return null;
}

function loadEditions(): EditionIndexEntry[] {
  const dir = findEditionsDir();
  if (!dir) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const out: EditionIndexEntry[] = [];

  for (const f of files) {
    try {
      const slug = f.replace(/\.json$/, "");
      const full = path.join(dir, f);
      const j = readJsonNoBom(full);
      out.push({
        slug,
        title: String(j?.title ?? slug),
        createdAt: j?.createdAt ? String(j.createdAt) : undefined,
      });
    } catch {}
  }

  out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || a.slug.localeCompare(b.slug));
  return out;
}

export default function ListPage() {
  const editions = loadEditions();

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 34, marginBottom: 10 }}>Edície</h1>
      <p style={{ opacity: 0.7, marginTop: 0, marginBottom: 24 }}>
        Klikni na edíciu. (Áno, je to naozaj celé.)
      </p>

      {editions.length === 0 ? (
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12, background: "#fafafa" }}>
          Nenašiel som žiadne edície (.json). Skontroluj, či existuje priečinok <code>packages/coso-factory/editions</code>.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {editions.map((e) => (
            <li key={e.slug} style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
              <a href={`/e/${e.slug}`} style={{ fontSize: 18, fontWeight: 650, textDecoration: "none" }}>
                {e.title}
              </a>
              <div style={{ opacity: 0.65, marginTop: 6, fontSize: 13 }}>
                <code>{e.slug}</code>
                {e.createdAt ? <> • {e.createdAt}</> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}