import fs from "node:fs";
import path from "node:path";
import EditionClient from "./ui";

export const dynamic = "force-dynamic";

type Edition = {
  slug?: string;
  title?: string;
  engine?: { locale?: string };
  content?: any;
  tasks?: any;
};

function loadEdition(slug: string): Edition | null {
  // Vercel/Next runtime: cwd býva root appky (apps/nevedelE)
  const cwd = process.cwd();

  // Ak chceš natvrdo nastaviť root pre editions, dá sa envkou
  const editionsRootEnv = (process.env.EDITIONS_ROOT || "").trim();

  const roots = [
    // 1) explicitné env nastavenie (ak použiješ)
    ...(editionsRootEnv ? [editionsRootEnv] : []),

    // 2) bežný case: app workspace root
    cwd,

    // 3) fallback: ak by cwd bolo repo root alebo niečo iné
    path.resolve(cwd, ".."),
    path.resolve(cwd, "..", ".."),
  ];

  const candidates: string[] = [];
  for (const r of roots) {
    candidates.push(path.join(r, "data", "editions", `${slug}.json`));
    candidates.push(path.join(r, "apps", "nevedelE", "data", "editions", `${slug}.json`)); // legacy fallback
    candidates.push(path.join(r, "editions", `${slug}.json`)); // legacy fallback
  }

  const file = candidates.find((p) => fs.existsSync(p)) ?? null;
  if (!file) return null;

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error("Failed to parse edition JSON:", file, e);
    return null;
  }
}


export default function Page({ params }: { params: { slug: string } }) {
  const slug = params?.slug || "";
  const edition = loadEdition(slug);

  if (!edition) {
    return (
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "56px 18px 120px", fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 28, margin: "0 0 10px" }}>404</h1>
        <p style={{ opacity: 0.75, margin: 0 }}>
          Edícia <b>{slug}</b> neexistuje alebo sa nedá načítať.
        </p>
      </main>
    );
  }

  return <EditionClient slug={slug} edition={edition} />;
}
