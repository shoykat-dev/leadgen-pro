/**
 * Standard OpenStreetMap (OSM) multi-tag mapping for LeadGen Pro categories.
 * Each category maps to multiple OSM tags across amenity, shop, office, craft, leisure, tourism, healthcare, etc.
 * This ensures maximum lead completeness without missing businesses tagged under alternative standard OSM tags.
 */

export interface OsmTagCriteria {
  key: string;
  value: string;
}

export const CATEGORY_TAGS: Record<string, OsmTagCriteria[]> = {
  // 1. Marketing & Creative
  digital_marketing: [
    { key: "office", value: "advertising" },
    { key: "office", value: "marketing" },
    { key: "office", value: "it" },
    { key: "office", value: "web_design" },
  ],
  seo_agency: [
    { key: "office", value: "advertising" },
    { key: "office", value: "marketing" },
    { key: "office", value: "it" },
  ],
  social_media_agency: [
    { key: "office", value: "advertising" },
    { key: "office", value: "marketing" },
    { key: "office", value: "media" },
  ],
  graphic_design: [
    { key: "office", value: "graphic_design" },
    { key: "craft", value: "photographer" },
    { key: "craft", value: "signmaker" },
  ],
  advertising_pr: [
    { key: "office", value: "advertising" },
    { key: "office", value: "pr" },
    { key: "office", value: "communication" },
  ],
  video_production: [
    { key: "craft", value: "photographer" },
    { key: "office", value: "studio" },
    { key: "office", value: "media" },
  ],
  photography_studio: [
    { key: "craft", value: "photographer" },
    { key: "shop", value: "photo" },
    { key: "office", value: "studio" },
  ],

  // 2. Food & Dining
  restaurant: [
    { key: "amenity", value: "restaurant" },
    { key: "amenity", value: "fast_food" },
    { key: "amenity", value: "cafe" },
    { key: "amenity", value: "food_court" },
  ],
  cafe: [
    { key: "amenity", value: "cafe" },
    { key: "amenity", value: "coffee_shop" },
    { key: "shop", value: "coffee" },
    { key: "amenity", value: "tea" },
  ],
  bakery: [
    { key: "shop", value: "bakery" },
    { key: "shop", value: "pastry" },
    { key: "shop", value: "confectionery" },
    { key: "craft", value: "baker" },
  ],
  fast_food: [
    { key: "amenity", value: "fast_food" },
    { key: "amenity", value: "food_court" },
    { key: "amenity", value: "restaurant" },
  ],
  bar_pub: [
    { key: "amenity", value: "pub" },
    { key: "amenity", value: "bar" },
    { key: "amenity", value: "nightclub" },
    { key: "amenity", value: "biergarten" },
  ],
  catering: [
    { key: "craft", value: "caterer" },
    { key: "amenity", value: "catering" },
    { key: "shop", value: "caterer" },
  ],

  // 3. Healthcare & Medical
  health_clinic: [
    { key: "amenity", value: "clinic" },
    { key: "amenity", value: "doctors" },
    { key: "healthcare", value: "clinic" },
    { key: "healthcare", value: "doctor" },
  ],
  dental_clinic: [
    { key: "amenity", value: "dentist" },
    { key: "healthcare", value: "dentist" },
  ],
  hospital: [
    { key: "amenity", value: "hospital" },
    { key: "healthcare", value: "hospital" },
  ],
  pharmacy: [
    { key: "amenity", value: "pharmacy" },
    { key: "healthcare", value: "pharmacy" },
    { key: "shop", value: "chemist" },
  ],
  dermatology: [
    { key: "healthcare", value: "dermatology" },
    { key: "amenity", value: "clinic" },
    { key: "healthcare", value: "clinic" },
  ],
  physiotherapy: [
    { key: "healthcare", value: "physiotherapist" },
    { key: "healthcare", value: "rehabilitation" },
  ],
  optometry: [
    { key: "shop", value: "optician" },
    { key: "healthcare", value: "optometrist" },
  ],
  chiropractor: [
    { key: "healthcare", value: "alternative" },
    { key: "healthcare", value: "physiotherapist" },
  ],
  veterinary: [
    { key: "amenity", value: "veterinary" },
    { key: "healthcare", value: "veterinary" },
  ],
  mental_health: [
    { key: "healthcare", value: "psychotherapist" },
    { key: "healthcare", value: "counselling" },
  ],

  // 4. Beauty & Wellness
  salon: [
    { key: "shop", value: "hairdresser" },
    { key: "shop", value: "beauty" },
    { key: "shop", value: "cosmetics" },
  ],
  spa: [
    { key: "leisure", value: "spa" },
    { key: "shop", value: "massage" },
    { key: "amenity", value: "public_bath" },
    { key: "leisure", value: "sauna" },
  ],
  barbershop: [
    { key: "shop", value: "hairdresser" },
    { key: "shop", value: "barber" },
  ],
  nail_salon: [
    { key: "shop", value: "beauty" },
    { key: "shop", value: "nail_salon" },
  ],
  massage: [
    { key: "shop", value: "massage" },
    { key: "leisure", value: "spa" },
  ],
  cosmetic_clinic: [
    { key: "shop", value: "beauty" },
    { key: "healthcare", value: "clinic" },
  ],

  // 5. Fitness & Sports
  gym: [
    { key: "leisure", value: "fitness_centre" },
    { key: "leisure", value: "sports_centre" },
  ],
  yoga: [
    { key: "leisure", value: "fitness_centre" },
    { key: "leisure", value: "yoga" },
  ],
  martial_arts: [
    { key: "leisure", value: "sports_centre" },
    { key: "leisure", value: "fitness_centre" },
    { key: "club", value: "sport" },
  ],
  swimming_pool: [
    { key: "leisure", value: "swimming_pool" },
    { key: "leisure", value: "sports_centre" },
  ],
  personal_trainer: [
    { key: "leisure", value: "fitness_centre" },
    { key: "office", value: "personal_trainer" },
  ],

  // 6. Real Estate & Architecture
  real_estate: [
    { key: "office", value: "estate_agent" },
    { key: "office", value: "property_management" },
  ],
  architecture: [
    { key: "office", value: "architect" },
    { key: "office", value: "engineer" },
  ],
  interior_design: [
    { key: "office", value: "interior_decorator" },
    { key: "shop", value: "interior_decoration" },
  ],
  construction: [
    { key: "craft", value: "builder" },
    { key: "office", value: "construction" },
    { key: "craft", value: "general_contractor" },
  ],
  property_management: [
    { key: "office", value: "property_management" },
    { key: "office", value: "estate_agent" },
  ],

  // 7. Home Services & Trades
  plumber: [
    { key: "craft", value: "plumber" },
    { key: "shop", value: "plumber" },
  ],
  electrician: [
    { key: "craft", value: "electrician" },
    { key: "shop", value: "electrical" },
  ],
  hvac: [
    { key: "craft", value: "hvac" },
    { key: "craft", value: "plumber" },
  ],
  roofing: [
    { key: "craft", value: "roofer" },
    { key: "craft", value: "builder" },
  ],
  cleaning: [
    { key: "craft", value: "cleaning" },
    { key: "office", value: "cleaning" },
  ],
  pest_control: [
    { key: "craft", value: "pest_control" },
  ],
  locksmith: [
    { key: "craft", value: "locksmith" },
    { key: "shop", value: "locksmith" },
  ],
  painting: [
    { key: "craft", value: "painter" },
  ],
  landscaping: [
    { key: "craft", value: "gardener" },
    { key: "craft", value: "landscaper" },
  ],
  handyman: [
    { key: "craft", value: "handyman" },
    { key: "craft", value: "carpenter" },
  ],
  flooring_carpet: [
    { key: "craft", value: "floorer" },
    { key: "shop", value: "carpet" },
    { key: "shop", value: "flooring" },
  ],
  appliance_repair: [
    { key: "craft", value: "electronics_repair" },
    { key: "shop", value: "appliance" },
  ],
  glass_glazier: [
    { key: "craft", value: "glazier" },
    { key: "craft", value: "window_construction" },
  ],

  // 8. Energy & Environment
  solar_energy: [
    { key: "craft", value: "electrician" },
    { key: "office", value: "energy_supplier" },
    { key: "shop", value: "solar" },
  ],
  waste_management: [
    { key: "amenity", value: "recycling" },
    { key: "amenity", value: "waste_transfer_station" },
  ],

  // 9. Legal & Financial
  law_firm: [
    { key: "office", value: "lawyer" },
    { key: "office", value: "legal" },
  ],
  accounting: [
    { key: "office", value: "accountant" },
    { key: "office", value: "tax_advisor" },
    { key: "office", value: "financial" },
  ],
  tax_consultant: [
    { key: "office", value: "tax_advisor" },
    { key: "office", value: "accountant" },
  ],
  financial_advisory: [
    { key: "office", value: "financial" },
    { key: "office", value: "financial_advisor" },
  ],
  insurance: [
    { key: "office", value: "insurance" },
  ],
  notary: [
    { key: "office", value: "notary" },
    { key: "office", value: "lawyer" },
  ],

  // 10. Business, HR & Staffing
  recruitment_agency: [
    { key: "office", value: "employment_agency" },
    { key: "office", value: "recruiter" },
  ],
  security_services: [
    { key: "office", value: "security" },
    { key: "craft", value: "security" },
  ],
  business_consulting: [
    { key: "office", value: "consulting" },
    { key: "office", value: "company" },
  ],
  coworking: [
    { key: "office", value: "coworking" },
    { key: "amenity", value: "coworking_space" },
  ],
  printing: [
    { key: "craft", value: "printer" },
    { key: "shop", value: "copyshop" },
    { key: "shop", value: "print" },
  ],
  translation: [
    { key: "office", value: "translator" },
  ],

  // 11. Automotive Services
  car_repair: [
    { key: "shop", value: "car_repair" },
    { key: "amenity", value: "car_repair" },
  ],
  auto_body: [
    { key: "shop", value: "car_repair" },
    { key: "craft", value: "car_body" },
  ],
  car_wash: [
    { key: "amenity", value: "car_wash" },
  ],
  tire_shop: [
    { key: "shop", value: "tyres" },
    { key: "shop", value: "car_repair" },
  ],
  car_dealership: [
    { key: "shop", value: "car" },
  ],
  car_rental: [
    { key: "amenity", value: "car_rental" },
  ],
  towing: [
    { key: "emergency", value: "towing" },
    { key: "amenity", value: "towing" },
  ],

  // 12. Logistics & Storage
  logistics: [
    { key: "office", value: "logistics" },
    { key: "office", value: "freight" },
  ],
  freight_forwarding: [
    { key: "office", value: "logistics" },
    { key: "office", value: "customs" },
  ],
  moving_company: [
    { key: "office", value: "moving_company" },
    { key: "craft", value: "mover" },
  ],
  self_storage: [
    { key: "shop", value: "storage_rental" },
    { key: "building", value: "warehouse" },
  ],
  courier_delivery: [
    { key: "amenity", value: "post_office" },
    { key: "office", value: "courier" },
  ],

  // 13. Pet Care & Services
  pet_store: [
    { key: "shop", value: "pet" },
    { key: "shop", value: "pet_grooming" },
  ],
  pet_grooming: [
    { key: "shop", value: "pet_grooming" },
    { key: "shop", value: "pet" },
  ],
  pet_boarding: [
    { key: "amenity", value: "animal_boarding" },
    { key: "amenity", value: "animal_shelter" },
  ],

  // 14. Hotels & Travel
  hotel: [
    { key: "tourism", value: "hotel" },
    { key: "tourism", value: "guest_house" },
    { key: "tourism", value: "motel" },
    { key: "tourism", value: "hostel" },
  ],
  resort: [
    { key: "tourism", value: "resort" },
    { key: "leisure", value: "resort" },
  ],
  travel_agency: [
    { key: "shop", value: "travel_agency" },
    { key: "office", value: "travel_agent" },
  ],

  // 15. Events & Entertainment
  event_planner: [
    { key: "office", value: "event_management" },
    { key: "craft", value: "event_planner" },
  ],
  event_venue: [
    { key: "amenity", value: "events_venue" },
    { key: "amenity", value: "conference_centre" },
    { key: "amenity", value: "community_centre" },
  ],
  dj_entertainment: [
    { key: "craft", value: "musician" },
    { key: "office", value: "studio" },
  ],

  // 16. Retail & Shopping
  supermarket: [
    { key: "shop", value: "supermarket" },
    { key: "shop", value: "convenience" },
    { key: "shop", value: "grocery" },
  ],
  clothing_store: [
    { key: "shop", value: "clothes" },
    { key: "shop", value: "boutique" },
    { key: "shop", value: "fashion" },
  ],
  electronics_store: [
    { key: "shop", value: "electronics" },
    { key: "shop", value: "computer" },
  ],
  furniture_store: [
    { key: "shop", value: "furniture" },
    { key: "shop", value: "interior_decoration" },
  ],
  jewelry_store: [
    { key: "shop", value: "jewelry" },
    { key: "shop", value: "jewellery" },
    { key: "shop", value: "watch" },
  ],
  bookstore: [
    { key: "shop", value: "books" },
    { key: "shop", value: "stationery" },
  ],
  florist: [
    { key: "shop", value: "florist" },
    { key: "shop", value: "flowers" },
  ],
  mobile_phone_shop: [
    { key: "shop", value: "mobile_phone" },
    { key: "shop", value: "telecommunication" },
    { key: "craft", value: "electronics_repair" },
  ],

  // 17. Education & Learning
  school: [
    { key: "amenity", value: "school" },
    { key: "amenity", value: "college" },
  ],
  tutoring: [
    { key: "amenity", value: "training" },
    { key: "office", value: "tutoring" },
  ],
  daycare: [
    { key: "amenity", value: "kindergarten" },
    { key: "amenity", value: "childcare" },
  ],
  driving_school: [
    { key: "amenity", value: "driving_school" },
  ],
  language_school: [
    { key: "amenity", value: "language_school" },
  ],
  music_academy: [
    { key: "amenity", value: "music_school" },
  ],
};

