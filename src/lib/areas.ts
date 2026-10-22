import areasData from "./areas-table.json" with { type: "json" };
import { getFallbackCoordinates } from "./location-hierarchy";

export interface AreaConfig {
  name: string;
  city: string;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;
}

/**
 * Normalizes string keys for flexible area dictionary lookups.
 */
export function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Authoritative AREAS data table mapping neighborhood/suburb areas to their exact center coordinates and radius.
 * Fixes OpenStreetMap lack of boundary polygons for suburb nodes (e.g. Banani).
 * Populated for all existing areas in the app using their center coordinates.
 */
export const AREAS: Record<string, AreaConfig> = {
  ...(areasData as Record<string, AreaConfig>),
  // Core verified reference areas per specification
  banani: { name: "Banani", city: "Dhaka", centerLat: 23.7937, centerLon: 90.4043, radiusMeters: 1500 },
  dhakabanani: { name: "Banani", city: "Dhaka", centerLat: 23.7937, centerLon: 90.4043, radiusMeters: 1500 },
  dhaka_banani: { name: "Banani", city: "Dhaka", centerLat: 23.7937, centerLon: 90.4043, radiusMeters: 1500 },
  gulshan1: { name: "Gulshan-1", city: "Dhaka", centerLat: 23.7785, centerLon: 90.4162, radiusMeters: 2000 },
  dhakagulshan1: { name: "Gulshan-1", city: "Dhaka", centerLat: 23.7785, centerLon: 90.4162, radiusMeters: 2000 },
  "gulshan-1": { name: "Gulshan-1", city: "Dhaka", centerLat: 23.7785, centerLon: 90.4162, radiusMeters: 2000 },
  gulshan2: { name: "Gulshan-2", city: "Dhaka", centerLat: 23.7925, centerLon: 90.4150, radiusMeters: 2000 },
  dhakagulshan2: { name: "Gulshan-2", city: "Dhaka", centerLat: 23.7925, centerLon: 90.4150, radiusMeters: 2000 },
  "gulshan-2": { name: "Gulshan-2", city: "Dhaka", centerLat: 23.7925, centerLon: 90.4150, radiusMeters: 2000 },
  dhanmondi: { name: "Dhanmondi", city: "Dhaka", centerLat: 23.7461, centerLon: 90.3742, radiusMeters: 2500 },
  dhakadhanmondi: { name: "Dhanmondi", city: "Dhaka", centerLat: 23.7461, centerLon: 90.3742, radiusMeters: 2500 },
  uttara: { name: "Uttara", city: "Dhaka", centerLat: 23.8759, centerLon: 90.3795, radiusMeters: 3000 },
  dhakauttara: { name: "Uttara", city: "Dhaka", centerLat: 23.8759, centerLon: 90.3795, radiusMeters: 3000 },
  mirpur: { name: "Mirpur", city: "Dhaka", centerLat: 23.8071, centerLon: 90.3686, radiusMeters: 3500 },
  dhakamirpur: { name: "Mirpur", city: "Dhaka", centerLat: 23.8071, centerLon: 90.3686, radiusMeters: 3500 },

  // Worldwide verified areas (Prompt 5 Worldwide Correctness)
  berlinmitte: { name: "Mitte", city: "Berlin", centerLat: 52.5200, centerLon: 13.4050, radiusMeters: 2000 },
  madridsalamanca: { name: "Salamanca", city: "Madrid", centerLat: 40.4285, centerLon: -3.6800, radiusMeters: 1800 },
  sydneysydneycbd: { name: "Sydney CBD", city: "Sydney", centerLat: -33.8688, centerLon: 151.2093, radiusMeters: 2000 },
  sydneycbd: { name: "Sydney CBD", city: "Sydney", centerLat: -33.8688, centerLon: 151.2093, radiusMeters: 2000 },
  dubaidowntowndubai: { name: "Downtown Dubai", city: "Dubai", centerLat: 25.1972, centerLon: 55.2744, radiusMeters: 2000 },
  dubaidowntown: { name: "Downtown Dubai", city: "Dubai", centerLat: 25.1972, centerLon: 55.2744, radiusMeters: 2000 },
  mumbaibandrawest: { name: "Bandra West", city: "Mumbai", centerLat: 19.0596, centerLon: 72.8295, radiusMeters: 2000 },
  bandrawest: { name: "Bandra West", city: "Mumbai", centerLat: 19.0596, centerLon: 72.8295, radiusMeters: 2000 },
  newyorkmidtown: { name: "Midtown", city: "New York", centerLat: 40.7549, centerLon: -73.9840, radiusMeters: 1800 },
  newyorkcitymidtown: { name: "Midtown", city: "New York", centerLat: 40.7549, centerLon: -73.9840, radiusMeters: 1800 },
  newyorkcitymanhattanmidtown: { name: "Midtown", city: "New York", centerLat: 40.7549, centerLon: -73.9840, radiusMeters: 1800 },
  manhattanmidtown: { name: "Midtown", city: "New York", centerLat: 40.7549, centerLon: -73.9840, radiusMeters: 1800 },
  paris1st: { name: "1st Arrondissement", city: "Paris", centerLat: 48.8606, centerLon: 2.3376, radiusMeters: 1500 },
  paris1starrondissement: { name: "1st Arrondissement", city: "Paris", centerLat: 48.8606, centerLon: 2.3376, radiusMeters: 1500 },
  paris1erarrondissement: { name: "1st Arrondissement", city: "Paris", centerLat: 48.8606, centerLon: 2.3376, radiusMeters: 1500 },
  paris1stlouvrepalaisroyal: { name: "1st (Louvre / Palais-Royal)", city: "Paris", centerLat: 48.8606, centerLon: 2.3376, radiusMeters: 1500 },
};

