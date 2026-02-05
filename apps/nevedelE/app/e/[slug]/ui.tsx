"use client";

export default function EditionClient({
  slug,
  edition,
}: {
  slug: string;
  edition: any;
}) {
  return (
    <main style={{ padding: 40 }}>
      <h1>{edition.title ?? slug}</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(edition.content ?? edition, null, 2)}
      </pre>
    </main>
  );
}
