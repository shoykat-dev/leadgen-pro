import assert from "node:assert/strict";
import {
  CATEGORY_TAGS,
  NAME_KEYWORDS,
  OVERTURE_KEYWORDS,
  getCategoryNameKeywords,
  getCategoryOvertureKeywords,
  nameMatchesKeywords,
  nameMatchesPhraseExclusions,
  nameMatchesFoodBlocklist,
  overtureCategoriesMatch,
} from "../src/lib/category-tags.ts";
import {
  elementPassesNamePrecedence,
  elementHasCommercialContext,
  countCategoryCoverage,
  searchFreeLiveDirectory,
} from "../src/lib/free-search.ts";
import { getAreaConfig, haversineDistanceMeters, postcodeConflicts } from "../src/lib/areas.ts";

console.log("================================================================================");
console.log("  COVERAGE + NAME-FALLBACK TESTS: keyword matching, precedence, Overture gate,");
console.log("  live London trade counts (Cleaning / Plumber / Electrician)");
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
  // UNIT 1: every category has name keywords and Overture keywords (101/101).
  // ---------------------------------------------------------------------------
  await test("UNIT 1: Keyword coverage is 101/101 for every category", () => {
    const ids = Object.keys(CATEGORY_TAGS);
    assert.equal(ids.length, 101, `Expected 101 categories, found ${ids.length}`);
    const missingName = ids.filter((id) => (NAME_KEYWORDS[id] || []).length === 0);
    const missingOv = ids.filter((id) => (OVERTURE_KEYWORDS[id] || []).length === 0);
    assert.deepEqual(missingName, [], `Categories without name keywords: ${missingName.join(", ")}`);
    assert.deepEqual(missingOv, [], `Categories without Overture keywords: ${missingOv.join(", ")}`);
    console.log(`[Coverage] ${ids.length} categories, all with name + Overture keywords.`);
  });

  // ---------------------------------------------------------------------------
  // UNIT 2: keyword matcher — stems prefix-match, short words need exact match.
  // ---------------------------------------------------------------------------
  await test("UNIT 2: Name-keyword matcher (stems, short words, no false positives)", () => {
    const plumberKw = getCategoryNameKeywords("plumber");
    assert.ok(plumberKw.includes("plumb"), "Plumber keywords must include the 'plumb' stem");
    assert.equal(nameMatchesKeywords("ABC Plumbing", plumberKw), true, "'ABC Plumbing' must match 'plumb'");
    assert.equal(nameMatchesKeywords("Drainage Solutions Ltd", plumberKw), true, "'Drainage Solutions Ltd' must match 'drainage'");
    assert.equal(nameMatchesKeywords("Barbershop", ["bar"]), false, "'bar' must NOT match 'Barbershop' (short keyword needs an exact token)");
    assert.equal(nameMatchesKeywords("The Bar", ["bar"]), true, "'bar' must match the standalone token 'Bar'");
    const cleaningKw = getCategoryNameKeywords("cleaning");
    assert.equal(nameMatchesKeywords("Sparkle Clean", cleaningKw), true, "'Sparkle Clean' must match Cleaning");
    assert.equal(nameMatchesKeywords("Joe's Pizza", cleaningKw), false, "'Joe's Pizza' must NOT match Cleaning");
    console.log("[Matcher] stem + exact-token rules behave as specified.");
  });

  // ---------------------------------------------------------------------------
  // UNIT 3: precedence — a hairdresser named "Clean Cuts" is never a cleaner.
  // ---------------------------------------------------------------------------
  await test("UNIT 3: Name precedence + commercial context gates", () => {
    assert.equal(
      elementPassesNamePrecedence({ shop: "hairdresser", name: "Clean Cuts" }, "cleaning"),
      false,
      "'Clean Cuts' hairdresser must NOT name-match into Cleaning"
    );
    assert.equal(
      elementPassesNamePrecedence({ amenity: "restaurant", name: "Clean Eats" }, "cleaning"),
      false,
      "A restaurant named 'Clean Eats' must NOT name-match into Cleaning"
    );
    assert.equal(
      elementPassesNamePrecedence({ name: "Sparkle Clean", phone: "+442071234567" }, "cleaning"),
      true,
      "An untagged business named 'Sparkle Clean' MAY name-match into Cleaning"
    );
    assert.equal(
      elementPassesNamePrecedence({ amenity: "cinema", name: "Electric Cinema" }, "electrician"),
      false,
      "'Electric Cinema' must NOT name-match into Electrician (cinema is a blocked primary tag)"
    );
    assert.equal(
      elementPassesNamePrecedence({ tourism: "museum", name: "Clean Museum" }, "cleaning"),
      false,
      "A museum must NOT name-match into Cleaning (museum is a blocked primary tag)"
    );
    assert.equal(
      elementPassesNamePrecedence({ shop: "trade", name: "City Plumbing" }, "plumber"),
      true,
      "'City Plumbing' (shop=trade, maps to no category) MAY name-match into Plumber"
    );
    assert.equal(
      elementHasCommercialContext({ name: "X", phone: "+442071234567" }),
      true,
      "A phone number counts as commercial context"
    );
    assert.equal(
      elementHasCommercialContext({ name: "X", building: "commercial" }),
      true,
      "A commercial building counts as commercial context"
    );
    assert.equal(
      elementHasCommercialContext({ name: "X" }),
      false,
      "A bare name with no tag at all has no commercial context"
    );
    console.log("[Precedence] 'Clean Cuts' stays a salon; untagged names may match.");
  });

  // ---------------------------------------------------------------------------
  // UNIT 4: phrase exclusions — dry cleaning / laundry never enters Cleaning.
  // ---------------------------------------------------------------------------
  await test("UNIT 4: Cleaning phrase exclusions (dry clean / laundry)", () => {
    const phrases = ["dry clean", "dryclean", "laundromat", "launderette", "laundry"];
    assert.equal(nameMatchesPhraseExclusions("City Dry Clean", phrases), true);
    assert.equal(nameMatchesPhraseExclusions("Quick Laundry", phrases), true);
    assert.equal(nameMatchesPhraseExclusions("Sparkle Clean", phrases), false);
    assert.equal(nameMatchesPhraseExclusions("Janitorial Services Ltd", phrases), false);
    console.log("[Exclusions] dry-cleaning and laundry names are excluded from Cleaning.");
  });

  // ---------------------------------------------------------------------------
  // UNIT 5: Overture relevance gate — events never leak into food categories.
  // ---------------------------------------------------------------------------
  await test("UNIT 5: Overture relevance gate (events out, real rows in)", () => {
    // DORANGOS-style leak: an events/entertainment business under Restaurant.
    assert.equal(
      overtureCategoriesMatch("restaurant", ["event", "entertainment"]),
      false,
      "Event/entertainment categories must NOT match Restaurant"
    );
    assert.equal(
      overtureCategoriesMatch("restaurant", ["concert_hall"]),
      false,
      "A concert hall must NOT match Restaurant"
    );
    // Supplier / wholesale businesses are never local-service leads.
    assert.equal(
      overtureCategoriesMatch("plumber", ["plumbing_supply"]),
      false,
      "A plumbing supplier must NOT match Plumber"
    );
    // Genuine rows pass.
    assert.equal(overtureCategoriesMatch("restaurant", ["restaurant", "fast_food"]), true);
    assert.equal(overtureCategoriesMatch("cafe", ["cafe", "coffee_shop"]), true);
    assert.equal(overtureCategoriesMatch("all", ["event"]), true, "'all' bypasses the gate");
    // Food name blocklist: a name that shows the business is not food at all
    // vetoes the lead however it is tagged (DORANGOS carries amenity=cafe).
    assert.equal(
      nameMatchesFoodBlocklist("DORANGOS (Instagram:-dorangos_comedy_events) Best Entertainment Mumbai"),
      true,
      "DORANGOS must match the food name blocklist"
    );
    assert.equal(nameMatchesFoodBlocklist("City Interiors"), true);
    assert.equal(nameMatchesFoodBlocklist("Joe's Pizza"), false);
    assert.equal(nameMatchesFoodBlocklist("The Coffee House"), false);
    console.log("[Gate] events/suppliers rejected; genuine categories accepted.");
  });

  // ---------------------------------------------------------------------------
  // LIVE 1: London City Cleaning must rise above 1, with badged name matches,
  // and no dry-cleaner / laundry names in the results.
  // ---------------------------------------------------------------------------
  await test("LIVE 1: London City Cleaning rises above 1 (name fallback)", async () => {
    const config = getAreaConfig("City of London", "London");
    console.log(`[Area] City of London (${config.centerLat}, ${config.centerLon}), radius ${config.radiusMeters}m`);
    const result = await searchFreeLiveDirectory({
      category: "cleaning",
      categoryLabel: "Cleaning Services",
      country: "United Kingdom",
      countryCode: "GB",
      city: "London",
      area: "City of London",
      bypassCache: true,
    });
    const tagMatches = result.leads.filter((l) => l.matchType === "tag").length;
    const nameMatches = result.leads.filter((l) => l.matchType === "name").length;
    console.log(`[Counts] total=${result.total} tag=${tagMatches} name=${nameMatches} partial=${result.partial || false}`);
    for (const lead of result.leads.slice(0, 15)) {
      console.log(`  - [${lead.matchType || "tag"}] ${lead.name}`);
    }
    assert.ok(result.total > 1, `London City Cleaning must return more than 1 lead (got ${result.total})`);
    assert.ok(nameMatches >= 1, `Expected at least 1 name-matched lead (got ${nameMatches})`);
    const dryCleaner = result.leads.find((l) =>
      /dry\s*clean|dryclean|laundromat|launderette|laundry/i.test(l.name || "")
    );
    assert.equal(dryCleaner, undefined, `Dry-cleaner/laundry leaked into Cleaning: ${dryCleaner?.name}`);
    for (const lead of result.leads) {
      if (lead.lat == null || lead.lon == null) continue;
      const d = haversineDistanceMeters(config.centerLat, config.centerLon, lead.lat, lead.lon);
      assert.ok(d <= config.radiusMeters, `${lead.name} is ${Math.round(d)}m out — beyond the ${config.radiusMeters}m radius`);
    }
    console.log("[Live] Cleaning count above 1, name matches badged, no dry cleaners, all in radius.");
  });

  // ---------------------------------------------------------------------------
  // LIVE 2: City of London Plumber + Electrician counts with name fallback.
  // (Soho was the original area here, but a direct Overpass query proved its
  // genuine OSM ceiling is 0 plumbers within the 1000m radius — the old
  // count of 4 came from the pre-fix 1500m radius. City of London has real
  // data for both trades, so it is the honest test area.)
  // ---------------------------------------------------------------------------
  await test("LIVE 2: City of London Plumber + Electrician counts with name fallback", async () => {
    for (const [category, label] of [
      ["plumber", "Plumber"],
      ["electrician", "Electrician"],
    ]) {
      const result = await searchFreeLiveDirectory({
        category,
        categoryLabel: label,
        country: "United Kingdom",
        countryCode: "GB",
        city: "London",
        area: "City of London",
        bypassCache: true,
      });
      const tagMatches = result.leads.filter((l) => l.matchType === "tag").length;
      const nameMatches = result.leads.filter((l) => l.matchType === "name").length;
      console.log(`[Counts] City of London ${label}: total=${result.total} tag=${tagMatches} name=${nameMatches} partial=${result.partial || false}`);
      for (const lead of result.leads.slice(0, 10)) {
        console.log(`  - [${lead.matchType || "tag"}] ${lead.name}`);
      }
      assert.ok(result.total >= 2, `City of London ${label} must return at least 2 leads (got ${result.total})`);
      assert.ok(nameMatches >= 1, `City of London ${label} must include at least 1 name-matched lead (got ${nameMatches})`);
      if (category === "electrician") {
        const cinema = result.leads.find((l) => /cinema/i.test(l.name || ""));
        assert.equal(cinema, undefined, `Electric Cinema leaked into Electrician: ${cinema?.name}`);
      }
    }
    console.log("[Live] Trade counts recorded above (old tag-only counts were Plumber 4 / Electrician 3 at the old radius).");
  });

  // ---------------------------------------------------------------------------
  // LIVE 3: coverage-count helper (used by the coverage audit) returns sane numbers.
  // ---------------------------------------------------------------------------
  await test("LIVE 3: countCategoryCoverage returns tag/name/total for one category", async () => {
    const config = getAreaConfig("City of London", "London");
    const counts = await countCategoryCoverage(
      "cleaning",
      config.radiusMeters,
      config.centerLat,
      config.centerLon,
      45000
    );
    console.log(`[Coverage] Cleaning in City of London: tag=${counts.tagCount} name=${counts.nameCount} total=${counts.total}`);
    assert.equal(typeof counts.tagCount, "number");
    assert.equal(typeof counts.nameCount, "number");
    assert.equal(counts.total, counts.tagCount + counts.nameCount, "total must equal tag + name");
    assert.ok(counts.total >= 1, "coverage total must be at least 1");
    console.log("[Live] Coverage helper works (powers the coverage-audit modal).");
  });

  // ---------------------------------------------------------------------------
  // UNIT: postcode-boundary gate (round 3) — Paris postcodes map 1:1 to
  // arrondissements, so a record asserting a different Paris postcode is out.
  // ---------------------------------------------------------------------------
  await test("UNIT: postcodeConflicts fires only on a different Paris postcode", () => {
    assert.equal(postcodeConflicts("75001", "75006"), true, "75006 conflicts with 75001");
    assert.equal(postcodeConflicts("75001", "75007"), true, "75007 conflicts with 75001");
    assert.equal(postcodeConflicts("75001", "75001"), false, "same postcode never conflicts");
    assert.equal(postcodeConflicts("75001", null), false, "missing record postcode never conflicts");
    assert.equal(postcodeConflicts("75001", undefined), false, "missing record postcode never conflicts");
    assert.equal(postcodeConflicts(undefined, "75006"), false, "area without postcode never gates");
    assert.equal(postcodeConflicts("75001", "2000"), false, "non-Paris postcode never conflicts");
    assert.equal(postcodeConflicts("75001", "75006 "), true, "whitespace is trimmed before comparing");
    assert.equal(postcodeConflicts("75001", "7500"), false, "malformed postcode never conflicts");
    const cfg = getAreaConfig("1st - Louvre / Palais-Royal", "Paris");
    assert.equal(cfg.postcode, "75001", "Paris 1st must carry postcode 75001");
    assert.equal(cfg.radiusMeters, 900, "Paris 1st radius must be 900m (centroid)");
    assert.equal(cfg.osmAreaId, 3600020727, "Paris 1st must carry OSM area id 3600020727 (polygon mode)");
    const cfg2 = getAreaConfig("2nd - Bourse / Sentier", "Paris");
    assert.equal(cfg2.postcode, "75002", "Paris 2nd must carry postcode 75002");
    assert.equal(cfg2.osmAreaId, 3600009542, "Paris 2nd must carry OSM area id 3600009542");
    assert.ok(cfg2.radiusMeters <= 1200, "Paris 2nd radius must be tight (<=1200m), not city-wide");
    console.log(`[Config] Paris 1st: centre (${cfg.centerLat}, ${cfg.centerLon}), ${cfg.radiusMeters}m, postcode ${cfg.postcode}, area ${cfg.osmAreaId}`);
    console.log(`[Config] Paris 2nd: centre (${cfg2.centerLat}, ${cfg2.centerLon}), ${cfg2.radiusMeters}m, postcode ${cfg2.postcode}, area ${cfg2.osmAreaId}`);
  });

  // ---------------------------------------------------------------------------
  // LIVE 4: Paris 1st Cafe — polygon mode: the round-3 offenders AND the 3
  // no-postcode residuals are gone, and members outside the 900m circle are
  // kept (boundary membership, not distance, is the test — sane 1500m bound).
  // ---------------------------------------------------------------------------
  await test("LIVE 4: Paris 1st Cafe excludes 6th/7th-arrondissement records", async () => {
    const config = getAreaConfig("1st - Louvre / Palais-Royal", "Paris");
    assert.ok(config.osmAreaId, "Paris 1st must carry an OSM area id (polygon mode)");
    const result = await searchFreeLiveDirectory({
      category: "cafe",
      categoryLabel: "Cafe",
      country: "France",
      countryCode: "FR",
      city: "Paris",
      area: "1st - Louvre / Palais-Royal",
      bypassCache: true,
    });
    console.log(`[Paris 1st] ${result.leads.length} leads, radius ${config.radiusMeters}m, polygon area ${config.osmAreaId}`);
    assert.ok(result.leads.length > 0, "Paris 1st Cafe must return leads");
    let maxD = 0;
    let outsideCircle = 0;
    for (const lead of result.leads) {
      assert.ok(lead.lat != null && lead.lon != null, `lead ${lead.name} must have coordinates`);
      const d = haversineDistanceMeters(config.centerLat, config.centerLon, lead.lat, lead.lon);
      if (d > maxD) maxD = d;
      if (d > config.radiusMeters) outsideCircle++;
      assert.ok(d <= 1500, `Paris lead ${lead.name} at ${Math.round(d)}m > 1500m sane bound for the 1st`);
    }
    console.log(`[Paris 1st] max distance ${Math.round(maxD)}m; ${outsideCircle} genuine members outside the 900m circle`);
    assert.ok(outsideCircle > 0, "polygon mode must keep genuine 1st-arr members outside the 900m circle");
    // Known 6th/7th records (verified in OSM) must be gone — the 4 postcoded
    // offenders from round 3 plus the 3 no-postcode residuals only the
    // boundary removes.
    const offenders = ["les deux magots", "le hibou", "blitz society", "café de la gare", "good news", "maison fleuret", "galette café"];
    for (const name of offenders) {
      const found = result.leads.find((l) => (l.name || "").toLowerCase().includes(name));
      assert.ok(!found, `offender "${name}" must not appear in Paris 1st results`);
    }
    console.log("[Paris 1st] known 6th/7th offenders absent (Deux Magots, Le Hibou, Blitz Society, Café de la Gare) and 3 residuals absent (Good News, Maison Fleuret, Galette Café).");
  });

  console.log("================================================================================");
  console.log(`  COVERAGE + FALLBACK TESTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");
  if (failedCount > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("[FATAL] Test runner crashed:", err);
  process.exit(1);
});
