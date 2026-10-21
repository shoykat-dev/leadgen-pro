import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

console.log("=====================================================");
console.log("  Overture Maps Places Importer (Node.js)");
console.log("  License: CDLA-Permissive-2.0 / ODbL");
console.log("=====================================================");

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "leadgen.db");
const db = new DatabaseSync(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS overture_places (
    id TEXT PRIMARY KEY,
    gers_id TEXT,
    name TEXT NOT NULL,
    category TEXT,
    categories TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    phones TEXT,
    emails TEXT,
    websites TEXT,
    socials TEXT,
    facebook_url TEXT,
    address_freeform TEXT,
    locality TEXT,
    region TEXT,
    postcode TEXT,
    country TEXT,
    operating_status TEXT,
    confidence REAL,
    sources TEXT,
    sources_json TEXT,
    release_version TEXT,
    release_tag TEXT,
    imported_at TEXT,
    last_seen_release TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_overture_places_lat_lon ON overture_places(lat, lon);
`);

const extraCols = ["gers_id", "category", "facebook_url", "address_freeform", "locality", "region", "postcode", "country", "operating_status", "confidence", "sources_json", "release_tag", "imported_at", "last_seen_release"];
for (const col of extraCols) {
  try { db.exec(`ALTER TABLE overture_places ADD COLUMN ${col} TEXT;`); } catch {}
}

const seedPath = path.join(process.cwd(), "data", "overture_places_bd.json");
if (!fs.existsSync(seedPath)) {
  console.error(`[-] Seed file not found at ${seedPath}`);
  process.exit(1);
}

const rawJson = fs.readFileSync(seedPath, "utf-8");
const places = JSON.parse(rawJson);

const beforeRow = db.prepare("SELECT COUNT(*) as count FROM overture_places").get();
const beforeCount = beforeRow ? beforeRow.count : 0;
console.log(`[*] Places currently in local database: ${beforeCount}`);
console.log(`[*] Processing ${places.length} Overture Places for Bangladesh...`);

const insertStmt = db.prepare(`
  INSERT INTO overture_places (
    id, gers_id, name, category, categories, lat, lon, phones, emails, websites, socials, facebook_url,
    address_freeform, locality, region, postcode, country, operating_status, confidence,
    sources, sources_json, release_version, release_tag, imported_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    gers_id = excluded.gers_id,
    name = excluded.name,
    category = excluded.category,
    categories = excluded.categories,
    lat = excluded.lat,
    lon = excluded.lon,
    phones = excluded.phones,
    emails = excluded.emails,
    websites = excluded.websites,
    socials = excluded.socials,
    facebook_url = excluded.facebook_url,
    address_freeform = excluded.address_freeform,
    locality = excluded.locality,
    region = excluded.region,
    postcode = excluded.postcode,
    country = excluded.country,
    operating_status = excluded.operating_status,
    confidence = excluded.confidence,
    sources = excluded.sources,
    sources_json = excluded.sources_json,
    release_version = excluded.release_version,
    release_tag = excluded.release_tag,
    imported_at = excluded.imported_at,
    updated_at = excluded.updated_at
`);

const nowIso = new Date().toISOString();

for (const p of places) {
  const fb = (p.socials || []).find((s) => s.toLowerCase().includes("facebook.com") || s.toLowerCase().includes("fb.com")) || null;
  const freeform = p.addresses?.[0]?.freeform || null;
  const locality = p.addresses?.[0]?.locality || null;
  const region = p.addresses?.[0]?.region || null;
  const postcode = p.addresses?.[0]?.postcode || null;
  const country = p.addresses?.[0]?.country || "BD";
  const primaryCat = p.categories?.[0] || null;

  insertStmt.run(
    p.id,
    p.id,
    p.name,
    primaryCat,
    JSON.stringify(p.categories || []),
    p.lat,
    p.lon,
    JSON.stringify(p.phones || []),
    JSON.stringify(p.emails || []),
    JSON.stringify(p.websites || []),
    JSON.stringify(p.socials || []),
    fb,
    freeform,
    locality,
    region,
    postcode,
    country,
    "open",
    1.0,
    JSON.stringify(p.sources || []),
    JSON.stringify(p.sources || []),
    p.release_version || "2024-09-18.0",
    p.release_version || "2024-09-18.0",
    nowIso,
    p.updated_at || nowIso
  );
}

const afterRow = db.prepare("SELECT COUNT(*) as count FROM overture_places").get();
const afterCount = afterRow ? afterRow.count : 0;

console.log("-----------------------------------------------------");
console.log(`  [RESULT] Count before:     ${beforeCount}`);
console.log(`  [RESULT] Items processed:  ${places.length}`);
console.log(`  [RESULT] Count after:      ${afterCount}`);
console.log(`  [RESULT] Duplicates added: 0 (INSERT OR REPLACE)`);
console.log("  [SUCCESS] Database updated with official Overture Places.");
console.log("=====================================================");
