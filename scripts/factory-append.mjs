import fs from "node:fs";
import path from "node:path";

function fail(msg) {
  console.error("FACTORY-APPEND ERROR:", msg);
  process.exit(1);
}

// --- 1) read + sanitize input ------------------------------------------------

const raw0 = process.env.EDITION_JSON;
if (!raw0) fail("Missing EDITION_JSON env var");

// Make it very hard to break JSON.parse with invisible garbage.
// - \uFEFF = BOM
// - \u200B-\u200D = zero-width space / joiners
// - \u2060 = word joiner
const raw = String(raw0)
  .replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, "")
  .trim();

// Optional: help debug when someone passes garbage
if (!raw.startsWith("{") && !raw.startsWith("[")) {
  console.error("EDITION_JSON first 120 chars:", raw.slice(0, 120));
  fail("EDITION_JSON does not look like JSON (must start with '{' or '[')");
}

// --- 2) parse JSON -----------------------------------------------------------

let edition;
try {
  edition = JSON.parse(raw);
} catch (e) {
  console.error("EDITION_JSON first 120 chars:", raw.slice(0, 120));
  console.error("JSON.parse error:", e?.message || String(e));
  fail("EDITION_JSON is not valid JSON");
}

// --- 3) validate minimal shape ----------------------------------------------
// Expected minimal shape:
// { "slug": "...", "title": "...", "content": {...} }

if (!edition || typeof edition !== "object" || Array.isArray(edition)) {
  fail("Edition JSON must be an object");
}

if (typeof edition.slug !== "string" || !edition.slug.trim()) {
  fail("Edition JSON must include non-empty string: slug");
}

if (typeof edition.title !== "string" || !edition.title.trim()) {
  fail("Edition JSON must include non-empty string: title");
}

if (!edition.content || typeof edition.content !== "object" || Array.isArray(edition.content)) {
  fail("Edition JSON must include object: content");
}

// Basic slug safety (file name + URL safe enough)
const slug = edition.slug.trim();
if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
  fail(
    `Invalid slug "${slug}". Use lowercase letters/numbers and hyphens only, 3-64 chars, no leading/trailing hyphen.`
  );
}

// --- 4) write into registry --------------------------------------------------

const root = path.join("apps", "nevedelE", "data");
const idxPath = path.join(root, "editions.json");
const dir = path.join(root, "editions");

fs.mkdirSync(dir, { recursive: true });

if (!fs.existsSync(idxPath)) {
  fail("Missing editions.json at " + idxPath);
}

let idx;
try {
  idx = JSON.parse(fs.readFileSync(idxPath, "utf8"));
} catch (e) {
  fail("editions.json exists but is not valid JSON: " + (e?.message || String(e)));
}

if (!idx || typeof idx !== "object" || Array.isArray(idx)) {
  fail("editions.json must be an object");
}

idx.editions ||= [];
if (!Array.isArray(idx.editions)) {
  fail("editions.json field 'editions' must be an array");
}

if (idx.editions.some((e) => e && typeof e === "object" && e.slug === slug)) {
  fail("Duplicate slug: " + slug);
}

const now = new Date().toISOString();
const entry = { slug, title: edition.title.trim(), createdAt: now };

// prepend newest
idx.editions.unshift(entry);

// Write index
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2) + "\n", "utf8");

// Write full edition file
const edPath = path.join(dir, `${slug}.json`);
fs.writeFileSync(
  edPath,
  JSON.stringify({ ...edition, slug, title: edition.title.trim(), createdAt: now }, null, 2) + "\n",
  "utf8"
);

console.log("OK: appended edition", slug);
console.log("Index:", idxPath);
console.log("Edition:", edPath);
