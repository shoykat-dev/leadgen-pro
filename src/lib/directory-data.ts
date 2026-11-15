export interface BusinessCategoryDefinition {
  id: string;
  label: string;
  group: string;
  icon: string;
  queryType: string;
}

export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const ALL_BUSINESS_SERVICES: BusinessCategoryDefinition[] = [
  // 1. Marketing & Creative
  { id: "digital_marketing", label: "Digital Marketing Agency", group: "Marketing & Creative", icon: "📈", queryType: "marketing" },
  { id: "seo_agency", label: "SEO & Content Marketing Agency", group: "Marketing & Creative", icon: "🎯", queryType: "seo" },
  { id: "social_media_agency", label: "Social Media Marketing Agency", group: "Marketing & Creative", icon: "📱", queryType: "smm" },
  { id: "graphic_design", label: "Graphic Design & Branding Studio", group: "Marketing & Creative", icon: "🎨", queryType: "design" },
  { id: "advertising_pr", label: "Advertising & PR Agency", group: "Marketing & Creative", icon: "📢", queryType: "pr" },
  { id: "video_production", label: "Video Production & Media Studio", group: "Marketing & Creative", icon: "🎬", queryType: "video" },
  { id: "photography_studio", label: "Photography & Portrait Studio", group: "Marketing & Creative", icon: "📷", queryType: "photo" },

  // 2. Food & Dining
  { id: "restaurant", label: "Restaurant & Fine Dining", group: "Food & Dining", icon: "🍽️", queryType: "restaurant" },
  { id: "cafe", label: "Cafe & Coffee Shop", group: "Food & Dining", icon: "☕", queryType: "cafe" },
  { id: "bakery", label: "Bakery & Pastry Shop", group: "Food & Dining", icon: "🥐", queryType: "bakery" },
  { id: "fast_food", label: "Fast Food & Burger Joint", group: "Food & Dining", icon: "🍔", queryType: "fast_food" },
  { id: "bar_pub", label: "Bar, Pub & Lounge", group: "Food & Dining", icon: "🍸", queryType: "pub" },
  { id: "catering", label: "Catering & Banquet Service", group: "Food & Dining", icon: "🍱", queryType: "catering" },

  // 3. Healthcare & Medical
  { id: "health_clinic", label: "Doctors & Medical Clinic", group: "Healthcare & Medical", icon: "🩺", queryType: "clinic" },
  { id: "dental_clinic", label: "Dental Clinic & Dentists", group: "Healthcare & Medical", icon: "🦷", queryType: "dentist" },
  { id: "hospital", label: "Hospital & Medical Center", group: "Healthcare & Medical", icon: "🏥", queryType: "hospital" },
  { id: "pharmacy", label: "Pharmacy & Drugstore", group: "Healthcare & Medical", icon: "💊", queryType: "pharmacy" },
  { id: "dermatology", label: "Dermatology & Skin Care Clinic", group: "Healthcare & Medical", icon: "🧴", queryType: "dermatology" },
  { id: "physiotherapy", label: "Physiotherapy & Rehab Center", group: "Healthcare & Medical", icon: "🧘", queryType: "physio" },
  { id: "optometry", label: "Optometrist & Eye Care Clinic", group: "Healthcare & Medical", icon: "👓", queryType: "optometry" },
  { id: "chiropractor", label: "Chiropractor & Wellness Clinic", group: "Healthcare & Medical", icon: "🦴", queryType: "chiropractor" },
  { id: "veterinary", label: "Veterinary Clinic & Animal Hospital", group: "Healthcare & Medical", icon: "🐾", queryType: "vet" },
  { id: "mental_health", label: "Psychology & Therapy Clinic", group: "Healthcare & Medical", icon: "🧠", queryType: "therapy" },

  // 4. Beauty & Wellness
  { id: "salon", label: "Beauty Salon & Hairdresser", group: "Beauty & Wellness", icon: "✂️", queryType: "hairdresser" },
  { id: "spa", label: "Spa, Sauna & Wellness Center", group: "Beauty & Wellness", icon: "🧖", queryType: "spa" },
  { id: "barbershop", label: "Barbershop & Men's Grooming", group: "Beauty & Wellness", icon: "💈", queryType: "barber" },
  { id: "nail_salon", label: "Nail & Lash Salon", group: "Beauty & Wellness", icon: "💅", queryType: "nail" },
  { id: "massage", label: "Massage Therapy Studio", group: "Beauty & Wellness", icon: "💆", queryType: "massage" },
  { id: "cosmetic_clinic", label: "Medical Spa & Aesthetic Clinic", group: "Beauty & Wellness", icon: "✨", queryType: "medspa" },

  // 5. Fitness & Sports
  { id: "gym", label: "Gym & Fitness Club", group: "Fitness & Sports", icon: "🏋️", queryType: "gym" },
  { id: "yoga", label: "Yoga & Pilates Studio", group: "Fitness & Sports", icon: "🧘", queryType: "yoga" },
  { id: "martial_arts", label: "Martial Arts & Boxing Gym", group: "Fitness & Sports", icon: "🥊", queryType: "martial" },
  { id: "swimming_pool", label: "Swimming Pool & Sports Complex", group: "Fitness & Sports", icon: "🏊", queryType: "pool" },
  { id: "personal_trainer", label: "Personal Training & Athletic Studio", group: "Fitness & Sports", icon: "🏃", queryType: "trainer" },

  // 6. Real Estate & Architecture
  { id: "real_estate", label: "Real Estate Agency & Realtors", group: "Real Estate & Architecture", icon: "🏢", queryType: "real_estate" },
  { id: "architecture", label: "Architectural & Engineering Firm", group: "Real Estate & Architecture", icon: "📐", queryType: "architecture" },
  { id: "interior_design", label: "Interior Design Studio", group: "Real Estate & Architecture", icon: "🛋️", queryType: "interior" },
  { id: "construction", label: "General Contractor & Construction", group: "Real Estate & Architecture", icon: "🏗️", queryType: "construction" },
  { id: "property_management", label: "Property Management Service", group: "Real Estate & Architecture", icon: "🔑", queryType: "property_mgmt" },

  // 7. Home Services & Trades
  { id: "plumber", label: "Plumber & Drainage Specialist", group: "Home Services & Trades", icon: "🔧", queryType: "plumber" },
  { id: "electrician", label: "Electrician & Electrical Contractor", group: "Home Services & Trades", icon: "⚡", queryType: "electrician" },
  { id: "hvac", label: "HVAC Heating & AC Repair", group: "Home Services & Trades", icon: "❄️", queryType: "hvac" },
  { id: "roofing", label: "Roofing Contractor", group: "Home Services & Trades", icon: "🏠", queryType: "roofing" },
  { id: "cleaning", label: "Cleaning & Janitorial Services", group: "Home Services & Trades", icon: "🧹", queryType: "cleaning" },
  { id: "pest_control", label: "Pest Control Exterminators", group: "Home Services & Trades", icon: "🐜", queryType: "pest" },
  { id: "locksmith", label: "24/7 Locksmith Services", group: "Home Services & Trades", icon: "🔐", queryType: "locksmith" },
  { id: "painting", label: "Painter & Decorator", group: "Home Services & Trades", icon: "🖌️", queryType: "painting" },
  { id: "landscaping", label: "Landscaping & Lawn Care", group: "Home Services & Trades", icon: "🌿", queryType: "landscaping" },
  { id: "handyman", label: "Handyman & Property Maintenance", group: "Home Services & Trades", icon: "🔨", queryType: "handyman" },
  { id: "flooring_carpet", label: "Flooring & Carpet Installation", group: "Home Services & Trades", icon: "🪵", queryType: "flooring" },
  { id: "appliance_repair", label: "Home Appliance Repair & Maintenance", group: "Home Services & Trades", icon: "🧰", queryType: "appliance" },
  { id: "glass_glazier", label: "Glass, Window & Mirror Replacement", group: "Home Services & Trades", icon: "🪟", queryType: "glazier" },

  // 8. Energy & Environment
  { id: "solar_energy", label: "Solar Energy & Solar Panel Contractor", group: "Energy & Environment", icon: "☀️", queryType: "solar" },
  { id: "waste_management", label: "Waste Management & Junk Removal", group: "Energy & Environment", icon: "♻️", queryType: "waste" },

  // 9. Legal & Financial
  { id: "law_firm", label: "Law Firm & Attorneys", group: "Legal & Financial", icon: "⚖️", queryType: "lawyer" },
  { id: "accounting", label: "Accounting, CPA & Bookkeeping", group: "Legal & Financial", icon: "📊", queryType: "accounting" },
  { id: "tax_consultant", label: "Tax Advisor & Consultant", group: "Legal & Financial", icon: "📑", queryType: "tax" },
  { id: "financial_advisory", label: "Financial Advisors & Wealth Mgmt", group: "Legal & Financial", icon: "💼", queryType: "finance" },
  { id: "insurance", label: "Insurance Broker & Agency", group: "Legal & Financial", icon: "🛡️", queryType: "insurance" },
  { id: "notary", label: "Notary Public & Document Certification", group: "Legal & Financial", icon: "📜", queryType: "notary" },

  // 10. Business, HR & Staffing
  { id: "recruitment_agency", label: "Recruitment & Staffing Agency", group: "Business & Staffing", icon: "👥", queryType: "recruiting" },
  { id: "security_services", label: "Security Guard & Patrol Services", group: "Business & Staffing", icon: "👮", queryType: "security" },
  { id: "business_consulting", label: "Management & Business Consulting", group: "Business & Staffing", icon: "💡", queryType: "consulting" },
  { id: "coworking", label: "Coworking Space & Shared Office", group: "Business & Staffing", icon: "🏢", queryType: "coworking" },
  { id: "printing", label: "Printing & Signage Solutions", group: "Business & Staffing", icon: "🖨️", queryType: "printing" },
  { id: "translation", label: "Translation & Localization Services", group: "Business & Staffing", icon: "🌍", queryType: "translation" },

  // 11. Automotive Services
  { id: "car_repair", label: "Auto Repair & Mechanics", group: "Automotive Services", icon: "🚗", queryType: "car_repair" },
  { id: "auto_body", label: "Auto Body & Paint Workshop", group: "Automotive Services", icon: "🚙", queryType: "auto_body" },
  { id: "car_wash", label: "Car Wash & Auto Detailing", group: "Automotive Services", icon: "🧼", queryType: "car_wash" },
  { id: "tire_shop", label: "Tire Shop & Wheel Alignment", group: "Automotive Services", icon: "🛞", queryType: "tire" },
  { id: "car_dealership", label: "Car Dealership & Auto Sales", group: "Automotive Services", icon: "🚘", queryType: "dealership" },
  { id: "car_rental", label: "Car Rental Agency", group: "Automotive Services", icon: "🔑", queryType: "car_rental" },
  { id: "towing", label: "Towing & Roadside Assistance", group: "Automotive Services", icon: "🛻", queryType: "towing" },

  // 12. Logistics & Storage
  { id: "logistics", label: "Logistics & Freight Services", group: "Logistics & Storage", icon: "🚚", queryType: "logistics" },
  { id: "freight_forwarding", label: "Freight Forwarding & Customs Broker", group: "Logistics & Storage", icon: "🚢", queryType: "freight" },
  { id: "moving_company", label: "Moving & Relocation Company", group: "Logistics & Storage", icon: "📦", queryType: "moving" },
  { id: "self_storage", label: "Self Storage & Warehouse Facilities", group: "Logistics & Storage", icon: "🏬", queryType: "storage" },
  { id: "courier_delivery", label: "Courier & Express Delivery", group: "Logistics & Storage", icon: "🛵", queryType: "courier" },

  // 13. Pet Care & Services
  { id: "pet_store", label: "Pet Shop & Animal Supplies", group: "Pet Care & Services", icon: "🐕", queryType: "pet" },
  { id: "pet_grooming", label: "Pet Grooming & Dog Spa", group: "Pet Care & Services", icon: "🐩", queryType: "grooming" },
  { id: "pet_boarding", label: "Pet Boarding & Dog Hotel", group: "Pet Care & Services", icon: "🐾", queryType: "boarding" },

  // 14. Hotels & Travel
  { id: "hotel", label: "Hotel & Luxury Suites", group: "Hotels & Travel", icon: "🏨", queryType: "hotel" },
  { id: "resort", label: "Resort & Vacation Retreat", group: "Hotels & Travel", icon: "🏖️", queryType: "resort" },
  { id: "travel_agency", label: "Travel Agency & Tour Operator", group: "Hotels & Travel", icon: "✈️", queryType: "travel" },

  // 15. Events & Entertainment
  { id: "event_planner", label: "Event & Wedding Planner", group: "Events & Entertainment", icon: "🎉", queryType: "event" },
  { id: "event_venue", label: "Event Venue & Banquet Hall", group: "Events & Entertainment", icon: "🏰", queryType: "venue" },
  { id: "dj_entertainment", label: "DJ & Audio Entertainment", group: "Events & Entertainment", icon: "🎧", queryType: "dj" },

  // 16. Retail & Shopping
  { id: "supermarket", label: "Supermarket & Grocery", group: "Retail & Shopping", icon: "🛒", queryType: "supermarket" },
  { id: "clothing_store", label: "Clothing & Fashion Boutique", group: "Retail & Shopping", icon: "👗", queryType: "clothing" },
  { id: "electronics_store", label: "Electronics & Gadget Store", group: "Retail & Shopping", icon: "📱", queryType: "electronics" },
  { id: "furniture_store", label: "Furniture & Home Goods", group: "Retail & Shopping", icon: "🛋️", queryType: "furniture" },
  { id: "jewelry_store", label: "Jewelry & Watch Store", group: "Retail & Shopping", icon: "💍", queryType: "jewelry" },
  { id: "bookstore", label: "Bookstore & Stationery", group: "Retail & Shopping", icon: "📚", queryType: "bookstore" },
  { id: "florist", label: "Florist & Flower Shop", group: "Retail & Shopping", icon: "💐", queryType: "florist" },
  { id: "mobile_phone_shop", label: "Mobile Phone Shop & Repair", group: "Retail & Shopping", icon: "📱", queryType: "mobile" },

  // 17. Education & Learning
  { id: "school", label: "Private School & Academy", group: "Education & Learning", icon: "🏫", queryType: "school" },
  { id: "tutoring", label: "Tutoring & Learning Center", group: "Education & Learning", icon: "📝", queryType: "tutoring" },
  { id: "daycare", label: "Daycare & Childcare Center", group: "Education & Learning", icon: "🧸", queryType: "daycare" },
  { id: "driving_school", label: "Driving School", group: "Education & Learning", icon: "🚦", queryType: "driving" },
  { id: "language_school", label: "Language Institute", group: "Education & Learning", icon: "🗣️", queryType: "language" },
  { id: "music_academy", label: "Music & Art Academy", group: "Education & Learning", icon: "🎵", queryType: "music" },
];

// NOTE (cleanup 2026-11-16): the dead business-name generator / category-profile /
// city-areas lookup code that used to live below this line was removed. It generated
// invented business names and email domains, had zero callers anywhere in the app,
// and contradicted the zero-fake-data rule. The live search path only ever uses
// ALL_BUSINESS_SERVICES above (plus getCountryFlag). Do not re-add name generators.