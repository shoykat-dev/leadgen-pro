import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { mergeOverturePlaces } from "../src/lib/free-search.ts";

console.log("================================================================================");
console.log("  ROUND 6 — OVERTURE MERGE PERFORMANCE REGRESSION TESTS");
console.log("  After the Turso connection was fixed, the City of London Restaurant search");
console.log("  timed out twice (65 s, 0 leads): the merge scanned every Overture row per");
console.log("  OSM lead (~98M haversines per loop). The merge now uses a spatial grid");
console.log("  index with identical match rules. These tests prove the rules are");
console.log("  unchanged AND that 2,500 leads x 45,000 Overture rows merge in < 5 s.");
console.log("================================================================================\n");

// City of London centre, as used by the live search that timed out.
const CENTER_LAT = 51.5155;
const CENTER_LON = -0.0922;
const RADIUS_M = 2000;

function makeCtx(overrides = {}) {
  return {
    centerLat: CENTER_LAT,
    centerLon: CENTER_LON,
    radiusMeters: RADIUS_M,
    areaConfig: { name: "City of London", city: "London", postcode: null },
    category: "restaurant",
    categoryLabel: "Restaurant & Fine Dining",
    cCode: "GB",
    now: new Date().toISOString(),
    ...overrides,
  };
}

// Minimal OSM-shaped lead: every field the merge / scoring reads is present.
function makeLead(name, lat, lon, overrides = {}) {
  return {
    id: `osm_${name.replace(/[^a-zA-Z0-9]/g, "_")}_${Math.round(lat * 1e6)}`,
    name,
    lat,
    lon,
    leadSources: ["osm"],
    fieldAttribution: { name: "osm" },
    phone: null,
    phoneE164: null,
    phoneStatus: "Missing",
    phoneWarning: null,
    canWhatsApp: false,
    email: null,
    emailStatus: "Missing",
    emailProvenance: undefined,
    website: null,
    websiteStatus: "No Website",
    hasWebsite: false,
    socials: [],
    facebookUrl: null,
    facebookSource: null,
    instagramUrl: null,
    instagramSource: null,
    whatsappConfirmed: false,
    whatsapp: null,
    whatsappNumber: null,
    whatsappLink: null,
    whatsappStatus: "None",
    whatsappSource: null,
    sourceUpdatedAt: null,
    fetchedAt: new Date().toISOString(),
    leadScore: 0,
    leadScoreTier: "LOW",
    scoreReasons: [],
    isContactable: false,
    bestChannel: "none",
    bestChannelValue: null,
    bestChannelLabel: "None",
    ...overrides,
  };
}

