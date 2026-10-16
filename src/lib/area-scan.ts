export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface ViewportRectangle {
  low: LatLngPoint;
  high: LatLngPoint;
}

export interface CategoryCoverageReport {
  categoryId: string;
  categoryLabel: string;
  callsUsed: number;
  rawResults: number;
  keptAfterValidation: number;
  duplicatesRemoved: number;
  tilesSubdivided: number;
  completeness: "Complete" | "Probably complete" | "Possibly incomplete";
  reason?: string;
}

export interface AreaCoverageReport {
  areaName: string;
  totalUniqueBusinesses: number;
  categoriesScanned: number;
  totalCategories: number;
  totalCallsUsed: number;
  sweepOnlyFoundCount: number;
  categories: CategoryCoverageReport[];
  honestNote: string;
}

export interface ScanJobTask {
  id: string;
  categoryId: string;
  categoryLabel: string;
  query: string;
  rectangle?: ViewportRectangle;
  depth: number;
  status: "pending" | "done" | "skipped";
  isSweep?: boolean;
}

export interface ScanJobState {
  id: string;
  areaName: string;
  countryCode: string;
  mode: "selected" | "web_relevant" | "all";
  status: "pending" | "running" | "paused" | "completed" | "cancelled";
  totalCategories: number;
  completedCategories: number;
  totalCallsUsed: number;
  resultsCount: number;
  tasks: ScanJobTask[];
  coverageReport: AreaCoverageReport;
  createdAt: string;
  updatedAt: string;
}

/**
 * Splits a bounding rectangle into 4 equal quadrants (NW, NE, SW, SE).
 */
export function splitRectangleIntoQuadrants(rect: ViewportRectangle): ViewportRectangle[] {
  const midLat = (rect.low.latitude + rect.high.latitude) / 2;
  const midLon = (rect.low.longitude + rect.high.longitude) / 2;

  return [
    // South-West (SW)
    {
      low: { latitude: rect.low.latitude, longitude: rect.low.longitude },
      high: { latitude: midLat, longitude: midLon },
    },
    // South-East (SE)
    {
      low: { latitude: rect.low.latitude, longitude: midLon },
      high: { latitude: midLat, longitude: rect.high.longitude },
    },
    // North-West (NW)
    {
      low: { latitude: midLat, longitude: rect.low.longitude },
      high: { latitude: rect.high.latitude, longitude: midLon },
    },
    // North-East (NE)
    {
      low: { latitude: midLat, longitude: midLon },
      high: { latitude: rect.high.latitude, longitude: rect.high.longitude },
    },
  ];
}

export interface BudgetStatusInput {
  dailyLimit: number;
  dailyUsed: number;
  monthlyLimit: number;
  monthlyUsed: number;
}

/**
 * Calculates pre-scan estimate: categories, estimated calls, quota status.
 */
export function calculateScanEstimate(params: {
  categories: string[];
  areaName: string;
  budget?: BudgetStatusInput;
}) {
  const budget = params.budget || {
    dailyLimit: 30,
    dailyUsed: 0,
    monthlyLimit: 900,
    monthlyUsed: 0,
  };
  const numCategories = params.categories.length;

  // Min calls: 1 per category
  const minCalls = numCategories;
  // Max estimated calls: assuming up to 3 pages or 1 tile split
  const maxCalls = numCategories * 4;

  const remainingDaily = Math.max(0, budget.dailyLimit - budget.dailyUsed);
  const remainingMonthly = Math.max(0, budget.monthlyLimit - budget.monthlyUsed);

  const estimatedDaysAtDailyLimit = Math.ceil(minCalls / Math.max(1, budget.dailyLimit));

  return {
    categoriesCount: numCategories,
    minCalls,
    maxCalls,
    remainingToday: remainingDaily,
    dailyLimit: budget.dailyLimit,
    remainingMonth: remainingMonthly,
    monthlyLimit: budget.monthlyLimit,
    estimatedDays: estimatedDaysAtDailyLimit,
    canRunImmediately: remainingDaily >= 1 && remainingMonthly >= 1,
  };
}

/**
 * Standard sweep query keywords to catch businesses with no mapped category.
 */
export const SWEEP_QUERIES = ["shops", "services", "office", "clinic", "company"];

/**
 * Priority Web-Service-Relevant Categories (Section 4 item 2c).
 * High-value local businesses that frequently need websites, redesigns, and SEO.
 */
export const WEB_RELEVANT_CATEGORIES: string[] = [
  "restaurant",
  "cafe",
  "bakery",
  "dental_clinic",
  "health_clinic",
  "dermatology",
  "salon",
  "spa",
  "barbershop",
  "gym",
  "yoga",
  "real_estate",
  "hotel_motel",
  "auto_repair",
  "car_wash",
  "law_firm",
  "accounting_tax",
  "catering",
  "event_planner",
  "private_school",
  "tutoring_center",
];

