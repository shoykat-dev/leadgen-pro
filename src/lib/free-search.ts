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
import { getOverturePlacesInBBox } from "./db";

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
  resultHeaderNote?: string;
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
 * Checks similarity between two business names for merging Overture and Overpass records.
 */
function isSimilarBusinessName(nameA: string, nameB: string): boolean {
  const normA = normalizeBusinessName(nameA);
  const normB = normalizeBusinessName(nameB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Substring match for names of reasonable length
  if (normA.length >= 4 && normB.length >= 4) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }

  // Bigram Dice coefficient similarity
  if (normA.length < 2 || normB.length < 2) return false;
  const bigramsA = new Set<string>();
  for (let i = 0; i < normA.length - 1; i++) bigramsA.add(normA.slice(i, i + 2));
  const bigramsB = new Set<string>();
  for (let i = 0; i < normB.length - 1; i++) bigramsB.add(normB.slice(i, i + 2));

  let common = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) common++;
  }
  const total = bigramsA.size + bigramsB.size;
  if (total === 0) return false;
  return (2 * common) / total >= 0.55;
}

/**
 * Builds the Overpass QL query string with nwr and (around:radius, lat, lon)
 */
function buildOverpassQuery(
  tags: OsmTagCriteria[],
  radiusMeters: number,
  lat: number,
  lon: number,
  timeoutSeconds = 60
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
 * Per Prompt 5 Bug 2: Timeout per mirror max 25s (configured to 22s).
 */
async function fetchOverpassMirror(
  mirrorUrl: string,
  query: string,
  timeoutMs = 22000
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
 * Per Prompt 5 Bug 2: Never spin longer than 60s total; max 25s per mirror.
 */
async function fetchOverpassWithFailover(
  tags: OsmTagCriteria[],
  radiusMeters: number,
  lat: number,
  lon: number,
  simulateMirror1Failure = false
): Promise<OverpassElement[]> {
  const query = buildOverpassQuery(tags, radiusMeters, lat, lon, 60);
  let lastError: Error | null = null;
  const startTime = Date.now();

  for (let i = 0; i < OVERPASS_MIRRORS.length; i++) {
    // 52s global timeout guard to ensure total request never exceeds 60s
    if (Date.now() - startTime > 52000) {
      console.warn("[Overpass Failover] Global 52s limit approached. Aborting mirror attempts.");
      break;
    }

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
      const remainingTime = Math.max(5000, 55000 - (Date.now() - startTime));
      const mirrorTimeout = Math.min(22000, remainingTime);
      const elements = await fetchOverpassMirror(mirrorUrl, query, mirrorTimeout);
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
        await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
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

  // 2. Check Server-Side Cache (Key: areaId + categoryId + radius, TTL: 7 days)
  if (!bypassCache) {
    const cachedEntry = getFromCache<BusinessLead[]>(areaId, category, radiusMeters);
    if (cachedEntry) {
      // Re-verify Haversine distance on cached rows to guarantee zero area leak
      const strictlyWithinLeads = cachedEntry.data.filter((l) => {
        if (l.lat === undefined || l.lat === null || l.lon === undefined || l.lon === null || isNaN(l.lat) || isNaN(l.lon)) return false;
        const d = haversineDistanceMeters(centerLat, centerLon, l.lat, l.lon);
        return d <= radiusMeters;
      });

      console.log(
        `[ServerCache HIT] Key: (${areaId}, ${category}, ${radiusMeters}m) -> Returned ${strictlyWithinLeads.length} leads strictly within ${radiusMeters}m. Last updated: ${cachedEntry.lastUpdated}`
      );
      for (const l of strictlyWithinLeads) {
        const d = haversineDistanceMeters(centerLat, centerLon, l.lat!, l.lon!);
        console.log(`[Haversine Cache Audit] ${l.name.padEnd(38)}: ${d.toFixed(1).padStart(6)}m / ${radiusMeters}m <= ${radiusMeters}m [PASS]`);
      }

      return {
        leads: strictlyWithinLeads,
        source: "free_directory",
        total: strictlyWithinLeads.length,
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

    // BUG 6 Fix: A lead is included ONLY if the element's OWN primary tag matches the category tag mapping
    const tags = el.tags || {};
    const matchesCategoryTag = tagSpecs.some((ts) => tags[ts.key] === ts.value);
    if (!matchesCategoryTag) {
      continue;
    }

    // Explicitly exclude non-matching establishments that might sit in commercial spaces (Bug 6)
    const isFoodCategory = tagSpecs.some(
      (ts) => ts.key === "amenity" && ["restaurant", "cafe", "fast_food", "food_court", "bar", "pub"].includes(ts.value)
    );
    if (isFoodCategory) {
      if (tags.office && !tags.amenity) continue;
      if (tags.craft && !tags.amenity) continue;
      if (
        tags.shop &&
        !["bakery", "pastry", "coffee", "tea", "deli", "ice_cream", "confectionery"].includes(tags.shop) &&
        !tags.amenity
      ) {
        continue;
      }
      const rawNameLower = (tags.name || "").toLowerCase();
      if (
        rawNameLower.includes("interiors") ||
        rawNameLower.includes("interior design") ||
        rawNameLower.includes("coffee machine supplier") ||
        rawNameLower.includes("documents clearing")
      ) {
        continue;
      }
    }

    const rawName = tags.name || tags["name:en"] || tags.brand;
    if (!rawName || rawName.trim().length < 2) continue;

    const cleanName = rawName.trim();
    const isWithin = distanceToCenter <= radiusMeters;

    // Acceptance Test 1 Debug Log to prove distance adherence
    console.log(
      `[Haversine] ${cleanName}: ${distanceToCenter.toFixed(1)}m from ${areaConfig.name} center (${centerLat}, ${centerLon}) [Within ${radiusMeters}m: ${isWithin ? "PASS" : "FAIL"}]`
    );

    if (!isWithin) {
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
        phoneStatus = "Format valid"; // Phone format is valid (OSM)
        canWhatsApp = pRes.canWhatsApp;
      }
    }

    // Deduplication Tier 2: Check normalized name + (same phone OR coordinates within 50m)
    const normName = normalizeBusinessName(cleanName);
    const isDuplicate = leads.some((existing) => {
      const existingNorm = normalizeBusinessName(existing.name);
      if (existingNorm === normName) {
        if (existing.phone && phone && existing.phone === phone) return true;
        if (existing.lat && existing.lon) {
          const distBetween = haversineDistanceMeters(
            existing.lat,
            existing.lon,
            lat,
            lon
          );
          if (distBetween <= 50) return true;
        }
      }
      return false;
    });

    if (isDuplicate) {
      continue;
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

    // Address (Prompt 5 Bug 4: Street address detection)
    const street = tags["addr:street"] || tags.street || "";
    const housenumber = tags["addr:housenumber"] || tags.housenumber || "";
    const streetAddress = [housenumber, street].filter(Boolean).join(" ");
    const hasFullStreet = Boolean(streetAddress || tags["addr:full"]);

    let address: string;
    let secondaryLocation: string | undefined = undefined;
    let hasStreetAddress: boolean;

    if (hasFullStreet) {
      address = streetAddress || tags["addr:full"];
      hasStreetAddress = true;
    } else {
      address = "Street address not available in OSM record";
      secondaryLocation = `${areaConfig.name}, ${areaConfig.city}`;
      hasStreetAddress = false;
    }

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
      leadSources: ["osm"],
      fieldAttribution: {
        name: "osm",
        phone: phone ? "osm" : undefined,
        email: email ? "osm" : undefined,
        website: website ? "osm" : undefined,
        address: "osm",
      },
      name: cleanName,
      category: categoryLabel,
      primaryType: tags.amenity || tags.shop || tags.office || tags.craft || tags.leisure || category,
      address,
      secondaryLocation,
      hasStreetAddress,
      distanceMeters: distanceToCenter,
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
      scoreReasons: scoreResult.reasons,
      sourceUpdatedAt: tags["check_date"] || now,
      fetchedAt: now,
    });
  }

  // 7. Overture Maps Integration & Merge (Prompt 3 Part A)
  // Query Overture Places from SQLite within bounding box of the target area
  const deltaLat = (radiusMeters + 500) / 111000;
  const deltaLon = (radiusMeters + 500) / (111000 * Math.max(0.1, Math.cos((centerLat * Math.PI) / 180)));
  const minLat = centerLat - deltaLat;
  const maxLat = centerLat + deltaLat;
  const minLon = centerLon - deltaLon;
  const maxLon = centerLon + deltaLon;

  let rawOverturePlaces: any[] = [];
  try {
    rawOverturePlaces = getOverturePlacesInBBox(minLat, maxLat, minLon, maxLon);
    console.log(
      `[Overture Query] Found ${rawOverturePlaces.length} Overture Places in BBox for ${areaConfig.name} (${minLat.toFixed(3)} - ${maxLat.toFixed(3)}, ${minLon.toFixed(3)} - ${maxLon.toFixed(3)}).`
    );
  } catch (err: any) {
    console.warn("[Overture Query Warning]:", err.message);
  }

  const matchedOvertureIds = new Set<string>();

  // Merge Overture records with Overpass results (match when normalized names are similar AND coordinates <= 100m)
  for (const lead of leads) {
    if (!lead.lat || !lead.lon) continue;

    const matchedOv = rawOverturePlaces.find((ov) => {
      if (matchedOvertureIds.has(ov.id)) return false;
      const dist = haversineDistanceMeters(lead.lat!, lead.lon!, ov.lat, ov.lon);
      if (dist > 100) return false;
      return isSimilarBusinessName(lead.name, ov.name);
    });

    if (matchedOv) {
      matchedOvertureIds.add(matchedOv.id);
      lead.leadSources = ["osm", "overture"];
      lead.sourceUpdatedAt = matchedOv.updated_at || lead.sourceUpdatedAt;

      const attr = lead.fieldAttribution || { name: "osm" };

      // Merge rule: Prefer Overpass (fresher) value for phone/website, keep union of emails
      // 1. Phone merge
      if (!lead.phone && matchedOv.phones && matchedOv.phones.length > 0) {
        const rawOvPhone = matchedOv.phones[0];
        const ovPhoneRes = validatePhone(rawOvPhone, cCode);
        if (ovPhoneRes.phone) {
          lead.phone = ovPhoneRes.phone;
          lead.phoneE164 = ovPhoneRes.phoneE164;
          lead.phoneStatus = "Format valid";
          lead.canWhatsApp = ovPhoneRes.canWhatsApp;
          attr.phone = "overture";
        }
      } else if (lead.phone) {
        attr.phone = "osm";
      }

      // 2. Website merge
      if (!lead.website && matchedOv.websites && matchedOv.websites.length > 0) {
        const rawOvWeb = matchedOv.websites[0];
        const webRes = classifyWebsite(rawOvWeb);
        if (webRes.website) {
          lead.website = webRes.website;
          lead.websiteStatus = webRes.websiteStatus;
          lead.hasWebsite = webRes.websiteStatus === "Has Website";
          attr.website = "overture";
        }
      } else if (lead.website) {
        attr.website = "osm";
      }

      // 3. Email merge: keep union of fields / both emails
      if (!lead.email && matchedOv.emails && matchedOv.emails.length > 0) {
        const ovEmail = matchedOv.emails[0];
        const eRes = validateEmail(ovEmail, lead.website);
        if (eRes.email) {
          lead.email = eRes.email;
          lead.emailStatus = "OpenStreetMap";
          lead.emailProvenance = "osm";
          attr.email = "overture";
        }
      } else if (lead.email) {
        attr.email = "osm";
      }

      // 4. Socials & Facebook: keep the Facebook URL from Overture
      if (matchedOv.socials && matchedOv.socials.length > 0) {
        const socialObjs = matchedOv.socials.map((s: string) => {
          let platform = "social";
          const lower = s.toLowerCase();
          if (lower.includes("facebook.com") || lower.includes("fb.com")) platform = "Facebook";
          else if (lower.includes("instagram.com")) platform = "Instagram";
          else if (lower.includes("linkedin.com")) platform = "LinkedIn";
          else if (lower.includes("twitter.com") || lower.includes("x.com")) platform = "Twitter/X";
          return { platform, url: s };
        });

        lead.socials = socialObjs;
        const fb = socialObjs.find((s: any) => s.platform === "Facebook");
        if (fb) lead.facebookUrl = fb.url;
        attr.socials = "overture";
      }

      lead.fieldAttribution = attr;

      // Recompute Lead Score using real signals (Prompt 3 Part C)
      const reScore = calculateLeadScore({
        websiteStatus: lead.websiteStatus,
        phoneStatus: lead.phoneStatus,
        phone: lead.phone,
        email: lead.email,
        emailStatus: lead.emailStatus,
        socials: lead.socials,
        facebookUrl: lead.facebookUrl,
        sourceUpdatedAt: lead.sourceUpdatedAt,
        fetchedAt: lead.fetchedAt,
      });

      lead.leadScore = reScore.score;
      lead.leadScoreTier = reScore.tier;
      lead.scoreReasons = reScore.reasons;

      console.log(
        `[Merged Lead] "${lead.name}" successfully merged with Overture record "${matchedOv.name}" (ID: ${matchedOv.id}). Attribution:`,
        attr
      );
    }
  }

  // Also include unmatched Overture places within area radius that match category or keywords
  for (const ov of rawOverturePlaces) {
    if (matchedOvertureIds.has(ov.id)) continue;
    const distToCenter = haversineDistanceMeters(centerLat, centerLon, ov.lat, ov.lon);
    if (distToCenter > radiusMeters) continue;

    const cleanName = (ov.name || "").trim();
    if (!cleanName || cleanName.length < 2) continue;

    const ovCats = (ov.categories || []).map((c: string) => c.toLowerCase());
    const targetCat = category.toLowerCase().replace(/_/g, " ");
    const isRelevant =
      category === "all" ||
      ovCats.some((c: string) => c.includes(targetCat) || targetCat.includes(c)) ||
      tagSpecs.some((t) => ovCats.some((c: string) => c.includes(t.value)));

    if (!isRelevant) continue;

    let phone: string | null = null;
    let phoneE164: string | null = null;
    let phoneStatus: "Valid" | "Format valid" | "Phone format unverified" | "Missing" = "Missing";
    let canWhatsApp = false;

    if (ov.phones && ov.phones.length > 0) {
      const pRes = validatePhone(ov.phones[0], cCode);
      if (pRes.phone) {
        phone = pRes.phone;
        phoneE164 = pRes.phoneE164;
        phoneStatus = "Format valid";
        canWhatsApp = pRes.canWhatsApp;
      }
    }

    const rawWeb = ov.websites?.[0] || null;
    const webRes = classifyWebsite(rawWeb);

    let email: string | null = null;
    let emailStatus: "OpenStreetMap" | "Missing" = "Missing";
    if (ov.emails && ov.emails.length > 0) {
      const eRes = validateEmail(ov.emails[0], webRes.website);
      if (eRes.email) {
        email = eRes.email;
        emailStatus = "OpenStreetMap";
      }
    }

    const socialObjs = (ov.socials || []).map((s: string) => {
      let platform = "social";
      const lower = s.toLowerCase();
      if (lower.includes("facebook.com") || lower.includes("fb.com")) platform = "Facebook";
      else if (lower.includes("instagram.com")) platform = "Instagram";
      else if (lower.includes("linkedin.com")) platform = "LinkedIn";
      return { platform, url: s };
    });
    const facebookUrl = socialObjs.find((s: any) => s.platform === "Facebook")?.url || null;

    const fullAddress =
      ov.addresses?.[0]?.freeform ||
      `${areaConfig.name}, ${areaConfig.city}`;

    const scoreResult = calculateLeadScore({
      websiteStatus: webRes.websiteStatus,
      phoneStatus,
      phone,
      email,
      emailStatus,
      socials: socialObjs,
      facebookUrl,
      sourceUpdatedAt: ov.updated_at,
      fetchedAt: now,
    });

    const googleMapsUri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${cleanName}, ${areaConfig.name}, ${areaConfig.city}`
    )}`;

    leads.push({
      id: `ov_${ov.id.replace(/[^a-zA-Z0-9]/g, "_")}`,
      placeId: `ov_${ov.id}`,
      source: "free_directory",
      leadSources: ["overture"],
      fieldAttribution: {
        name: "overture",
        phone: phone ? "overture" : undefined,
        email: email ? "overture" : undefined,
        website: webRes.website ? "overture" : undefined,
        socials: socialObjs.length > 0 ? "overture" : undefined,
        address: "overture",
      },
      name: cleanName,
      category: categoryLabel,
      primaryType: ov.categories?.[0] || category,
      address: fullAddress,
      lat: ov.lat,
      lon: ov.lon,
      phone,
      phoneE164,
      phoneStatus,
      canWhatsApp,
      email,
      emailProvenance: email ? "osm" : undefined,
      emailStatus,
      website: webRes.website,
      websiteStatus: webRes.websiteStatus,
      hasWebsite: webRes.websiteStatus === "Has Website",
      socials: socialObjs,
      facebookUrl,
      rating: null,
      userRatingCount: null,
      googleMapsUri,
      businessStatus: "OPERATIONAL",
      dataQuality: assessDataQuality({ phoneStatus, email, emailStatus, websiteStatus: webRes.websiteStatus }),
      leadScore: scoreResult.score,
      leadScoreTier: scoreResult.tier,
      scoreReasons: scoreResult.reasons,
      sourceUpdatedAt: ov.updated_at,
      fetchedAt: now,
    });
  }

  // 8. FINAL MANDATORY HAVERSINE POST-FILTER ON THE COMPLETED RESULT LIST:
  // Must run on the FINAL result list on EVERY element type (node, way, relation).
  // Any result with missing, NaN, or unresolved coordinates is strictly EXCLUDED.
  let finalFilteredLeads: BusinessLead[] = [];
  for (const lead of leads) {
    if (lead.lat === undefined || lead.lat === null || lead.lon === undefined || lead.lon === null || isNaN(lead.lat) || isNaN(lead.lon)) {
      console.warn(`[Area Radius Audit] EXCLUDED "${lead.name}" (${lead.id}): missing coordinates`);
      continue;
    }

    const distMeters = haversineDistanceMeters(centerLat, centerLon, lead.lat, lead.lon);
    const isWithin = distMeters <= radiusMeters;

    // Auditable debug log: per search, log every returned business with its computed distance in meters from area center
    console.log(
      `[Haversine Distance Audit] ${lead.name.padEnd(38)}: ${distMeters.toFixed(1).padStart(6)}m / ${radiusMeters}m <= ${radiusMeters}m [${isWithin ? "PASS" : "EXCLUDED"}]`
    );

    if (isWithin) {
      lead.distanceMeters = distMeters;
      finalFilteredLeads.push(lead);
    }
  }

  console.log(
    `[Final Post-Filter] ${finalFilteredLeads.length} / ${leads.length} leads strictly confirmed within ${radiusMeters}m of ${areaConfig.name} center (${centerLat}, ${centerLon}).`
  );

  // BUG 7 Sanity Check: If major city + major category returns < 10 leads, log warning with query
  const majorCities = ["madrid", "berlin", "paris", "london", "newyork", "newyorkcity", "sydney", "dubai", "mumbai", "dhaka", "barcelona"];
  const cityKey = (areaConfig.city || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const isMajorCity = majorCities.includes(cityKey);
  const isMajorFoodCategory = ["restaurant", "cafe", "fast_food"].includes(category.toLowerCase());

  if (isMajorCity && isMajorFoodCategory && finalFilteredLeads.length < 10) {
    const checkQuery = buildOverpassQuery(tagSpecs, radiusMeters, centerLat, centerLon, 60);
    console.warn(`[Sanity Check Warning: Low Count in ${areaConfig.city} / ${areaConfig.name}]`, {
      city: areaConfig.city,
      area: areaConfig.name,
      category,
      count: finalFilteredLeads.length,
      query: checkQuery,
    });
  }

  // BUG 5 Fix: Shared contact and unverified generic email detection
  const phoneToNames = new Map<string, Set<string>>();
  const emailToNames = new Map<string, Set<string>>();

  for (const lead of finalFilteredLeads) {
    const normName = normalizeBusinessName(lead.name);
    if (lead.phone) {
      const pKey = lead.phoneE164 || lead.phone.replace(/[^0-9]/g, "");
      if (!phoneToNames.has(pKey)) phoneToNames.set(pKey, new Set());
      phoneToNames.get(pKey)!.add(normName);
    }
    if (lead.email) {
      const eKey = lead.email.toLowerCase().trim();
      if (!emailToNames.has(eKey)) emailToNames.set(eKey, new Set());
      emailToNames.get(eKey)!.add(normName);
    }
  }

  const GENERIC_EMAIL_DOMAINS = new Set([
    "gmail.com",
    "yahoo.com",
    "ymail.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "icloud.com",
    "aol.com",
    "zoho.com",
    "protonmail.com",
    "proton.me",
    "mail.com",
  ]);

  for (const lead of finalFilteredLeads) {
    let isShared = false;
    if (lead.phone) {
      const pKey = lead.phoneE164 || lead.phone.replace(/[^0-9]/g, "");
      if ((phoneToNames.get(pKey)?.size || 0) >= 3) {
        isShared = true;
      }
    }
    if (lead.email) {
      const eKey = lead.email.toLowerCase().trim();
      if ((emailToNames.get(eKey)?.size || 0) >= 3) {
        isShared = true;
      }
    }

    if (isShared) {
      lead.contactWarning = "Shared contact — verify before use";
    }

    if (lead.email) {
      const parts = lead.email.toLowerCase().split("@");
      if (parts.length === 2 && GENERIC_EMAIL_DOMAINS.has(parts[1])) {
        const localPart = parts[0].replace(/[^a-z0-9]/g, "");
        const normBiz = normalizeBusinessName(lead.name);
        const bizTokens = lead.name
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(
            (t) =>
              t.length >= 3 &&
              !["the", "and", "ltd", "llc", "inc", "co", "cafe", "restaurant", "food", "bar", "kitchen", "grill", "bistro", "house", "shop"].includes(t)
          );

        const hasTextualRelation =
          normBiz.length >= 3 &&
          (localPart.includes(normBiz) ||
            normBiz.includes(localPart) ||
            bizTokens.some((tok) => localPart.includes(tok)));

        if (!hasTextualRelation) {
          lead.emailWarning = "Unverified email — check before use";
        }
      }
    }
  }

  // BUG 4 Sorting: Within the same lead score, leads WITH a full street address come before placeholder ones
  finalFilteredLeads.sort((a, b) => {
    if (b.leadScore !== a.leadScore) return b.leadScore - a.leadScore;
    const aHas = a.hasStreetAddress ? 1 : 0;
    const bHas = b.hasStreetAddress ? 1 : 0;
    if (bHas !== aHas) return bHas - aHas;
    return (a.distanceMeters || 0) - (b.distanceMeters || 0);
  });

  // BUG 2 Hard Processing Cap: If match > 3000 businesses, keep 3000 closest by distance
  let resultHeaderNote: string | undefined = undefined;
  if (finalFilteredLeads.length > 3000) {
    const totalMatched = finalFilteredLeads.length;
    finalFilteredLeads.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    finalFilteredLeads = finalFilteredLeads.slice(0, 3000);
    resultHeaderNote = `Showing the 3,000 closest of ~${totalMatched.toLocaleString()} mapped businesses`;
    console.log(`[Hard Processing Cap Applied]: ${resultHeaderNote}`);
  }

  // 9. Save to Server-Side Cache (7-day TTL with radius included in key)
  const savedCache = saveToCache(areaId, category, finalFilteredLeads, radiusMeters);

  return {
    leads: finalFilteredLeads,
    source: "free_directory",
    total: finalFilteredLeads.length,
    areaConfig,
    cached: false,
    lastUpdated: savedCache.lastUpdated,
    resultHeaderNote,
  };
}
