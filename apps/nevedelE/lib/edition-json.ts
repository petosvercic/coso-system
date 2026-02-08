export type EditionPayload = {
  slug: string;
  title: string;
  content: Record<string, any>;
  [k: string]: any;
};

function sanitizeRaw(raw: string) {
  return String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B\u200C\u200D\u2060]/g, "")
    .trim();
}

function unwrapCodeFence(input: string) {
  const fence = input.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  return fence ? fence[1].trim() : input;
}

function extractJSONObject(input: string) {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return input;
  return input.slice(start, end + 1);
}

export function normalizeEditionJsonRaw(raw: string) {
  const base = sanitizeRaw(raw);
  const noFence = unwrapCodeFence(base);
  return extractJSONObject(noFence).trim();
}

export function validateEditionJson(raw: string, existingSlugs: string[] = []) {
  const normalized = normalizeEditionJsonRaw(raw);
  let obj: any;

  try {
    obj = JSON.parse(normalized);
  } catch (e: any) {
    return {
      ok: false as const,
      error: "INVALID_JSON",
      details: String(e?.message ?? e),
      debug: {
        rawStart: String(raw ?? "").slice(0, 120),
        normalizedStart: normalized.slice(0, 120),
        foundRootKeys: [],
      },
    };
  }

  const foundRootKeys = obj && typeof obj === "object" && !Array.isArray(obj) ? Object.keys(obj) : [];

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false as const, error: "NOT_OBJECT", debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  }
  if (typeof obj.slug !== "string" || !obj.slug.trim()) {
    return { ok: false as const, error: "MISSING_SLUG", debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  }
  if (typeof obj.title !== "string" || !obj.title.trim()) return { ok: false as const, error: "MISSING_TITLE", debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  if (!obj.content || typeof obj.content !== "object" || Array.isArray(obj.content)) {
    return { ok: false as const, error: "MISSING_CONTENT_OBJECT" };
  }

  const slug = obj.slug.trim();
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) return { ok: false as const, error: "BAD_SLUG", details: slug, debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };
  if (existingSlugs.includes(slug)) return { ok: false as const, error: "DUPLICATE_SLUG", details: slug, debug: { foundRootKeys, normalizedStart: normalized.slice(0, 120) } };

  return { ok: true as const, obj: { ...obj, slug, title: obj.title.trim() } as EditionPayload };
}
