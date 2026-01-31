import fs from "node:fs";
import path from "node:path";

function fail(msg) { console.error(msg); process.exit(1); }

const raw = process.env.EDITION_JSON;
if (!raw) fail("Missing EDITION_JSON");

let edition;
try { edition = JSON.parse(raw); } catch { fail("EDITION_JSON is not valid JSON"); }

/**
 * Expected minimal shape from LLM:
 * {
 *   "slug": "chemia-2026-02",
 *   "title": "Chémia po čínsky – edícia Feb 2026",
 *   "prompt_fixed": "...(the fixed prompt base)...",
 *   "content": { ... arbitrary texts/params for template ... }
 * }
 */
if (!edition.slug || !edition.title || !edition.content) {
  fail("Edition JSON must include: slug, title, content");
}

const root = "apps/nevedelE/data";
const idxPath = path.join(root, "editions.json");
const dir = path.join(root, "editions");
fs.mkdirSync(dir, { recursive: true });

const idx = JSON.parse(fs.readFileSync(idxPath, "utf8"));
idx.editions ||= [];

if (idx.editions.some(e => e.slug === edition.slug)) {
  fail("Duplicate slug: " + edition.slug);
}

const now = new Date().toISOString();
const entry = {
  slug: edition.slug,
  title: edition.title,
  createdAt: now
};

idx.editions.unshift(entry);
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2) + "\n", "utf8");

const edPath = path.join(dir, `${edition.slug}.json`);
fs.writeFileSync(edPath, JSON.stringify({ ...edition, createdAt: now }, null, 2) + "\n", "utf8");

console.log("OK: appended edition", edition.slug);
