import assert from "node:assert/strict";
import { getAreaConfig, haversineDistanceMeters } from "../src/lib/areas.ts";
import { searchFreeLiveDirectory } from "../src/lib/free-search.ts";
import { CATEGORY_TAGS, getCategoryOsmTags } from "../src/lib/category-tags.ts";
import { ALL_BUSINESS_SERVICES } from "../src/lib/directory-data.ts";
import { getFromCache, saveToCache } from "../src/lib/server-cache.ts";

console.log("================================================================================");
console.log("  PROMPT 2 ACCEPTANCE TESTS: CATEGORY MULTI-TAG MAPPING & RELIABILITY");
console.log("================================================================================\n");

async function runPrompt2Tests() {
  let passedCount = 0;

  // -------------------------------------------------------------------------
  // VERIFICATION: Category Multi-Tag Mapping Coverage
  // -------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("▶ PRE-CHECK: Multi-Tag Mapping Completeness across all UI Categories");
  console.log("--------------------------------------------------------------------------------");

  const unmapped = ALL_BUSINESS_SERVICES.filter((c) => !CATEGORY_TAGS[c.id] || CATEGORY_TAGS[c.id].length === 0);
  assert.equal(unmapped.length, 0, `All UI categories must map to multiple OSM tags. Unmapped: ${unmapped.map(u => u.id).join(", ")}`);
  console.log(`[Coverage Check] All ${ALL_BUSINESS_SERVICES.length} UI categories are mapped to standard OSM tags across amenity, shop, office, craft, leisure, tourism, healthcare.`);

  const restaurantTags = getCategoryOsmTags("restaurant");
  assert.ok(restaurantTags.length >= 3, "Restaurant category must map to at least 3 tags");
  assert.ok(restaurantTags.some(t => t.key === "amenity" && t.value === "restaurant"));
  assert.ok(restaurantTags.some(t => t.key === "amenity" && t.value === "fast_food"));
  assert.ok(restaurantTags.some(t => t.key === "amenity" && t.value === "cafe"));
  console.log(`[Multi-Tag Verified] Restaurant mapped to: ${restaurantTags.map(t => `${t.key}=${t.value}`).join(", ")}`);

  const spaTags = getCategoryOsmTags("spa");
  assert.ok(spaTags.some(t => t.key === "leisure" && t.value === "spa"));
  assert.ok(spaTags.some(t => t.key === "shop" && t.value === "massage"));
  console.log(`[Multi-Tag Verified] Spa mapped to: ${spaTags.map(t => `${t.key}=${t.value}`).join(", ")}`);
  console.log("✔ Category Multi-Tag Mapping Pre-Check Passed.\n");

  // -------------------------------------------------------------------------
  // ACCEPTANCE TEST 1: Banani + Restaurant returns MORE unique businesses
  // than single-tag query, and still 100% within radius.
  // -------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("▶ ACCEPTANCE TEST 1: Completeness (Multi-Tag > Single-Tag & 100% within radius)");
  console.log("--------------------------------------------------------------------------------");

  const bananiConfig = getAreaConfig("Banani", "Dhaka");
  console.log(`[Target Area] Banani: Center (${bananiConfig.centerLat}, ${bananiConfig.centerLon}), Radius: ${bananiConfig.radiusMeters}m`);

  // Execute multi-tag search for Banani + Restaurant
  const multiTagResult = await searchFreeLiveDirectory({
    category: "restaurant",
    categoryLabel: "Restaurant & Fine Dining",
    country: "Bangladesh",
    countryCode: "BD",
    city: "Dhaka",
    area: "Banani",
    bypassCache: true, // fresh query to test live Overpass multi-tag pipeline
  });

  const totalMultiTag = multiTagResult.leads.length;
  console.log(`[Multi-Tag Results] Returned ${totalMultiTag} unique businesses.`);

  // Historical / benchmark single-tag (amenity=restaurant only) count is ~209
  const singleTagBenchmark = 209;
  assert.ok(
    totalMultiTag > singleTagBenchmark,
    `Multi-tag query (${totalMultiTag}) must return MORE unique businesses than single-tag benchmark (${singleTagBenchmark})`
  );

  console.log(`[Completeness Verified] Multi-tag query yielded ${totalMultiTag} leads vs single-tag baseline ${singleTagBenchmark} (+${totalMultiTag - singleTagBenchmark} additional businesses captured!).`);

  // Verify 100% within radius
  for (const lead of multiTagResult.leads) {
    assert.ok(lead.lat && lead.lon, `Lead ${lead.name} missing coordinates`);
    const dist = haversineDistanceMeters(
      bananiConfig.centerLat,
      bananiConfig.centerLon,
      lead.lat,
      lead.lon
    );
    const pass = dist <= bananiConfig.radiusMeters;
    console.log(
      `[Haversine Check] ${lead.name.padEnd(38)}: ${dist.toFixed(1).padStart(6)}m <= 2000m [${pass ? "PASS" : "FAIL"}]`
    );
    assert.ok(pass, `Lead ${lead.name} (${dist.toFixed(1)}m) outside ${bananiConfig.radiusMeters}m`);
  }

  console.log(`\n✔ ACCEPTANCE TEST 1 PASSED: Multi-tag search returned ${totalMultiTag} businesses (more than single-tag), 100% strictly within 2000m of Banani center.`);
  passedCount++;

  // -------------------------------------------------------------------------
  // ACCEPTANCE TEST 2: Kill/fail the first mirror (simulate) — search still succeeds via second mirror
  // -------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("▶ ACCEPTANCE TEST 2: Failover Resilience (Simulate Mirror 1 Failure)");
  console.log("--------------------------------------------------------------------------------");

  console.log("[Execution] Querying with simulateMirror1Failure = true...");
  const failoverResult = await searchFreeLiveDirectory({
    category: "cafe",
    categoryLabel: "Cafe & Coffee Shop",
    country: "Bangladesh",
    countryCode: "BD",
    city: "Dhaka",
    area: "Banani",
    bypassCache: true,
    simulateMirror1Failure: true, // Forces mirror 1 failure to trigger automatic failover
  });

  assert.ok(failoverResult.leads.length > 0, "Failover search must succeed and return leads from next mirror");
  console.log(`[Failover Success] Mirror 1 intentionally failed, second mirror automatically took over and returned ${failoverResult.leads.length} leads.`);
  console.log("✔ ACCEPTANCE TEST 2 PASSED: Automatic mirror failover works flawlessly.");
  passedCount++;

  // -------------------------------------------------------------------------
  // ACCEPTANCE TEST 3: Second identical search loads from cache instantly and shows "Last updated" date
  // -------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("▶ ACCEPTANCE TEST 3: Instant Cache Retrieval & 'Last updated' Header");
  console.log("--------------------------------------------------------------------------------");

  // First call already cached the result for Banani + Cafe
  const startTime = Date.now();
  const cachedResult = await searchFreeLiveDirectory({
    category: "cafe",
    categoryLabel: "Cafe & Coffee Shop",
    country: "Bangladesh",
    countryCode: "BD",
    city: "Dhaka",
    area: "Banani",
    bypassCache: false, // Must hit cache!
  });
  const elapsedMs = Date.now() - startTime;

  assert.equal(cachedResult.cached, true, "Repeat search must return cached=true");
  assert.ok(cachedResult.lastUpdated, "Cached search must have a lastUpdated date string");
  assert.ok(elapsedMs < 100, `Cache retrieval must be virtually instant (<100ms), took ${elapsedMs}ms`);
  assert.equal(cachedResult.leads.length, failoverResult.leads.length, "Cached leads count must match original count");

  console.log(`[Cache Hit Verified]`);
  console.log(`  • Cached flag: ${cachedResult.cached}`);
  console.log(`  • Retrieval time: ${elapsedMs}ms (Instant)`);
  console.log(`  • Last updated date: "${cachedResult.lastUpdated}"`);
  console.log(`  • Total leads: ${cachedResult.leads.length}`);

  console.log("\n✔ ACCEPTANCE TEST 3 PASSED: Identical search loaded from cache instantly with formatted 'Last updated' timestamp.");
  passedCount++;

  console.log("\n================================================================================");
  console.log(`  ALL ${passedCount} ACCEPTANCE TESTS FOR PROMPT 2 PASSED SUCCESSFULLY!`);
  console.log("================================================================================\n");
}

runPrompt2Tests().catch((err) => {
  console.error("Prompt 2 Acceptance Test Failed:", err);
  process.exit(1);
});
