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
  // Ensure core reference areas are exact per specification (Banani: 1500m to eliminate edge overlap)
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
};

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
 * Checks city_area composite key first, then area key, then geocoding / fallback coordinates.
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

  // 1. Composite City + Area match (highest accuracy for common area names across cities)
  if (compositeKey && AREAS[compositeKey]) {
    return AREAS[compositeKey];
  }

  // 2. Direct area dictionary match
  if (aKey && AREAS[aKey]) {
    return AREAS[aKey];
  }

  // 3. Fallback coordinates via getFallbackCoordinates (or passed fallbackLat)
  const resolvedCoords =
    fallbackLat && fallbackLon
      ? { lat: fallbackLat, lon: fallbackLon }
      : getFallbackCoordinates(cleanCity, cleanArea, countryCode);

  const defaultRadius = 2000;
  return {
    name: cleanArea || cleanCity || "Target Area",
    city: cleanCity || "Target City",
    centerLat: resolvedCoords?.lat || fallbackLat || 23.7937,
    centerLon: resolvedCoords?.lon || fallbackLon || 90.4043,
    radiusMeters: defaultRadius,
  };
}
