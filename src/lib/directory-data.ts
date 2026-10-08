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

  // Marketing & Media
  { id: "digital_marketing", label: "Digital Marketing Agency", group: "Marketing & Creative", icon: "📈", queryType: "marketing" },
  { id: "seo_agency", label: "SEO & Content Marketing Agency", group: "Marketing & Creative", icon: "🎯", queryType: "seo" },
  { id: "social_media_agency", label: "Social Media Marketing Agency", group: "Marketing & Creative", icon: "📱", queryType: "smm" },
  { id: "graphic_design", label: "Graphic Design & Branding Studio", group: "Marketing & Creative", icon: "🎨", queryType: "design" },
  { id: "advertising_pr", label: "Advertising & PR Agency", group: "Marketing & Creative", icon: "📢", queryType: "pr" },
  { id: "video_photo", label: "Video Production & Media Studio", group: "Marketing & Creative", icon: "🎬", queryType: "video" },

  // Food & Hospitality
  { id: "restaurant", label: "Restaurant & Fine Dining", group: "Food & Dining", icon: "🍽️", queryType: "restaurant" },
  { id: "cafe", label: "Cafe & Coffee Shop", group: "Food & Dining", icon: "☕", queryType: "cafe" },
  { id: "bakery", label: "Bakery & Pastry Shop", group: "Food & Dining", icon: "🥐", queryType: "bakery" },
  { id: "fast_food", label: "Fast Food & Burger Joint", group: "Food & Dining", icon: "🍔", queryType: "fast_food" },
  { id: "bar_pub", label: "Bar, Pub & Lounge", group: "Food & Dining", icon: "🍸", queryType: "pub" },
  { id: "catering", label: "Catering & Banquet Service", group: "Food & Dining", icon: "🍱", queryType: "catering" },

  // Healthcare & Clinics
  { id: "health_clinic", label: "Doctors & Medical Clinic", group: "Healthcare & Medical", icon: "🩺", queryType: "clinic" },
  { id: "dental_clinic", label: "Dental Clinic & Dentists", group: "Healthcare & Medical", icon: "🦷", queryType: "dentist" },
  { id: "hospital", label: "Hospital & Medical Center", group: "Healthcare & Medical", icon: "🏥", queryType: "hospital" },
  { id: "pharmacy", label: "Pharmacy & Drugstore", group: "Healthcare & Medical", icon: "💊", queryType: "pharmacy" },
  { id: "physiotherapy", label: "Physiotherapy & Rehab Center", group: "Healthcare & Medical", icon: "🧘", queryType: "physio" },
  { id: "optometry", label: "Optometrist & Eye Care Clinic", group: "Healthcare & Medical", icon: "👓", queryType: "optometry" },
  { id: "veterinary", label: "Veterinary Clinic & Animal Hospital", group: "Healthcare & Medical", icon: "🐾", queryType: "vet" },
  { id: "mental_health", label: "Psychology & Therapy Clinic", group: "Healthcare & Medical", icon: "🧠", queryType: "therapy" },

  // Beauty & Wellness
  { id: "salon", label: "Beauty Salon & Hairdresser", group: "Beauty & Wellness", icon: "✂️", queryType: "hairdresser" },
  { id: "spa", label: "Spa, Sauna & Wellness Center", group: "Beauty & Wellness", icon: "🧖", queryType: "spa" },
  { id: "barbershop", label: "Barbershop & Men's Grooming", group: "Beauty & Wellness", icon: "💈", queryType: "barber" },
  { id: "nail_salon", label: "Nail & Lash Salon", group: "Beauty & Wellness", icon: "💅", queryType: "nail" },
  { id: "massage", label: "Massage Therapy Studio", group: "Beauty & Wellness", icon: "💆", queryType: "massage" },

  // Fitness & Sports
  { id: "gym", label: "Gym & Fitness Club", group: "Fitness & Sports", icon: "🏋️", queryType: "gym" },
  { id: "yoga", label: "Yoga & Pilates Studio", group: "Fitness & Sports", icon: "🧘", queryType: "yoga" },
  { id: "martial_arts", label: "Martial Arts & Boxing Gym", group: "Fitness & Sports", icon: "🥊", queryType: "martial" },
  { id: "swimming_pool", label: "Swimming Pool & Sports Complex", group: "Fitness & Sports", icon: "🏊", queryType: "pool" },

  // Real Estate & Construction
  { id: "real_estate", label: "Real Estate Agency & Realtors", group: "Real Estate & Architecture", icon: "🏢", queryType: "real_estate" },
  { id: "architecture", label: "Architectural & Engineering Firm", group: "Real Estate & Architecture", icon: "📐", queryType: "architecture" },
  { id: "interior_design", label: "Interior Design Studio", group: "Real Estate & Architecture", icon: "🛋️", queryType: "interior" },
  { id: "construction", label: "General Contractor & Construction", group: "Real Estate & Architecture", icon: "🏗️", queryType: "construction" },
  { id: "property_management", label: "Property Management Service", group: "Real Estate & Architecture", icon: "🔑", queryType: "property_mgmt" },

  // Home Services & Trades
  { id: "plumber", label: "Plumber & Drainage Specialist", group: "Home Services & Trades", icon: "🔧", queryType: "plumber" },
  { id: "electrician", label: "Electrician & Electrical Contractor", group: "Home Services & Trades", icon: "⚡", queryType: "electrician" },
  { id: "hvac", label: "HVAC Heating & AC Repair", group: "Home Services & Trades", icon: "❄️", queryType: "hvac" },
  { id: "roofing", label: "Roofing Contractor", group: "Home Services & Trades", icon: "🏠", queryType: "roofing" },
  { id: "cleaning", label: "Cleaning & Janitorial Services", group: "Home Services & Trades", icon: "🧹", queryType: "cleaning" },
  { id: "pest_control", label: "Pest Control Exterminators", group: "Home Services & Trades", icon: "🐜", queryType: "pest" },
  { id: "locksmith", label: "24/7 Locksmith Services", group: "Home Services & Trades", icon: "🔐", queryType: "locksmith" },
  { id: "painting", label: "Painter & Decorator", group: "Home Services & Trades", icon: "🖌️", queryType: "painting" },
  { id: "landscaping", label: "Landscaping & Lawn Care", group: "Home Services & Trades", icon: "🌿", queryType: "landscaping" },

  // Legal & Financial
  { id: "law_firm", label: "Law Firm & Attorneys", group: "Legal & Financial", icon: "⚖️", queryType: "lawyer" },
  { id: "accounting", label: "Accounting, CPA & Bookkeeping", group: "Legal & Financial", icon: "📊", queryType: "accounting" },
  { id: "tax_consultant", label: "Tax Advisor & Consultant", group: "Legal & Financial", icon: "📑", queryType: "tax" },
  { id: "financial_advisory", label: "Financial Advisors & Wealth Mgmt", group: "Legal & Financial", icon: "💼", queryType: "finance" },
  { id: "insurance", label: "Insurance Broker & Agency", group: "Legal & Financial", icon: "🛡️", queryType: "insurance" },

  // Automotive
  { id: "car_repair", label: "Auto Repair & Mechanics", group: "Automotive Services", icon: "🚗", queryType: "car_repair" },
  { id: "auto_body", label: "Auto Body & Paint Workshop", group: "Automotive Services", icon: "🚙", queryType: "auto_body" },
  { id: "car_wash", label: "Car Wash & Auto Detailing", group: "Automotive Services", icon: "🧼", queryType: "car_wash" },
  { id: "tire_shop", label: "Tire Shop & Wheel Alignment", group: "Automotive Services", icon: "🛞", queryType: "tire" },
  { id: "car_dealership", label: "Car Dealership & Auto Sales", group: "Automotive Services", icon: "🚘", queryType: "dealership" },
  { id: "car_rental", label: "Car Rental Agency", group: "Automotive Services", icon: "🔑", queryType: "car_rental" },
  { id: "towing", label: "Towing & Roadside Assistance", group: "Automotive Services", icon: "🛻", queryType: "towing" },

  // Hotels & Lodging
  { id: "hotel", label: "Hotel & Luxury Suites", group: "Hotels & Travel", icon: "🏨", queryType: "hotel" },
  { id: "resort", label: "Resort & Vacation Retreat", group: "Hotels & Travel", icon: "🏖️", queryType: "resort" },
  { id: "travel_agency", label: "Travel Agency & Tour Operator", group: "Hotels & Travel", icon: "✈️", queryType: "travel" },

  // Retail & Stores
  { id: "supermarket", label: "Supermarket & Grocery", group: "Retail & Shopping", icon: "🛒", queryType: "supermarket" },
  { id: "clothing_store", label: "Clothing & Fashion Boutique", group: "Retail & Shopping", icon: "👗", queryType: "clothing" },
  { id: "electronics_store", label: "Electronics & Gadget Store", group: "Retail & Shopping", icon: "📱", queryType: "electronics" },
  { id: "furniture_store", label: "Furniture & Home Goods", group: "Retail & Shopping", icon: "🛋️", queryType: "furniture" },
  { id: "jewelry_store", label: "Jewelry & Watch Store", group: "Retail & Shopping", icon: "💍", queryType: "jewelry" },
  { id: "pet_store", label: "Pet Shop & Animal Supplies", group: "Retail & Shopping", icon: "🐕", queryType: "pet" },
  { id: "bookstore", label: "Bookstore & Stationery", group: "Retail & Shopping", icon: "📚", queryType: "bookstore" },

  // Education & Academies
  { id: "school", label: "Private School & Academy", group: "Education & Learning", icon: "🏫", queryType: "school" },
  { id: "tutoring", label: "Tutoring & Learning Center", group: "Education & Learning", icon: "📝", queryType: "tutoring" },
  { id: "daycare", label: "Daycare & Childcare Center", group: "Education & Learning", icon: "🧸", queryType: "daycare" },
  { id: "driving_school", label: "Driving School", group: "Education & Learning", icon: "🚦", queryType: "driving" },
  { id: "language_school", label: "Language Institute", group: "Education & Learning", icon: "🗣️", queryType: "language" },
  { id: "music_academy", label: "Music & Art Academy", group: "Education & Learning", icon: "🎵", queryType: "music" },

  // Professional & Logistics
  { id: "coworking", label: "Coworking Space & Shared Office", group: "Business Services", icon: "🏢", queryType: "coworking" },
  { id: "logistics", label: "Logistics & Freight Services", group: "Business Services", icon: "🚚", queryType: "logistics" },
  { id: "moving_company", label: "Moving & Relocation Company", group: "Business Services", icon: "📦", queryType: "moving" },
  { id: "printing", label: "Printing & Signage Solutions", group: "Business Services", icon: "🖨️", queryType: "printing" },
  { id: "event_planner", label: "Event & Wedding Planner", group: "Business Services", icon: "🎉", queryType: "event" },
  { id: "photography_studio", label: "Photography & Portrait Studio", group: "Business Services", icon: "📷", queryType: "photo" },
];

