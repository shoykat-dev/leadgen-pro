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
