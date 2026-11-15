import {
  type BusinessLead,
  validatePhoneNumber,
  validateEmail,
  classifyWebsite,
  calculateLeadScore,
  assessDataQuality,
  deduplicateLeads,
  computeLeadContactability,
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

// Covers all 101 categories in ALL_BUSINESS_SERVICES with their exact ids.
// googleType is set only where the Google Places type is certain — a wrong
// type fails the query, while keyword-only search always works. Categories
// without a matching Google type rely on searchKeywords alone.
// NOTE: this path is dormant — no Google Places API key is set, so the live
// search uses the free OpenStreetMap path. Keep this mapping correct anyway.
export const CATEGORY_GOOGLE_MAPPING: Record<string, CategoryGoogleMapping> = {
  // Digital & Creative Agencies
  digital_marketing: { searchKeywords: "digital marketing agency seo ppc", priorityGroup: "web_relevant" },
  seo_agency: { searchKeywords: "seo agency content marketing", priorityGroup: "web_relevant" },
  social_media_agency: { searchKeywords: "social media marketing agency", priorityGroup: "web_relevant" },
  graphic_design: { searchKeywords: "graphic design branding studio", priorityGroup: "web_relevant" },
  advertising_pr: { searchKeywords: "advertising agency public relations", priorityGroup: "web_relevant" },
  video_production: { searchKeywords: "video production media studio", priorityGroup: "web_relevant" },
  photography_studio: { searchKeywords: "photography studio portrait photographer", priorityGroup: "web_relevant" },

  // Food & Dining (High Priority for Web Design)
  restaurant: { googleType: "restaurant", searchKeywords: "restaurant fine dining food", priorityGroup: "web_relevant" },
  cafe: { googleType: "cafe", searchKeywords: "cafe coffee shop espresso", priorityGroup: "web_relevant" },
  bakery: { googleType: "bakery", searchKeywords: "bakery pastry cakes", priorityGroup: "web_relevant" },
  fast_food: { googleType: "fast_food_restaurant", searchKeywords: "fast food burger pizza", priorityGroup: "web_relevant" },
  bar_pub: { googleType: "bar", searchKeywords: "bar pub lounge", priorityGroup: "web_relevant" },
  catering: { searchKeywords: "catering banquet food service", priorityGroup: "web_relevant" },

  // Healthcare & Medical (High Value Web Clients)
  health_clinic: { googleType: "doctor", searchKeywords: "medical clinic doctor healthcare", priorityGroup: "web_relevant" },
  dental_clinic: { googleType: "dentist", searchKeywords: "dentist dental clinic teeth care", priorityGroup: "web_relevant" },
  hospital: { googleType: "hospital", searchKeywords: "hospital medical center emergency", priorityGroup: "web_relevant" },
  pharmacy: { googleType: "pharmacy", searchKeywords: "pharmacy drugstore medicine", priorityGroup: "web_relevant" },
  dermatology: { searchKeywords: "dermatology skin care clinic", priorityGroup: "web_relevant" },
  physiotherapy: { googleType: "physiotherapist", searchKeywords: "physiotherapy rehab physical therapy", priorityGroup: "web_relevant" },
  optometry: { searchKeywords: "optometrist eye clinic glasses", priorityGroup: "web_relevant" },
  chiropractor: { googleType: "chiropractor", searchKeywords: "chiropractor wellness clinic", priorityGroup: "web_relevant" },
  veterinary: { googleType: "veterinary_care", searchKeywords: "veterinary animal clinic pet hospital", priorityGroup: "web_relevant" },
  mental_health: { searchKeywords: "psychology therapy clinic counselling", priorityGroup: "web_relevant" },

  // Beauty & Wellness
  salon: { googleType: "beauty_salon", searchKeywords: "beauty salon hair salon parlour", priorityGroup: "web_relevant" },
  spa: { googleType: "spa", searchKeywords: "spa wellness massage sauna", priorityGroup: "web_relevant" },
  barbershop: { googleType: "barber_shop", searchKeywords: "barbershop men grooming salon", priorityGroup: "web_relevant" },
  nail_salon: { googleType: "nail_salon", searchKeywords: "nail salon lash parlour", priorityGroup: "web_relevant" },
  massage: { searchKeywords: "massage therapy studio", priorityGroup: "web_relevant" },
  cosmetic_clinic: { searchKeywords: "medical spa aesthetic clinic cosmetic", priorityGroup: "web_relevant" },

  // Fitness & Sports
  gym: { googleType: "gym", searchKeywords: "gym fitness center workout club", priorityGroup: "web_relevant" },
  yoga: { searchKeywords: "yoga studio pilates meditation", priorityGroup: "web_relevant" },
  martial_arts: { searchKeywords: "martial arts karate boxing mma", priorityGroup: "web_relevant" },
  swimming_pool: { searchKeywords: "swimming pool sports complex", priorityGroup: "web_relevant" },
  personal_trainer: { searchKeywords: "personal trainer athletic studio", priorityGroup: "web_relevant" },

  // Real Estate & Construction
  real_estate: { googleType: "real_estate_agency", searchKeywords: "real estate agency property realtor", priorityGroup: "web_relevant" },
  architecture: { searchKeywords: "architect architectural engineering firm", priorityGroup: "web_relevant" },
  interior_design: { searchKeywords: "interior design home decor studio", priorityGroup: "web_relevant" },
  construction: { searchKeywords: "construction contractor builders", priorityGroup: "web_relevant" },
  property_management: { searchKeywords: "property management service", priorityGroup: "web_relevant" },

  // Home Trades & Services
  plumber: { googleType: "plumber", searchKeywords: "plumber plumbing sanitary service", priorityGroup: "web_relevant" },
  electrician: { googleType: "electrician", searchKeywords: "electrician electrical repairs", priorityGroup: "web_relevant" },
  hvac: { searchKeywords: "hvac ac repair air conditioning heating", priorityGroup: "web_relevant" },
  roofing: { googleType: "roofing_contractor", searchKeywords: "roofing contractor repairs", priorityGroup: "web_relevant" },
  cleaning: { searchKeywords: "cleaning service janitorial commercial cleaning", priorityGroup: "web_relevant" },
  pest_control: { searchKeywords: "pest control exterminator", priorityGroup: "web_relevant" },
  locksmith: { googleType: "locksmith", searchKeywords: "locksmith keys door locks", priorityGroup: "web_relevant" },
  painting: { googleType: "painter", searchKeywords: "house painting decorator contractor", priorityGroup: "web_relevant" },
  landscaping: { searchKeywords: "landscaping lawn care gardener", priorityGroup: "web_relevant" },
  handyman: { searchKeywords: "handyman property maintenance repairs", priorityGroup: "web_relevant" },
  flooring_carpet: { searchKeywords: "flooring carpet installation", priorityGroup: "web_relevant" },
  appliance_repair: { searchKeywords: "appliance repair home maintenance", priorityGroup: "web_relevant" },
  glass_glazier: { searchKeywords: "glass window mirror replacement glazier", priorityGroup: "web_relevant" },
  solar_energy: { searchKeywords: "solar energy panel contractor", priorityGroup: "web_relevant" },
  waste_management: { searchKeywords: "waste management junk removal", priorityGroup: "web_relevant" },

  // Professional Services
  law_firm: { googleType: "lawyer", searchKeywords: "law firm advocate attorney lawyer", priorityGroup: "web_relevant" },
  accounting: { googleType: "accounting", searchKeywords: "accounting firm tax audit cpa bookkeeper", priorityGroup: "web_relevant" },
  tax_consultant: { searchKeywords: "tax advisor consultant", priorityGroup: "web_relevant" },
  financial_advisory: { searchKeywords: "financial advisor wealth management", priorityGroup: "web_relevant" },
  insurance: { googleType: "insurance_agency", searchKeywords: "insurance agency broker claims", priorityGroup: "web_relevant" },
  notary: { searchKeywords: "notary public document certification", priorityGroup: "web_relevant" },
  recruitment_agency: { searchKeywords: "recruitment staffing agency", priorityGroup: "web_relevant" },
  security_services: { searchKeywords: "security guard patrol services", priorityGroup: "web_relevant" },
  business_consulting: { searchKeywords: "management business consulting", priorityGroup: "web_relevant" },
  coworking: { searchKeywords: "coworking space shared office", priorityGroup: "web_relevant" },
  printing: { searchKeywords: "printing signage solutions", priorityGroup: "web_relevant" },
  translation: { searchKeywords: "translation localization services", priorityGroup: "web_relevant" },

  // Automotive & Transport
  car_repair: { googleType: "car_repair", searchKeywords: "car repair auto garage workshop mechanic", priorityGroup: "web_relevant" },
  auto_body: { searchKeywords: "auto body paint workshop collision repair", priorityGroup: "web_relevant" },
  car_wash: { googleType: "car_wash", searchKeywords: "car wash detailing auto cleaning", priorityGroup: "web_relevant" },
  tire_shop: { searchKeywords: "tire shop wheel alignment", priorityGroup: "web_relevant" },
  car_dealership: { googleType: "car_dealer", searchKeywords: "car dealership auto sales", priorityGroup: "web_relevant" },
  car_rental: { googleType: "car_rental", searchKeywords: "car rental agency", priorityGroup: "web_relevant" },
  towing: { searchKeywords: "towing roadside assistance", priorityGroup: "web_relevant" },
  logistics: { searchKeywords: "logistics freight services", priorityGroup: "web_relevant" },
  freight_forwarding: { searchKeywords: "freight forwarding customs broker", priorityGroup: "web_relevant" },
  moving_company: { googleType: "moving_company", searchKeywords: "moving relocation company", priorityGroup: "web_relevant" },
  self_storage: { googleType: "storage", searchKeywords: "self storage warehouse facilities", priorityGroup: "web_relevant" },
  courier_delivery: { searchKeywords: "courier express delivery", priorityGroup: "web_relevant" },

  // Pets
  pet_store: { googleType: "pet_store", searchKeywords: "pet store dog cat supplies aquarium", priorityGroup: "web_relevant" },
  pet_grooming: { searchKeywords: "pet grooming dog spa", priorityGroup: "web_relevant" },
  pet_boarding: { searchKeywords: "pet boarding dog hotel kennel", priorityGroup: "web_relevant" },

  // Hospitality & Travel
  hotel: { googleType: "lodging", searchKeywords: "hotel resort guest house lodging", priorityGroup: "web_relevant" },
  resort: { googleType: "lodging", searchKeywords: "resort vacation retreat", priorityGroup: "web_relevant" },
  travel_agency: { googleType: "travel_agency", searchKeywords: "travel agency tourism air ticketing", priorityGroup: "web_relevant" },
  event_planner: { searchKeywords: "event wedding planner", priorityGroup: "web_relevant" },
  event_venue: { searchKeywords: "event venue banquet hall", priorityGroup: "web_relevant" },
  dj_entertainment: { searchKeywords: "dj audio entertainment", priorityGroup: "web_relevant" },

  // Retail & Boutiques
  supermarket: { googleType: "supermarket", searchKeywords: "supermarket grocery store", priorityGroup: "web_relevant" },
  clothing_store: { googleType: "clothing_store", searchKeywords: "clothing store boutique fashion apparel", priorityGroup: "web_relevant" },
  electronics_store: { googleType: "electronics_store", searchKeywords: "electronics store gadget mobile computer", priorityGroup: "web_relevant" },
  furniture_store: { googleType: "furniture_store", searchKeywords: "furniture showroom home decor", priorityGroup: "web_relevant" },
  jewelry_store: { googleType: "jewelry_store", searchKeywords: "jewelry store gold diamonds ornaments", priorityGroup: "web_relevant" },
  bookstore: { googleType: "book_store", searchKeywords: "bookstore stationery books", priorityGroup: "web_relevant" },
  florist: { googleType: "florist", searchKeywords: "florist flower shop bouquet", priorityGroup: "web_relevant" },
  mobile_phone_shop: { searchKeywords: "mobile phone shop repair accessories", priorityGroup: "web_relevant" },

  // Education
  school: { googleType: "school", searchKeywords: "school academy coaching center", priorityGroup: "web_relevant" },
  tutoring: { searchKeywords: "tutoring coaching test prep ielts", priorityGroup: "web_relevant" },
  daycare: { searchKeywords: "daycare childcare center", priorityGroup: "web_relevant" },
  driving_school: { searchKeywords: "driving school lessons", priorityGroup: "web_relevant" },
  language_school: { searchKeywords: "language institute school", priorityGroup: "web_relevant" },
  music_academy: { searchKeywords: "music art academy lessons", priorityGroup: "web_relevant" },
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
  const cachedResponse = await getCachedPlacesResponse(cacheKey);
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
  const budget = await getBudgetStatus(confirmedExtraDailyCalls);
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
  await incrementGoogleApiCallCount();

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
      phone: phoneRes.phone,
      canWhatsApp: phoneRes.canWhatsApp,
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
      phoneWarning: phoneRes.isSuspicious ? "Suspicious number — verify before use" : null,
      matchType: "google",
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
      whatsapp: null,
      whatsappNumber: null,
      whatsappLink: null,
      whatsappConfirmed: false,
      whatsappStatus: phoneRes.canWhatsApp
        ? "Mobile number — WhatsApp not confirmed"
        : "Not listed as WhatsApp",
      whatsappSource: null,
      facebookUrl: null,
      facebookSource: null,
      instagramUrl: null,
      instagramSource: null,
    };

    computeLeadContactability(lead);
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
  await setCachedPlacesResponse(cacheKey, result, 30);

  return result;
}
