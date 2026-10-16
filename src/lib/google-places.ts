import {
  type BusinessLead,
  validatePhoneNumber,
  validateEmail,
  classifyWebsite,
  calculateLeadScore,
  assessDataQuality,
  deduplicateLeads,
} from "./data-integrity";
import {
  getBudgetStatus,
  incrementGoogleApiCallCount,
  getCachedPlacesResponse,
  setCachedPlacesResponse,
} from "./db";

// Exact single constant for Google Places API (New) FieldMask
export const GOOGLE_PLACES_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryType,places.primaryTypeDisplayName,places.businessStatus,places.location";

// Category-to-Google-Type Mapping
export interface CategoryGoogleMapping {
  googleType?: string;
  searchKeywords: string;
  priorityGroup: "web_relevant" | "standard";
}

export const CATEGORY_GOOGLE_MAPPING: Record<string, CategoryGoogleMapping> = {
  // Food & Dining (High Priority for Web Design)
  restaurant: { googleType: "restaurant", searchKeywords: "restaurant fine dining food", priorityGroup: "web_relevant" },
  cafe: { googleType: "cafe", searchKeywords: "cafe coffee shop espresso", priorityGroup: "web_relevant" },
  bakery: { googleType: "bakery", searchKeywords: "bakery pastry cakes", priorityGroup: "web_relevant" },
  fast_food: { googleType: "fast_food_restaurant", searchKeywords: "fast food burger pizza", priorityGroup: "web_relevant" },
  bar_pub: { googleType: "bar", searchKeywords: "bar pub lounge", priorityGroup: "web_relevant" },
  catering: { searchKeywords: "catering banquet food service", priorityGroup: "web_relevant" },

  // Healthcare & Medical (High Value Web Clients)
  dental_clinic: { googleType: "dentist", searchKeywords: "dentist dental clinic teeth care", priorityGroup: "web_relevant" },
  health_clinic: { googleType: "doctor", searchKeywords: "medical clinic doctor healthcare", priorityGroup: "web_relevant" },
  hospital: { googleType: "hospital", searchKeywords: "hospital medical center emergency", priorityGroup: "web_relevant" },
  pharmacy: { googleType: "pharmacy", searchKeywords: "pharmacy drugstore medicine", priorityGroup: "web_relevant" },
  physiotherapy: { googleType: "physiotherapist", searchKeywords: "physiotherapy rehab physical therapy", priorityGroup: "web_relevant" },
  veterinary: { googleType: "veterinary_care", searchKeywords: "veterinary animal clinic pet hospital", priorityGroup: "web_relevant" },
  optometry: { searchKeywords: "optometrist eye clinic glasses", priorityGroup: "web_relevant" },
  dermatology: { searchKeywords: "dermatology skin care clinic", priorityGroup: "web_relevant" },

  // Beauty & Wellness
  salon: { googleType: "beauty_salon", searchKeywords: "beauty salon hair salon parlour", priorityGroup: "web_relevant" },
  spa: { googleType: "spa", searchKeywords: "spa wellness massage sauna", priorityGroup: "web_relevant" },
  barbershop: { googleType: "barber_shop", searchKeywords: "barbershop men grooming salon", priorityGroup: "web_relevant" },
  nail_salon: { searchKeywords: "nail salon lash parlour", priorityGroup: "web_relevant" },

  // Fitness & Sports
  gym: { googleType: "gym", searchKeywords: "gym fitness center workout club", priorityGroup: "web_relevant" },
  yoga: { searchKeywords: "yoga studio pilates meditation", priorityGroup: "web_relevant" },
  martial_arts: { searchKeywords: "martial arts karate boxing mma", priorityGroup: "web_relevant" },

  // Real Estate & Construction
  real_estate: { googleType: "real_estate_agency", searchKeywords: "real estate agency property realtor", priorityGroup: "web_relevant" },
  architecture: { searchKeywords: "architect architectural engineering firm", priorityGroup: "web_relevant" },
  interior_design: { searchKeywords: "interior design home decor studio", priorityGroup: "web_relevant" },
  construction: { searchKeywords: "construction contractor builders", priorityGroup: "web_relevant" },

  // Home Trades & Services
  plumber: { googleType: "plumber", searchKeywords: "plumber plumbing sanitary service", priorityGroup: "web_relevant" },
  electrician: { googleType: "electrician", searchKeywords: "electrician electrical repairs", priorityGroup: "web_relevant" },
  roofing: { googleType: "roofing_contractor", searchKeywords: "roofing contractor repairs", priorityGroup: "web_relevant" },
  painter: { googleType: "painter", searchKeywords: "house painting decorator contractor", priorityGroup: "web_relevant" },
  locksmith: { googleType: "locksmith", searchKeywords: "locksmith keys door locks", priorityGroup: "web_relevant" },
  hvac: { searchKeywords: "hvac ac repair air conditioning heating", priorityGroup: "web_relevant" },
  cleaning: { searchKeywords: "cleaning service janitorial commercial cleaning", priorityGroup: "web_relevant" },

  // Professional Services
  legal_firm: { googleType: "lawyer", searchKeywords: "law firm advocate attorney lawyer", priorityGroup: "web_relevant" },
  accounting_cpa: { googleType: "accounting", searchKeywords: "accounting firm tax audit cpa bookkeeper", priorityGroup: "web_relevant" },
  insurance_agency: { googleType: "insurance_agency", searchKeywords: "insurance agency broker claims", priorityGroup: "web_relevant" },

  // Education
  school: { googleType: "school", searchKeywords: "school academy coaching center", priorityGroup: "web_relevant" },
  tutoring_center: { searchKeywords: "tutoring coaching test prep ielts", priorityGroup: "web_relevant" },

  // Hospitality & Travel
  hotel: { googleType: "hotel", searchKeywords: "hotel resort guest house lodging", priorityGroup: "web_relevant" },
  travel_agency: { googleType: "travel_agency", searchKeywords: "travel agency tourism air ticketing", priorityGroup: "web_relevant" },

  // Automotive
  auto_repair: { googleType: "car_repair", searchKeywords: "car repair auto garage workshop mechanic", priorityGroup: "web_relevant" },
  car_wash: { googleType: "car_wash", searchKeywords: "car wash detailing auto cleaning", priorityGroup: "web_relevant" },

  // Retail & Boutiques
  clothing_boutique: { googleType: "clothing_store", searchKeywords: "clothing store boutique fashion apparel", priorityGroup: "web_relevant" },
  jewelry: { googleType: "jewelry_store", searchKeywords: "jewelry store gold diamonds ornaments", priorityGroup: "web_relevant" },
  furniture: { googleType: "furniture_store", searchKeywords: "furniture showroom home decor", priorityGroup: "web_relevant" },
  electronics: { googleType: "electronics_store", searchKeywords: "electronics store gadget mobile computer", priorityGroup: "web_relevant" },
  pet_shop: { googleType: "pet_store", searchKeywords: "pet store dog cat supplies aquarium", priorityGroup: "web_relevant" },
};