/**
 * Returns the array of OSM tag criteria for a given application category ID.
 * Falls back to generic amenity & shop tags if unmapped.
 */
export function getCategoryOsmTags(categoryId: string): OsmTagCriteria[] {
  const normalizedId = categoryId.toLowerCase().trim();
  if (CATEGORY_TAGS[normalizedId] && CATEGORY_TAGS[normalizedId].length > 0) {
    return CATEGORY_TAGS[normalizedId];
  }

  // Fallback: sanitized amenity & shop
  const safeVal = normalizedId.replace(/[^a-z0-9_]/g, "_");
  return [
    { key: "amenity", value: safeVal },
    { key: "shop", value: safeVal },
  ];
}

// ---------------------------------------------------------------------------
// Name-keyword fallback
// Service trades (cleaning, plumbing, electrical, roofing, ...) are rarely
// tagged with a category tag in OpenStreetMap — most exist only as a name on a
// generic office/company node. A tag-only query therefore finds almost none of
// them. The fallback matches business NAMES against per-category keywords and
// unions those leads with the tag-matched set. Every name match is badged
// "Matched by name — verify category" in the UI and marked in the CSV, so the
// user can see how each lead was found. See free-search.ts for the pipeline
// (precedence rule, commercial-context check, exclusions).
// ---------------------------------------------------------------------------

