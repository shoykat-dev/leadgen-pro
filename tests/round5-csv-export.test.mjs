import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { searchFreeLiveDirectory } from "../src/lib/free-search.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

console.log("================================================================================");
console.log("  ROUND 5 — CSV EXPORT COUNT REGRESSION TESTS");
console.log("  Sydney CBD Cafe showed 410 leads but exported 383 rows: a '#' in one");
console.log("  website URL truncated the data: URI download at the fragment boundary.");
console.log("================================================================================\n");

async function runTests() {
  let passedCount = 0;
  let failedCount = 0;

  async function test(title, fn) {
    console.log("--------------------------------------------------------------------------------");
    console.log(`▶ ${title}`);
    console.log("--------------------------------------------------------------------------------");
    try {
      await fn();
      passedCount++;
      console.log(`[PASS] ${title}\n`);
    } catch (err) {
      failedCount++;
      console.error(`[FAIL] ${title}`);
      console.error(`       ${err.message}\n`);
    }
  }

  // ---------------------------------------------------------------------------
  // UNIT 1: reproduce the old failure mode — encodeURI leaves '#' raw, and a
  // browser treats everything after '#' in a data: URI as a fragment (dropped).
  // ---------------------------------------------------------------------------
  await test("UNIT 1: Old data-URI path demonstrably loses rows at '#'", () => {
    const rows = [
      `"Alpha Cafe","Cafe","https://example.com/a"`,
      `"Naala Badu Kiosk","Cafe","https://www.artgallery.nsw.gov.au/visit/eat-drink/#eat-and-drink-in-the-north-building-kiosk"`,
      `"Beta Cafe","Cafe","https://example.com/b"`,
      `"Gamma Cafe","Cafe","https://example.com/c"`,
    ];
    const csv = ["Name,Category,Website", ...rows].join("\n");
    // What the old code did: encodeURI the whole data: URI, then the browser
    // resolves it — the fragment (from the first '#') is not part of the data.
    const encoded = encodeURI("data:text/csv;charset=utf-8," + csv);
    assert.ok(encoded.includes("#"), "encodeURI must leave '#' unencoded (the bug's precondition)");
    const downloaded = decodeURI(encoded.split("#")[0]);
    const completeRows = downloaded.split("\n").filter((line) => line.endsWith('"')).length;
    assert.equal(completeRows, 1, `Old path must keep only 1 complete row of 4 (got ${completeRows})`);
    assert.ok(!downloaded.includes("Beta Cafe"), "Rows after '#' must be lost in the old path");
    assert.ok(!downloaded.includes("Gamma Cafe"), "Rows after '#' must be lost in the old path");
    assert.ok(downloaded.endsWith("eat-drink/"), "Download must end exactly at the '#' boundary");
    console.log("[Repro] Old data-URI path keeps only 1 of 4 rows once a '#' URL appears.");
  });

  // ---------------------------------------------------------------------------
  // UNIT 2: no CSV download in the app may use the data: URI + encodeURI pattern.
  // All three export sites must use Blob + createObjectURL (bytes verbatim).
  // ---------------------------------------------------------------------------
  await test("UNIT 2: No data: URI CSV download remains; all exports use Blob", () => {
    const exportSites = [
      "src/components/data-table-view.tsx",
      "src/components/my-leads-view.tsx",
      "src/components/coverage-audit-modal.tsx",
    ];
    for (const rel of exportSites) {
      const src = readFileSync(join(root, rel), "utf-8");
      assert.ok(!src.includes("data:text/csv"), `${rel} must not build a data: URI CSV download`);
      assert.ok(
        src.includes("new Blob(") && src.includes("URL.createObjectURL(blob)"),
        `${rel} must download CSV via Blob + createObjectURL`
      );
      assert.ok(src.includes("URL.revokeObjectURL(url)"), `${rel} must revoke the object URL after download`);
      console.log(`[Export] ${rel}: Blob download, no data: URI.`);
    }
  });

  // ---------------------------------------------------------------------------
  // UNIT 3: the CSV join itself maps every lead to exactly one row, even when a
  // field contains '#', quotes, or commas — no row is lost or split.
  // ---------------------------------------------------------------------------
  await test("UNIT 3: CSV join keeps one row per lead with '#' / quote / comma fields", () => {
    const fields = [
      ["Naala Badu Kiosk", "https://www.artgallery.nsw.gov.au/visit/eat-drink/#eat-and-drink-in-the-north-building-kiosk"],
      ['Café "Gigi"', "Shop 1, 12 George St"],
      ["Tom & Jerry's", "https://example.com/?a=1&b=2"],
    ];
    const lines = fields.map((f) => f.map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    const csv = ["Name,Website", ...lines].join("\n");
    assert.equal(csv.split("\n").length, 4, "Header + 3 leads must be exactly 4 lines");
    assert.ok(csv.includes("#eat-and-drink"), "The '#' URL must survive intact in the CSV text");
    console.log("[Join] 3 leads -> 4 lines; '#' URL intact.");
  });

  // ---------------------------------------------------------------------------
  // LIVE 1: Sydney CBD Cafe returns 410 leads, including the two '#' URLs that
  // triggered the truncation (Naala Badu Kiosk, The Gallery Cafe).
  // ---------------------------------------------------------------------------
  await test("LIVE 1: Sydney CBD Cafe is 410 leads incl. both '#' URLs", async () => {
    const result = await searchFreeLiveDirectory({
      category: "cafe",
      categoryLabel: "Cafe & Coffee Shop",
      country: "Australia",
      countryCode: "AU",
      city: "Sydney",
      area: "Sydney CBD",
      bypassCache: true,
    });
    console.log(`[Counts] Sydney CBD Cafe: total=${result.total} partial=${result.partial || false}`);
    assert.equal(result.total, 410, `Sydney CBD Cafe must return 410 leads (got ${result.total})`);
    const naala = result.leads.find((l) => l.name === "Naala Badu Kiosk");
    const gallery = result.leads.find((l) => l.name === "The Gallery Cafe");
    assert.ok(naala, "Naala Badu Kiosk must be in the results");
    assert.ok(gallery, "The Gallery Cafe must be in the results");
    assert.ok(
      (naala.website || "").includes("#"),
      `Naala Badu Kiosk website must still carry the '#' fragment: ${naala.website}`
    );
    assert.ok(
      (gallery.website || "").includes("#"),
      `The Gallery Cafe website must still carry the '#' fragment: ${gallery.website}`
    );
    console.log(`[Hash] Naala Badu: ${naala.website}`);
    console.log(`[Hash] Gallery Cafe: ${gallery.website}`);
  });

  // ---------------------------------------------------------------------------
  // LIVE 2: small-set sanity — London City Cleaning stays at 3 (no regression
  // in the small-result path the export also serves).
  // ---------------------------------------------------------------------------
  await test("LIVE 2: London City Cleaning stays at 3 (small-set sanity)", async () => {
    const result = await searchFreeLiveDirectory({
      category: "cleaning",
      categoryLabel: "Cleaning Services",
      country: "United Kingdom",
      countryCode: "GB",
      city: "London",
      area: "City of London",
      bypassCache: true,
    });
    console.log(`[Counts] London City Cleaning: total=${result.total} partial=${result.partial || false}`);
    assert.equal(result.total, 3, `London City Cleaning must return 3 leads (got ${result.total})`);
  });

  console.log("================================================================================");
  console.log(`  ROUND 5 TESTS: ${passedCount} passed, ${failedCount} failed`);
  console.log("================================================================================");
  if (failedCount > 0) process.exit(1);
}

runTests();
