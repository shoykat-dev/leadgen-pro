import {
  type BusinessLead,
  validatePhone,
  validateEmail,
  classifyWebsite,
  calculateLeadScore,
  assessDataQuality,
} from "./data-integrity";
import { getAreaConfig, haversineDistanceMeters, type AreaConfig } from "./areas";
import { getFallbackCoordinates } from "./location-hierarchy";
import { getCategoryOsmTags, type OsmTagCriteria } from "./category-tags";
import { getFromCache, saveToCache } from "./server-cache";

export interface FreeSearchOptions {
  query?: string;
  category: string;
  categoryLabel?: string;
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  area?: string;
  lat?: number | null;
  lon?: number | null;
  bypassCache?: boolean;
  simulateMirror1Failure?: boolean; // For testing failover resilience
}

export interface FreeSearchResult {
  leads: BusinessLead[];
  source: "free_directory";
  total: number;
  areaConfig: AreaConfig;
  cached?: boolean;
  lastUpdated?: string;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

// Public Overpass API mirrors for rotation & automatic failover
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
}

/**
 * Builds the Overpass QL query string with nwr and (around:radius, lat, lon)
 */
function buildOverpassQuery(
  tags: OsmTagCriteria[],
  radiusMeters: number,
  lat: number,
  lon: number,
  timeoutSeconds = 120
): string {
  const statements = tags
    .map(
      (t) =>
        `nwr["${t.key}"="${t.value}"](around:${radiusMeters}, ${lat}, ${lon});`
    )
    .join("\n  ");

  return `[out:json][timeout:${timeoutSeconds}];
(
  ${statements}
);
out center tags;`;
}

/**
 * Executes an Overpass query against a single mirror with a resilient timeout.
 */
async function fetchOverpassMirror(
  mirrorUrl: string,
  query: string,
  timeoutMs = 12000
): Promise<OverpassElement[]> {
  const res = await fetch(mirrorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "LeadGenPro-Directory-Scanner/2.0 (Mozilla/5.0; OpenStreetMap MultiTag Resilience; contact: support@leadgenpro.com)",
      "Referer": "https://leadgenpro.com",
    },
    body: "data=" + encodeURIComponent(query),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`Mirror ${mirrorUrl} returned HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("json")) {
    const text = await res.text();
    throw new Error(
      `Mirror ${mirrorUrl} returned non-JSON response: ${text.slice(0, 100)}`
    );
  }

  const json = await res.json();
  if (!Array.isArray(json.elements)) {
    throw new Error(
      `Mirror ${mirrorUrl} returned invalid payload structure (no elements array)`
    );
  }

  return json.elements;
}

/**
 * Robust fetcher with mirror rotation, automatic failover on 429/5xx/timeout, and exponential backoff.
 */
async function fetchOverpassWithFailover(
  tags: OsmTagCriteria[],
  radiusMeters: number,
  lat: number,
  lon: number,
  simulateMirror1Failure = false
): Promise<OverpassElement[]> {
  const query = buildOverpassQuery(tags, radiusMeters, lat, lon, 120);
  let lastError: Error | null = null;

  for (let i = 0; i < OVERPASS_MIRRORS.length; i++) {
    const mirrorUrl = OVERPASS_MIRRORS[i];

    // Mirror 1 simulation failure hook for Acceptance Test 2
    if (i === 0 && simulateMirror1Failure) {
      console.warn(
        `[Overpass Failover Simulation] Intentionally failing Mirror 1 (${mirrorUrl}) to verify automatic failover.`
      );
      continue;
    }

    try {
      console.log(
        `[Overpass Mirror ${i + 1}/${OVERPASS_MIRRORS.length}] Querying ${mirrorUrl}...`
      );
      const elements = await fetchOverpassMirror(mirrorUrl, query, 12000);
      console.log(
        `[Overpass Mirror Success] ${mirrorUrl} returned ${elements.length} raw elements.`
      );
      return elements;
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[Overpass Mirror ${i + 1} Failed] ${mirrorUrl}: ${err.message}. Rotating to next mirror...`
      );

      // Backoff before trying next mirror
      if (i < OVERPASS_MIRRORS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
      }
    }
  }

  // If combined multi-tag query failed across all mirrors, try query splitting per tag
  if (tags.length > 1) {
    console.log(
      `[Overpass Splitting] Combined query failed. Splitting into ${tags.length} individual tag queries...`
    );
    const combinedElements: OverpassElement[] = [];

    for (const singleTag of tags) {
      const splitQuery = buildOverpassQuery([singleTag], radiusMeters, lat, lon, 60);

      for (const mirrorUrl of OVERPASS_MIRRORS) {
        try {
          const elements = await fetchOverpassMirror(mirrorUrl, splitQuery, 45000);
          combinedElements.push(...elements);
          break; // Succeeded for this tag, move to next
        } catch {
          // Try next mirror for this tag
        }
      }
    }

    if (combinedElements.length > 0) {
      return combinedElements;
    }
  }

  throw (
    lastError ||
    new Error("All OpenStreetMap Overpass mirrors are currently busy or unavailable.")
  );
}

