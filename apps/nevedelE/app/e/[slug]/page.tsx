import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";

function readJsonNoBom(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

// Next 16: params can be a Promise -> await it
export default async function EditionPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const p: any = await (params as any);
  const slug = String(p?.slug ?? "");

  const edPath = path.join(process.cwd(), "data", "editions", `${slug}.json`);
  if (!slug || !fs.existsSync(edPath)) notFound();

  const ed = readJsonNoBom(edPath);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <p style={{ marginBottom: 12 }}>
        <a href="/list">späť na edície</a>
      </p>

      <h1 style={{ fontSize: 32, marginBottom: 8 }}>{ed?.title ?? slug}</h1>
      <p style={{ opacity: 0.7, marginBottom: 16 }}>
        slug: <code>{slug}</code>
      </p>

      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Content (raw)</h2>
      <pre style={{ padding: 12, background: "#111", color: "#eee", overflowX: "auto" }}>
        {JSON.stringify(ed?.content ?? {}, null, 2)}
      </pre>
    </main>
  );
}