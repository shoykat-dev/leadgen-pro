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
    name TEXT NOT NULL,
    categories TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    phones TEXT,
    emails TEXT,
    websites TEXT,
    socials TEXT,
    addresses TEXT,
    sources TEXT,
    release_version TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_overture_places_lat_lon ON overture_places(lat, lon);
`);

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
    id, name, categories, lat, lon, phones, emails, websites, socials, addresses, sources, release_version, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    categories = excluded.categories,
    lat = excluded.lat,
    lon = excluded.lon,
    phones = excluded.phones,
    emails = excluded.emails,
    websites = excluded.websites,
    socials = excluded.socials,
    addresses = excluded.addresses,
    sources = excluded.sources,
    release_version = excluded.release_version,
    updated_at = excluded.updated_at
`);

const nowIso = new Date().toISOString();

for (const p of places) {
  insertStmt.run(
    p.id,
    p.name,
    JSON.stringify(p.categories || []),
    p.lat,
    p.lon,
    JSON.stringify(p.phones || []),
    JSON.stringify(p.emails || []),
    JSON.stringify(p.websites || []),
    JSON.stringify(p.socials || []),
    JSON.stringify(p.addresses || []),
    JSON.stringify(p.sources || []),
    p.release_version || "2024-09-18.0",
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
