// Loads the 12-row Bangladesh seed snapshot into the database via src/lib/db.ts.
// The target follows the same env-var rule as the site: Turso when
// TURSO_DATABASE_URL + TURSO_AUTH_TOKEN are set, local SQLite otherwise.
// For the real multi-country import, use scripts/import_overture.py instead.
import fs from "node:fs";
import path from "node:path";
import { upsertOverturePlaces, getOverturePlaceCount, type OverturePlaceRecord } from "../src/lib/db";

async function runImport() {
  console.log("=====================================================");
  console.log("  Overture Maps Places Importer (Node.js / TS)");
  console.log("  License: CDLA-Permissive-2.0 / ODbL");
  console.log("=====================================================");

  const seedPath = path.join(process.cwd(), "data", "overture_places_bd.json");
  if (!fs.existsSync(seedPath)) {
    console.error(`[-] Seed file not found at ${seedPath}`);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(seedPath, "utf-8");
  const places: OverturePlaceRecord[] = JSON.parse(rawJson);

  const beforeCount = await getOverturePlaceCount();
  console.log(`[*] Places currently in local database: ${beforeCount}`);
  console.log(`[*] Processing ${places.length} Overture Places for Bangladesh...`);

  const { insertedCount } = await upsertOverturePlaces(places);
  const afterCount = await getOverturePlaceCount();

  console.log("-----------------------------------------------------");
  console.log(`  [RESULT] Count before:     ${beforeCount}`);
  console.log(`  [RESULT] Items processed:  ${insertedCount}`);
  console.log(`  [RESULT] Count after:      ${afterCount}`);
  console.log(`  [RESULT] Duplicates added: 0 (INSERT OR REPLACE)`);
  console.log("  [SUCCESS] Database updated with official Overture Places.");
  console.log("=====================================================");
}

runImport().catch((err) => {
  console.error("Fatal error during import:", err);
  process.exit(1);
});
