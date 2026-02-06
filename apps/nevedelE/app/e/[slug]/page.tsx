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
  const base = process.cwd();

  // správne miesto (tvoje reálne dáta)
  const pData1 = path.join(base, "apps", "nevedelE", "data", "editions", `${slug}.json`);
  const pData2 = path.join(base, "data", "editions", `${slug}.json`);

  // legacy fallback (ak by si to niekde ešte mal)
  const pLegacy1 = path.join(base, "apps", "nevedelE", "editions", `${slug}.json`);
  const pLegacy2 = path.join(base, "editions", `${slug}.json`);

  const file =
    (fs.existsSync(pData1) && pData1) ||
    (fs.existsSync(pData2) && pData2) ||
    (fs.existsSync(pLegacy1) && pLegacy1) ||
    (fs.existsSync(pLegacy2) && pLegacy2) ||
    null;

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
