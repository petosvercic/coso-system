import { notFound } from "next/navigation";
import path from "path";
import fs from "fs/promises";

export default async function EditionPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const editionsDir = path.join(
    process.cwd(),
    "apps/nevedelE/data/editions"
  );

  const filePath = path.join(editionsDir, `${slug}.json`);

  let edition: any = null;

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    edition = JSON.parse(raw);
  } catch (e) {
    notFound();
  }

  if (!edition) notFound();

  return (
    <main>
      <h1>{edition.title}</h1>
      {/* zvyšok renderu nechaj tak */}
    </main>
  );
}
