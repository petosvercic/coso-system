import fs from "node:fs";
import path from "node:path";

function fail(msg) { console.error(msg); process.exit(1); }

const raw0 = process.env.EDITION_JSON;
if (!raw0) fail("Missing EDITION_JSON");

// make it very hard to break JSON.parse with invisible garbage
const raw = String(raw0)
  .replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, "") // BOM + zero-width junk
  .trim();

let edition;
try {
  edition = JSON.parse(raw);
} catch (e) {
  console.error("EDITION_JSON (first 80 chars):", raw.slice(0, 80));
  fail("EDITION_JSON is not valid JSON");
}

// Expected minimal shape:
// { "slug": "...", "title": "...", "content": {...} }
if (!edition || typeof edition !== "object") fail("Edition JSON must be an object");
if (!edition.slug || !edition.title || !edition.content) {
  fail("Edition JSON must include: slug, title, content");
}

const root = "apps/nevedelE/data";
const idxPath = path.join(root, "editions.json");
const dir = path.join(root, "editions");
fs.mkdirSync(dir, { recursive: true });

if (!fs.existsSync(idxPath)) {
  fail("Missing editions.json at " + idxPath);
}

const idx = JSON.parse(fs.readFileSync(idxPath, "utf8"));
idx.editions ||= [];

if (idx.editions.some(e => e.slug === edition.slug)) {
  fail("Duplicate slug: " + edition.slug);
}

const now = new Date().toISOString();
const entry = { slug: edition.slug, title: edition.title, createdAt: now };

idx.editions.unshift(entry);
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2) + "\n", "utf8");

const edPath = path.join(dir, `${edition.slug}.json`);
fs.writeFileSync(edPath, JSON.stringify({ ...edition, createdAt: now }, null, 2) + "\n", "utf8");

console.log("OK: appended edition", edition.slug);