export interface ViewportRectangle {
  low: { latitude: number; longitude: number };
  high: { latitude: number; longitude: number };
}

export interface GooglePlacesSearchOptions {
  query: string;
  categoryId?: string;
  countryCode?: string;
  rectangle?: ViewportRectangle;
  center?: { lat: number; lon: number };
  radiusMeters?: number;
  pageToken?: string;
  pageSize?: number;
  confirmedExtraDailyCalls?: number;
  isSweep?: boolean;
}

export interface GooglePlacesSearchResult {
  leads: BusinessLead[];
  nextPageToken?: string;
  callsUsed: number;
  cached: boolean;
  totalFetched: number;
}

/**
 * Executes an official call to Google Places API (New) searchText endpoint.
 * Protected by budget guards, response caching, field masking, and data validation.
 */
export async function searchGooglePlaces(
  options: GooglePlacesSearchOptions
): Promise<GooglePlacesSearchResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY is not configured in .env.local. You can still import leads from CSV or add leads manually."
    );
  }

  const {
    query,
    categoryId,
    countryCode = "BD",
    rectangle,
    pageToken,
    pageSize = 20,
    confirmedExtraDailyCalls = 0,
  } = options;

  // 1. Build cache key: query + rectangle + pageToken
  const rectKey = rectangle
    ? `${rectangle.low.latitude.toFixed(4)},${rectangle.low.longitude.toFixed(4)}_${rectangle.high.latitude.toFixed(4)},${rectangle.high.longitude.toFixed(4)}`
    : "no_rect";
  const cacheKey = `places_${query.toLowerCase().trim()}_${categoryId || "all"}_${rectKey}_${pageToken || "p1"}`;

  // 2. Check 30-day response cache
  const cachedResponse = getCachedPlacesResponse(cacheKey);
  if (cachedResponse) {
    return {
      leads: cachedResponse.leads || [],
      nextPageToken: cachedResponse.nextPageToken,
      callsUsed: 0,
      cached: true,
      totalFetched: cachedResponse.leads?.length || 0,
    };
  }

  // 3. HARD BUDGET GUARD Check
  const budget = getBudgetStatus(confirmedExtraDailyCalls);
  if (!budget.canCallGoogle) {
    throw new Error(budget.reason || "Google API daily or monthly call limit reached.");
  }

  // 4. Construct request payload for Places API (New)
  const categoryConfig = categoryId ? CATEGORY_GOOGLE_MAPPING[categoryId] : undefined;
  let textQuery = query;

  if (categoryConfig && !textQuery.includes(categoryConfig.searchKeywords.split(" ")[0])) {
    textQuery = `${query} ${categoryConfig.searchKeywords.split(" ")[0]}`.trim();
  }

  const payload: any = {
    textQuery,
    pageSize: Math.min(pageSize, 20),
  };

  if (pageToken) {
    payload.pageToken = pageToken;
  }

  if (categoryConfig?.googleType) {
    payload.includedType = categoryConfig.googleType;
  }

  // Viewport rectangle restriction
  if (rectangle) {
    payload.locationRestriction = {
      rectangle: {
        low: {
          latitude: rectangle.low.latitude,
          longitude: rectangle.low.longitude,
        },
        high: {
          latitude: rectangle.high.latitude,
          longitude: rectangle.high.longitude,
        },
      },
    };
  }

  // 5. Execute official Places API (New) request
  const endpoint = "https://places.googleapis.com/v1/places:searchText";
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
      },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    console.error("[Google Places API Network Error]:", err.message);
    throw new Error("Network problem contacting Google Places API. Please check your internet connection and try again.");
  }

  // Handle specific Google API error statuses
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody?.error?.message || response.statusText;
    const errorCode = errorBody?.error?.status || response.status;

    console.error(`[Google Places API Error ${response.status}]:`, errorMessage);

    if (response.status === 400) {
      throw new Error(`Google Places API Bad Request: ${errorMessage}`);
    } else if (response.status === 403) {
      if (errorMessage.toLowerCase().includes("billing")) {
        throw new Error("Google Places API billing is not enabled. Please enable billing in Google Cloud Console.");
      }
      if (errorMessage.toLowerCase().includes("has not been used") || errorMessage.toLowerCase().includes("disabled")) {
        throw new Error("Places API (New) is not enabled for this key. Please enable 'Places API (New)' in Google Cloud Console.");
      }
      throw new Error("Invalid Google API Key or permission denied. Please verify your API key restrictions.");
    } else if (response.status === 429) {
      throw new Error("Google Places API quota exceeded. Please wait or check your Google Cloud quota limits.");
    }

    throw new Error(`Google Places API returned error ${errorCode}: ${errorMessage}`);
  }

  // 6. Record usage count ONLY on successful call
  incrementGoogleApiCallCount();

  const data = await response.json();
  const rawPlaces = Array.isArray(data.places) ? data.places : [];

  // 7. Data Integrity Pipeline: sanitize, validate, and enrich raw Google places
  const fetchedAt = new Date().toISOString();
  const leads: BusinessLead[] = [];

  for (const place of rawPlaces) {
    // Only accept OPERATIONAL businesses
    if (place.businessStatus && place.businessStatus !== "OPERATIONAL") {
      continue;
    }

    const name = place.displayName?.text?.trim() || "";
    if (!name || name.length < 2) continue;

    const address = place.formattedAddress?.trim() || "Address not provided";

    // Validate phone number
    const rawPhone = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
    const phoneRes = validatePhoneNumber(rawPhone, countryCode);

    // Classify website
    const webRes = classifyWebsite(place.websiteUri || null);

    // Extract email (Google Places does NOT provide email; mark honestly as missing or found on website later)
    const emailRes = validateEmail(null, webRes.website);

    const leadPartial: Partial<BusinessLead> = {
      phoneStatus: phoneRes.phoneStatus,
      email: emailRes.email,
      emailStatus: emailRes.emailStatus,
      websiteStatus: webRes.websiteStatus,
      rating: typeof place.rating === "number" ? place.rating : null,
      userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    };

    const scoreRes = calculateLeadScore(leadPartial);
    const quality = assessDataQuality(leadPartial);

    const lead: BusinessLead = {
      id: place.id || `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      placeId: place.id,
      source: "google_places",
      name,
      category: place.primaryTypeDisplayName?.text || categoryId || "Local Business",
      primaryType: place.primaryType,
      address,
      lat: place.location?.latitude || null,
      lon: place.location?.longitude || null,
      phone: phoneRes.phone,
      phoneE164: phoneRes.phoneE164,
      phoneStatus: phoneRes.phoneStatus,
      canWhatsApp: phoneRes.canWhatsApp,
      email: emailRes.email,
      emailStatus: emailRes.emailStatus,
      emailProvenance: undefined,
      website: webRes.website,
      websiteStatus: webRes.websiteStatus,
      hasWebsite: webRes.websiteStatus === "Has Website",
      rating: leadPartial.rating,
      userRatingCount: leadPartial.userRatingCount,
      googleMapsUri: place.googleMapsUri || (place.id ? `https://www.google.com/maps/place/?q=place_id:${place.id}` : null),
      googleMapsUrl: place.googleMapsUri || (place.id ? `https://www.google.com/maps/place/?q=place_id:${place.id}` : null),
      googleMapsEmbedUrl: place.id ? `https://maps.google.com/maps?q=place_id:${place.id}&output=embed` : null,
      googleMapsDirectionsUrl: place.googleMapsUri || null,
      businessStatus: place.businessStatus || "OPERATIONAL",
      dataQuality: quality,
      leadScore: scoreRes.score,
      leadScoreTier: scoreRes.tier,
      fetchedAt,
      crmStatus: "New",
    };

    leads.push(lead);
  }

  // Deduplicate results
  const uniqueLeads = deduplicateLeads(leads);

  const result: GooglePlacesSearchResult = {
    leads: uniqueLeads,
    nextPageToken: data.nextPageToken || undefined,
    callsUsed: 1,
    cached: false,
    totalFetched: uniqueLeads.length,
  };

  // 8. Cache response for up to 30 days
  setCachedPlacesResponse(cacheKey, result, 30);

  return result;
}