export const NAME_KEYWORDS: Record<string, string[]> = {
  // 1. Marketing & Creative
  digital_marketing: ["digital marketing", "marketing agency", "marketing", "growth marketing", "web design"],
  seo_agency: ["seo", "search engine", "search marketing"],
  social_media_agency: ["social media", "smm", "digital agency"],
  graphic_design: ["graphic design", "branding studio", "brand design"],
  advertising_pr: ["advertising", "ad agency", "public relations", "pr agency"],
  video_production: ["video production", "film production", "video studio", "production house"],
  photography_studio: ["photography", "photo studio", "photographer", "portrait studio"],

  // 2. Food & Dining
  restaurant: ["restaurant", "eatery", "diner", "bistro", "trattoria", "brasserie"],
  cafe: ["cafe", "coffee shop", "coffee house", "espresso", "tea house", "tea room"],
  bakery: ["bakery", "baker", "patisserie", "pastry", "cake shop"],
  fast_food: ["fast food", "burger", "pizza", "kebab", "fried chicken"],
  bar_pub: ["pub", "bar", "lounge", "tavern", "brewery", "beer garden", "wine bar"],
  catering: ["catering", "banquet", "event catering"],

  // 3. Healthcare & Medical
  health_clinic: ["clinic", "medical clinic", "doctor", "health clinic", "medical center"],
  dental_clinic: ["dental", "dentist", "orthodontic"],
  hospital: ["hospital", "medical center"],
  pharmacy: ["pharmacy", "drugstore", "chemist"],
  dermatology: ["dermatology", "skin clinic", "skin care"],
  physiotherapy: ["physiotherapy", "physio", "rehabilitation", "rehab"],
  optometry: ["optometrist", "optician", "eye care", "optical"],
  chiropractor: ["chiropractor", "chiropractic"],
  veterinary: ["veterinary", "vet clinic", "animal hospital"],
  mental_health: ["psychology", "psychologist", "therapy", "therapist", "counselling", "counseling", "mental health"],

  // 4. Beauty & Wellness
  salon: ["salon", "hairdresser", "hair salon", "beauty salon"],
  spa: ["spa", "sauna", "wellness center"],
  barbershop: ["barber", "barbershop"],
  nail_salon: ["nail salon", "nails", "lash studio", "lash"],
  massage: ["massage", "massage therapy"],
  cosmetic_clinic: ["aesthetic", "cosmetic clinic", "med spa", "medical spa", "botox"],

  // 5. Fitness & Sports
  gym: ["gym", "fitness", "fitness center", "health club"],
  yoga: ["yoga", "pilates"],
  martial_arts: ["martial arts", "boxing", "karate", "taekwondo", "judo", "jiu jitsu", "mma"],
  swimming_pool: ["swimming pool", "swim school", "aquatic"],
  personal_trainer: ["personal training", "personal trainer", "athletic"],

  // 6. Real Estate & Architecture
  real_estate: ["real estate", "realtor", "estate agent", "property agent"],
  architecture: ["architect", "engineering"],
  interior_design: ["interior design", "interior decorator"],
  construction: ["construction", "contractor", "general contractor", "builder", "builders"],
  property_management: ["property management", "property manager"],

  // 7. Home Services & Trades (the weak trades — name matching matters most here)
  plumber: ["plumb", "drainage"],
  electrician: ["electric", "electrical contractor"],
  hvac: ["hvac", "heating", "air conditioning", "ac repair"],
  roofing: ["roof"],
  cleaning: ["clean", "janitorial", "housekeeping", "maid", "facilities"],
  pest_control: ["pest control", "pest", "exterminator"],
  locksmith: ["locksmith", "lock"],
  painting: ["paint", "decorator"],
  landscaping: ["landscap", "lawn care", "gardener", "gardening"],
  handyman: ["handyman", "property maintenance", "maintenance"],
  flooring_carpet: ["flooring", "carpet", "floor"],
  appliance_repair: ["appliance repair", "appliance", "white goods"],
  glass_glazier: ["glazier", "glazing", "glass"],

  // 8. Energy & Environment
  solar_energy: ["solar", "solar energy", "solar panel"],
  waste_management: ["waste", "junk removal", "rubbish", "recycling"],

  // 9. Legal & Financial
  law_firm: ["law firm", "lawyer", "attorney", "solicitor", "legal"],
  accounting: ["accounting", "accountant", "bookkeeping", "cpa"],
  tax_consultant: ["tax", "tax advisor", "tax consultant"],
  financial_advisory: ["financial", "wealth management", "financial advisor"],
  insurance: ["insurance", "insurer"],
  notary: ["notary"],

  // 10. Business, HR & Staffing
  recruitment_agency: ["recruitment", "staffing", "employment agency", "headhunter"],
  security_services: ["security", "security guard", "patrol"],
  business_consulting: ["consulting", "consultant", "business consulting", "management consulting"],
  coworking: ["coworking", "shared office", "workspace"],
  printing: ["print", "signage"],
  translation: ["translation", "translator", "localization", "interpretation"],

  // 11. Automotive Services
  car_repair: ["auto repair", "car repair", "mechanic", "garage", "motors"],
  auto_body: ["auto body", "body shop", "car paint", "dent repair"],
  car_wash: ["car wash", "auto detailing", "detailing"],
  tire_shop: ["tire", "tyre", "wheel alignment"],
  car_dealership: ["car dealership", "auto sales", "car sales", "motors"],
  car_rental: ["car rental", "car hire", "rent a car"],
  towing: ["towing", "roadside assistance", "tow truck"],

  // 12. Logistics & Storage
  logistics: ["logistics", "freight", "shipping"],
  freight_forwarding: ["freight forwarding", "customs broker", "freight"],
  moving_company: ["moving", "relocation", "removals", "movers"],
  self_storage: ["self storage", "storage", "warehouse"],
  courier_delivery: ["courier", "delivery", "express delivery", "parcel"],

  // 13. Pet Care & Services
  pet_store: ["pet shop", "pet store", "pet supplies"],
  pet_grooming: ["pet grooming", "dog grooming", "grooming"],
  pet_boarding: ["pet boarding", "dog hotel", "pet hotel", "kennel", "cattery"],

  // 14. Hotels & Travel
  hotel: ["hotel", "guest house", "motel", "hostel", "inn", "suites"],
  resort: ["resort", "vacation", "retreat"],
  travel_agency: ["travel agency", "travel agent", "tour operator", "tours"],

  // 15. Events & Entertainment
  event_planner: ["event planner", "wedding planner", "event planning", "party planner"],
  event_venue: ["event venue", "banquet hall", "conference", "function room"],
  dj_entertainment: ["dj", "disc jockey", "entertainment", "karaoke"],

  // 16. Retail & Shopping
  supermarket: ["supermarket", "grocery", "grocery store", "market"],
  clothing_store: ["clothing", "fashion", "boutique", "apparel"],
  electronics_store: ["electronics", "gadget", "computer store"],
  furniture_store: ["furniture", "home goods"],
  jewelry_store: ["jewelry", "jewellery", "jeweler", "watch"],
  bookstore: ["bookstore", "bookshop", "stationery", "books"],
  florist: ["florist", "flower", "flowers", "bouquet"],
  mobile_phone_shop: ["mobile phone", "phone shop", "phone repair", "cell phone", "mobile repair"],

  // 17. Education & Learning
  school: ["school", "academy", "college"],
  tutoring: ["tutoring", "tutor", "learning center", "coaching"],
  daycare: ["daycare", "childcare", "nursery", "kindergarten", "creche"],
  driving_school: ["driving school", "driving lessons", "driver training"],
  language_school: ["language school", "language institute", "language center"],
  music_academy: ["music school", "music academy", "art academy", "music lessons"],
};

