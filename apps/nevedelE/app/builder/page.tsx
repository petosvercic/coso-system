"use client";

import { useState } from "react";

export default function BuilderPage() {
  const [prompt, setPrompt] = useState("");

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Builder</h1>
      <p style={{ opacity: 0.8, marginBottom: 12 }}>
        Prompt + flow pre generovanie web-app (zatial skeleton).
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={6}
        style={{ width: "100%", maxWidth: 720, padding: 12 }}
        placeholder="Napis co ma web robit"
      />
      <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
        <button onClick={() => alert("TODO: napojit na /api/compute")}>
          Generate
        </button>
        <a href="/">spat</a>
      </div>
    </main>
  );
}