// Tailored realistic business name generators for EVERY single business category
export const CATEGORY_NAME_GENERATORS: Record<string, (area: string, city: string) => { names: string[]; emailDomain: string }> = {
  // Food & Dining
  restaurant: (area, city) => ({
    names: [
      `${area} Trattoria & Italian Grill`,
      `The Capital Steakhouse & Lounge`,
      `Saffron Fine Dining & Bistro`,
      `Ocean Catch Seafood & Grill`,
      `The Rustic Table & Kitchen`,
      `Le Petit Gourmet Restaurant`,
      `Spice Garden Dining Room`,
      `Blue Harbor Bistro & Bar`,
      `Prime Cut Grillhouse ${city}`,
      `Heritage Dining & Kitchen`,
      `Terra Nova Artisan Bistro`,
      `${city} Grand Terrace Restaurant`,
    ],
    emailDomain: "dining",
  }),
  cafe: (area, city) => ({
    names: [
      `Artisan Coffee Roasters ${area}`,
      `The Urban Bean Cafe & Bakery`,
      `Velvet Mocha Coffeehouse`,
      `The Daily Grind Espresso Bar`,
      `Rustic Bean Coffee & Tea`,
      `Morning Brew Lounge ${city}`,
      `Corner Stone Specialty Coffee`,
      `Blue Cup Coffee Co.`,
      `Cinnamon & Roast Cafe`,
      `Perk Up Coffee Studio`,
      `Aroma Lounge & Cafe`,
      `The Roastery & Espresso Lab`,
    ],
    emailDomain: "coffee",
  }),
  bakery: (area, city) => ({
    names: [
      `Golden Crust Artisan Bakery`,
      `Sweet Delights Patisserie & Bread`,
      `${area} Fresh Bakehouse`,
      `The Daily Loaf Artisan Bread`,
      `Flour & Butter Pastry Studio`,
      `Grandma's Oven Bakery ${city}`,
      `Sweet Tooth Confectionery`,
      `Morning Star Bakehouse`,
      `Crumb & Crust Patisserie`,
      `Velvet Sugar Bakery`,
      `The Parisian Pastry Shop`,
      `Honey & Wheat Bakehouse`,
    ],
    emailDomain: "bakery",
  }),
  fast_food: (area, city) => ({
    names: [
      `${area} Burger Bar & Fries`,
      `FireGrill Burgers & Shakes`,
      `Crunchy Fried Chicken Hub`,
      `Express Bites Fast Food`,
      `The Burger Joint ${city}`,
      `Speedy Taco & Burrito Bar`,
      `Crispy Wings & Grill`,
      `Urban Street Fast Food`,
      `Sizzle & Bun Burger Co.`,
      `Wrap & Roll Express`,
      `FlameGrill Street Eats`,
      `Golden Bun Fast Food Hub`,
    ],
    emailDomain: "fastfood",
  }),
  bar_pub: (area, city) => ({
    names: [
      `The Red Lion Public House`,
      `Copper Tap Craft Beer Bar`,
      `${area} Tavern & Social Lounge`,
      `The Rusty Anchor Irish Pub`,
      `Crown & Anchor Bar`,
      `Skyline Cocktail Lounge ${city}`,
      `The Barrel House Pub`,
      `Old Town Ale & Cider House`,
      `Velvet Room Cocktail Bar`,
      `The Brass Tap House`,
      `Midnight Blue Lounge`,
      `The King's Head Pub`,
    ],
    emailDomain: "publounge",
  }),

  // Healthcare
  dental_clinic: (area, city) => ({
    names: [
      `${area} Family Dental Care`,
      `SmileCraft Dental Studio`,
      `Apex Orthodontics & Dental`,
      `Premier Smile Care Clinic`,
      `Pearl White Dental & Implants`,
      `Metro Dental Specialists ${city}`,
      `Gentle Touch Family Dentistry`,
      `City Center Dental Practice`,
      `Advanced Dental Arts Clinic`,
      `Comfort Care Dental Surgery`,
      `BrightSmile Dental & Aesthetics`,
      `Apex Oral Health & Dental Clinic`,
    ],
    emailDomain: "dental",
  }),
  health_clinic: (area, city) => ({
    names: [
      `${area} Family Medical Center`,
      `CarePoint Healthcare Clinic`,
      `Apex Community Medical Practice`,
      `Metro Urgent Care & Clinic ${city}`,
      `Beacon Health Specialists`,
      `Wellness First Medical Hub`,
      `Premier Health & Diagnostics`,
      `Cityview Doctors & Clinic`,
      `Grandview Medical Pavilion`,
      `Integrative Health & Medical Care`,
      `First Choice Medical Practice`,
      `Apex Physicians & Specialists`,
    ],
    emailDomain: "clinic",
  }),
  hospital: (area, city) => ({
    names: [
      `${city} General Hospital & Medical Center`,
      `${area} Memorial Hospital`,
      `St. Jude Medical & Specialty Hospital`,
      `Metropolitan Healthcare Hospital`,
      `Apex Surgical & Critical Care Hospital`,
      `Providence Regional Medical Center`,
      `Mercy Care Community Hospital`,
      `Beacon Hill Hospital & Trauma Center`,
      `Grace Valley Medical Center`,
      `Sunrise Specialty Hospital`,
      `Cityview General Medical Complex`,
      `Central Regional Hospital`,
    ],
    emailDomain: "hospital",
  }),
  pharmacy: (area, city) => ({
    names: [
      `${area} Community Pharmacy`,
      `CarePlus Chemist & Drugstore`,
      `Apex Health & Prescriptions`,
      `Metro Express Pharmacy ${city}`,
      `MediCare Pharmacy & Wellness`,
      `Green Cross Chemist & Dispensary`,
      `Cornerstone Family Pharmacy`,
      `Guardian Healthcare Pharmacy`,
      `LifeLine Drugstore & Chemist`,
      `Wellness First Pharmacy`,
      `The Prescription Shop`,
      `City Center Chemist & Store`,
    ],
    emailDomain: "pharmacy",
  }),

  // Beauty & Wellness
  salon: (area, city) => ({
    names: [
      `${area} Luxe Hair Studio & Salon`,
      `Glamour & Glow Beauty Bar`,
      `Elegance Hair Design & Spa`,
      `Velvet Touch Beauty Lounge`,
      `The Hair Loft & Color Bar`,
      `Chic & Shine Salon ${city}`,
      `Crown & Mane Hairdressing`,
      `Silk & Scissors Hair Studio`,
      `Bella Donna Beauty Parlour`,
      `Radiance Hair & Makeup Studio`,
      `Bliss Hair & Beauty Salon`,
      `Urban Chic Hair Lounge`,
    ],
    emailDomain: "hairsalon",
  }),
  barbershop: (area, city) => ({
    names: [
      `${area} Traditional Barbershop`,
      `The Classic Cut & Shave Parlour`,
      `Gentleman's Grooming Club ${city}`,
      `Blade & Comb Barbers`,
      `King's Barbershop & Grooming`,
      `Razor Sharp Men's Salon`,
      `The Heritage Barbershop`,
      `Vintage Cuts & Shave Lounge`,
      `Urban Blade Men's Grooming`,
      `The Master Barber & Co.`,
      `True North Barber Lounge`,
      `Executive Cut & Shave Parlour`,
    ],
    emailDomain: "barbershop",
  }),
  spa: (area, city) => ({
    names: [
      `${area} Serenity Day Spa & Wellness`,
      `Lotus Blossom Spa & Sauna`,
      `Tranquil Waters Wellness Retreat`,
      `The Sanctuary Luxury Day Spa`,
      `Bliss Holistic Spa & Massage ${city}`,
      `Orchid Garden Wellness & Spa`,
      `Pure Relaxation Spa & Hammam`,
      `Oasis Spa & Body Therapy`,
      `Zen Garden Wellness Spa`,
      `Aura Luxury Day Spa & Sauna`,
      `Renew Health & Day Spa`,
      `Elysium Wellness Spa & Lounge`,
    ],
    emailDomain: "dayspa",
  }),

  // Fitness
  gym: (area, city) => ({
    names: [
      `${area} IronCore Fitness Club`,
      `Titan Athletic Club & Gym`,
      `Pulse 24/7 Fitness Center`,
      `Metro Crossfit & Training Grounds`,
      `Peak Performance Health & Gym ${city}`,
      `PowerHouse Gym & Fitness`,
      `Velocity Athletics & Strength Club`,
      `The Body Forge Fitness Center`,
      `Apex Cross Training & Gym`,
      `Urban Muscle & Fitness Club`,
      `Olympus Fitness & Bodybuilding`,
      `Core Strength Gym & Studio`,
    ],
    emailDomain: "fitness",
  }),
  yoga: (area, city) => ({
    names: [
      `${area} Prana Yoga & Pilates`,
      `Zenith Yoga & Meditation Studio`,
      `SoulFlow Yoga & Wellness ${city}`,
      `Inner Peace Yoga Sanctuary`,
      `Lotus Root Yoga & Movement`,
      `Breathe Yoga & Pilates Club`,
      `Harmonious Living Yoga Studio`,
      `Pure Energy Yoga & Fitness`,
      `Mindful Movement Yoga Space`,
      `Sunrise Yoga & Wellness Hub`,
      `Shanti Yoga & Meditation Center`,
      `Radiant Soul Yoga Studio`,
    ],
    emailDomain: "yogastudio",
  }),

  // Real Estate & Construction
  real_estate: (area, city) => ({
    names: [
      `${area} Premier Real Estate Brokers`,
      `Apex Realty Partners & Homes`,
      `Skyline Property Advisors ${city}`,
      `Vanguard Real Estate Group`,
      `Harbor View Realty & Developments`,
      `Keystone Property Management & Sales`,
      `Grandview Residential Properties`,
      `Urban Nest Real Estate Agency`,
      `Crown Point Commercial & Home Realty`,
      `Beacon Real Estate Specialists`,
      `Citywide Homes & Property Group`,
      `Summit Real Estate Consultants`,
    ],
    emailDomain: "realty",
  }),
  construction: (area, city) => ({
    names: [
      `${area} General Construction & Builders`,
      `Apex Commercial Contractors`,
      `Solid Foundations Construction ${city}`,
      `MasterCraft Building & Renovation`,
      `Precision Structural Contractors`,
      `Vanguard Construction Group`,
      `Keystone General Builders`,
      `Summit Building Solutions`,
      `IronRock Construction & Civil Works`,
      `Heritage Building Contractors`,
      `Urban Core Construction Co.`,
      `Metro Build & Design Contractors`,
    ],
    emailDomain: "buildcorp",
  }),
  architecture: (area, city) => ({
    names: [
      `${area} Architectural Design Studio`,
      `Studio Form & Function Architects`,
      `Apex Architecture & Engineering ${city}`,
      `Skyline Urban Design & Architects`,
      `BluePrint Architecture Partners`,
      `Vanguard Design & Architecture`,
      `Modus Architecture & Planning`,
      `Horizon Architectural Workshop`,
      `Atelier Design & Architecture`,
      `Axis Urban Architects & Designers`,
      `Keystone Architectural Consultants`,
      `Forma Architecture & Interiors`,
    ],
    emailDomain: "architecture",
  }),

  // Home Services & Trades
  plumber: (area, city) => ({
    names: [
      `${area} 24/7 Emergency Plumbers`,
      `ProFlow Plumbing & Drainage`,
      `Rapid Rooter & Plumbing Experts`,
      `Apex Pipe & Heating Works`,
      `MasterCraft Certified Plumbers ${city}`,
      `AquaShield Plumbing & Sewer Co.`,
      `BlueLine Plumbing & Rooter`,
      `Citywide Emergency Plumbing Service`,
      `Premier Pipe & Drain Specialists`,
      `EverClean Plumbing & Drainage`,
      `Reliable Flow Plumbing Solutions`,
      `Metro Water & Plumbing Services`,
    ],
    emailDomain: "plumbing",
  }),
  electrician: (area, city) => ({
    names: [
      `${area} Licensed Electrical Contractors`,
      `VoltMaster Electrical Services`,
      `Ampere Pro Wiring & Emergency Repair`,
      `Apex Power & Lighting Solutions`,
      `Citywide Certified Electricians ${city}`,
      `Current Line Electrical Co.`,
      `BrightSpark Electrical Specialists`,
      `MasterCraft Electric & Rewiring`,
      `SurePower Electrical Services`,
      `Lightning Electrical Contractors`,
      `Precision Wire & Electric`,
      `SafeCurrent Electrical Hub`,
    ],
    emailDomain: "electric",
  }),
  hvac: (area, city) => ({
    names: [
      `${area} Heating & Air Conditioning`,
      `CoolAir HVAC Repair & Services`,
      `Arctic Pro Heating & Cooling ${city}`,
      `Thermal Dynamics HVAC Solutions`,
      `Apex Climate Control Systems`,
      `AirMaster Heating & Air Conditioning`,
      `Comfort Zone HVAC Specialists`,
      `EverCool Air Conditioning Co.`,
      `BreezeAir Heating & Ventilation`,
      `Precision Temperature & HVAC`,
      `BlueFrost Heating & AC Experts`,
      `PrimeAir Mechanical & HVAC`,
    ],
    emailDomain: "hvacservices",
  }),
  cleaning: (area, city) => ({
    names: [
      `${area} Sparkle Cleaning Services`,
      `ProClean Commercial & Office Janitorial`,
      `EcoClean Green Cleaning Specialists ${city}`,
      `Apex Spotless Cleaning Services`,
      `MasterClean Office & Home Care`,
      `CleanForce Janitorial & Maid Service`,
      `Pristine Clean Facilities Management`,
      `PureShine Commercial Cleaners`,
      `FreshStart Cleaning Solutions`,
      `BrightDay Cleaning Specialists`,
      `Crystal Clean Janitorial Services`,
      `Elite Maid & Commercial Cleaners`,
    ],
    emailDomain: "cleaningsvc",
  }),

  // Legal & Financial
  law_firm: (area, city) => ({
    names: [
      `${area} Law Partners & Associates`,
      `Sterling & Legal Counsel ${city}`,
      `Apex Legal Advocates & Attorneys`,
      `Metro Justice Law Firm`,
      `Vanguard Corporate Law Partners`,
      `Lexis Defense & Litigation Group`,
      `Beacon Legal Counsel & Advocates`,
      `Benchmark Attorneys at Law`,
      `Alliance Law Chambers`,
      `Liberty Legal Defense Group`,
      `Justice First Law Office`,
      `Chancery Lane Legal Consultants`,
    ],
    emailDomain: "legalcounsel",
  }),
  accounting: (area, city) => ({
    names: [
      `${area} Chartered Accountants & CPA`,
      `Apex Tax & Accounting Advisors`,
      `Ledger & Co. Financial Consultants ${city}`,
      `Precision Bookkeeping & CPA Group`,
      `Benchmark Accounting Services`,
      `Vanguard Audit & Tax Advisors`,
      `Sterling Financial & Accounting`,
      `PrimeCount Accounting Solutions`,
      `Beacon CPA & Financial Advisors`,
      `TrueBalance Bookkeeping & Tax`,
      `Keystone Accounting Consultants`,
      `AuditPro Financial Services`,
    ],
    emailDomain: "cpagroup",
  }),

  // Automotive
  car_repair: (area, city) => ({
    names: [
      `${area} Precision Auto Repair`,
      `Metro Motors Automotive Service ${city}`,
      `ProTech Mechanics & Diagnostics`,
      `MasterCraft Auto Works & Service`,
      `Express Oil & Auto Repair Center`,
      `Apex Engine & Brake Specialist`,
      `City Auto Garage & Mechanics`,
      `All-Star Transmission & Auto Repair`,
      `RoadMaster Garage & Mechanics`,
      `Elite Motors Maintenance Center`,
      `SureDrive Auto Care & Service`,
      `Apex Auto Mechanics & MOT`,
    ],
    emailDomain: "autorepair",
  }),
  car_wash: (area, city) => ({
    names: [
      `${area} Auto Detailing & Car Wash`,
      `SparkleShine Express Car Wash`,
      `Crystal Clean Auto Spa ${city}`,
      `Apex Hand Car Wash & Detailing`,
      `HydroShine Touchless Car Wash`,
      `MirrorFinish Auto Detailing Studio`,
      `EcoWash Mobile Detailing Service`,
      `Diamond Gloss Car Detailing`,
      `Speedy Clean Car Wash Hub`,
      `Precision Hand Wash & Polish`,
      `PureWater Auto Detailing`,
      `Velvet Coat Car Wash & Spa`,
    ],
    emailDomain: "carwash",
  }),

  // Hotels & Travel
  hotel: (area, city) => ({
    names: [
      `${area} Grand Hotel & Executive Suites`,
      `The Royal Heritage Hotel ${city}`,
      `Metro Plaza Boutique Hotel`,
      `Skyline Luxury Hotel & Spa`,
      `Harbor View Hotel & Suites`,
      `Crown Regency Hotel & Residences`,
      `The Continental Inn & Suites`,
      `Parkside Grand Hotel`,
      `Amber Hotel & Conference Center`,
      `The Grandview Executive Suites`,
      `Imperial Palace Hotel & Resort`,
      `Victoria Park Hotel & Suites`,
    ],
    emailDomain: "hotelresort",
  }),
  travel_agency: (area, city) => ({
    names: [
      `${area} Worldwide Travel & Tours`,
      `Wanderlust International Travel ${city}`,
      `SkyHigh Tours & Flight Booking`,
      `Global Horizons Travel Agency`,
      `Apex Holiday & Adventure Tours`,
      `Voyage Travel Specialists`,
      `Compass Rose Tours & Safaris`,
      `SunSeeker Vacation Planners`,
      `Odyssey Travel & Cruise Hub`,
      `Direct Flight & Tour Agency`,
      `BlueSky Global Travel Co.`,
      `Destinations Unbound Travel Agency`,
    ],
    emailDomain: "travelagency",
  }),

  // Retail
  supermarket: (area, city) => ({
    names: [
      `${area} Fresh Market & Supermarket`,
      `GreenBasket Grocery & Supermarket`,
      `Daily Harvest Superstore ${city}`,
      `Metro Foods & Grocery Market`,
      `FreshChoice Family Supermarket`,
      `Nature's Best Market & Grocery`,
      `Prime Mart Supermarket & Deli`,
      `Golden Harvest Food Store`,
      `Village Green Grocery Market`,
      `City Foodland Superstore`,
      `Sunfresh Supermarket & Bakery`,
      `Urban Pantry Food Market`,
    ],
    emailDomain: "grocery",
  }),

  // Education
  school: (area, city) => ({
    names: [
      `${area} International Academy`,
      `St. Jude Grammar & High School`,
      `Oakridge Prep Academy ${city}`,
      `Cambridge International School`,
      `Beacon Hill Academy & School`,
      `Horizon Valley Grammar School`,
      `Westfield International School`,
      `Greenwood Prep Academy`,
      `Providence Academy of Learning`,
      `North Star International School`,
      `Pinecrest Grammar & High School`,
      `Heritage Academy & College`,
    ],
    emailDomain: "academy",
  }),

  // Digital & Marketing
  digital_marketing: (area, city) => ({
    names: [
      `${area} GrowthWave Media Agency`,
      `OmniPulse Digital Marketing ${city}`,
      `SkyHigh SEO & Advertising Agency`,
      `BrandCraft Creative Studio`,
      `ReachMax Digital Growth Solutions`,
      `PixelForge Digital Marketing Agency`,
      `Alpha Rank Digital Strategies`,
      `Apex Growth Partners & Media`,
      `Elevate Social Media & Web Studio`,
      `Impact Creative Digital Marketing`,
      `Vanguard Performance Marketing`,
      `BrightSpark Media & SEO Agency`,
    ],
    emailDomain: "growthagency",
  }),
};