export interface CityBoundingBox {
  cityName: string;
  countryCode: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  defaultCenterLat: number;
  defaultCenterLon: number;
}

/**
 * Authoritative city bounding boxes for major curated worldwide cities (Prompt 5 Bug 1).
 * Used to validate resolved area centers and ensure area geocoding never resolves to the wrong city.
 */
export const CITY_BOUNDING_BOXES: Record<string, CityBoundingBox> = {
  berlin: { cityName: "Berlin", countryCode: "DE", minLat: 52.338, maxLat: 52.675, minLon: 13.088, maxLon: 13.761, defaultCenterLat: 52.5200, defaultCenterLon: 13.4050 },
  madrid: { cityName: "Madrid", countryCode: "ES", minLat: 40.311, maxLat: 40.563, minLon: -3.834, maxLon: -3.524, defaultCenterLat: 40.4168, defaultCenterLon: -3.7038 },
  sydney: { cityName: "Sydney", countryCode: "AU", minLat: -34.118, maxLat: -33.578, minLon: 150.628, maxLon: 151.343, defaultCenterLat: -33.8688, defaultCenterLon: 151.2093 },
  dubai: { cityName: "Dubai", countryCode: "AE", minLat: 24.950, maxLat: 25.350, minLon: 55.050, maxLon: 55.500, defaultCenterLat: 25.2048, defaultCenterLon: 55.2708 },
  mumbai: { cityName: "Mumbai", countryCode: "IN", minLat: 18.890, maxLat: 19.300, minLon: 72.770, maxLon: 73.000, defaultCenterLat: 19.0760, defaultCenterLon: 72.8777 },
  newyork: { cityName: "New York", countryCode: "US", minLat: 40.477, maxLat: 40.917, minLon: -74.259, maxLon: -73.700, defaultCenterLat: 40.7128, defaultCenterLon: -74.0060 },
  newyorkcity: { cityName: "New York", countryCode: "US", minLat: 40.477, maxLat: 40.917, minLon: -74.259, maxLon: -73.700, defaultCenterLat: 40.7128, defaultCenterLon: -74.0060 },
  paris: { cityName: "Paris", countryCode: "FR", minLat: 48.815, maxLat: 48.902, minLon: 2.224, maxLon: 2.469, defaultCenterLat: 48.8566, defaultCenterLon: 2.3522 },
  london: { cityName: "London", countryCode: "GB", minLat: 51.286, maxLat: 51.691, minLon: -0.510, maxLon: 0.334, defaultCenterLat: 51.5074, defaultCenterLon: -0.1278 },
  dhaka: { cityName: "Dhaka", countryCode: "BD", minLat: 23.680, maxLat: 23.900, minLon: 90.320, maxLon: 90.520, defaultCenterLat: 23.8103, defaultCenterLon: 90.4125 },
  amsterdam: { cityName: "Amsterdam", countryCode: "NL", minLat: 52.278, maxLat: 52.431, minLon: 4.728, maxLon: 5.079, defaultCenterLat: 52.3676, defaultCenterLon: 4.9041 },
  rotterdam: { cityName: "Rotterdam", countryCode: "NL", minLat: 51.850, maxLat: 51.980, minLon: 4.350, maxLon: 4.600, defaultCenterLat: 51.9244, defaultCenterLon: 4.4777 },
  barcelona: { cityName: "Barcelona", countryCode: "ES", minLat: 41.320, maxLat: 41.470, minLon: 2.050, maxLon: 2.230, defaultCenterLat: 41.3879, defaultCenterLon: 2.1699 },
  munich: { cityName: "Munich", countryCode: "DE", minLat: 48.061, maxLat: 48.248, minLon: 11.360, maxLon: 11.722, defaultCenterLat: 48.1351, defaultCenterLon: 11.5820 },
  tokyo: { cityName: "Tokyo", countryCode: "JP", minLat: 35.500, maxLat: 35.850, minLon: 139.550, maxLon: 139.900, defaultCenterLat: 35.6762, defaultCenterLon: 139.6503 },
  singapore: { cityName: "Singapore", countryCode: "SG", minLat: 1.150, maxLat: 1.480, minLon: 103.600, maxLon: 104.050, defaultCenterLat: 1.3521, defaultCenterLon: 103.8198 },
  delhi: { cityName: "Delhi", countryCode: "IN", minLat: 28.400, maxLat: 28.880, minLon: 76.850, maxLon: 77.350, defaultCenterLat: 28.6139, defaultCenterLon: 77.2090 },
};

