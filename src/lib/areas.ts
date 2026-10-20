export interface AreaConfig {
  name: string;
  city: string;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;
}

/**
 * Authoritative AREAS data table mapping neighborhood/suburb areas to their exact center coordinates and radius.
 * Fixes OpenStreetMap lack of boundary polygons for suburb nodes (e.g. Banani).
 */
export const AREAS: Record<string, AreaConfig> = {
  // --- DHAKA DIVISION ---
  banani: { name: "Banani", city: "Dhaka", centerLat: 23.7937, centerLon: 90.4043, radiusMeters: 2000 },
  gulshan1: { name: "Gulshan-1", city: "Dhaka", centerLat: 23.7785, centerLon: 90.4162, radiusMeters: 2000 },
  "gulshan-1": { name: "Gulshan-1", city: "Dhaka", centerLat: 23.7785, centerLon: 90.4162, radiusMeters: 2000 },
  gulshan2: { name: "Gulshan-2", city: "Dhaka", centerLat: 23.7925, centerLon: 90.4150, radiusMeters: 2000 },
  "gulshan-2": { name: "Gulshan-2", city: "Dhaka", centerLat: 23.7925, centerLon: 90.4150, radiusMeters: 2000 },
  dhanmondi: { name: "Dhanmondi", city: "Dhaka", centerLat: 23.7461, centerLon: 90.3742, radiusMeters: 2500 },
  uttara: { name: "Uttara", city: "Dhaka", centerLat: 23.8759, centerLon: 90.3795, radiusMeters: 3000 },
  "uttara(sectors1-18)": { name: "Uttara", city: "Dhaka", centerLat: 23.8759, centerLon: 90.3795, radiusMeters: 3000 },
  mirpur: { name: "Mirpur", city: "Dhaka", centerLat: 23.8071, centerLon: 90.3686, radiusMeters: 3500 },
  "mirpur(1-14)": { name: "Mirpur", city: "Dhaka", centerLat: 23.8071, centerLon: 90.3686, radiusMeters: 3500 },
  mohammadpur: { name: "Mohammadpur", city: "Dhaka", centerLat: 23.7658, centerLon: 90.3584, radiusMeters: 2500 },
  motijheel: { name: "Motijheel", city: "Dhaka", centerLat: 23.7330, centerLon: 90.4172, radiusMeters: 2000 },
  badda: { name: "Badda", city: "Dhaka", centerLat: 23.7805, centerLon: 90.4267, radiusMeters: 2500 },
  khilgaon: { name: "Khilgaon", city: "Dhaka", centerLat: 23.7516, centerLon: 90.4223, radiusMeters: 2000 },
  tejgaon: { name: "Tejgaon", city: "Dhaka", centerLat: 23.7598, centerLon: 90.3916, radiusMeters: 2500 },
  bashundhara: { name: "Bashundhara R/A", city: "Dhaka", centerLat: 23.8164, centerLon: 90.4285, radiusMeters: 2500 },
  "bashundharar/a": { name: "Bashundhara R/A", city: "Dhaka", centerLat: 23.8164, centerLon: 90.4285, radiusMeters: 2500 },
  baridhara: { name: "Baridhara", city: "Dhaka", centerLat: 23.7997, centerLon: 90.4206, radiusMeters: 1800 },
  niketan: { name: "Niketan", city: "Dhaka", centerLat: 23.7745, centerLon: 90.4072, radiusMeters: 1500 },
  lalbagh: { name: "Lalbagh", city: "Dhaka", centerLat: 23.7188, centerLon: 90.3882, radiusMeters: 2000 },
  paltan: { name: "Paltan", city: "Dhaka", centerLat: 23.7350, centerLon: 90.4125, radiusMeters: 1800 },
  ramna: { name: "Ramna", city: "Dhaka", centerLat: 23.7389, centerLon: 90.4025, radiusMeters: 2000 },
  shahbagh: { name: "Shahbagh", city: "Dhaka", centerLat: 23.7380, centerLon: 90.3955, radiusMeters: 1500 },
  newmarket: { name: "New Market", city: "Dhaka", centerLat: 23.7334, centerLon: 90.3843, radiusMeters: 1800 },
  cantonment: { name: "Cantonment", city: "Dhaka", centerLat: 23.8223, centerLon: 90.3935, radiusMeters: 2500 },
  jatrabari: { name: "Jatrabari", city: "Dhaka", centerLat: 23.7115, centerLon: 90.4343, radiusMeters: 2500 },
  sutrapur: { name: "Sutrapur", city: "Dhaka", centerLat: 23.7088, centerLon: 90.4168, radiusMeters: 2000 },
  demra: { name: "Demra", city: "Dhaka", centerLat: 23.7085, centerLon: 90.4897, radiusMeters: 3000 },
  sabujbagh: { name: "Sabujbagh", city: "Dhaka", centerLat: 23.7397, centerLon: 90.4336, radiusMeters: 2000 },
  kafrul: { name: "Kafrul", city: "Dhaka", centerLat: 23.7915, centerLon: 90.3831, radiusMeters: 2000 },
  hazaribagh: { name: "Hazaribagh", city: "Dhaka", centerLat: 23.7350, centerLon: 90.3667, radiusMeters: 2000 },
  rampura: { name: "Rampura", city: "Dhaka", centerLat: 23.7612, centerLon: 90.4208, radiusMeters: 2000 },
  moghbazar: { name: "Moghbazar", city: "Dhaka", centerLat: 23.7495, centerLon: 90.4035, radiusMeters: 1800 },
  eskaton: { name: "Eskaton", city: "Dhaka", centerLat: 23.7450, centerLon: 90.3980, radiusMeters: 1500 },
  malibagh: { name: "Malibagh", city: "Dhaka", centerLat: 23.7482, centerLon: 90.4140, radiusMeters: 1800 },
  shantinagar: { name: "Shantinagar", city: "Dhaka", centerLat: 23.7385, centerLon: 90.4142, radiusMeters: 1500 },
  keraniganj: { name: "Keraniganj", city: "Dhaka", centerLat: 23.6844, centerLon: 90.3686, radiusMeters: 3500 },
  savar: { name: "Savar", city: "Dhaka", centerLat: 23.8442, centerLon: 90.2583, radiusMeters: 4000 },
  tongi: { name: "Tongi", city: "Gazipur", centerLat: 23.8967, centerLon: 90.4014, radiusMeters: 3000 },
  gazipursadar: { name: "Gazipur Sadar", city: "Gazipur", centerLat: 24.0023, centerLon: 90.4264, radiusMeters: 3500 },
  narayanganjsadar: { name: "Narayanganj Sadar", city: "Narayanganj", centerLat: 23.6238, centerLon: 90.5000, radiusMeters: 3000 },
  fatullah: { name: "Fatullah", city: "Narayanganj", centerLat: 23.6500, centerLon: 90.4833, radiusMeters: 2500 },

  // --- CHITTAGONG DIVISION ---
  agrabad: { name: "Agrabad", city: "Chittagong", centerLat: 22.3275, centerLon: 91.8122, radiusMeters: 2500 },
  nasirabad: { name: "Nasirabad", city: "Chittagong", centerLat: 22.3667, centerLon: 91.8167, radiusMeters: 2500 },
  khulshi: { name: "Khulshi", city: "Chittagong", centerLat: 22.3619, centerLon: 91.8028, radiusMeters: 2500 },
  halishahar: { name: "Halishahar", city: "Chittagong", centerLat: 22.3333, centerLon: 91.7833, radiusMeters: 3000 },
  panchlaish: { name: "Panchlaish", city: "Chittagong", centerLat: 22.3667, centerLon: 91.8333, radiusMeters: 2500 },
  chandgaon: { name: "Chandgaon", city: "Chittagong", centerLat: 22.3833, centerLon: 91.8500, radiusMeters: 3000 },
  kotwali_ctg: { name: "Kotwali", city: "Chittagong", centerLat: 22.3333, centerLon: 91.8333, radiusMeters: 2000 },
  patenga: { name: "Patenga", city: "Chittagong", centerLat: 22.2500, centerLon: 91.8000, radiusMeters: 4000 },

  // --- SYLHET DIVISION ---
  zindabazar: { name: "Zinda Bazar", city: "Sylhet", centerLat: 24.8949, centerLon: 91.8687, radiusMeters: 2000 },
  amberkhana: { name: "Amberkhana", city: "Sylhet", centerLat: 24.9036, centerLon: 91.8681, radiusMeters: 2000 },
  subidbazar: { name: "Subidbazar", city: "Sylhet", centerLat: 24.9042, centerLon: 91.8558, radiusMeters: 2000 },
  shahiidgah: { name: "Shahi Eidgah", city: "Sylhet", centerLat: 24.9080, centerLon: 91.8785, radiusMeters: 2000 },
  uposhahar: { name: "Uposhahar", city: "Sylhet", centerLat: 24.8860, centerLon: 91.8790, radiusMeters: 2000 },

  // --- UNITED KINGDOM ---
  cityoflondon: { name: "City of London", city: "London", centerLat: 51.5155, centerLon: -0.0922, radiusMeters: 2000 },
  westminster: { name: "Westminster", city: "London", centerLat: 51.4975, centerLon: -0.1357, radiusMeters: 2500 },
  camden: { name: "Camden", city: "London", centerLat: 51.5430, centerLon: -0.1430, radiusMeters: 2500 },
  soho: { name: "Soho", city: "London", centerLat: 51.5137, centerLon: -0.1365, radiusMeters: 1500 },
  canarywharf: { name: "Canary Wharf", city: "London", centerLat: 51.5054, centerLon: -0.0235, radiusMeters: 2000 },
  kensington: { name: "Kensington", city: "London", centerLat: 51.5014, centerLon: -0.1919, radiusMeters: 2500 },

  // --- UNITED STATES ---
  manhattan: { name: "Manhattan", city: "New York", centerLat: 40.7831, centerLon: -73.9712, radiusMeters: 4000 },
  midtown: { name: "Midtown", city: "New York", centerLat: 40.7549, centerLon: -73.9840, radiusMeters: 2500 },
  brooklyn: { name: "Brooklyn", city: "New York", centerLat: 40.6782, centerLon: -73.9442, radiusMeters: 5000 },
  financialdistrict: { name: "Financial District", city: "New York", centerLat: 40.7075, centerLon: -74.0090, radiusMeters: 2000 },

  // --- UNITED ARAB EMIRATES ---
  downtowndubai: { name: "Downtown Dubai", city: "Dubai", centerLat: 25.1972, centerLon: 55.2744, radiusMeters: 2500 },
  dubaimarina: { name: "Dubai Marina", city: "Dubai", centerLat: 25.0805, centerLon: 55.1403, radiusMeters: 2500 },
  deira: { name: "Deira", city: "Dubai", centerLat: 25.2697, centerLon: 55.3095, radiusMeters: 3000 },
  businessbay: { name: "Business Bay", city: "Dubai", centerLat: 25.1837, centerLon: 55.2666, radiusMeters: 2500 },
};

/**
 * Normalizes string keys for flexible area dictionary lookups.
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
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
 * Resolves area configuration: exact center coordinates, verified name, city, and radius in meters.
 * Returns null if not found in table or fallback coordinates.
 */
export function getAreaConfig(
  areaName: string,
  cityName: string = "Dhaka",
  fallbackLat?: number | null,
  fallbackLon?: number | null
): AreaConfig {
  const cleanArea = areaName.trim();
  const aKey = normalizeKey(cleanArea);

  // 1. Direct dictionary match
  if (AREAS[aKey]) {
    return AREAS[aKey];
  }

  // 2. Partial / containment match
  for (const [key, cfg] of Object.entries(AREAS)) {
    if (aKey.includes(key) || key.includes(aKey)) {
      return {
        ...cfg,
        name: cleanArea,
      };
    }
  }

  // 3. Fallback coordinates if provided or geocoded
  const defaultRadius = 2000;
  return {
    name: cleanArea || cityName,
    city: cityName,
    centerLat: fallbackLat || 23.7937, // default Banani center if undefined
    centerLon: fallbackLon || 90.4043,
    radiusMeters: defaultRadius,
  };
}
