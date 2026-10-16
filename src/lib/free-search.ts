import {
  type BusinessLead,
  validatePhone,
  validateEmail,
  classifyWebsite,
  calculateLeadScore,
  assessDataQuality,
  deduplicateLeads,
} from "./data-integrity";
import { getFallbackCoordinates } from "./location-hierarchy";

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
}

interface NominatimItem {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  category?: string;
  extratags?: {
    [key: string]: string | undefined;
    phone?: string;
    "contact:phone"?: string;
    mobile?: string;
    "contact:mobile"?: string;
    website?: string;
    "contact:website"?: string;
    url?: string;
    email?: string;
    "contact:email"?: string;
    opening_hours?: string;
  };
}

function getSimpleCategoryKeyword(categoryId: string, label: string): string {
  const MAP: Record<string, string> = {
    restaurant: "restaurants",
    cafe: "cafes",
    fast_food: "fast food",
    bakery: "bakery",
    hotel_motel: "hotels",
    bar_pub: "bar",
    dental_clinic: "dentist",
    health_clinic: "clinic",
    hospital: "hospitals",
    pharmacy: "pharmacy",
    salon: "beauty salon",
    spa: "spa",
    barbershop: "barbershop",
    gym: "gym",
    real_estate: "real estate",
    law_firm: "lawyer",
    cleaning: "cleaning service",
    auto_repair: "car repair",
    car_wash: "car wash",
    plumber: "plumber",
    electrician: "electrician",
    private_school: "school",
    tutoring_center: "coaching",
  };

  if (MAP[categoryId]) return MAP[categoryId];
  const base = label.split("&")[0].split("/")[0].trim().toLowerCase();
  return base || categoryId.replace(/_/g, " ");
}

/**
 * Searches real local businesses using OpenStreetMap / Nominatim live public API.
 * 100% Free, requires NO Google API key and NO credit card.
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

  let targetLat = options.lat;
  let targetLon = options.lon;

  if (!targetLat || !targetLon) {
    const coords = getFallbackCoordinates(city, area);
    if (coords) {
      targetLat = coords.lat;
      targetLon = coords.lon;
    }
  }

  // Construct natural search keywords that Nominatim understands
  const keyword = getSimpleCategoryKeyword(category, categoryLabel);
  const locationPart = area ? `${area}, ${city}` : city;

  const queries = [
    `${keyword} in ${locationPart}`,
    `${keyword} ${locationPart}`,
    `${category.replace(/_/g, " ")} in ${locationPart}`,
  ];
  let allItems: NominatimItem[] = [];

  for (const q of queries) {
    try {
      let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&addressdetails=1&extratags=1&limit=40`;

      if (targetLat && targetLon) {
        const delta = 0.05;
        url += `&viewbox=${targetLon - delta},${targetLat + delta},${targetLon + delta},${targetLat - delta}&bounded=0`;
      }

      const res = await fetch(url, {
        headers: {
          "User-Agent": "LeadGenPro-FreeSearch/2.0 (contact: support@leadgenpro.com)",
          "Accept-Language": "en,bn",
        },
      });

      if (res.ok) {
        const data = (await res.json()) as NominatimItem[];
        if (Array.isArray(data) && data.length > 0) {
          allItems.push(...data);
          if (allItems.length >= 15) break;
        }
      }
    } catch (err) {
      console.warn("[FreeSearch Nominatim error]:", err);
    }
  }

  const leads: BusinessLead[] = [];
  const now = new Date().toISOString();

  for (const item of allItems) {
    const rawName = item.name || item.display_name.split(",")[0].trim();
    if (!rawName || rawName.length < 2) continue;

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    const extratags = item.extratags || {};
    const rawPhone =
      extratags.phone ||
      extratags["contact:phone"] ||
      extratags.mobile ||
      extratags["contact:mobile"] ||
      extratags.telephone ||
      extratags["contact:telephone"] ||
      null;

    const rawWeb =
      extratags.website ||
      extratags["contact:website"] ||
      extratags.url ||
      extratags["contact:url"] ||
      extratags.facebook ||
      extratags["contact:facebook"] ||
      extratags.instagram ||
      extratags["contact:instagram"] ||
      null;

    const rawEmail =
      extratags.email ||
      extratags["contact:email"] ||
      null;

    // Validate phone & whatsapp
    const phoneRes = validatePhone(rawPhone, countryCode);

    // Validate website
    const webRes = classifyWebsite(rawWeb);

    // Validate email
    const emailRes = validateEmail(rawEmail, webRes.website);

    // Build Pinpoint Google Maps Links (clean query for exact business card on Google Maps)
    const cleanLocation = area ? `${area}, ${city}` : city;
    const placeQuery = encodeURIComponent(`${rawName}, ${cleanLocation}`);
    const googleMapsUri = `https://www.google.com/maps/search/?api=1&query=${placeQuery}`;
    const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${placeQuery}&hl=en&z=16&output=embed`;
    const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${placeQuery}`;

    // Calculate lead score (0-100) per Section 8
    const scoreRes = calculateLeadScore({
      websiteStatus: webRes.websiteStatus,
      phoneStatus: phoneRes.phoneStatus,
      emailStatus: emailRes.emailStatus,
      rating: null,
      userRatingCount: null,
    });

    const lead: BusinessLead = {
      id: `osm_${item.osm_type || "node"}_${item.osm_id || item.place_id}`,
      placeId: `osm_${item.osm_id || item.place_id}`,
      source: "free_directory",
      name: rawName,
      category: categoryLabel,
      primaryType: item.type || category,
      address: item.display_name,
      lat: isNaN(lat) ? null : lat,
      lon: isNaN(lon) ? null : lon,
      phone: phoneRes.phone,
      phoneE164: phoneRes.phoneE164,
      phoneStatus: phoneRes.phoneStatus,
      canWhatsApp: phoneRes.canWhatsApp,
      email: emailRes.email,
      emailStatus: emailRes.emailStatus,
      emailProvenance: emailRes.email ? "found_on_website" : undefined,
      website: webRes.website,
      websiteStatus: webRes.websiteStatus,
      hasWebsite: webRes.websiteStatus === "Has Website",
      rating: null,
      userRatingCount: null,
      googleMapsUri,
      googleMapsUrl: googleMapsUri,
      googleMapsEmbedUrl,
      googleMapsDirectionsUrl,
      businessStatus: "OPERATIONAL",
      leadScore: scoreRes.score,
      leadScoreTier: scoreRes.tier,
      dataQuality: assessDataQuality({
        phoneStatus: phoneRes.phoneStatus,
        websiteStatus: webRes.websiteStatus,
        emailStatus: emailRes.emailStatus,
        address: item.display_name,
        lat,
        lon,
      }),
      fetchedAt: now,
    };

    leads.push(lead);
  }

  const unique = deduplicateLeads(leads);

  return {
    leads: unique,
    source: "free_live_directory",
    total: unique.length,
  };
}