// Minimal OverturePlaceRecord-shaped row.
function makeOv(id, name, lat, lon, overrides = {}) {
  return {
    id,
    name,
    categories: ["restaurant"],
    lat,
    lon,
    phones: [],
    emails: [],
    websites: [],
    socials: [],
    facebook_url: null,
    addresses: [{ freeform: null, locality: "London", region: null, postcode: null, country: "GB" }],
    sources: [],
    release_version: "2026-10-21.0",
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ~1 degree latitude = 111,000 m; longitude scaled by cos(lat) at London.
function offset(lat, lon, dNorthM, dEastM) {
  return [
    lat + dNorthM / 111000,
    lon + dEastM / (111000 * Math.cos((lat * Math.PI) / 180)),
  ];
}

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

  // Silence the merge's per-lead "[Merged Lead]" logs during the timed run
  // only; the unit tests below keep logging on.
  const realLog = console.log;

  // ---------------------------------------------------------------------------
  // UNIT 1: enrichment still merges a same-name Overture row within 100 m and
  // fills the missing phone from Overture.
  // ---------------------------------------------------------------------------
  await test("UNIT 1: Same-name Overture row within 100 m enriches the OSM lead", () => {
    const [ovLat, ovLon] = offset(CENTER_LAT, CENTER_LON, 30, 0);
    const leads = [makeLead("Testaurant London", CENTER_LAT, CENTER_LON)];
    const ovs = [
      makeOv("ov-1", "Testaurant London", ovLat, ovLon, { phones: ["+44 20 7403 1100"] }),
    ];
    mergeOverturePlaces(leads, ovs, makeCtx());
    assert.equal(leads.length, 1, "no duplicate lead should be added");
    assert.deepEqual(leads[0].leadSources, ["osm", "overture"]);
    assert.ok(leads[0].phone, "phone should be filled from Overture");
    assert.equal(leads[0].fieldAttribution.phone, "overture");
    assert.equal(leads[0].isContactable, true);
  });

  // ---------------------------------------------------------------------------
  // UNIT 2: the 100 m enrichment radius is unchanged — 150 m away, no merge.
  // ---------------------------------------------------------------------------
  await test("UNIT 2: Same name 150 m away does NOT merge (100 m rule kept)", () => {
    const [ovLat, ovLon] = offset(CENTER_LAT, CENTER_LON, 150, 0);
    const leads = [makeLead("Testaurant London", CENTER_LAT, CENTER_LON)];
    const ovs = [
      makeOv("ov-1", "Testaurant London", ovLat, ovLon, {
        phones: ["+44 20 7403 1100"],
        categories: ["office"], // non-matching category: must not be added either
      }),
    ];
    mergeOverturePlaces(leads, ovs, makeCtx());
    assert.equal(leads.length, 1);
    assert.deepEqual(leads[0].leadSources, ["osm"]);
    assert.equal(leads[0].phone, null);
  });

  // ---------------------------------------------------------------------------
  // UNIT 3: dissimilar names do not merge even 10 m apart.
  // ---------------------------------------------------------------------------
  await test("UNIT 3: Dissimilar name 10 m away does NOT merge", () => {
    const [ovLat, ovLon] = offset(CENTER_LAT, CENTER_LON, 10, 0);
    const leads = [makeLead("Zebra Crossing Cafe", CENTER_LAT, CENTER_LON)];
    const ovs = [
      makeOv("ov-1", "Quantum Logistics Hub", ovLat, ovLon, {
        phones: ["+44 20 7403 1100"],
        categories: ["office"],
      }),
    ];
    mergeOverturePlaces(leads, ovs, makeCtx());
    assert.equal(leads.length, 1);
    assert.equal(leads[0].phone, null);
  });

  // ---------------------------------------------------------------------------
  // UNIT 4: first-match semantics — when two Overture rows match, the FIRST
  // in array order wins, exactly as Array.find did before the grid.
  // ---------------------------------------------------------------------------
  await test("UNIT 4: Two matching rows — first in array order wins", () => {
    const [lat1, lon1] = offset(CENTER_LAT, CENTER_LON, 20, 0);
    const [lat2, lon2] = offset(CENTER_LAT, CENTER_LON, -20, 0);
    const leads = [makeLead("Testaurant London", CENTER_LAT, CENTER_LON)];
    const ovs = [
      makeOv("ov-first", "Testaurant London", lat1, lon1, { phones: ["+44 20 7403 1101"] }),
      makeOv("ov-second", "Testaurant London", lat2, lon2, { phones: ["+44 20 7403 1102"] }),
    ];
    mergeOverturePlaces(leads, ovs, makeCtx());
    assert.equal(leads.length, 1);
    assert.ok(
      (leads[0].phoneE164 || leads[0].phone || "").includes("74031101"),
      `expected the FIRST row's phone, got ${leads[0].phoneE164 || leads[0].phone}`
    );
  });

  // ---------------------------------------------------------------------------
  // UNIT 5: dedupe — an Overture row sharing a phone with an OSM lead within
  // 50 m (but with a dissimilar name, so enrichment did not fire) is NOT
  // added as a second lead.
  // ---------------------------------------------------------------------------
  await test("UNIT 5: Same-phone row within 50 m is deduped, not added twice", () => {
    const [ovLat, ovLon] = offset(CENTER_LAT, CENTER_LON, 20, 0);
    const leads = [
      makeLead("Luna Coffee House", CENTER_LAT, CENTER_LON, {
        phone: "+44 20 7407 4002",
        phoneE164: "+442074074002",
        phoneStatus: "Format valid",
      }),
    ];
    const ovs = [
      makeOv("ov-1", "Cafe Luna", ovLat, ovLon, { phones: ["+44 20 7407 4002"] }),
    ];
    mergeOverturePlaces(leads, ovs, makeCtx());
    assert.equal(leads.length, 1, "the duplicate must not be added");
    assert.equal(leads[0].name, "Luna Coffee House");
  });

  // ---------------------------------------------------------------------------
  // UNIT 6: an unmatched, in-radius, category-matching Overture row IS added
  // as an Overture-only lead.
  // ---------------------------------------------------------------------------
  await test("UNIT 6: Unmatched in-radius restaurant row is added as Overture-only lead", () => {
    const [ovLat, ovLon] = offset(CENTER_LAT, CENTER_LON, 500, 300);
    const leads = [makeLead("Far Away Diner", CENTER_LAT, CENTER_LON)];
    const ovs = [
      makeOv("ov-new", "Riverside Brasserie", ovLat, ovLon, {
        phones: ["+44 20 7403 9999"],
        emails: ["hello@riverside.example.co.uk"],
      }),
    ];
    mergeOverturePlaces(leads, ovs, makeCtx());
    assert.equal(leads.length, 2);
    const added = leads.find((l) => l.id === "ov_ov_new");
    assert.ok(added, "Overture-only lead should be present");
    assert.deepEqual(added.leadSources, ["overture"]);
    assert.equal(added.matchType, "overture");
    assert.ok(added.phone, "added lead should carry the Overture phone");
    assert.equal(added.email, "hello@riverside.example.co.uk");
  });

  // ---------------------------------------------------------------------------
  // UNIT 7: the category gate still applies — a non-restaurant row is not added.
  // ---------------------------------------------------------------------------
  await test("UNIT 7: Non-matching category row is NOT added", () => {
    const [ovLat, ovLon] = offset(CENTER_LAT, CENTER_LON, 500, 300);
    const leads = [makeLead("Far Away Diner", CENTER_LAT, CENTER_LON)];
    const ovs = [
      makeOv("ov-office", "Riverside Offices Ltd", ovLat, ovLon, {
        categories: ["office"],
        phones: ["+44 20 7403 9999"],
      }),
    ];
    mergeOverturePlaces(leads, ovs, makeCtx());
    assert.equal(leads.length, 1);
  });

  // ---------------------------------------------------------------------------
  // UNIT 8: rows outside the search radius are not added as Overture-only leads.
  // ---------------------------------------------------------------------------
  await test("UNIT 8: Row outside the radius is NOT added", () => {
    const [ovLat, ovLon] = offset(CENTER_LAT, CENTER_LON, 2600, 0);
    const leads = [makeLead("Far Away Diner", CENTER_LAT, CENTER_LON)];
    const ovs = [makeOv("ov-far", "Outskirts Bistro", ovLat, ovLon)];
    mergeOverturePlaces(leads, ovs, makeCtx());
    assert.equal(leads.length, 1);
  });

  // ---------------------------------------------------------------------------
  // PERF: 2,500 OSM leads x 45,000 Overture rows (City-of-London density)
  // must merge in under 5 seconds in-process. Fixture construction is NOT
  // timed — only the merge step is.
  // ---------------------------------------------------------------------------
  await test("PERF: 2,500 leads x 45,000 Overture rows merge in < 5 s", () => {
    // Deterministic pseudo-random generator so the fixture is stable.
    let seed = 20261116;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const NAME_POOL = [];
    const stems = ["Cafe", "Bistro", "Trattoria", "Diner", "Brasserie", "Eatery", "Grill", "Tavern", "Kitchen", "Bakery"];
    const middles = ["Aroma", "Verde", "Luna", "Marina", "Olive", "Saffron", "Willow", "Copper", "Harbour", "Ember"];
    for (const s of stems) {
      for (const m of middles) {
        for (let n = 1; n <= 6; n++) NAME_POOL.push(`${s} ${m} ${n}`);
      }
    }
    const NON_FOOD_CATS = [["office"], ["store"], ["bank"], ["hotel"], ["fitness"]];
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];

    const leads = [];
    for (let i = 0; i < 2500; i++) {
      const [lat, lon] = offset(CENTER_LAT, CENTER_LON, (rand() - 0.5) * 4000, (rand() - 0.5) * 4000);
      leads.push(makeLead(pick(NAME_POOL), lat, lon));
    }

    const ovs = [];
    for (let i = 0; i < 45000; i++) {
      const [lat, lon] = offset(CENTER_LAT, CENTER_LON, (rand() - 0.5) * 5000, (rand() - 0.5) * 5000);
      const isRestaurant = rand() < 0.04; // ~4% restaurant share, as in the real bbox
      ovs.push(
        makeOv(`ov-perf-${i}`, pick(NAME_POOL), lat, lon, {
          categories: isRestaurant ? ["restaurant"] : pick(NON_FOOD_CATS),
          phones: rand() < 0.6 ? [`+44 20 7${String(100 + Math.floor(rand() * 900))} ${String(1000 + Math.floor(rand() * 9000))}`] : [],
          emails: rand() < 0.2 ? [`hello${i}@example.co.uk`] : [],
          websites: rand() < 0.5 ? [`https://www.example${i}.co.uk`] : [],
        })
      );
    }

    const mergedBefore = leads.length;
    console.log = () => {}; // mute per-merge logs for the timed run
    let elapsedMs;
    try {
      const t0 = performance.now();
      mergeOverturePlaces(leads, ovs, makeCtx());
      elapsedMs = performance.now() - t0;
    } finally {
      console.log = realLog;
    }
    realLog(`       merged ${mergedBefore} leads + 45,000 Overture rows in ${elapsedMs.toFixed(0)} ms -> ${leads.length} leads`);
    assert.ok(
      elapsedMs < 5000,
      `merge took ${elapsedMs.toFixed(0)} ms, over the 5,000 ms budget`
    );
    assert.ok(leads.length >= mergedBefore, "merge must not drop OSM leads");
  });

  console.log("================================================================================");
  console.log(`  ROUND 6 RESULTS: ${passedCount} passed, ${failedCount} failed`);
  console.log("================================================================================");
  if (failedCount > 0) process.exit(1);
}

runTests();
