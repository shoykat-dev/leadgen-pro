import {
  type BusinessLead,
  validatePhone,
  validateEmail,
  classifyWebsite,
  validateRecordUrl,
  validatePlatformUrl,
  buildSocialUrl,
  calculateLeadScore,
  assessDataQuality,
  computeLeadContactability,
} from "./data-integrity";
import { getAreaConfig, haversineDistanceMeters, postcodeConflicts, type AreaConfig } from "./areas";
import { getFallbackCoordinates } from "./location-hierarchy";
import {
  getCategoryOsmTags,
  getCategoryNameKeywords,
  getCategoriesForTag,
  nameMatchesKeywords,
  nameMatchesPhraseExclusions,
  nameMatchesFoodBlocklist,
  overtureCategoriesMatch,
  NAME_MATCH_EXCLUSIONS,
  NAME_MATCH_PHRASE_EXCLUSIONS,
  NAME_MATCH_BLOCKED_PRIMARY_VALUES,
  type OsmTagCriteria,
} from "./category-tags";
import { getFromCache, saveToCache, formatLastUpdated } from "./server-cache";
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
  /** True when the data source gave up part-way and only some leads were collected. */
  partial?: boolean;
}

/**
 * Shared deadline for one search: every Overpass attempt (combined query,
 * per-tag split fallback, name-keyword query) must finish before this time,
 * so a search never spins longer than ~60s in total. Partial results collected
 * before the deadline are returned honestly instead of an error.
 */
const SEARCH_BUDGET_MS = 52000;
/** Name-keyword fetch is skipped once the tag query already found this many elements. */
const NAME_FALLBACK_TAG_CEILING = 400;

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
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
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

  // Substring match for names of reasonable length. Minimum 8 characters:
  // at 4, short names such as "Cafe" inside "Cafe Aroma" merged businesses
  // that merely share a generic word.
  if (normA.length >= 8 && normB.length >= 8) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }

  // Bigram Dice coefficient similarity. Threshold 0.80 (raised from 0.55 on
  // 2026-11-16): at 0.55, "Coal & Coffee Banani" wrongly merged with the Overture
  // record "Crimson Cup Coffee Banani" (Dice 0.57 — shared generic tokens
  // "coffee"/"banani") and inherited Crimson Cup's phone, email and website.
  // True same-business pairs (e.g. "Nando's Banani" vs "Nandos Banani") score ~0.95+.
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
  return (2 * common) / total >= 0.8;
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
 * Default 22s per attempt; callers pass a shorter budget (usually 15s) when
 * several mirrors still have to be tried inside the shared search deadline.
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

export interface OverpassFetchOutcome {
  elements: OverpassElement[];
  /** True when the deadline cut the fetch short with only some tags collected. */
  partial: boolean;
}

/**
 * Runs one Overpass query string against the mirrors in rotation, respecting
 * the shared search deadline. Returns the first successful response.
 */