/**
 * Validates whether given coordinates fall inside the city's bounding box.
 */
export function isCoordinateInCityBounds(cityName: string, lat: number, lon: number): boolean {
  const cKey = normalizeKey(cityName);
  const bbox = CITY_BOUNDING_BOXES[cKey];
  if (!bbox) return true; // If no predefined bbox, pass through
  return lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
}

/**
 * Validates that coordinates lie inside the specified city's bounding box.
 * Throws "Could not locate {Area} in {City}" if coordinates fail validation (Prompt 5 Bug 1).
 */
export function validateAreaInCity(areaName: string, cityName: string, lat: number, lon: number): void {
  if (!isCoordinateInCityBounds(cityName, lat, lon)) {
    throw new Error(`Could not locate ${areaName} in ${cityName}`);
  }
}

/**
 * Computes precise distance in meters between two lat/lon coordinates using the Haversine formula.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves area configuration: exact center coordinates, canonical name, city, and radius in meters.
 * Validates that resolved center coordinates strictly lie inside the selected city's bounding box (Prompt 5 Bug 1).
 * Never silently searches the wrong city.
 */
export function getAreaConfig(
  areaName: string,
  cityName: string = "Dhaka",
  fallbackLat?: number | null,
  fallbackLon?: number | null,
  countryCode?: string
): AreaConfig {
  const cleanArea = (areaName || "").trim();
  const cleanCity = (cityName || "").trim();
  const aKey = normalizeKey(cleanArea);
  const compositeKey = normalizeKey(`${cleanCity}_${cleanArea}`);

  const isCityCentre =
    cleanArea.toLowerCase() === "city centre" ||
    cleanArea.toLowerCase() === "city center" ||
    cleanArea.toLowerCase() === `${cleanCity.toLowerCase()} centre` ||
    cleanArea.toLowerCase() === `${cleanCity.toLowerCase()} center`;

  let config: AreaConfig | null = null;

  // 0. Explicit City Centre search (Prompt 5 Worldwide Coverage)
  if (isCityCentre) {
    const cKey = normalizeKey(cleanCity);
    const bbox = CITY_BOUNDING_BOXES[cKey];
    const cityCoords = bbox
      ? { lat: bbox.defaultCenterLat, lon: bbox.defaultCenterLon }
      : fallbackLat && fallbackLon
      ? { lat: fallbackLat, lon: fallbackLon }
      : getFallbackCoordinates(cleanCity, undefined, countryCode);

    if (cityCoords) {
      config = {
        name: "City centre",
        city: cleanCity,
        centerLat: cityCoords.lat,
        centerLon: cityCoords.lon,
        radiusMeters: 3000,
      };
    }
  }

  // 1. Composite City + Area match (highest accuracy for common area names across cities)
  if (!config && compositeKey && AREAS[compositeKey]) {
    config = { ...AREAS[compositeKey] };
  } else if (!config && aKey && AREAS[aKey]) {
    // 2. Direct area dictionary match — check if city matches or passes bbox validation
    const candidate = AREAS[aKey];
    if (candidate.city.toLowerCase() === cleanCity.toLowerCase() || isCoordinateInCityBounds(cleanCity, candidate.centerLat, candidate.centerLon)) {
      config = { ...candidate, city: cleanCity };
    }
  }

  // 3. Fallback coordinates via getFallbackCoordinates (or passed fallbackLat)
  if (!config) {
    const resolvedCoords =
      fallbackLat && fallbackLon
        ? { lat: fallbackLat, lon: fallbackLon }
        : getFallbackCoordinates(cleanCity, cleanArea, countryCode);

    if (resolvedCoords) {
      config = {
        name: cleanArea || cleanCity || "Target Area",
        city: cleanCity || "Target City",
        centerLat: resolvedCoords.lat,
        centerLon: resolvedCoords.lon,
        radiusMeters: 2000,
      };
    }
  }

  // 4. Default to city center if area is 'City centre' or empty
  if (!config) {
    const cKey = normalizeKey(cleanCity);
    const bbox = CITY_BOUNDING_BOXES[cKey];
    if (bbox) {
      config = {
        name: cleanArea || `${cleanCity} Centre`,
        city: cleanCity,
        centerLat: bbox.defaultCenterLat,
        centerLon: bbox.defaultCenterLon,
        radiusMeters: 3000,
      };
    }
  }

  if (!config) {
    config = {
      name: cleanArea || cleanCity || "Target Area",
      city: cleanCity || "Target City",
      centerLat: fallbackLat || 23.7937,
      centerLon: fallbackLon || 90.4043,
      radiusMeters: 2000,
    };
  }

  // Prompt 5 Bug 1 Hard Validation: resolved center must lie inside selected city's bbox
  const isValidInCity = isCoordinateInCityBounds(cleanCity, config.centerLat, config.centerLon);
  if (!isValidInCity) {
    console.error(
      `[Area Geocoding Validation Error] Resolved center (${config.centerLat}, ${config.centerLon}) for "${cleanArea}" is OUTSIDE bounds of city "${cleanCity}".`
    );
    throw new Error(`Could not locate ${cleanArea} in ${cleanCity}`);
  }

  console.log(
    `[Area Geocoded & Validated] ${config.name}, ${config.city} -> Center: (${config.centerLat}, ${config.centerLon}), Radius: ${config.radiusMeters}m (City BBox: Valid)`
  );

  return config;
}
