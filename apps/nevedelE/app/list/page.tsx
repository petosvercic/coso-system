// /apps/nevedelE/app/list/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

const EDITIONS = [
  { slug: "demo-odomykanie", title: "Demo odomykanie 5×25" },
];

export default function ListPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 18px", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>Zoznam edícií</h1>

      <div style={{ display: "grid", gap: 10 }}>
        {EDITIONS.map((e) => (
          <Link
            key={e.slug}
            href={`/e/${e.slug}`}
            style={{
              display: "block",
              padding: 16,
              border: "1px solid #e7e7e7",
              borderRadius: 14,
              textDecoration: "none",
              color: "#111",
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 700 }}>{e.title}</div>
            <div style={{ opacity: 0.65, fontSize: 13 }}>/e/{e.slug}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