async function fetchOverpassQueryWithFailover(
  query: string,
  deadlineMs: number,
  simulateMirror1Failure = false,
  /** Per-mirror ceiling. Tag queries use the 15s default; name-regex queries
   *  are far slower in dense areas (measured ~37s for a 2km central-London
   *  radius) and need a longer ceiling to ever succeed. The shared deadline
   *  still caps the total time — this only stops a slow mirror from being
   *  abandoned before it can answer. */
  perMirrorTimeoutMs = 15000
): Promise<OverpassElement[]> {
  let lastError: Error | null = null;

  for (let i = 0; i < OVERPASS_MIRRORS.length; i++) {
    const remaining = deadlineMs - Date.now();
    if (remaining <= 2000) {
      console.warn("[Overpass Failover] Search deadline reached. Aborting mirror attempts.");
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
      const mirrorTimeout = Math.min(perMirrorTimeoutMs, Math.max(5000, remaining - 1000));
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

  throw (
    lastError ||
    new Error("All OpenStreetMap Overpass mirrors are currently busy or unavailable.")
  );
}

/**
 * Robust fetcher with mirror rotation, automatic failover on 429/5xx/timeout, and exponential backoff.
 * Never spins longer than the shared search deadline (60s total for the whole
 * search). If the combined multi-tag query fails everywhere, it falls back to
 * per-tag split queries — also inside the same deadline — and returns whatever
 * was collected as a PARTIAL result instead of failing the whole search.
 */
async function fetchOverpassWithFailover(
  tags: OsmTagCriteria[],
  radiusMeters: number,
  lat: number,
  lon: number,
  deadlineMs: number,
  simulateMirror1Failure = false
): Promise<OverpassFetchOutcome> {
  const query = buildOverpassQuery(tags, radiusMeters, lat, lon, 60);

  try {
    const elements = await fetchOverpassQueryWithFailover(query, deadlineMs, simulateMirror1Failure);
    return { elements, partial: false };
  } catch (err: any) {
    console.warn(`[Overpass Failover] Combined query failed on all mirrors: ${err.message}`);
  }

  // If combined multi-tag query failed across all mirrors, try query splitting per tag.
  // The split shares the SAME deadline: every tag and mirror attempt checks the
  // remaining budget first, and whatever was collected before the deadline is
  // returned as a partial result (previously this fallback had no budget at
  // all and a single search could run ~71s).
  if (tags.length > 1) {
    console.log(
      `[Overpass Splitting] Combined query failed. Splitting into ${tags.length} individual tag queries...`
    );
    const combinedElements: OverpassElement[] = [];
    let tagsAttempted = 0;

    for (const singleTag of tags) {
      if (Date.now() > deadlineMs - 3000) {
        console.warn(
          `[Overpass Splitting] Deadline reached after ${tagsAttempted}/${tags.length} tags; returning ${combinedElements.length} collected elements as partial results.`
        );
        break;
      }
      tagsAttempted++;
      const splitQuery = buildOverpassQuery([singleTag], radiusMeters, lat, lon, 60);

      for (const mirrorUrl of OVERPASS_MIRRORS) {
        const remaining = deadlineMs - Date.now();
        if (remaining <= 2000) break;
        try {
          const elements = await fetchOverpassMirror(
            mirrorUrl,
            splitQuery,
            Math.min(12000, Math.max(4000, remaining - 1000))
          );
          combinedElements.push(...elements);
          break; // Succeeded for this tag, move to next
        } catch {
          // Try next mirror for this tag
        }
      }
    }

    if (combinedElements.length > 0) {
      const partial = tagsAttempted < tags.length;
      return { elements: combinedElements, partial };
    }
  }

  throw new Error("All OpenStreetMap Overpass mirrors are currently busy or unavailable.");
}

// ---------------------------------------------------------------------------
// Name-keyword fallback
// Service trades are rarely tagged with a category tag in OSM, so the tag
// query alone finds almost none of them. The fallback runs a second Overpass
// query matching business NAMES against the category keywords, then unions
// those elements with the tag set in the same pipeline (coordinates,
// Haversine post-filter, dedupe by element id). Tag matches always win:
// an element found by both counts once, as tag-matched.
// ---------------------------------------------------------------------------

/** OSM tag keys that mark an element's own business type (precedence rule). */
const PRIMARY_TAG_KEYS = [
  "amenity",
  "shop",
  "office",
  "craft",
  "leisure",
  "tourism",
  "healthcare",
  "club",
  "emergency",
];

/** OSM tag keys that count as commercial context for a name match. */
const COMMERCIAL_TAG_KEYS = [
  "amenity",
  "shop",
  "office",
  "craft",
  "leisure",
  "tourism",
  "healthcare",
  "club",
];

const CONTACT_TAG_KEYS = [
  "phone",
  "contact:phone",
  "mobile",
  "contact:mobile",
  "email",
  "contact:email",
  "website",
  "contact:website",
];

function escapeOverpassRegex(text: string): string {
  return text.replace(/[.*+?()[\]{}^$|\\]/g, "\\$&");
}

/**
 * Bounding box covering a circle of the given radius. Name-regex queries use
 * a bbox instead of `around:` — measured 37s vs >70s for a 2km central-London
 * radius (the `around` distance check is expensive on top of the regex scan).
 * The Haversine post-filter in the main loop is the real radius guarantee,
 * so the slightly larger bbox corners are harmless.
 */
function bboxForRadius(
  radiusMeters: number,
  lat: number,
  lon: number
): [number, number, number, number] {
  const latDelta = radiusMeters / 111320;
  const lonDelta = radiusMeters / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const south = Math.max(-90, lat - latDelta);
  const north = Math.min(90, lat + latDelta);
  const west = Math.max(-180, lon - lonDelta);
  const east = Math.min(180, lon + lonDelta);
  return [south, west, north, east];
}

/**
 * Builds the name-match Overpass query: elements whose name contains a
 * category keyword, restricted server-side to elements with a commercial tag,
 * a contact tag, or a commercial building context. The code-side checks in
 * the main loop (strict word-boundary keyword match, precedence rule) are the
 * real guarantee — this query only narrows the candidate set.
 *
 * The indexed tag filter comes FIRST in each statement and the area filter is
 * a bbox (see bboxForRadius) — both measured faster than the regex-first /
 * `around:` form for dense areas.
 */
function buildNameMatchQuery(
  keywords: string[],
  radiusMeters: number,
  lat: number,
  lon: number,
  timeoutSeconds = 60
): string {
  const pattern = keywords.map(escapeOverpassRegex).join("|");
  const [south, west, north, east] = bboxForRadius(radiusMeters, lat, lon);
  const bbox = `(${south},${west},${north},${east})`;
  const statements: string[] = [];
  for (const key of COMMERCIAL_TAG_KEYS) {
    statements.push(`nwr["${key}"]["name"~"${pattern}",i]${bbox};`);
  }
  for (const key of CONTACT_TAG_KEYS) {
    statements.push(`nwr["${key}"]["name"~"${pattern}",i]${bbox};`);
  }
  statements.push(`nwr["building"~"commercial|retail|office"]["name"~"${pattern}",i]${bbox};`);

  return `[out:json][timeout:${timeoutSeconds}];
(
  ${statements.join("\n  ")}
);
out center tags;`;
}

/**
 * Precedence rule: an element whose own primary tag maps to a DIFFERENT
 * category is never name-matched into this one. Returns false when the
 * element belongs elsewhere, true when it may be name-matched here.
 */
export function elementPassesNamePrecedence(
  tags: Record<string, string>,
  categoryId: string
): boolean {
  const normalizedId = categoryId.toLowerCase().trim();
  const mapped = new Set<string>();
  for (const key of PRIMARY_TAG_KEYS) {
    const value = tags[key];
    if (!value) continue;
    // A blocked primary tag (cinema, museum, library, ...) is never a local
    // service business, even though it maps to no directory category.
    if (NAME_MATCH_BLOCKED_PRIMARY_VALUES.has(value.toLowerCase().trim())) return false;
    for (const cat of getCategoriesForTag(key, value)) mapped.add(cat);
  }
  if (mapped.size === 0) return true; // Generic element — no category claims it.
  return mapped.has(normalizedId);
}

/** A name match needs a commercial tag, a contact tag, or a commercial building. */
export function elementHasCommercialContext(tags: Record<string, string>): boolean {
  for (const key of COMMERCIAL_TAG_KEYS) {
    if (tags[key]) return true;
  }
  for (const key of CONTACT_TAG_KEYS) {
    if (tags[key]) return true;
  }
  const building = (tags["building"] || "").toLowerCase();
  return building === "commercial" || building === "retail" || building === "office";
}

/**
 * Runs the name-keyword query inside the shared search deadline. A failure
 * here never fails the search — the tag results stand on their own.
 */
async function fetchNameMatches(
  keywords: string[],
  radiusMeters: number,
  lat: number,
  lon: number,
  deadlineMs: number
): Promise<OverpassElement[]> {
  if (keywords.length === 0) return [];
  const remaining = deadlineMs - Date.now();
  if (remaining <= 10000) {
    console.warn("[Name Fallback] Skipped: less than 10s left in the search budget.");
    return [];
  }
  const query = buildNameMatchQuery(keywords, radiusMeters, lat, lon, 60);
  try {
    // Name-regex queries are slow in dense areas (measured ~37s for a 2km
    // central-London radius), so they get a 40s per-mirror ceiling instead of
    // the 15s tag-query default. The shared deadline still caps total time.
    const elements = await fetchOverpassQueryWithFailover(query, deadlineMs, false, 40000);
    console.log(`[Name Fallback] Name query returned ${elements.length} candidate elements.`);
    return elements;
  } catch (err: any) {
    console.warn(`[Name Fallback] Name query failed (${err.message}); continuing with tag matches only.`);
    return [];
  }
}

/**
 * Turns raw Overture social URLs into validated { platform, url } objects.
 * Malformed URLs are dropped, and the platform is classified from the URL
 * hostname — never from a substring — so a link labelled Facebook really
 * points at facebook.com.
 */
function overtureSocialObjects(socials: string[]): { platform: string; url: string }[] {
  const out: { platform: string; url: string }[] = [];
  for (const s of socials || []) {
    const valid = validateRecordUrl(s);
    if (!valid) continue;
    let host = "";
    try {
      host = new URL(valid).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }
    let platform = "social";
    if (host === "facebook.com" || host === "fb.com" || host === "fb.me") platform = "Facebook";
    else if (host === "instagram.com" || host === "instagr.am") platform = "Instagram";
    else if (host === "linkedin.com") platform = "LinkedIn";
    else if (host === "twitter.com" || host === "x.com") platform = "Twitter/X";
    else if (host === "tiktok.com") platform = "TikTok";
    out.push({ platform, url: valid });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Coverage counts (used by the coverage-audit API route)
// Counts use the Overpass radius filter plus the same code-side rules as the
// main pipeline (strict keyword match, precedence, commercial context), but
// without the Haversine re-check on element centres — counts are therefore a
// close upper bound, and the audit UI says so.
// ---------------------------------------------------------------------------

export interface CategoryCoverageCounts {
  tagCount: number;
  nameCount: number;
  total: number;
}

function buildIdsQuery(
  tags: OsmTagCriteria[],
  radiusMeters: number,
  lat: number,
  lon: number
): string {
  const statements = tags
    .map((t) => `nwr["${t.key}"="${t.value}"](around:${radiusMeters}, ${lat}, ${lon});`)
    .join("\n  ");
  return `[out:json][timeout:30];
(
  ${statements}
);
out ids;`;
}

function buildNameTagsQuery(
  keywords: string[],
  radiusMeters: number,
  lat: number,
  lon: number
): string {
  const pattern = keywords.map(escapeOverpassRegex).join("|");
  const [south, west, north, east] = bboxForRadius(radiusMeters, lat, lon);
  const bbox = `(${south},${west},${north},${east})`;
  const statements: string[] = [];
  for (const key of COMMERCIAL_TAG_KEYS) {
    statements.push(`nwr["${key}"]["name"~"${pattern}",i]${bbox};`);
  }
  for (const key of CONTACT_TAG_KEYS) {
    statements.push(`nwr["${key}"]["name"~"${pattern}",i]${bbox};`);
  }
  statements.push(`nwr["building"~"commercial|retail|office"]["name"~"${pattern}",i]${bbox};`);
  return `[out:json][timeout:30];
(
  ${statements.join("\n  ")}
);
out tags;`;
}

/**
 * Counts tag-matched and name-matched businesses for one category in one area.
 * Used by the coverage audit; each query gets its own short deadline so one
 * slow category cannot stall the whole audit.
 */
export async function countCategoryCoverage(
  categoryId: string,
  radiusMeters: number,
  lat: number,
  lon: number,
  budgetMs = 25000
): Promise<CategoryCoverageCounts> {
  const tagSpecs = getCategoryOsmTags(categoryId);
  const keywords = getCategoryNameKeywords(categoryId);
  const deadlineMs = Date.now() + budgetMs;

  const tagIds = new Set<string>();
  try {
    const tagQuery = buildIdsQuery(tagSpecs, radiusMeters, lat, lon);
    const tagElements = await fetchOverpassQueryWithFailover(tagQuery, deadlineMs);
    for (const el of tagElements) tagIds.add(`${el.type}/${el.id}`);
  } catch (err: any) {
    console.warn(`[Coverage Audit] Tag count failed for ${categoryId}: ${err.message}`);
  }

  const nameIds = new Set<string>();
  if (keywords.length > 0) {
    try {
      const nameQuery = buildNameTagsQuery(keywords, radiusMeters, lat, lon);
      // The name query may use the whole remaining budget (name-regex scans
      // are slow in dense areas); the shared deadline still caps total time.
      const nameElements = await fetchOverpassQueryWithFailover(nameQuery, deadlineMs, false, budgetMs);
      const exclusions = NAME_MATCH_EXCLUSIONS[categoryId.toLowerCase().trim()] || [];
      const phraseExclusions = NAME_MATCH_PHRASE_EXCLUSIONS[categoryId.toLowerCase().trim()] || [];
      for (const el of nameElements) {
        const key = `${el.type}/${el.id}`;
        if (tagIds.has(key)) continue; // Tag-matched already — counts once, as tag.
        const tags = el.tags || {};
        const rawName = tags.name || tags["name:en"] || tags.brand || "";
        if (!rawName || !nameMatchesKeywords(rawName, keywords)) continue;
        if (!elementPassesNamePrecedence(tags, categoryId)) continue;
        if (!elementHasCommercialContext(tags)) continue;
        if (exclusions.some((ex) => tags[ex.key] === ex.value)) continue;
        if (nameMatchesPhraseExclusions(rawName, phraseExclusions)) continue;
        nameIds.add(key);
      }
    } catch (err: any) {
      console.warn(`[Coverage Audit] Name count failed for ${categoryId}: ${err.message}`);
    }
  }

  return {
    tagCount: tagIds.size,
    nameCount: nameIds.size,
    total: tagIds.size + nameIds.size,
  };
}

/**
 * Searches real local businesses using OpenStreetMap Overpass API:
 * 1. Multi-tag mapping per category (e.g. amenity=restaurant, amenity=fast_food, amenity=cafe).
 * 2. Name-keyword fallback for service trades (union with the tag set, badged "Matched by name").
 * 3. High reliability mirror rotation across overpass-api.de, overpass.kumi.systems, overpass.private.coffee.
 * 4. Two-tier deduplication: by OSM type+id, then by normalized name + coordinates within 50m.
 * 5. Mandatory Haversine post-filtering <= radiusMeters.
 * 6. Server-side caching keyed by areaId + categoryId (TTL: 7 days) returning "Last updated" date.
 * 7. Hard data honesty: 0 fake emails, phones, ratings, or websites.
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
    options.lon || fallbackCoords?.lon,
    cCode
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
      }).map((l) => {
        computeLeadContactability(l);
        return l;
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

  // Shared deadline for every Overpass attempt in this search (60s total).
  const searchDeadlineMs = Date.now() + SEARCH_BUDGET_MS;

  // 3. Resolve Multi-Tag Criteria for the category
  const tagSpecs = getCategoryOsmTags(category);
  console.log(
    `[Category Multi-Tag] "${category}" mapped to ${tagSpecs.length} OSM tags:`,
    tagSpecs.map((t) => `${t.key}=${t.value}`).join(", ")
  );

  // 4. Fetch from Overpass mirrors with automatic failover
  let tagElements: OverpassElement[] = [];
  let searchPartial = false;
  try {
    const tagOutcome = await fetchOverpassWithFailover(
      tagSpecs,
      radiusMeters,
      centerLat,
      centerLon,
      searchDeadlineMs,
      simulateMirror1Failure
    );
    tagElements = tagOutcome.elements;
    searchPartial = tagOutcome.partial;
  } catch (err: any) {
    console.error("[Overpass Execution Error]:", err.message);
    throw new Error(
      "Data source busy, please try again in a few moments."
    );
  }

  // 4b. Name-keyword fallback: service trades are rarely category-tagged, so
  // match business names too and union them with the tag set. Skipped when the
  // tag query already returned plenty (tag-rich categories gain nothing from
  // a second query) or when the search budget is nearly spent.
  const nameKeywords = getCategoryNameKeywords(category);
  let nameElements: OverpassElement[] = [];
  if (nameKeywords.length > 0 && tagElements.length < NAME_FALLBACK_TAG_CEILING) {
    nameElements = await fetchNameMatches(
      nameKeywords,
      radiusMeters,
      centerLat,
      centerLon,
      searchDeadlineMs
    );
  } else if (nameKeywords.length > 0) {
    console.log(
      `[Name Fallback] Skipped: tag query already returned ${tagElements.length} elements (>= ${NAME_FALLBACK_TAG_CEILING}).`
    );
  }

  const tagElementIds = new Set(tagElements.map((el) => `${el.type}/${el.id}`));
  const nameElementIds = new Set(nameElements.map((el) => `${el.type}/${el.id}`));

  // 5. Deduplication Tier 1: Dedupe by OSM type + id (tag set + name set union).
  // An element found by both counts once, as tag-matched.
  const uniqueOsmElements: OverpassElement[] = [];
  const seenOsmTypeAndId = new Set<string>();

  for (const el of [...tagElements, ...nameElements]) {
    const osmKey = `${el.type}/${el.id}`;
    if (seenOsmTypeAndId.has(osmKey)) {
      continue;
    }
    seenOsmTypeAndId.add(osmKey);
    uniqueOsmElements.push(el);
  }

  console.log(
    `[Dedupe Tier 1] ${tagElements.length} tag + ${nameElements.length} name elements deduplicated to ${uniqueOsmElements.length} unique OSM records.`
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

    // A lead enters a category ONLY via its own primary-tag mapping OR a
    // name-keyword match. An element found by both counts once, as tag-matched.
    const tags = el.tags || {};

    // Postcode-boundary gate (round 3): a record that asserts a different
    // Paris postcode belongs to another arrondissement — excluded even when
    // its coordinates fall inside the search circle (a circle cannot follow
    // a boundary). Records without a postcode are unaffected.
    if (postcodeConflicts(areaConfig.postcode, tags["addr:postcode"])) {
      continue;
    }

    const osmKey = `${el.type}/${el.id}`;
    const matchesCategoryTag = tagSpecs.some((ts) => tags[ts.key] === ts.value);
    const isNameCandidate = nameElementIds.has(osmKey) && !tagElementIds.has(osmKey);
    if (!matchesCategoryTag && !isNameCandidate) {
      continue;
    }

    const rawName = tags.name || tags["name:en"] || tags.brand;
    if (!rawName || rawName.trim().length < 2) continue;

    const matchType: "tag" | "name" = matchesCategoryTag ? "tag" : "name";

    // Name-only matches must pass every gate: strict word-boundary keyword
    // match, precedence rule (a barbershop named "Clean Cuts" stays out of
    // Cleaning), commercial context, and per-category exclusions (dry
    // cleaning never enters Cleaning).
    if (matchType === "name") {
      if (!nameMatchesKeywords(rawName, nameKeywords)) continue;
      if (!elementPassesNamePrecedence(tags, category)) continue;
      if (!elementHasCommercialContext(tags)) continue;
      const tagExclusions = NAME_MATCH_EXCLUSIONS[category.toLowerCase().trim()] || [];
      if (tagExclusions.some((ex) => tags[ex.key] === ex.value)) continue;
      const phraseExclusions = NAME_MATCH_PHRASE_EXCLUSIONS[category.toLowerCase().trim()] || [];
      if (nameMatchesPhraseExclusions(rawName, phraseExclusions)) continue;
    }

    // Explicitly exclude non-matching establishments that might sit in commercial spaces (Bug 6)
    const isFoodCategory = tagSpecs.some(
      (ts) => ts.key === "amenity" && ["restaurant", "cafe", "fast_food", "food_court", "bar", "pub"].includes(ts.value)
    );
    if (isFoodCategory) {
      // A name that shows the business is not food at all (events venue,
      // interiors firm, supplier) vetoes the lead however it is tagged —
      // OSM mis-tags venues (DORANGOS, a comedy-events business, is cafe).
      if (nameMatchesFoodBlocklist(rawName)) {
        continue;
      }
      // Structural exclusions apply to tag matches only: a name-matched
      // business is vouched for by its name plus the gates above.
      if (matchesCategoryTag) {
        if (tags.office && !tags.amenity) continue;
        if (tags.craft && !tags.amenity) continue;
        if (
          tags.shop &&
          !["bakery", "pastry", "coffee", "tea", "deli", "ice_cream", "confectionery"].includes(tags.shop) &&
          !tags.amenity
        ) {
          continue;
        }
      }
    }

    const cleanName = rawName.trim();
    const isWithin = distanceToCenter <= radiusMeters;

    // Acceptance Test 1 Debug Log to prove distance adherence
    console.log(
      `[Haversine] ${cleanName}: ${distanceToCenter.toFixed(1)}m from ${areaConfig.name} center (${centerLat}, ${centerLon}) [Within ${radiusMeters}m: ${isWithin ? "PASS" : "FAIL"}]`
    );

    if (!isWithin) {
      continue;
    }

    // 7. Strict Data Honesty (BUG 2 Fix - Never fabricate or guess) & Phase 6 Step 1 (Read ALL OSM contact tags)
    const contactTagSource: Record<string, string> = {};

    // 1. Phone extraction
    let rawPhone: string | null = null;
    const phoneKeys = ["phone", "contact:phone", "mobile", "contact:mobile", "telephone", "contact:telephone"];
    for (const pk of phoneKeys) {
      if (tags[pk]) {
        rawPhone = tags[pk];
        contactTagSource.phone = pk;
        break;
      }
    }

    let phone: string | null = null;
    let phoneE164: string | null = null;
    let phoneStatus: "Valid" | "Format valid" | "Phone format unverified" | "Missing" = "Missing";
    let canWhatsApp = false;
    let phoneWarning: string | null = null;

    if (rawPhone) {
      const pRes = validatePhone(rawPhone, cCode);
      if (pRes.isSuspicious) {
        // Placeholder-looking number (e.g. +91 22 1111 1111): never "Format valid".
        phoneWarning = "Suspicious number — verify before use";
      }
      if (pRes.phoneStatus === "Valid") {
        phone = pRes.phone;
        phoneE164 = pRes.phoneE164;
        phoneStatus = "Format valid"; // Phone format is valid (OSM)
        canWhatsApp = pRes.canWhatsApp;
      }
    }

    // 2. WhatsApp extraction (HARD RULE: ONLY from contact:whatsapp or whatsapp tag)
    let rawWhatsapp: string | null = null;
    let whatsappTag = "";
    if (tags["contact:whatsapp"]) {
      rawWhatsapp = tags["contact:whatsapp"];
      whatsappTag = "contact:whatsapp";
      contactTagSource.whatsapp = "contact:whatsapp";
    } else if (tags["whatsapp"]) {
      rawWhatsapp = tags["whatsapp"];
      whatsappTag = "whatsapp";
      contactTagSource.whatsapp = "whatsapp";
    }

    let whatsapp: string | null = null;
    let whatsappNumber: string | null = null;
    let whatsappLink: string | null = null;
    let whatsappConfirmed = false;
    let whatsappStatus: "WhatsApp (business-listed)" | "Mobile number — WhatsApp not confirmed" | "None" = "None";
    let whatsappSource: string | undefined = undefined;

    if (rawWhatsapp) {
      const pWaRes = validatePhone(rawWhatsapp, cCode);
      const digits = (pWaRes.phoneE164 || rawWhatsapp).replace(/[^0-9]/g, "");
      if (digits.length >= 8) {
        whatsapp = pWaRes.phone || (rawWhatsapp.startsWith("+") ? rawWhatsapp : `+${digits}`);
        whatsappNumber = digits;
        whatsappLink = `https://wa.me/${digits}`;
        whatsappConfirmed = true;
        whatsappStatus = "WhatsApp (business-listed)";
        whatsappSource = `OSM (${whatsappTag})`;
      }
    } else if (phone && phoneStatus === "Format valid" && canWhatsApp) {
      // Mobile-format number without WhatsApp evidence: NEVER label as WhatsApp or build wa.me link
      whatsappStatus = "Mobile number — WhatsApp not confirmed";
      whatsappConfirmed = false;
    }

    // Deduplication Tier 2: Check normalized name + (same phone OR coordinates within 50m)
    const normName = normalizeBusinessName(cleanName);
    const phoneDigits = phoneE164
      ? phoneE164.replace(/[^0-9]/g, "")
      : phone
      ? phone.replace(/[^0-9]/g, "")
      : "";
    const isDuplicate = leads.some((existing) => {
      // Cross-script duplicate: same normalised phone + coordinates within 50m
      // merges even when the names are in different scripts (e.g. Arabic vs Latin McDonald's).
      if (phoneDigits && existing.lat && existing.lon) {
        const existingDigits = existing.phoneE164
          ? existing.phoneE164.replace(/[^0-9]/g, "")
          : existing.phone
          ? existing.phone.replace(/[^0-9]/g, "")
          : "";
        if (existingDigits && existingDigits === phoneDigits) {
          const distBetween = haversineDistanceMeters(
            existing.lat,
            existing.lon,
            lat,
            lon
          );
          if (distBetween <= 50) return true;
        }
      }
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

    // 3. Website: Extract ONLY from real OSM tags
    let rawWebsite: string | null = null;
    const websiteKeys = ["website", "contact:website", "url", "contact:url"];
    for (const wk of websiteKeys) {
      if (tags[wk]) {
        rawWebsite = tags[wk];
        contactTagSource.website = wk;
        break;
      }
    }

    const webRes = classifyWebsite(rawWebsite);
    const website = webRes.website;
    const websiteStatus = webRes.websiteStatus;

    // 4. Email: Extract ONLY from real OSM tags
    let rawEmail: string | null = null;
    if (tags["email"]) {
      rawEmail = tags["email"];
      contactTagSource.email = "email";
    } else if (tags["contact:email"]) {
      rawEmail = tags["contact:email"];
      contactTagSource.email = "contact:email";
    }

    let email: string | null = null;
    let emailStatus: "OpenStreetMap" | "Missing" = "Missing";

    if (rawEmail) {
      const eRes = validateEmail(rawEmail, website);
      if (eRes.email) {
        email = eRes.email;
        emailStatus = "OpenStreetMap";
      }
    }

    // 5. Facebook & Instagram extraction (Phase 6 Step 1 & 2).
    // buildSocialUrl validates: an email address is never turned into a
    // social URL, and a value that already contains the platform domain is
    // never prefixed again (that used to double the domain).
    let rawFacebook = tags["contact:facebook"] || tags["facebook"] || null;
    if (tags["contact:facebook"]) contactTagSource.facebook = "contact:facebook";
    else if (tags["facebook"]) contactTagSource.facebook = "facebook";

    const facebookUrl = buildSocialUrl(rawFacebook, "facebook");

    let rawInstagram = tags["contact:instagram"] || tags["instagram"] || null;
    if (tags["contact:instagram"]) contactTagSource.instagram = "contact:instagram";
    else if (tags["instagram"]) contactTagSource.instagram = "instagram";

    const instagramUrl = buildSocialUrl(rawInstagram, "instagram");

    // Address (Phase 5 Bug 4: Street address detection)
    const street = tags["addr:street"] || tags.street || "";
    const housenumber = tags["addr:housenumber"] || tags.housenumber || "";
    const streetAddress = [housenumber, street].filter(Boolean).join(" ");
    // Housename + postcode disambiguate look-alike addresses (round 3:
    // "Fodoo Coffee Lounge, Corner George and Smith Streets" looked like a
    // Parramatta business until its housename "Myer City Store" and postcode
    // 2000 showed it is a CBD business — 237m from the CBD centre).
    const houseName = tags["addr:housename"] || "";
    const recordPostcode = tags["addr:postcode"] || "";
    const hasFullStreet = Boolean(streetAddress || tags["addr:full"]);

    let address: string;
    let secondaryLocation: string | undefined = undefined;
    let hasStreetAddress: boolean;

    if (hasFullStreet) {
      address = [houseName, streetAddress || tags["addr:full"], recordPostcode]
        .filter(Boolean)
        .join(", ");
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
      phone,
      canWhatsApp,
      email,
      emailStatus,
      websiteStatus,
      facebookUrl,
      instagramUrl,
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

    // Compute any-channel contactability & best channel (Phase 6 Step 6)
    const contactInfo = computeLeadContactability({
      whatsappConfirmed,
      whatsapp,
      whatsappNumber,
      whatsappLink,
      email,
      emailStatus,
      facebookUrl,
      instagramUrl,
      phone,
      phoneStatus,
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
        socials: facebookUrl || instagramUrl ? "osm" : undefined,
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
      phoneWarning,
      matchType,
      whatsapp,
      whatsappNumber,
      whatsappLink,
      whatsappConfirmed,
      whatsappStatus,
      whatsappSource,
      email,
      emailProvenance: email ? "osm" : undefined,
      emailStatus,
      website,
      websiteStatus,
      hasWebsite: websiteStatus === "Has Website",
      facebookUrl,
      facebookSource: facebookUrl ? "osm" : undefined,
      instagramUrl,
      instagramSource: instagramUrl ? "osm" : undefined,
      isContactable: contactInfo.isContactable,
      bestChannel: contactInfo.bestChannel,
      bestChannelValue: contactInfo.bestChannelValue,
      bestChannelLabel: contactInfo.bestChannelLabel,
      contactTagSource,
      rating,
      userRatingCount,
      googleMapsUri,
      googleMapsUrl: googleMapsUri,
      businessStatus: "OPERATIONAL",
      dataQuality,
      leadScore,
      leadScoreTier,
      scoreReasons: scoreResult.reasons,
      sourceUpdatedAt: tags["check_date"] || now,
      fetchedAt: now,
    });
  }

  // 7. Overture Maps Integration & Merge (Phase 3 Part A)
  // Query Overture Places from SQLite within bounding box of the target area
  const deltaLat = (radiusMeters + 500) / 111000;
  const deltaLon = (radiusMeters + 500) / (111000 * Math.max(0.1, Math.cos((centerLat * Math.PI) / 180)));
  const minLat = centerLat - deltaLat;
  const maxLat = centerLat + deltaLat;
  const minLon = centerLon - deltaLon;
  const maxLon = centerLon + deltaLon;

  let rawOverturePlaces: any[] = [];
  try {
    rawOverturePlaces = await getOverturePlacesInBBox(minLat, maxLat, minLon, maxLon);
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
        if (ovPhoneRes.isSuspicious && !lead.phoneWarning) {
          lead.phoneWarning = "Suspicious number — verify before use";
        }
        // Only accept libphonenumber-valid numbers as "Format valid" (same rule as the OSM path).
        if (ovPhoneRes.phoneStatus === "Valid" && ovPhoneRes.phone) {
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
          lead.emailProvenance = "overture";
          attr.email = "overture";
        }
      } else if (lead.email) {
        attr.email = "osm";
      }

      // 4. Socials & Facebook: keep the Facebook URL and Instagram URL from Overture (Phase 6 Step 2)
      if (matchedOv.socials && matchedOv.socials.length > 0) {
        const socialObjs = overtureSocialObjects(matchedOv.socials);

        if (socialObjs.length > 0) {
          lead.socials = socialObjs;
          const fb = socialObjs.find((s: any) => s.platform === "Facebook");
          if (fb && !lead.facebookUrl) {
            lead.facebookUrl = fb.url;
            lead.facebookSource = "overture";
          }
          const insta = socialObjs.find((s: any) => s.platform === "Instagram");
          if (insta && !lead.instagramUrl) {
            lead.instagramUrl = insta.url;
            lead.instagramSource = "overture";
          }
          attr.socials = "overture";
        }
      }

      if (matchedOv.facebook_url && !lead.facebookUrl) {
        const ovFb = validatePlatformUrl(matchedOv.facebook_url, "facebook");
        if (ovFb) {
          lead.facebookUrl = ovFb;
          lead.facebookSource = "overture";
        }
      }

      lead.fieldAttribution = attr;

      // Recompute Lead Score using real signals (Phase 3 Part C)
      const reScore = calculateLeadScore({
        websiteStatus: lead.websiteStatus,
        phoneStatus: lead.phoneStatus,
        phone: lead.phone,
        canWhatsApp: lead.canWhatsApp,
        email: lead.email,
        emailStatus: lead.emailStatus,
        socials: lead.socials,
        facebookUrl: lead.facebookUrl,
        instagramUrl: lead.instagramUrl,
        sourceUpdatedAt: lead.sourceUpdatedAt,
        fetchedAt: lead.fetchedAt,
      });

      lead.leadScore = reScore.score;
      lead.leadScoreTier = reScore.tier;
      lead.scoreReasons = reScore.reasons;

      // Recompute any-channel contactability & best channel (Phase 6 Step 6)
      const reContact = computeLeadContactability(lead);
      lead.isContactable = reContact.isContactable;
      lead.bestChannel = reContact.bestChannel;
      lead.bestChannelValue = reContact.bestChannelValue;
      lead.bestChannelLabel = reContact.bestChannelLabel;

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

    // Postcode-boundary gate (round 3): same rule as the OSM path — an
    // Overture record asserting a different Paris postcode belongs to
    // another arrondissement.
    const ovPostcode = ov.addresses?.[0]?.postcode || null;
    if (postcodeConflicts(areaConfig.postcode, ovPostcode)) continue;

    // Dedupe guard: never add an Overture row that duplicates an existing lead
    // (same normalised name + coords within 50m, or same normalised phone + coords
    // within 50m). Without this, a business present in both OSM and Overture but
    // failing the name-similarity merge above would appear twice in the results.
    const ovNormName = normalizeBusinessName(cleanName);
    const ovPhoneDigits = (ov.phones?.[0] || "").replace(/[^0-9]/g, "");
    const duplicatesExisting = leads.some((existing) => {
      if (!existing.lat || !existing.lon) return false;
      const d = haversineDistanceMeters(existing.lat, existing.lon, ov.lat, ov.lon);
      if (d > 50) return false;
      if (ovNormName && normalizeBusinessName(existing.name) === ovNormName) return true;
      if (ovPhoneDigits) {
        const exDigits = existing.phoneE164
          ? existing.phoneE164.replace(/[^0-9]/g, "")
          : existing.phone
          ? existing.phone.replace(/[^0-9]/g, "")
          : "";
        if (exDigits && exDigits === ovPhoneDigits) return true;
      }
      return false;
    });
    if (duplicatesExisting) continue;

    // Tight relevance gate: the Overture categories must contain a
    // per-category keyword as a whole word/phrase. The previous loose
    // substring check let unrelated trades through (e.g. an events business
    // under Restaurant). Food categories also apply the name blocklist.
    const ovCats = (ov.categories || []).map((c: string) => String(c));
    if (!overtureCategoriesMatch(category, ovCats)) continue;

    // Food categories also apply the name blocklist (an interiors firm or a
    // documents-clearing office is not a restaurant, however it is tagged).
    const isFoodTarget = ["restaurant", "cafe", "fast_food", "bakery", "catering", "bar_pub"].includes(
      category.toLowerCase().trim()
    );
    if (isFoodTarget && nameMatchesFoodBlocklist(cleanName)) {
      continue;
    }

    let phone: string | null = null;
    let phoneE164: string | null = null;
    let phoneStatus: "Valid" | "Format valid" | "Phone format unverified" | "Missing" = "Missing";
    let canWhatsApp = false;
    let phoneWarning: string | null = null;

    if (ov.phones && ov.phones.length > 0) {
      const pRes = validatePhone(ov.phones[0], cCode);
      if (pRes.isSuspicious) {
        phoneWarning = "Suspicious number — verify before use";
      }
      // Only accept libphonenumber-valid numbers as "Format valid" (same rule as the OSM path).
      if (pRes.phoneStatus === "Valid" && pRes.phone) {
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

    const socialObjs = overtureSocialObjects(ov.socials || []);
    const facebookUrl = socialObjs.find((s: any) => s.platform === "Facebook")?.url || null;
    const instagramUrl = socialObjs.find((s: any) => s.platform === "Instagram")?.url || null;

    const fullAddress =
      ov.addresses?.[0]?.freeform ||
      `${areaConfig.name}, ${areaConfig.city}`;

    const scoreResult = calculateLeadScore({
      websiteStatus: webRes.websiteStatus,
      phoneStatus,
      phone,
      canWhatsApp,
      email,
      emailStatus,
      socials: socialObjs,
      facebookUrl,
      instagramUrl,
      sourceUpdatedAt: ov.updated_at,
      fetchedAt: now,
    });

    const googleMapsUri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${cleanName}, ${areaConfig.name}, ${areaConfig.city}`
    )}`;

    const ovLead: BusinessLead = {
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
      phoneWarning,
      matchType: "overture",
      whatsapp: null,
      whatsappNumber: null,
      whatsappLink: null,
      whatsappConfirmed: false,
      whatsappStatus: canWhatsApp ? "Mobile number — WhatsApp not confirmed" : "Not listed as WhatsApp",
      whatsappSource: null,
      email,
      emailProvenance: email ? "overture" : undefined,
      emailStatus,
      website: webRes.website,
      websiteStatus: webRes.websiteStatus,
      hasWebsite: webRes.websiteStatus === "Has Website",
      socials: socialObjs,
      facebookUrl,
      facebookSource: facebookUrl ? "overture" : null,
      instagramUrl,
      instagramSource: instagramUrl ? "overture" : null,
      rating: null,
      userRatingCount: null,
      googleMapsUri,
      googleMapsUrl: googleMapsUri,
      businessStatus: "OPERATIONAL",
      dataQuality: assessDataQuality({ phoneStatus, email, emailStatus, websiteStatus: webRes.websiteStatus }),
      leadScore: scoreResult.score,
      leadScoreTier: scoreResult.tier,
      scoreReasons: scoreResult.reasons,
      sourceUpdatedAt: ov.updated_at,
      fetchedAt: now,
      contactTagSource: {},
    };

    computeLeadContactability(ovLead);
    leads.push(ovLead);
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
      if ((phoneToNames.get(pKey)?.size || 0) >= 2) {
        isShared = true;
      }
    }
    if (lead.email) {
      const eKey = lead.email.toLowerCase().trim();
      if ((emailToNames.get(eKey)?.size || 0) >= 2) {
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

  // Honest partial results: when the deadline cut the fetch short, return what
  // was collected with a clear note instead of failing the whole search.
  if (searchPartial) {
    resultHeaderNote = `Partial results — data source busy, showing ${finalFilteredLeads.length.toLocaleString()} businesses`;
    console.log(`[Partial Results] ${resultHeaderNote}`);
  }

  // 9. Save to Server-Side Cache (7-day TTL with radius included in key).
  // Partial results are NEVER cached — caching them would serve an incomplete
  // result set for 7 days.
  let lastUpdated: string;
  if (!searchPartial) {
    const savedCache = saveToCache(areaId, category, finalFilteredLeads, radiusMeters);
    lastUpdated = savedCache.lastUpdated;
  } else {
    lastUpdated = formatLastUpdated(new Date().toISOString());
  }

  return {
    leads: finalFilteredLeads,
    source: "free_directory",
    total: finalFilteredLeads.length,
    areaConfig,
    cached: false,
    lastUpdated,
    resultHeaderNote,
    partial: searchPartial,
  };
}
