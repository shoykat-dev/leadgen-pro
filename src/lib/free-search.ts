import {
  type BusinessLead,
  validatePhone,
  validateEmail,
  classifyWebsite,
  calculateLeadScore,
  assessDataQuality,
  deduplicateLeads,
} from "./data-integrity";
import { getAreaConfig, haversineDistanceMeters, type AreaConfig } from "./areas";
import { getFallbackCoordinates } from "./location-hierarchy";
import { Country } from "country-state-city";

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
}

export interface FreeSearchResult {
  leads: BusinessLead[];
  source: "free_live_directory";
  total: number;
  areaConfig: AreaConfig;
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

/**
 * Maps application category to standard OpenStreetMap tag criteria for Overpass QL.
 */
export function getOverpassTagsForCategory(categoryId: string): { key: string; value: string }[] {
  const map: Record<string, { key: string; value: string }[]> = {
    // Food & Dining
    restaurant: [{ key: "amenity", value: "restaurant" }],
    cafe: [{ key: "amenity", value: "cafe" }],
    bakery: [{ key: "shop", value: "bakery" }],
    fast_food: [{ key: "amenity", value: "fast_food" }],
    bar_pub: [
      { key: "amenity", value: "pub" },
      { key: "amenity", value: "bar" },
    ],
    catering: [{ key: "craft", value: "caterer" }],

    // Healthcare & Medical
    health_clinic: [
      { key: "amenity", value: "clinic" },
      { key: "amenity", value: "doctors" },
    ],
    dental_clinic: [{ key: "amenity", value: "dentist" }],
    hospital: [{ key: "amenity", value: "hospital" }],
    pharmacy: [{ key: "amenity", value: "pharmacy" }],
    dermatology: [
      { key: "healthcare", value: "dermatology" },
      { key: "amenity", value: "clinic" },
    ],
    physiotherapy: [{ key: "healthcare", value: "physiotherapist" }],
    optometry: [{ key: "shop", value: "optician" }],
    chiropractor: [{ key: "healthcare", value: "alternative" }],
    veterinary: [{ key: "amenity", value: "veterinary" }],
    mental_health: [{ key: "healthcare", value: "psychotherapist" }],

    // Beauty & Wellness
    salon: [
      { key: "shop", value: "hairdresser" },
      { key: "shop", value: "beauty" },
    ],
    spa: [{ key: "leisure", value: "spa" }],
    barbershop: [{ key: "shop", value: "hairdresser" }],
    nail_salon: [{ key: "shop", value: "beauty" }],
    massage: [{ key: "shop", value: "massage" }],
    cosmetic_clinic: [{ key: "shop", value: "beauty" }],

    // Fitness & Sports
    gym: [{ key: "leisure", value: "fitness_centre" }],
    yoga: [{ key: "leisure", value: "fitness_centre" }],
    martial_arts: [{ key: "leisure", value: "sports_centre" }],
    swimming_pool: [{ key: "leisure", value: "swimming_pool" }],
    personal_trainer: [{ key: "leisure", value: "fitness_centre" }],

    // Real Estate & Construction
    real_estate: [{ key: "office", value: "estate_agent" }],
    architecture: [{ key: "office", value: "architect" }],
    interior_design: [{ key: "office", value: "interior_decorator" }],
    general_contractor: [{ key: "craft", value: "builder" }],
    roofing: [{ key: "craft", value: "roofer" }],
    plumbing: [{ key: "craft", value: "plumber" }],
    electrical: [{ key: "craft", value: "electrician" }],
    hvac: [{ key: "craft", value: "hvac" }],
    landscaping: [{ key: "craft", value: "gardener" }],
    painting_contractor: [{ key: "craft", value: "painter" }],
    carpentry: [{ key: "craft", value: "carpenter" }],
    flooring: [{ key: "craft", value: "floorer" }],
    solar_installation: [{ key: "craft", value: "electrician" }],
    pest_control: [{ key: "craft", value: "pest_control" }],

    // Professional & Legal
    law_firm: [{ key: "office", value: "lawyer" }],
    accounting: [
      { key: "office", value: "accountant" },
      { key: "office", value: "financial" },
    ],
    insurance_agency: [{ key: "office", value: "insurance" }],
    financial_advisor: [{ key: "office", value: "financial_advisor" }],
    marketing_agency: [{ key: "office", value: "advertising_agency" }],
    web_design: [
      { key: "office", value: "it" },
      { key: "office", value: "graphic_design" },
    ],
    software_company: [{ key: "office", value: "it" }],
    it_support: [{ key: "office", value: "it" }],

    // Automotive
    car_repair: [{ key: "shop", value: "car_repair" }],
    auto_body: [{ key: "shop", value: "car_repair" }],
    car_wash: [{ key: "amenity", value: "car_wash" }],
    tire_shop: [{ key: "shop", value: "tyres" }],
    car_dealership: [{ key: "shop", value: "car" }],
    car_rental: [{ key: "amenity", value: "car_rental" }],
    towing: [{ key: "emergency", value: "towing" }],

    // Education & Hospitality
    private_school: [{ key: "amenity", value: "school" }],
    tutoring_center: [{ key: "amenity", value: "training" }],
    preschool: [{ key: "amenity", value: "kindergarten" }],
    language_school: [{ key: "amenity", value: "language_school" }],
    hotel_motel: [{ key: "tourism", value: "hotel" }],
  };

  if (map[categoryId]) {
    return map[categoryId];
  }

  // Generic fallback: check amenity or shop
  return [
    { key: "amenity", value: categoryId.replace(/_/g, " ") },
    { key: "shop", value: categoryId.replace(/_/g, " ") },
  ];
}

/**
 * Searches real local businesses using OpenStreetMap Overpass API with strict radius and Haversine distance post-filtering.
 * HARD DATA HONESTY: Zero simulated or pattern-generated emails, phones, ratings, or websites.
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
  } = options;

  const cCode = (countryCode || "BD").toUpperCase();

  // 1. Resolve exact Area Configuration ({ name, city, centerLat, centerLon, radiusMeters })
  const fallbackCoords = getFallbackCoordinates(city, area, cCode);
  const areaConfig = getAreaConfig(
    area || city,
    city,
    options.lat || fallbackCoords?.lat,
    options.lon || fallbackCoords?.lon
  );

  const { centerLat, centerLon, radiusMeters } = areaConfig;

  // 2. Build Overpass query with radius filter around the area center:
  // e.g. nwr["amenity"="restaurant"](around:2000, 23.7937, 90.4043);
  const tagSpecs = getOverpassTagsForCategory(category);
  const tagStatements = tagSpecs
    .map(
      (t) =>
        `nwr["${t.key}"="${t.value}"](around:${radiusMeters}, ${centerLat}, ${centerLon});`
    )
    .join("\n  ");

  const overpassQuery = `[out:json][timeout:25];
(
  ${tagStatements}
);
out center tags;`;

  // 3. Fetch from reliable public Overpass API mirrors with timeout
  const mirrors = [
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
  ];

  let rawElements: OverpassElement[] = [];
  let fetchedSuccessfully = false;

  for (const mirrorUrl of mirrors) {
    try {
      const res = await fetch(mirrorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "LeadGenPro-B2B-Discovery/2.0 (OpenStreetMap Data Honesty Compliant)",
        },
        body: "data=" + encodeURIComponent(overpassQuery),
        signal: AbortSignal.timeout(9000),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.elements)) {
          rawElements = data.elements;
          fetchedSuccessfully = true;
          break;
        }
      }
    } catch {
      // Try next mirror
    }
  }

  // Fallback to bounded OSM Nominatim query if Overpass mirrors are unavailable or return empty
  if (!fetchedSuccessfully || rawElements.length === 0) {
    try {
      const deltaLat = radiusMeters / 111320;
      const deltaLon = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));
      const viewboxStr = `${centerLon - deltaLon},${centerLat + deltaLat},${centerLon + deltaLon},${centerLat - deltaLat}`;

      const term = categoryLabel.split("&")[0].split("/")[0].trim().toLowerCase();
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        term
      )}&countrycodes=${cCode.toLowerCase()}&format=json&addressdetails=1&extratags=1&viewbox=${viewboxStr}&bounded=1&limit=40`;

      const nomRes = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "LeadGenPro-Directory/2.0 (contact: support@leadgenpro.com)",
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData)) {
          rawElements = nomData.map((item: any) => ({
            type: (item.osm_type || "node") as "node" | "way" | "relation",
            id: item.osm_id || item.place_id,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            tags: {
              name: item.name || item.display_name?.split(",")[0]?.trim(),
              amenity: item.type,
              ...(item.extratags || {}),
              "addr:full": item.display_name,
            },
          }));
        }
      }
    } catch (e) {
      console.warn("[FreeSearch fallback warning]:", e);
    }
  }

  // 4. Mandatory Haversine Post-Filtering & Debug Logging
  // Acceptance Test 1: Every returned business's coordinates must be <= radiusMeters of centerLat, centerLon.
  const leads: BusinessLead[] = [];
  const now = new Date().toISOString();
  const seenKeys = new Set<string>();

  for (const el of rawElements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    // Haversine distance calculation in meters
    const distance = haversineDistanceMeters(centerLat, centerLon, lat, lon);

    const tags = el.tags || {};
    const rawName = tags.name || tags["name:en"] || tags.brand;
    if (!rawName || rawName.trim().length < 2) continue;

    const cleanName = rawName.trim();
    const dedupKey = `${cleanName.toLowerCase()}_${Math.round(lat * 1000)}_${Math.round(lon * 1000)}`;
    if (seenKeys.has(dedupKey)) continue;

    // MANDATORY POST-FILTER: Keep only results within radiusMeters of area center
    if (distance > radiusMeters) {
      continue;
    }

    seenKeys.add(dedupKey);

    // Debug log to prove coordinates and distance adherence (Acceptance Test 1)
    console.log(
      `[Haversine] ${cleanName}: ${distance.toFixed(1)}m from ${areaConfig.name} center (${centerLat}, ${centerLon}) [Within ${radiusMeters}m: PASS]`
    );

    // 5. Strict Data Honesty (BUG 2 Fix - Never fabricate or guess)
    // Extract phone ONLY from real OSM tags
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
      if (pRes.phone && pRes.phoneStatus === "Valid") {
        phone = pRes.phone;
        phoneE164 = pRes.phoneE164;
        phoneStatus = "Format valid"; // Must be labelled "Format valid" per prompt rule (never "Verified Mobile")
        canWhatsApp = pRes.canWhatsApp;
      } else if (pRes.phone) {
        phone = pRes.phone;
        phoneStatus = "Phone format unverified";
      }
    }

    // Extract website ONLY from real OSM tags
    const rawWeb =
      tags.website ||
      tags["contact:website"] ||
      tags.url ||
      tags["contact:url"] ||
      tags.facebook ||
      tags["contact:facebook"] ||
      tags.instagram ||
      tags["contact:instagram"] ||
      null;

    let website: string | null = null;
    let websiteStatus: "No Website" | "Social Only" | "Has Website" = "No Website";
    let hasWebsite = false;

    if (rawWeb) {
      const wRes = classifyWebsite(rawWeb);
      website = wRes.website;
      websiteStatus = wRes.websiteStatus;
      hasWebsite = wRes.websiteStatus === "Has Website";
    }

    // Extract email ONLY from real OSM tags
    const rawEmail = tags.email || tags["contact:email"] || null;
    let email: string | null = null;
    let emailStatus: "OpenStreetMap" | "Found on website" | "Missing" | "Different domain" | "Invalid format" =
      "Missing";
    let emailProvenance: "osm" | "found_on_website" | undefined = undefined;

    if (rawEmail) {
      const eRes = validateEmail(rawEmail, website);
      if (eRes.email && eRes.emailStatus !== "Invalid format") {
        email = eRes.email;
        emailStatus = "OpenStreetMap";
        emailProvenance = "osm";
      }
    }

    // Hard Rule: OSM has no rating or review counts — store null
    const rating: number | null = null;
    const userRatingCount: number | null = null;

    // Build real Google Maps outbound search link
    const cleanLocation = area ? `${area}, ${city}` : city;
    const placeQuery = encodeURIComponent(`${cleanName}, ${cleanLocation}, ${country}`);
    const googleMapsUri = `https://www.google.com/maps/search/?api=1&query=${placeQuery}`;

    // Compute lead score based on honest signals
    const scoreRes = calculateLeadScore({
      websiteStatus,
      phoneStatus,
      emailStatus,
      rating: 0,
      userRatingCount: 0,
    });

    // Compose formatted address from OSM tags or display name
    const street = tags["addr:street"] || tags.road;
    const houseNumber = tags["addr:housenumber"];
    const postcode = tags["addr:postcode"];
    let displayAddress = tags["addr:full"] || "";
    if (!displayAddress) {
      const parts = [
        houseNumber ? `${houseNumber} ${street || ""}` : street,
        areaConfig.name,
        city,
        postcode,
      ].filter(Boolean);
      displayAddress = parts.length > 0 ? parts.join(", ") : `${areaConfig.name}, ${city}`;
    }

    leads.push({
      id: `osm_${el.type}_${el.id}`,
      placeId: `osm_${el.id}`,
      source: "free_directory",
      name: cleanName,
      category: categoryLabel,
      primaryType: tags.amenity || tags.shop || tags.office || category,
      address: displayAddress,
      lat,
      lon,
      phone,
      phoneE164,
      phoneStatus,
      canWhatsApp,
      email,
      emailStatus,
      emailProvenance,
      website,
      websiteStatus,
      hasWebsite,
      rating,
      userRatingCount,
      googleMapsUri,
      googleMapsUrl: googleMapsUri,
      googleMapsEmbedUrl: `https://maps.google.com/maps?q=${placeQuery}&hl=en&z=16&output=embed`,
      googleMapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${placeQuery}`,
      businessStatus: "OPERATIONAL",
      leadScore: scoreRes.score,
      leadScoreTier: scoreRes.tier,
      dataQuality: assessDataQuality({
        phoneStatus,
        websiteStatus,
        emailStatus,
        address: displayAddress,
        lat,
        lon,
      }),
      fetchedAt: now,
    });
  }

  const unique = deduplicateLeads(leads);

  return {
    leads: unique,
    source: "free_live_directory",
    total: unique.length,
    areaConfig,
  };
}