/**
 * Per-category tag exclusions for name matching. A name-matched element carrying
 * one of these tags is never pulled into the category, even when its name fits.
 * (Laundry / dry cleaning is its own trade — it never belongs to Cleaning.)
 */
export const NAME_MATCH_EXCLUSIONS: Record<string, OsmTagCriteria[]> = {
  cleaning: [{ key: "shop", value: "dry_cleaning" }],
};

/**
 * Per-category name phrases that veto a name match even when a keyword fits.
 * Same purpose as NAME_MATCH_EXCLUSIONS, for businesses whose tag does not say
 * what they are (e.g. a generic office node named "Dry Clean Express").
 */
export const NAME_MATCH_PHRASE_EXCLUSIONS: Record<string, string[]> = {
  cleaning: ["dry clean", "dryclean", "laundromat", "launderette", "laundry"],
};

export function getCategoryNameKeywords(categoryId: string): string[] {
  return NAME_KEYWORDS[categoryId.toLowerCase().trim()] || [];
}

// ---------------------------------------------------------------------------
// Tag -> category index (precedence rule)
// An element whose own primary tag maps to a DIFFERENT category is never
// name-matched into this category (e.g. a barbershop named "Clean Cuts" stays
// in the salon categories and never appears under Cleaning).
// ---------------------------------------------------------------------------