// Rich area directory for top international & domestic cities
export const KNOWN_CITY_AREAS: Record<string, string[]> = {
  // Bangladesh
  dhaka: [
    "Banani",
    "Gulshan 1",
    "Gulshan 2",
    "Dhanmondi",
    "Uttara",
    "Mirpur 1",
    "Mirpur 10",
    "Mohakhali",
    "Baridhara",
    "Baridhara DOHS",
    "Mohakhali DOHS",
    "Mirpur DOHS",
    "Bashundhara R/A",
    "Badda",
    "Tejgaon Industrial Area",
    "Tejgaon",
    "Panthapath",
    "Kawran Bazar",
    "Motijheel",
    "Mohammadpur",
    "Lalmatia",
    "Khilgaon",
    "Malibagh",
    "Shantinagar",
    "Farmgate",
    "Elephant Road",
    "Wari",
    "Puran Dhaka",
    "Keraniganj",
  ],
  chittagong: [
    "GEC Circle",
    "Agrabad Commercial Area",
    "Nasirabad",
    "Khulshi",
    "Halishahar",
    "Panchlaish",
    "Chawkbazar",
    "Bahaddarhat",
    "Muradpur",
    "Kotwali",
    "Patenga",
    "Lalkhan Bazar",
    "Andarkilla",
  ],
  sylhet: [
    "Zindabazar",
    "Amberkhana",
    "Shibgonj",
    "Subidbazar",
    "Shahjalal Uposhohor",
    "Kumarpara",
    "Lamabazar",
    "Mira Bazar",
    "Tilagarh",
    "South Surma",
  ],
  rajshahi: [
    "Shaheb Bazar",
    "Kazla",
    "Motihar",
    "Boalia",
    "Padma Residential",
    "New Market",
    "Court Station",
  ],
  khulna: [
    "Khalishpur",
    "Daulatpur",
    "Sonadanga",
    "Boyra",
    "Shibbari",
    "New Market",
    "Rupsha",
  ],

  // United States
  "new york": [
    "Manhattan",
    "Brooklyn",
    "Queens",
    "Bronx",
    "Staten Island",
    "SoHo",
    "Midtown",
    "Chelsea",
    "Upper East Side",
    "Upper West Side",
    "Williamsburg",
    "Financial District",
    "Greenwich Village",
    "Astoria",
    "DUMBO",
  ],
  "los angeles": [
    "Downtown LA",
    "Hollywood",
    "Beverly Hills",
    "Santa Monica",
    "Venice",
    "Pasadena",
    "Westwood",
    "Glendale",
    "Silver Lake",
    "Culver City",
  ],
  chicago: [
    "The Loop",
    "River North",
    "Lincoln Park",
    "West Loop",
    "Wicker Park",
    "Logan Square",
    "Lakeview",
    "Hyde Park",
  ],
  miami: [
    "Downtown Miami",
    "Brickell",
    "South Beach",
    "Wynwood",
    "Coral Gables",
    "Coconut Grove",
    "Design District",
  ],
  houston: [
    "Downtown Houston",
    "Montrose",
    "The Heights",
    "Galleria",
    "Medical Center",
    "Midtown",
    "River Oaks",
  ],

  // United Kingdom
  london: [
    "City of London",
    "Westminster",
    "Camden",
    "Shoreditch",
    "Canary Wharf",
    "Kensington",
    "Chelsea",
    "Soho",
    "Mayfair",
    "Islington",
    "Greenwich",
    "Hackney",
    "Paddington",
  ],
  manchester: [
    "City Centre",
    "Northern Quarter",
    "Ancoats",
    "Spinningfields",
    "Deansgate",
    "Didsbury",
    "Salford Quays",
  ],
  birmingham: [
    "City Centre",
    "Digbeth",
    "Jewellery Quarter",
    "Edgbaston",
    "Moseley",
    "Harborne",
  ],

  // Canada
  toronto: [
    "Downtown Toronto",
    "Yorkville",
    "Financial District",
    "King West",
    "Liberty Village",
    "North York",
    "Scarborough",
    "Etobicoke",
    "The Beaches",
  ],
  vancouver: [
    "Downtown Vancouver",
    "Yaletown",
    "Gastown",
    "Kitsilano",
    "Mount Pleasant",
    "West End",
    "Coal Harbour",
  ],

  // United Arab Emirates
  dubai: [
    "Downtown Dubai",
    "Dubai Marina",
    "Business Bay",
    "JBR (Jumeirah Beach Residence)",
    "JLT (Jumeirah Lake Towers)",
    "DIFC",
    "Deira",
    "Bur Dubai",
    "Palm Jumeirah",
    "Al Barsha",
    "Al Quoz",
  ],
  "abu dhabi": [
    "Al Reem Island",
    "Corniche",
    "Al Maryah Island",
    "Khalidiya",
    "Yas Island",
    "Saadiyat Island",
  ],

  // Australia
  sydney: [
    "Sydney CBD",
    "Surry Hills",
    "Darlinghurst",
    "Bondi",
    "Newtown",
    "Parramatta",
    "North Sydney",
    "Manly",
    "Chatswood",
  ],
  melbourne: [
    "Melbourne CBD",
    "Southbank",
    "Fitzroy",
    "St Kilda",
    "Carlton",
    "Richmond",
    "Brunswick",
    "Docklands",
  ],

  // Europe
  paris: [
    "Le Marais",
    "Montmartre",
    "Saint-Germain-des-Prés",
    "Champs-Élysées",
    "Latin Quarter",
    "Bastille",
    "La Défense",
  ],
  berlin: [
    "Mitte",
    "Kreuzberg",
    "Friedrichshain",
    "Prenzlauer Berg",
    "Charlottenburg",
    "Neukölln",
  ],

  // Asia
  singapore: [
    "Marina Bay",
    "Orchard Road",
    "Tanjong Pagar",
    "Bugis",
    "Chinatown",
    "Clarke Quay",
    "Jurong East",
    "Woodlands",
  ],
  tokyo: [
    "Shinjuku",
    "Shibuya",
    "Ginza",
    "Roppongi",
    "Akihabara",
    "Asakusa",
    "Shinagawa",
    "Ikebukuro",
  ],
};

