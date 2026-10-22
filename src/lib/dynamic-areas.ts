import fs from "fs";
import path from "path";
import { AREAS, isCoordinateInCityBounds, normalizeKey, type AreaConfig } from "./areas";

export interface DynamicAreaResult {
  areas: string[];
  cityCenter: { lat: number; lon: number };
  isDynamic: boolean;
  source: "osm_suburbs" | "city_centre_fallback";
}

const CACHE_TTL_30_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getDynamicCacheDir(): string {
  const dir = path.join(process.cwd(), ".cache", "dynamic-areas");
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {}
  return dir;
}

const dynamicMemoryCache = new Map<
  string,
  {
    result: DynamicAreaResult;
    expiresAt: number;
  }
>();

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * Geocodes a city using OSM Nominatim strictly bounded with countrycodes.
 */
export async function geocodeCityWithNominatim(
  cityName: string,
  countryCode: string
): Promise<{
  centerLat: number;
  centerLon: number;
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
} | null> {
  const cleanCity = cityName.trim();
  const cCode = countryCode.trim().toLowerCase();
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    `${cleanCity}, ${countryCode}`
  )}&countrycodes=${cCode}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "LeadGenPro-Worldwide-Directory/2.0 (OpenStreetMap Geocoding; support@leadgenpro.com)",
        "Referer": "https://leadgenpro.com",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    const centerLat = parseFloat(first.lat);
    const centerLon = parseFloat(first.lon);
    if (isNaN(centerLat) || isNaN(centerLon)) return null;

    let minLat = centerLat - 0.15;
    let maxLat = centerLat + 0.15;
    let minLon = centerLon - 0.15;
    let maxLon = centerLon + 0.15;

    if (Array.isArray(first.boundingbox) && first.boundingbox.length === 4) {
      minLat = parseFloat(first.boundingbox[0]);
      maxLat = parseFloat(first.boundingbox[1]);
      minLon = parseFloat(first.boundingbox[2]);
      maxLon = parseFloat(first.boundingbox[3]);
    }

    return {
      centerLat,
      centerLon,
      bbox: { minLat, maxLat, minLon, maxLon },
    };
  } catch (err: any) {
    console.warn(`[Nominatim Geocode Failed for ${cleanCity}, ${countryCode}]:`, err.message);
    return null;
  }
}

/**
 * Resolves areas for any city worldwide:
 * Queries Overpass for place=suburb / place=neighbourhood nodes within the city bbox.
 * Validates each node coordinate against the city bbox.
 * Falls back to "City centre" (3000m radius) if no suburbs exist.
 * Caches result per city for 30 days.
 */
export async function getOrBuildCityAreas(
  cityNameOrOptions: string | { city: string; cityName?: string; countryCode?: string; country?: string },
  countryCodeParam?: string
): Promise<DynamicAreaResult> {
  const cityName =
    typeof cityNameOrOptions === "object"
      ? cityNameOrOptions.city || cityNameOrOptions.cityName || ""
      : cityNameOrOptions;
  const countryCode =
    typeof cityNameOrOptions === "object"
      ? cityNameOrOptions.countryCode || "NL"
      : countryCodeParam || "BD";

  const cacheKey = `${countryCode}_${cityName}`.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const now = Date.now();

  // 1. Check memory cache
  const mem = dynamicMemoryCache.get(cacheKey);
  if (mem && mem.expiresAt > now) {
    return mem.result;
  }

  // 2. Check disk cache
  try {
    const filePath = path.join(getDynamicCacheDir(), `${cacheKey}.json`);
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (parsed.expiresAt && parsed.expiresAt > now) {
        dynamicMemoryCache.set(cacheKey, parsed);
        // Register areas into AREAS table
        for (const a of parsed.result.areas) {
          const compKey = normalizeKey(`${cityName}_${a}`);
          if (!AREAS[compKey]) {
            AREAS[compKey] = {
              name: a,
              city: cityName,
              centerLat: parsed.result.cityCenter.lat,
              centerLon: parsed.result.cityCenter.lon,
              radiusMeters: a.toLowerCase() === "city centre" ? 3000 : 2000,
            };
          }
        }
        return parsed.result;
      }
    }
  } catch {}

  // 3. Geocode city with Nominatim
  const geo = await geocodeCityWithNominatim(cityName, countryCode);
  const cityCenter = geo
    ? { lat: geo.centerLat, lon: geo.centerLon }
    : { lat: 52.3676, lon: 4.9041 }; // Default fallback coordinates

  let suburbNames: string[] = [];

  if (geo) {
    const { minLat, maxLat, minLon, maxLon } = geo.bbox;
    const overpassQuery = `[out:json][timeout:25];(node["place"~"suburb|neighbourhood|quarter"](${minLat},${minLon},${maxLat},${maxLon}););out center;`;

    for (const mirrorUrl of OVERPASS_MIRRORS) {
      try {
        const res = await fetch(mirrorUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "LeadGenPro-Worldwide-Directory/2.0 (Overpass Suburb Fallback)",
          },
          body: "data=" + encodeURIComponent(overpassQuery),
          signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json.elements) && json.elements.length > 0) {
          for (const el of json.elements) {
            const rawName = el.tags?.name || el.tags?.["name:en"];
            if (!rawName || rawName.trim().length < 2) continue;
            const nodeLat = el.lat ?? el.center?.lat;
            const nodeLon = el.lon ?? el.center?.lon;
            if (nodeLat === undefined || nodeLon === undefined) continue;

            // Bug 1 Validation: must lie inside city bbox
            if (
              nodeLat >= minLat &&
              nodeLat <= maxLat &&
              nodeLon >= minLon &&
              nodeLon <= maxLon
            ) {
              const cleanSub = rawName.trim();
              if (!suburbNames.includes(cleanSub)) {
                suburbNames.push(cleanSub);
                const compKey = normalizeKey(`${cityName}_${cleanSub}`);
                AREAS[compKey] = {
                  name: cleanSub,
                  city: cityName,
                  centerLat: nodeLat,
                  centerLon: nodeLon,
                  radiusMeters: 2000,
                };
              }
            }
          }
          if (suburbNames.length > 0) break;
        }
      } catch (err: any) {
        console.warn(`[Dynamic Area Overpass Mirror Failed ${mirrorUrl}]:`, err.message);
      }
    }
  }

  // 4. If city has no suburb/neighbourhood nodes, offer "City centre" search (Prompt 5 Worldwide Coverage)
  let result: DynamicAreaResult;
  if (suburbNames.length > 0) {
    result = {
      areas: suburbNames.slice(0, 30),
      cityCenter,
      isDynamic: true,
      source: "osm_suburbs",
    };
  } else {
    const centreName = "City centre";
    const compKey = normalizeKey(`${cityName}_${centreName}`);
    AREAS[compKey] = {
      name: centreName,
      city: cityName,
      centerLat: cityCenter.lat,
      centerLon: cityCenter.lon,
      radiusMeters: 3000,
    };
    result = {
      areas: [centreName],
      cityCenter,
      isDynamic: true,
      source: "city_centre_fallback",
    };
  }

  // 5. Cache for 30 days
  const expiresAt = now + CACHE_TTL_30_DAYS_MS;
  dynamicMemoryCache.set(cacheKey, { result, expiresAt });
  try {
    const filePath = path.join(getDynamicCacheDir(), `${cacheKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ result, expiresAt }), "utf-8");
  } catch {}

  return result;
}