const TAG_TO_CATEGORIES = new Map<string, Set<string>>();

function tagIndexKey(key: string, value: string): string {
  return `${key.toLowerCase()}=${value.toLowerCase()}`;
}

for (const [categoryId, tags] of Object.entries(CATEGORY_TAGS)) {
  for (const t of tags) {
    const k = tagIndexKey(t.key, t.value);
    if (!TAG_TO_CATEGORIES.has(k)) TAG_TO_CATEGORIES.set(k, new Set());
    TAG_TO_CATEGORIES.get(k)!.add(categoryId);
  }
}

/** All category ids that a given OSM tag maps to (empty when unmapped). */
export function getCategoriesForTag(key: string, value: string): string[] {
  const found = TAG_TO_CATEGORIES.get(tagIndexKey(key, value));
  return found ? Array.from(found) : [];
}

// ---------------------------------------------------------------------------
// Token matching shared by the name fallback and the Overture category gate.
// Keywords match as whole words/phrases: a keyword token of 4+ letters may
// prefix-match ("plumb" matches "plumbing"), shorter tokens must match exactly
// ("bar" must not match "barber"). British/American spelling is normalised.
// ---------------------------------------------------------------------------

export function tokenizePhrase(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/centre/g, "center")
    .replace(/theatre/g, "theater")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function phraseMatchesTokens(phraseTokens: string[], hayTokens: string[]): boolean {
  if (phraseTokens.length === 0 || phraseTokens.length > hayTokens.length) return false;
  for (let i = 0; i <= hayTokens.length - phraseTokens.length; i++) {
    let ok = true;
    for (let j = 0; j < phraseTokens.length; j++) {
      const p = phraseTokens[j];
      const h = hayTokens[i + j];
      const matches = p.length >= 4 ? h.startsWith(p) : h === p;
      if (!matches) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/** Strict word/phrase check: does this business name match any keyword? */
export function nameMatchesKeywords(name: string, keywords: string[]): boolean {
  const hayTokens = tokenizePhrase(name);
  if (hayTokens.length === 0) return false;
  return keywords.some((kw) => phraseMatchesTokens(tokenizePhrase(kw), hayTokens));
}

/** Strict check: does this name contain any veto phrase? */
export function nameMatchesPhraseExclusions(name: string, phrases: string[]): boolean {
  const hayTokens = tokenizePhrase(name);
  if (hayTokens.length === 0) return false;
  return phrases.some((p) => phraseMatchesTokens(tokenizePhrase(p), hayTokens));
}

// ---------------------------------------------------------------------------
// Overture category gate
// Overture Places categories.primary uses taxonomy values such as
// "fast_food_restaurant", "hair_salon", "cleaning_service". The gate matches a
// row only when one of its categories contains a per-category keyword as a
// whole word/phrase — loose substring matching used to let unrelated trades
// through (e.g. an events business under Restaurant).
// ---------------------------------------------------------------------------

/** Tag values too generic to use as Overture keywords on their own. */
const GENERIC_TAG_VALUE_STOPLIST = new Set([
  "car",
  "company",
  "it",
  "office",
  "studio",
  "shop",
  "store",
  "retail",
  "service",
  "services",
  "centre",
  "center",
  "food",
  "health",
  "sport",
  "club",
  "bank",
]);

/** Extra Overture taxonomy terms where tag values + name keywords fall short. */
const OVERTURE_KEYWORD_OVERRIDES: Record<string, string[]> = {
  real_estate: ["real estate agency", "real estate agent"],
  supermarket: ["grocery store"],
  clothing_store: ["clothing store"],
  mobile_phone_shop: ["cell phone store", "mobile phone store"],
  car_dealership: ["car dealer", "auto dealer"],
  hotel: ["guest house", "bed and breakfast"],
  health_clinic: ["medical clinic", "health center"],
  tutoring: ["tutoring center", "learning center"],
  self_storage: ["storage facility"],
  courier_delivery: ["courier service", "delivery service"],
  cleaning: ["cleaning service", "house cleaning", "commercial cleaning"],
  plumber: ["plumbing service"],
  electrician: ["electrical service"],
  roofing: ["roofing service"],
  hvac: ["hvac service"],
  landscaping: ["landscaping service", "lawn care service"],
  pest_control: ["pest control service"],
  moving_company: ["moving company", "moving service"],
  event_venue: ["event space", "banquet hall"],
  travel_agency: ["travel agency"],
  business_consulting: ["consulting firm"],
  recruitment_agency: ["staffing agency", "employment agency"],
};

function buildOvertureKeywords(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const categoryId of Object.keys(CATEGORY_TAGS)) {
    const terms = new Set<string>();
    for (const t of CATEGORY_TAGS[categoryId]) {
      const term = t.value.replace(/_/g, " ").toLowerCase().trim();
      if (term && !GENERIC_TAG_VALUE_STOPLIST.has(term)) terms.add(term);
    }
    for (const kw of NAME_KEYWORDS[categoryId] || []) {
      terms.add(kw.toLowerCase().trim());
    }
    for (const kw of OVERTURE_KEYWORD_OVERRIDES[categoryId] || []) {
      terms.add(kw.toLowerCase().trim());
    }
    out[categoryId] = Array.from(terms);
  }
  return out;
}

export const OVERTURE_KEYWORDS: Record<string, string[]> = buildOvertureKeywords();

export function getCategoryOvertureKeywords(categoryId: string): string[] {
  return OVERTURE_KEYWORDS[categoryId.toLowerCase().trim()] || [];
}

/** Overture category tokens that mark a non-service business (supplier etc.). */
const OVERTURE_NON_SERVICE_TOKENS = new Set([
  "supply",
  "supplier",
  "suppliers",
  "supplies",
  "wholesale",
  "manufacturer",
  "manufacturing",
  "distributor",
  "distributors",
  "distribution",
  "warehouse",
]);

/** Overture category tokens that must never appear under a food category. */
const FOOD_CATEGORY_OVERTURE_EXCLUSIONS = new Set([
  "event",
  "events",
  "entertainment",
  "comedy",
  "concert",
  "theater",
  "cinema",
  "nightclub",
  "casino",
]);

/** Name phrases that veto a lead under any food category (OSM or Overture). */
const FOOD_NAME_BLOCKLIST = [
  "interiors",
  "interior design",
  "coffee machine supplier",
  "documents clearing",
];

/**
 * True when a business NAME shows it is not a food business at all — an
 * events/entertainment venue, an interiors firm, a supplier — however it is
 * tagged. Applies to tag matches, name matches, and Overture rows alike:
 * OSM itself mis-tags venues (DORANGOS, a comedy-events business, carries
 * amenity=cafe), so the tag alone cannot be trusted for food categories.
 */
export function nameMatchesFoodBlocklist(name: string): boolean {
  const lower = (name || "").toLowerCase();
  if (FOOD_NAME_BLOCKLIST.some((phrase) => lower.includes(phrase))) return true;
  return tokenizePhrase(lower).some((t) => FOOD_CATEGORY_OVERTURE_EXCLUSIONS.has(t));
}

const FOOD_CATEGORIES = new Set([
  "restaurant",
  "cafe",
  "fast_food",
  "bakery",
  "catering",
  "bar_pub",
]);

/**
 * Primary tag values that veto name matching into ANY category. The precedence
 * rule only protects against tags that map to one of the 101 directory
 * categories — but some businesses carry a primary tag that maps to nothing
 * (e.g. amenity=cinema is not a directory category), so "Electric Cinema"
 * would otherwise name-match into Electrician. Every value here was checked
 * to map to NO directory category; values that do map (school, hospital,
 * post_office, ...) are deliberately absent because precedence already
 * handles them.
 */
export const NAME_MATCH_BLOCKED_PRIMARY_VALUES: ReadonlySet<string> = new Set([
  "cinema",
  "theatre",
  "theater",
  "arts_centre",
  "library",
  "university",
  "place_of_worship",
  "church",
  "mosque",
  "temple",
  "synagogue",
  "police",
  "fire_station",
  "townhall",
  "courthouse",
  "social_facility",
  "marketplace",
  "museum",
  "gallery",
  "attraction",
  "viewpoint",
  "artwork",
  "memorial",
  "monument",
  "park",
  "garden",
  "playground",
]);

/**
 * Tight relevance gate for unmatched Overture rows: the row's categories must
 * contain a per-category keyword as a whole word/phrase, must not be a
 * supplier/wholesale business, and (for food categories) must not be an
 * events/entertainment business.
 */
export function overtureCategoriesMatch(
  categoryId: string,
  overtureCategories: string[]
): boolean {
  const normalizedId = categoryId.toLowerCase().trim();
  if (normalizedId === "all") return true;
  const keywords = getCategoryOvertureKeywords(normalizedId);
  if (keywords.length === 0) return false;

  for (const rawCat of overtureCategories || []) {
    const tokens = tokenizePhrase(String(rawCat).replace(/_/g, " "));
    if (tokens.length === 0) continue;
    // Supplier / wholesale / warehouse businesses are never local-service leads.
    if (tokens.some((t) => OVERTURE_NON_SERVICE_TOKENS.has(t))) continue;
    // Events / entertainment businesses never belong under a food category.
    if (
      FOOD_CATEGORIES.has(normalizedId) &&
      tokens.some((t) => FOOD_CATEGORY_OVERTURE_EXCLUSIONS.has(t))
    ) {
      continue;
    }
    if (keywords.some((kw) => phraseMatchesTokens(tokenizePhrase(kw), tokens))) {
      return true;
    }
  }
  return false;
}
