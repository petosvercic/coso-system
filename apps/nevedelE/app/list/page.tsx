import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type EditionIndexEntry = { slug: string; title: string; createdAt?: string };

function readJsonNoBom(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function safeListEditions(): EditionIndexEntry[] {
  const dir = path.join(process.cwd(), "data", "editions");
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const out: EditionIndexEntry[] = [];

  for (const f of files) {
    try {
      const p = path.join(dir, f);
      const j = readJsonNoBom(p);
      const slug = String(j?.slug ?? f.replace(/\.json$/, ""));
      const title = String(j?.title ?? slug);
      const createdAt = j?.createdAt ? String(j.createdAt) : undefined;
      out.push({ slug, title, createdAt });
    } catch {
      // ignore broken json
    }
  }

  out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return out;
}

export default function Page() {
  const editions = safeListEditions();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 980 }}>
      <h1 style={{ fontSize: 28, marginTop: 0 }}>Edície</h1>

      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Toto je verejný zoznam hotových edícií (produktové stránky).
      </p>

      <p style={{ marginTop: 10 }}>
        <a href="/builder">→ Builder</a>
      </p>

      {editions.length ? (
        <ul style={{ display: "grid", gap: 10, paddingLeft: 18 }}>
          {editions.map((e) => (
            <li key={e.slug}>
              <a href={/e/}>{e.title}</a>{" "}
              <small style={{ opacity: 0.7 }}>
                ({e.slug}{e.createdAt ? ,  : ""})
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ opacity: 0.7 }}>Zatiaľ žiadne edície. Postav prvú v Builderi.</p>
      )}
    </main>
  );
}