/**
 * Searches real local businesses using OpenStreetMap Overpass API:
 * 1. Multi-tag mapping per category (e.g. amenity=restaurant, amenity=fast_food, amenity=cafe).
 * 2. High reliability mirror rotation across overpass-api.de, overpass.kumi.systems, overpass.private.coffee.
 * 3. Two-tier deduplication: by OSM type+id, then by normalized name + coordinates within 50m.
 * 4. Mandatory Haversine post-filtering <= radiusMeters.
 * 5. Server-side caching keyed by areaId + categoryId (TTL: 7 days) returning "Last updated" date.
 * 6. Hard data honesty: 0 fake emails, phones, ratings, or websites.
 */
export async function searchFreeLiveDirectory(
  options: FreeSearchOptions
): Promise<FreeSearchResult> {
  const {
    category,
    categoryLabel = category,
    country = "Bangladesh",
    countryCode = "BD",
    city = "Dhaka",
    area = "Banani",
    bypassCache = false,
    simulateMirror1Failure = false,
  } = options;

  const cCode = (countryCode || "BD").toUpperCase();

  // 1. Resolve exact Area Configuration
  const fallbackCoords = getFallbackCoordinates(city, area, cCode);
  const areaConfig = getAreaConfig(
    area || city,
    city,
    options.lat || fallbackCoords?.lat,
    options.lon || fallbackCoords?.lon
  );

  const { centerLat, centerLon, radiusMeters } = areaConfig;
  const areaId = `${cCode}_${areaConfig.city}_${areaConfig.name}`.toLowerCase();

  // 2. Check Server-Side Cache (Key: areaId + categoryId, TTL: 7 days)
  if (!bypassCache) {
    const cachedEntry = getFromCache<BusinessLead[]>(areaId, category);
    if (cachedEntry) {
      console.log(
        `[ServerCache HIT] Key: (${areaId}, ${category}) -> Returned ${cachedEntry.data.length} leads instantly. Last updated: ${cachedEntry.lastUpdated}`
      );
      return {
        leads: cachedEntry.data,
        source: "free_directory",
        total: cachedEntry.data.length,
        areaConfig,
        cached: true,
        lastUpdated: cachedEntry.lastUpdated,
      };
    }
  }

  // 3. Resolve Multi-Tag Criteria for the category
  const tagSpecs = getCategoryOsmTags(category);
  console.log(
    `[Category Multi-Tag] "${category}" mapped to ${tagSpecs.length} OSM tags:`,
    tagSpecs.map((t) => `${t.key}=${t.value}`).join(", ")
  );

  // 4. Fetch from Overpass mirrors with automatic failover
  let rawElements: OverpassElement[] = [];
  try {
    rawElements = await fetchOverpassWithFailover(
      tagSpecs,
      radiusMeters,
      centerLat,
      centerLon,
      simulateMirror1Failure
    );
  } catch (err: any) {
    console.error("[Overpass Execution Error]:", err.message);
    throw new Error(
      "Data source busy, please try again in a few moments."
    );
  }

  // 5. Deduplication Tier 1: Dedupe by OSM type + id
  const uniqueOsmElements: OverpassElement[] = [];
  const seenOsmTypeAndId = new Set<string>();

  for (const el of rawElements) {
    const osmKey = `${el.type}/${el.id}`;
    if (seenOsmTypeAndId.has(osmKey)) {
      continue;
    }
    seenOsmTypeAndId.add(osmKey);
    uniqueOsmElements.push(el);
  }

  console.log(
    `[Dedupe Tier 1] ${rawElements.length} raw elements deduplicated to ${uniqueOsmElements.length} unique OSM records.`
  );

  // 6. Mandatory Haversine Post-Filtering & Deduplication Tier 2:
  // Post-filter every lead <= radiusMeters, then dedupe by normalized name + coordinates <= 50m.
  const leads: BusinessLead[] = [];
  const now = new Date().toISOString();

  for (const el of uniqueOsmElements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    // Calculate Haversine distance in meters from area centroid
    const distanceToCenter = haversineDistanceMeters(
      centerLat,
      centerLon,
      lat,
      lon
    );

    // MANDATORY POST-FILTER: Keep only results within radiusMeters of area center
    const isWithin = distanceToCenter <= radiusMeters;
    const tags = el.tags || {};
    const rawName = tags.name || tags["name:en"] || tags.brand;
    if (!rawName || rawName.trim().length < 2) continue;

    const cleanName = rawName.trim();

    // Acceptance Test 1 Debug Log to prove distance adherence
    console.log(
      `[Haversine] ${cleanName}: ${distanceToCenter.toFixed(1)}m from ${areaConfig.name} center (${centerLat}, ${centerLon}) [Within ${radiusMeters}m: ${isWithin ? "PASS" : "FAIL"}]`
    );

    if (!isWithin) {
      continue;
    }

    // Deduplication Tier 2: Check normalized name + coordinates within 50m
    const normName = normalizeBusinessName(cleanName);
    const isDuplicate = leads.some((existing) => {
      if (!existing.lat || !existing.lon) return false;
      const existingNorm = normalizeBusinessName(existing.name);
      if (existingNorm === normName) {
        const distBetween = haversineDistanceMeters(
          existing.lat,
          existing.lon,
          lat,
          lon
        );
        return distBetween <= 50;
      }
      return false;
    });

    if (isDuplicate) {
      continue;
    }

    // 7. Strict Data Honesty (BUG 2 Fix - Never fabricate or guess)
    const rawPhone =
      tags.phone ||
      tags["contact:phone"] ||
      tags.mobile ||
      tags["contact:mobile"] ||
      tags.telephone ||
      tags["contact:telephone"] ||
      null;

    let phone: string | null = null;
    let phoneE164: string | null = null;
    let phoneStatus: "Valid" | "Format valid" | "Phone format unverified" | "Missing" = "Missing";
    let canWhatsApp = false;

    if (rawPhone) {
      const pRes = validatePhone(rawPhone, cCode);
      if (pRes.phoneStatus === "Valid") {
        phone = pRes.phone;
        phoneE164 = pRes.phoneE164;
        phoneStatus = "Format valid"; // Display format verified only (no fabricated 'Verified Mobile')
        canWhatsApp = pRes.canWhatsApp;
      }
    }

    // Website: Extract ONLY from real OSM tags
    const rawWebsite =
      tags.website ||
      tags["contact:website"] ||
      tags.url ||
      tags["contact:url"] ||
      null;

    const webRes = classifyWebsite(rawWebsite);
    const website = webRes.website;
    const websiteStatus = webRes.websiteStatus;

    // Email: Extract ONLY from real OSM tags
    const rawEmail =
      tags.email ||
      tags["contact:email"] ||
      null;

    let email: string | null = null;
    let emailStatus: "OpenStreetMap" | "Missing" = "Missing";

    if (rawEmail) {
      const eRes = validateEmail(rawEmail, website);
      if (eRes.email) {
        email = eRes.email;
        emailStatus = "OpenStreetMap";
      }
    }

    // Address
    const street = tags["addr:street"] || "";
    const housenumber = tags["addr:housenumber"] || "";
    const streetAddress = [housenumber, street].filter(Boolean).join(" ");
    const fullAddress =
      streetAddress ||
      tags["addr:full"] ||
      `${areaConfig.name}, ${areaConfig.city}`;

    // Ratings/reviews are null (Data Honesty)
    const rating = null;
    const userRatingCount = null;

    // Outbound Google Maps search URL (real, un-scraped link)
    const encodedSearch = encodeURIComponent(
      `${cleanName}, ${areaConfig.name}, ${areaConfig.city}`
    );
    const googleMapsUri = `https://www.google.com/maps/search/?api=1&query=${encodedSearch}`;

    const scoreResult = calculateLeadScore({
      phoneStatus,
      email,
      emailStatus,
      websiteStatus,
      rating: null,
      userRatingCount: null,
    });

    const leadScore = scoreResult.score;
    const leadScoreTier = scoreResult.tier;

    const dataQuality = assessDataQuality({
      phoneStatus,
      email,
      emailStatus,
      websiteStatus,
    });

    leads.push({
      id: `free_${el.type}_${el.id}`,
      placeId: `osm_${el.type}_${el.id}`,
      source: "free_directory",
      name: cleanName,
      category: categoryLabel,
      primaryType: tags.amenity || tags.shop || tags.office || tags.craft || tags.leisure || category,
      address: fullAddress,
      lat,
      lon,
      phone,
      phoneE164,
      phoneStatus,
      canWhatsApp,
      email,
      emailProvenance: email ? "osm" : undefined,
      emailStatus,
      website,
      websiteStatus,
      hasWebsite: websiteStatus === "Has Website",
      rating,
      userRatingCount,
      googleMapsUri,
      businessStatus: "OPERATIONAL",
      dataQuality,
      leadScore,
      leadScoreTier,
      fetchedAt: now,
    });
  }

  console.log(
    `[Dedupe Tier 2 & Haversine] Finished processing. Returning ${leads.length} validated leads for ${areaConfig.name}.`
  );

  // 8. Save to Server-Side Cache (7-day TTL)
  const savedCache = saveToCache(areaId, category, leads);

  return {
    leads,
    source: "free_directory",
    total: leads.length,
    areaConfig,
    cached: false,
    lastUpdated: savedCache.lastUpdated,
  };
}
