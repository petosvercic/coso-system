export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>nevedelE</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Produktova appka (monorepo) - UI skeleton.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <a href="/list">Zoznamy</a>
        <a href="/builder">Builder</a>
      </div>
      <hr style={{ margin: "24px 0" }} />
      <p style={{ opacity: 0.7 }}>API sanity: /api/compute</p>
    </main>
  );
}
