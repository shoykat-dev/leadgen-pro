// Loads a filtered Overture JSONL export into a Turso (libSQL) database.
//
// Step 1 (extract + filter, on a PC):
//   python scripts/import_overture.py --countries GB,DE,FR --release <RELEASE> --export-jsonl data/overture_eu.jsonl
// Step 2 (this script — credentials from environment variables only, never in code):
//   TURSO_DATABASE_URL=libsql://<your-db>.turso.io TURSO_AUTH_TOKEN=<token> node scripts/load_overture_turso.mjs data/overture_eu.jsonl
//
// The JSONL holds only places with at least one contact signal (phone, email,
// website, or social link) — the filter is applied at extract time, because
// Turso Free allows 5 GB storage and 10M rows written/month and a full
// unfiltered multi-country import would not fit. Import Europe first (the
// target market), then US/CA. Re-runs are idempotent (UPSERT on GERS id).
//
// Requires @libsql/client (already a project dependency).
// No Turso account, database, or token is created by this script.

import fs from "node:fs";
import readline from "node:readline";
import { createClient } from "@libsql/client";

const BATCH_SIZE = 100;

const UPSERT_SQL = `
  INSERT INTO overture_places (
    id, gers_id, name, category, categories, lat, lon,
    phones, emails, websites, socials, facebook_url,
    address_freeform, locality, region, postcode, country,
    operating_status, confidence, sources_json, release_version, release_tag,
    imported_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?
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
    sources_json = excluded.sources_json,
    release_version = excluded.release_version,
    release_tag = excluded.release_tag,
    imported_at = excluded.imported_at,
    updated_at = excluded.updated_at
`;

async function main() {
  const jsonlPath = process.argv[2];
  if (!jsonlPath) {
    console.error("Usage: node scripts/load_overture_turso.mjs <overture.jsonl>");
    process.exit(2);
  }
  if (!fs.existsSync(jsonlPath)) {
    console.error(`[-] File not found: ${jsonlPath}`);
    process.exit(2);
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error(
      "[-] TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must both be set in the environment.\n" +
        "    Create them in the Turso dashboard (database settings -> create token) and\n" +
        "    pass them as env vars — never put credentials in code, config, or docs."
    );
    process.exit(2);
  }

  console.log("=====================================================");
  console.log("  Overture JSONL -> Turso Loader (libSQL)");
  console.log("=====================================================");
  console.log(`  File: ${jsonlPath}`);
  console.log(`  Target: ${url.replace(/\/\/[^.]+\./, "//***.")}`);

  const client = createClient({ url, authToken });

  // Same schema as src/lib/db.ts (overture_places table).
  await client.executeMultiple(`
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

  const before = await client.execute("SELECT COUNT(*) AS count FROM overture_places");
  const countBefore = Number(before.rows[0]?.count || 0);
  console.log(`  Rows before: ${countBefore.toLocaleString()}`);

  const stream = fs.createReadStream(jsonlPath, "utf-8");
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let batch = [];
  let processed = 0;
  let skipped = 0;
  const perCountry = new Map();

  const flush = async () => {
    if (batch.length === 0) return;
    await client.batch(batch);
    processed += batch.length;
    if (processed % 10000 < BATCH_SIZE) {
      console.log(`  ... ${processed.toLocaleString()} rows loaded`);
    }
    batch = [];
  };

  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let p;
    try {
      p = JSON.parse(trimmed);
    } catch {
      skipped++;
      continue;
    }
    if (!p.id || !p.name || typeof p.lat !== "number" || typeof p.lon !== "number") {
      skipped++;
      continue;
    }
    perCountry.set(p.country || "(blank)", (perCountry.get(p.country || "(blank)") || 0) + 1);
    batch.push({
      sql: UPSERT_SQL,
      args: [
        p.id,
        p.gers_id || p.id,
        p.name,
        p.category || "",
        JSON.stringify(p.categories || []),
        p.lat,
        p.lon,
        JSON.stringify(p.phones || []),
        JSON.stringify(p.emails || []),
        JSON.stringify(p.websites || []),
        JSON.stringify(p.socials || []),
        p.facebook_url || null,
        p.address_freeform || null,
        p.locality || null,
        p.region || null,
        p.postcode || null,
        p.country || null,
        p.operating_status || "open",
        typeof p.confidence === "number" ? p.confidence : 1.0,
        p.sources_json || "[]",
        p.release_tag || "latest",
        p.release_tag || "latest",
        p.imported_at || new Date().toISOString(),
        p.updated_at || new Date().toISOString(),
      ],
    });
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  const after = await client.execute("SELECT COUNT(*) AS count FROM overture_places");
  const countAfter = Number(after.rows[0]?.count || 0);
  const byCountry = await client.execute(
    "SELECT country, COUNT(*) AS n FROM overture_places GROUP BY country ORDER BY n DESC"
  );

  console.log("-----------------------------------------------------");
  console.log(`  Rows processed: ${processed.toLocaleString()} (skipped ${skipped} bad lines)`);
  console.log(`  Rows before: ${countBefore.toLocaleString()} | after: ${countAfter.toLocaleString()}`);
  console.log("  Per country in database:");
  for (const row of byCountry.rows) {
    console.log(`    ${row.country || "(blank)"}: ${Number(row.n).toLocaleString()}`);
  }
  console.log("  [SUCCESS] Turso database updated (idempotent UPSERT — re-runs add no duplicates).");
  console.log("=====================================================");
}

main().catch((err) => {
  console.error("Fatal error during Turso load:", err);
  process.exit(1);
});