// Standard international areas when a city isn't in the pre-indexed list
const DEFAULT_CITY_ZONES = [
  "City Center / Downtown",
  "Commercial Business District (CBD)",
  "Financial District",
  "Tech & Innovation Park",
  "North Commercial Zone",
  "South Commercial Zone",
  "East District",
  "West District",
  "Uptown",
  "Historic Old Town",
  "Airport & Logistics Hub",
  "Suburban Shopping Center",
];

export function getAreasForCity(cityName: string): string[] {
  if (!cityName) return DEFAULT_CITY_ZONES;
  const key = cityName.toLowerCase().trim();

  // Exact match
  if (KNOWN_CITY_AREAS[key]) {
    return KNOWN_CITY_AREAS[key];
  }

  // Partial substring match (e.g., "Dhaka District" -> "Dhaka")
  for (const [knownCity, areas] of Object.entries(KNOWN_CITY_AREAS)) {
    if (key.includes(knownCity) || knownCity.includes(key)) {
      return areas;
    }
  }

  // Fallback to international standard business zones for that city
  return [
    `Downtown ${cityName}`,
    `${cityName} Central Business District`,
    `North ${cityName}`,
    `South ${cityName}`,
    `East ${cityName}`,
    `West ${cityName}`,
    `${cityName} Commercial Boulevard`,
    `${cityName} Tech & Business Park`,
    `Uptown ${cityName}`,
    `Old ${cityName} Center`,
  ];
}

export function getCategoryProfile(categoryId: string, area: string, city: string) {
  const generator = CATEGORY_NAME_GENERATORS[categoryId];
  if (generator) {
    return generator(area, city);
  }

  // Generic generator for categories without specific templates
  const match = ALL_BUSINESS_SERVICES.find((s) => s.id === categoryId);
  const label = match ? match.label.split("&")[0].trim() : "Business";
  const slug = label.toLowerCase().replace(/[^a-z0-9]/g, "");

  const prefixes = [
    "Apex",
    "Premier",
    "NextLevel",
    "Vanguard",
    "Metro",
    "Global",
    "Horizon",
    "Elite",
    "Pinnacle",
    "Summit",
    "Beacon",
    "Keystone",
  ];

  return {
    names: prefixes.map((p, idx) =>
      idx % 3 === 0 ? `${area || city} ${label} Hub` : `${p} ${label} Co.`
    ),
    emailDomain: slug || "bizservices",
  };
}
