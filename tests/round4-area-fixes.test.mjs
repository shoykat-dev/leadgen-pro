import assert from "node:assert/strict";
import fs from "node:fs";
import { searchFreeLiveDirectory } from "../src/lib/free-search.ts";
import { getAreaConfig, haversineDistanceMeters, isCoordinateInCityBounds } from "../src/lib/areas.ts";

console.log("================================================================================");
console.log("  ROUND 4 AREA FIXES: Paris arrondissement centres + polygon area ids,");
console.log("  Sydney Newtown/Paddington centres, full-table wrong-city audit");
console.log("================================================================================\n");

const AREAS = JSON.parse(
  fs.readFileSync(new URL("../src/lib/areas-table.json", import.meta.url), "utf-8")
);

// Verified 2026-11-16: centroids geocoded (DISTRICT match, relevance 100) and
// confirmed by reverse-geocode — each lands in its own arrondissement with the
// matching 7500X postcode. Area ids: Overpass admin_level=9 relations
// (area id = 3600000000 + relation id).
const PARIS_EXPECTED = {
  "1st - Louvre / Palais-Royal": { lat: 48.8622, lon: 2.3365, r: 900, pc: "75001", area: 3600020727 },
  "2nd - Bourse / Sentier": { lat: 48.86626, lon: 2.34052, r: 800, pc: "75002", area: 3600009542 },
  "3rd - Le Marais": { lat: 48.86471, lon: 2.36447, r: 900, pc: "75003", area: 3600020742 },
  "4th - Notre-Dame / Marais": { lat: 48.85591, lon: 2.35318, r: 1000, pc: "75004", area: 3600009597 },
  "5th - Latin Quarter": { lat: 48.84672, lon: 2.34363, r: 1100, pc: "75005", area: 3600020873 },
  "6th - Saint-Germain-des-Pres": { lat: 48.85122, lon: 2.33289, r: 1000, pc: "75006", area: 3600009527 },
  "7th - Eiffel Tower / Invalides": { lat: 48.85486, lon: 2.32026, r: 1400, pc: "75007", area: 3600009521 },
  "8th - Champs-Elysees": { lat: 48.87757, lon: 2.31655, r: 1300, pc: "75008", area: 3600020872 },
  "9th - Opera": { lat: 48.87115, lon: 2.33207, r: 1000, pc: "75009", area: 3600009537 },
  "10th - Canal Saint-Martin": { lat: 48.87361, lon: 2.35845, r: 1200, pc: "75010", area: 3600009528 },
  "11th - Bastille / Republique": { lat: 48.85763, lon: 2.38005, r: 1300, pc: "75011", area: 3600009533 },
};

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
      console.error(`  ${err.message}\n`);
    }
  }

  // ---------------------------------------------------------------------------
  // UNIT 1: every Paris arrondissement (1st–11th) resolves to its real
  // centroid with a tight radius, its own postcode, and its OSM area id —
  // via BOTH key forms (prefixed and unprefixed), so the postcode gate and
  // polygon mode apply regardless of which key resolves.
  // ---------------------------------------------------------------------------
  await test("UNIT 1: Paris 1st–11th centres, postcodes and area ids (both key forms)", () => {
    for (const [name, exp] of Object.entries(PARIS_EXPECTED)) {
      for (const keyForm of [name, `Paris ${name}`]) {
        const cfg = getAreaConfig(keyForm, "Paris");
        const d = haversineDistanceMeters(exp.lat, exp.lon, cfg.centerLat, cfg.centerLon);
        assert.ok(d <= 200, `${name} [${keyForm}] centre ${Math.round(d)}m from verified centroid`);
        assert.equal(cfg.radiusMeters, exp.r, `${name} radius must be ${exp.r}m`);
        assert.equal(cfg.postcode, exp.pc, `${name} must carry postcode ${exp.pc}`);
        assert.equal(cfg.osmAreaId, exp.area, `${name} must carry OSM area id ${exp.area}`);
      }
      console.log(`[Paris] ${name}: centre OK, ${exp.r}m, ${exp.pc}, area ${exp.area} (both key forms)`);
    }
  });

  // ---------------------------------------------------------------------------
  // UNIT 2: La Défense has its real centre (Parvis de la Défense, 92800),
  // not the Paris city default.
  // ---------------------------------------------------------------------------
  await test("UNIT 2: La Défense centre is the real business district", () => {
    const cfg = getAreaConfig("La Defense (Business District)", "Paris");
    const d = haversineDistanceMeters(48.89263, 2.23741, cfg.centerLat, cfg.centerLon);
    assert.ok(d <= 200, `La Défense centre ${Math.round(d)}m from Parvis de la Défense`);
    assert.equal(cfg.radiusMeters, 1000, "La Défense radius must be 1000m");
    assert.equal(cfg.postcode, "92800", "La Défense must carry postcode 92800");
    assert.equal(cfg.osmAreaId, undefined, "La Défense is not a Paris arrondissement — no area id");
    console.log(`[Paris] La Défense: (${cfg.centerLat}, ${cfg.centerLon}), 1000m, 92800`);
  });

  // ---------------------------------------------------------------------------
  // UNIT 3: Sydney Newtown + Paddington are in Sydney, not Hobart / London.
  // ---------------------------------------------------------------------------
  await test("UNIT 3: Sydney Newtown and Paddington centres are in Sydney", () => {
    const nw = getAreaConfig("Newtown", "Sydney");
    const nwD = haversineDistanceMeters(-33.89856, 151.1763, nw.centerLat, nw.centerLon);
    assert.ok(nwD <= 200, `Newtown centre ${Math.round(nwD)}m from verified centroid`);
    const pd = getAreaConfig("Paddington", "Sydney");
    const pdD = haversineDistanceMeters(-33.88203, 151.2289, pd.centerLat, pd.centerLon);
    assert.ok(pdD <= 200, `Paddington centre ${Math.round(pdD)}m from verified centroid`);
    console.log(`[Sydney] Newtown (${nw.centerLat}, ${nw.centerLon}), Paddington (${pd.centerLat}, ${pd.centerLon})`);
  });

  // ---------------------------------------------------------------------------
  // UNIT 4: the named wrong-city entries from the full-table audit now resolve
  // inside their own city (no bbox throw, centre within 40km of the city centre).
  // ---------------------------------------------------------------------------
  await test("UNIT 4: audit-named wrong-city entries now resolve in their own city", () => {
    const cityCentre = {
      Mumbai: [19.076, 72.8777],
      Tokyo: [35.6762, 139.6503],
      Madrid: [40.4168, -3.7038],
      Rotterdam: [51.9244, 4.4777],
      Munich: [48.1351, 11.582],
      Sydney: [-33.8688, 151.2093],
    };
    const checks = [
      ["Dadar", "Mumbai"],
      ["Thane", "Mumbai"],
      ["Navi Mumbai", "Mumbai"],
      ["Minato", "Tokyo"],
      ["Ebisu", "Tokyo"],
      ["Chueca", "Madrid"],
      ["Noord", "Rotterdam"],
      ["Neuhausen", "Munich"],
      ["Newtown", "Sydney"],
      ["Paddington", "Sydney"],
    ];
    for (const [area, city] of checks) {
      const cfg = getAreaConfig(area, city); // throws if outside the city bbox
      const [clat, clon] = cityCentre[city];
      const d = haversineDistanceMeters(clat, clon, cfg.centerLat, cfg.centerLon);
      assert.ok(d <= 40000, `${area}, ${city} centre ${Math.round(d / 1000)}km from the city centre`);
      console.log(`[Audit] ${area}, ${city}: (${cfg.centerLat}, ${cfg.centerLon}) — ${(d / 1000).toFixed(1)}km from city centre`);
    }
  });

  // ---------------------------------------------------------------------------
  // UNIT 5: full-table audit — every entry's centre must sit within 40km of
  // its city's largest-cluster centre, except the verified legitimately-far
  // areas (far suburbs / upazilas whose centres were confirmed by
  // reverse-geocode). Hyderabad is checked separately: it is the one city
  // name shared by two countries (IN + PK), so its areas are checked against
  // their own country's centre. Also: no entry may sit outside its city's
  // bounding box (getAreaConfig throws for those).
  // ---------------------------------------------------------------------------
  await test("UNIT 5: full-table audit — no wrong-city centres remain", () => {
    const LEGIT_FAR = new Set([
      "Houston||Katy", // 44km — Katy, TX, verified by reverse-geocode
      "Kishoreganj||Bhairab", // 48km — Bhairab Upazila, verified
      "Bhola||Char Fasson", // 52km — Char Fasson Upazila, verified
      "Bandarban||Lama", // 49km — Lama Upazila, verified
      "Pabna||Bera", // 41km — Bera Upazila, verified
    ]);
    const HYD_IN = new Set(["Banjara Hills", "Begumpet", "Gachibowli", "Hitec City", "Jubilee Hills", "Madhapur", "Secunderabad"]);
    const HYD_IN_CENTRE = [17.385, 78.4867];
    const HYD_PK_CENTRE = [25.39242, 68.37366];

    const byCity = {};
    for (const [key, v] of Object.entries(AREAS)) {
      (byCity[v.city] = byCity[v.city] || []).push([key, v]);
    }
    let checked = 0;
    const violations = [];
    for (const [city, items] of Object.entries(byCity)) {
      if (city === "Hyderabad") {
        // Per-area reference: Indian areas vs Hyderabad-IN, Pakistani vs Hyderabad-PK.
        for (const [key, v] of items) {
          checked++;
          const ref = HYD_IN.has(v.name) ? HYD_IN_CENTRE : HYD_PK_CENTRE;
          const d = haversineDistanceMeters(ref[0], ref[1], v.centerLat, v.centerLon);
          if (d > 40000) violations.push(`${key} (${v.name}): ${Math.round(d / 1000)}km from its Hyderabad centre`);
        }
        continue;
      }
      if (items.length < 3) continue;
      // Largest 30km cluster centre (median of the largest cluster).
      const pts = items.map(([, v]) => [v.centerLat, v.centerLon]);
      let bestSeed = 0;
      let bestN = -1;
      for (let i = 0; i < pts.length; i++) {
        const n = pts.filter((q) => haversineDistanceMeters(pts[i][0], pts[i][1], q[0], q[1]) <= 30000).length;
        if (n > bestN) { bestN = n; bestSeed = i; }
      }
      const seed = pts[bestSeed];
      const mem = pts.filter((q) => haversineDistanceMeters(seed[0], seed[1], q[0], q[1]) <= 30000);
      const mlat = mem.map((q) => q[0]).sort((a, b) => a - b)[Math.floor(mem.length / 2)];
      const mlon = mem.map((q) => q[1]).sort((a, b) => a - b)[Math.floor(mem.length / 2)];
      for (const [key, v] of items) {
        checked++;
        if (LEGIT_FAR.has(`${city}||${v.name}`)) continue;
        const d = haversineDistanceMeters(mlat, mlon, v.centerLat, v.centerLon);
        if (d > 40000) violations.push(`${key} (${v.name}, ${city}): ${Math.round(d / 1000)}km from cluster centre`);
      }
    }
    // Bounding-box check: getAreaConfig throws for centres outside the box.
    const outsideBox = [];
    for (const [key, v] of Object.entries(AREAS)) {
      if (!isCoordinateInCityBounds(v.city, v.centerLat, v.centerLon)) {
        outsideBox.push(`${key} (${v.name}, ${v.city})`);
      }
    }
    console.log(`[Audit] ${checked} entries checked against their city cluster centre; ${Object.keys(byCity).length} cities.`);
    assert.deepEqual(violations, [], `wrong-city centres remain: ${violations.slice(0, 10).join("; ")}`);
    assert.deepEqual(outsideBox, [], `entries outside their city bbox: ${outsideBox.slice(0, 10).join("; ")}`);
    console.log("[Audit] no wrong-city centres; no entries outside their city bbox (5 legitimately-far areas allowlisted).");
  });

  // ---------------------------------------------------------------------------
  // LIVE 1: Paris 2nd Cafe — real centroid + polygon: results are 2nd-arr
  // businesses (no other 750xx postcode in any address), within budget.
  // ---------------------------------------------------------------------------
  await test("LIVE 1: Paris 2nd Cafe returns 2nd-arrondissement results", async () => {
    const config = getAreaConfig("2nd - Bourse / Sentier", "Paris");
    const start = Date.now();
    const result = await searchFreeLiveDirectory({
      category: "cafe",
      categoryLabel: "Cafe",
      country: "France",
      countryCode: "FR",
      city: "Paris",
      area: "2nd - Bourse / Sentier",
      bypassCache: true,
    });
    const duration = Date.now() - start;
    console.log(`[Paris 2nd] ${result.leads.length} leads in ${(duration / 1000).toFixed(1)}s`);
    assert.ok(duration < 60000, `Paris 2nd search took ${duration}ms, must complete under 60s`);
    assert.ok(result.leads.length > 0, "Paris 2nd Cafe must return leads");
    for (const lead of result.leads) {
      const pcs = (lead.address || "").match(/\b750\d{2}\b/g) || [];
      for (const pc of pcs) {
        assert.equal(pc, "75002", `Paris 2nd lead ${lead.name} carries postcode ${pc}`);
      }
      const d = haversineDistanceMeters(config.centerLat, config.centerLon, lead.lat, lead.lon);
      assert.ok(d <= 1500, `Paris 2nd lead ${lead.name} at ${Math.round(d)}m > 1500m sane bound`);
    }
    console.log("[Paris 2nd] no other-arrondissement postcodes in any address.");
  });

  // ---------------------------------------------------------------------------
  // LIVE 2: Paris 6th + 7th Cafe spot-checks (same rules, sane bounds sized
  // to the arrondissement — the 7th is large and elongated, ~4km²; its
  // farthest genuine member (Eiffel Tower area) is 2071m from the centroid,
  // so the 7th bound is 2500m).
  // ---------------------------------------------------------------------------
  await test("LIVE 2: Paris 6th and 7th Cafe spot-checks", async () => {
    for (const [area, pc, bound] of [
      ["6th - Saint-Germain-des-Pres", "75006", 1500],
      ["7th - Eiffel Tower / Invalides", "75007", 2500],
    ]) {
      const config = getAreaConfig(area, "Paris");
      const start = Date.now();
      const result = await searchFreeLiveDirectory({
        category: "cafe",
        categoryLabel: "Cafe",
        country: "France",
        countryCode: "FR",
        city: "Paris",
        area,
        bypassCache: true,
      });
      const duration = Date.now() - start;
      console.log(`[Paris ${pc}] ${result.leads.length} leads in ${(duration / 1000).toFixed(1)}s`);
      assert.ok(duration < 60000, `${area} search took ${duration}ms, must complete under 60s`);
      assert.ok(result.leads.length > 0, `${area} Cafe must return leads`);
      for (const lead of result.leads) {
        const pcs = (lead.address || "").match(/\b750\d{2}\b/g) || [];
        for (const found of pcs) {
          assert.equal(found, pc, `${area} lead ${lead.name} carries postcode ${found}`);
        }
        const d = haversineDistanceMeters(config.centerLat, config.centerLon, lead.lat, lead.lon);
        assert.ok(d <= bound, `${area} lead ${lead.name} at ${Math.round(d)}m > ${bound}m sane bound`);
      }
      console.log(`[Paris ${pc}] no other-arrondissement postcodes in any address.`);
    }
  });

  // ---------------------------------------------------------------------------
  // LIVE 3: Sydney Newtown + Paddington Cafe — real suburbs, real results,
  // all within the 2500m suburb radius.
  // ---------------------------------------------------------------------------
  await test("LIVE 3: Sydney Newtown and Paddington return local results", async () => {
    for (const area of ["Newtown", "Paddington"]) {
      const config = getAreaConfig(area, "Sydney");
      const start = Date.now();
      const result = await searchFreeLiveDirectory({
        category: "cafe",
        categoryLabel: "Cafe",
        country: "Australia",
        countryCode: "AU",
        city: "Sydney",
        area,
        bypassCache: true,
      });
      const duration = Date.now() - start;
      console.log(`[Sydney ${area}] ${result.leads.length} leads in ${(duration / 1000).toFixed(1)}s`);
      assert.ok(duration < 60000, `${area} search took ${duration}ms, must complete under 60s`);
      assert.ok(result.leads.length > 0, `${area} Cafe must return leads`);
      for (const lead of result.leads) {
        const d = haversineDistanceMeters(config.centerLat, config.centerLon, lead.lat, lead.lon);
        assert.ok(d <= config.radiusMeters, `${area} lead ${lead.name} at ${Math.round(d)}m > ${config.radiusMeters}m`);
      }
      console.log(`[Sydney ${area}] all leads within ${config.radiusMeters}m.`);
    }
  });

  console.log("================================================================================");
  console.log(`  ROUND 4 AREA FIXES: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");
  if (failedCount > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("[FATAL] Test runner crashed:", err);
  process.exit(1);
});
