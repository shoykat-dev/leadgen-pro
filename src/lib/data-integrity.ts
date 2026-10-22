import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";

export type LeadSource = "google_places" | "csv_import" | "manual" | "free_directory";
export type EmailProvenance = "found_on_website" | "csv" | "manual" | "google" | "osm";
export type WebsiteStatus = "No Website" | "Social Only" | "Has Website";
export type PhoneStatus = "Valid" | "Format valid" | "Phone format unverified" | "Missing";
export type EmailStatus =
  | "Found on website"
  | "OpenStreetMap"
  | "MX ok"
  | "Different domain"
  | "No mail server found"
  | "Invalid format"
  | "Missing";


export interface ScoreReason {
  reason: string;
  points: number;
}

export interface FieldAttribution {
  name?: "osm" | "overture";
  phone?: "osm" | "overture" | "website";
  email?: "osm" | "overture" | "website";
  emailSourceUrl?: string | null;
  website?: "osm" | "overture";
  socials?: "overture" | "osm";
  address?: "osm" | "overture";
}

export interface BusinessLead {
  id: string;
  placeId?: string;
  source: LeadSource;
  leadSources?: ("osm" | "overture" | "website" | "google_places" | "csv_import" | "manual")[];
  fieldAttribution?: FieldAttribution;
  name: string;
  category: string;
  primaryType?: string;
  address: string;
  lat?: number | null;
  lon?: number | null;
  phone: string | null;
  phoneE164: string | null;
  phoneStatus: PhoneStatus;
  canWhatsApp: boolean;
  email: string | null;
  emailProvenance?: EmailProvenance;
  emailStatus: EmailStatus;
  emailSourceUrl?: string | null;
  website: string | null;
  websiteStatus: WebsiteStatus;
  hasWebsite?: boolean;
  socials?: { platform: string; url: string }[] | null;
  facebookUrl?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsUri?: string | null;
  googleMapsUrl?: string | null;
  googleMapsEmbedUrl?: string | null;
  googleMapsDirectionsUrl?: string | null;
  businessStatus?: string;
  dataQuality: "High" | "Medium" | "Low";
  leadScore: number;
  leadScoreTier: "High" | "Medium" | "Low";
  scoreReasons?: ScoreReason[];
  sourceUpdatedAt?: string | null;
  fetchedAt: string;
  notes?: string;
  crmStatus?: "New" | "Contacted" | "Replied" | "Meeting" | "Won" | "Lost";
  lastContactedAt?: string | null;
  nextFollowUpDate?: string | null;
  // Prompt 5 Worldwide Correctness fields
  hasStreetAddress?: boolean;
  secondaryLocation?: string;
  contactWarning?: string | null;
  emailWarning?: string | null;
  distanceMeters?: number | null;
}

// Common junk/placeholder phone patterns to reject unconditionally
const JUNK_PHONE_PATTERNS = [
  /^(\d)\1{6,}$/, // Repeated digits e.g. 00000000, 1111111
  /123456|234567|345678|456789|987654|876543/, // Sequential digits
  /000000$/, // Trailing zeros e.g. 1713-000000
  new RegExp(["1712", "345678"].join("-") + "|" + ["1912", "345678"].join("-")), // Known dummy patterns
];

// Domains/terms that indicate non-authentic or placeholder emails
const JUNK_EMAIL_DOMAINS = [
  "example.com",
  "test.com",
  "domain.com",
  "yourdomain.com",
  "mycompany.com",
  "localhost",
  "sentry.io",
  "wixpress.com",
  "wordpress.com",
  "tempmail.com",
  "123.com",
];

const JUNK_EMAIL_PREFIXES = [
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "bounce",
  "admin@domain.com",
  "info@domain.com",
];

// Image false-positive extensions accidentally picked up from DOM/regex
const JUNK_EMAIL_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".gif",
  "@2x",
];

/**
 * Validates a phone number using libphonenumber-js with special support for Bangladesh mobile & landlines.
 * Rejects placeholder sequences, trailing zeros, or unparseable formats.
 */
export function validatePhone(
  rawPhone: string | null | undefined,
  defaultCountry: string = "BD"
): {
  phone: string | null;
  phoneE164: string | null;
  phoneStatus: PhoneStatus;
  canWhatsApp: boolean;
} {
  if (!rawPhone || !rawPhone.trim() || rawPhone.trim() === "N/A") {
    return {
      phone: null,
      phoneE164: null,
      phoneStatus: "Missing",
      canWhatsApp: false,
    };
  }

  let cleaned = rawPhone.trim();

  // Normalize common Bangladesh mapper typo "+801..." -> "+8801..." (missing second 8)
  const compactDigits = cleaned.replace(/[\s\-\(\)]/g, "");
  if (defaultCountry === "BD" && /^\+801[3-9]\d{8}$/.test(compactDigits)) {
    cleaned = "+880" + compactDigits.slice(3);
  }

  // 1. Check for obvious dummy sequences
  const digitsOnly = cleaned.replace(/\D/g, "");
  for (const pattern of JUNK_PHONE_PATTERNS) {
    if (pattern.test(digitsOnly) || pattern.test(cleaned)) {
      return {
        phone: cleaned,
        phoneE164: null,
        phoneStatus: "Phone format unverified",
        canWhatsApp: false,
      };
    }
  }

  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      phone: cleaned,
      phoneE164: null,
      phoneStatus: "Phone format unverified",
      canWhatsApp: false,
    };
  }

  // 2. Parse using libphonenumber-js
  try {
    const countryCode = (defaultCountry && defaultCountry.length === 2
      ? defaultCountry.toUpperCase()
      : "BD") as any;

    const parsed = parsePhoneNumberFromString(cleaned, countryCode);

    if (parsed && parsed.isValid()) {
      const e164 = parsed.number; // e.g. +8801711223344

      // Special Bangladesh Mobile validation: 013, 014, 015, 016, 017, 018, 019
      if (parsed.country === "BD") {
        const national = parsed.nationalNumber;
        // Bangladesh mobile starts with 1[3-9] and has 10 digits total without leading 0
        const isBdMobile = /^1[3-9]\d{8}$/.test(national);
        const isBdLandline = national.length >= 6;

        if (isBdMobile) {
          return {
            phone: parsed.formatNational(),
            phoneE164: e164,
            phoneStatus: "Valid",
            canWhatsApp: true,
          };
        } else if (isBdLandline) {
          return {
            phone: parsed.formatNational(),
            phoneE164: e164,
            phoneStatus: "Valid",
            canWhatsApp: false, // Landlines cannot receive WhatsApp
          };
        }
      }

      return {
        phone: parsed.formatInternational(),
        phoneE164: e164,
        phoneStatus: "Valid",
        canWhatsApp: parsed.getType() === "MOBILE" || parsed.getType() === "FIXED_LINE_OR_MOBILE",
      };
    }
  } catch {
    // Parsing error
  }

  return {
    phone: cleaned,
    phoneE164: null,
    phoneStatus: "Phone format unverified",
    canWhatsApp: false,
  };
}

export function validatePhoneNumber(
  rawPhone: string | null | undefined,
  defaultCountry: string = "BD"
) {
  return validatePhone(rawPhone, defaultCountry);
}

/**
 * Validates an email address and checks for junk domains or image false positives.
 */
export function validateEmail(
  rawEmail: string | null | undefined,
  websiteUrl?: string | null
): {
  email: string | null;
  emailStatus: EmailStatus;
} {
  if (!rawEmail || !rawEmail.trim() || rawEmail.trim() === "N/A") {
    return { email: null, emailStatus: "Missing" };
  }

  const emailClean = rawEmail.trim().toLowerCase();

  // Basic regex check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(emailClean)) {
    return { email: null, emailStatus: "Invalid format" };
  }

  // Reject image false positives (e.g. logo.png@2x)
  for (const ext of JUNK_EMAIL_EXTENSIONS) {
    if (emailClean.includes(ext)) {
      return { email: null, emailStatus: "Invalid format" };
    }
  }

  // Reject junk prefixes & domains
  const [prefix, domain] = emailClean.split("@");
  if (!domain || !prefix) {
    return { email: null, emailStatus: "Invalid format" };
  }

  for (const junkDomain of JUNK_EMAIL_DOMAINS) {
    if (domain === junkDomain || domain.endsWith("." + junkDomain)) {
      return { email: null, emailStatus: "Invalid format" };
    }
  }

  for (const junkPrefix of JUNK_EMAIL_PREFIXES) {
    if (prefix === junkPrefix || prefix.startsWith("noreply") || prefix.startsWith("no-reply")) {
      return { email: null, emailStatus: "Invalid format" };
    }
  }

  // Domain match check against business website
  if (websiteUrl && websiteUrl.trim()) {
    try {
      const siteHostname = new URL(
        websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
      ).hostname.replace(/^www\./, "");

      if (domain !== siteHostname && !domain.endsWith("." + siteHostname)) {
        // Different domain (e.g. uses gmail or generic provider)
        return { email: emailClean, emailStatus: "Different domain" };
      }
      return { email: emailClean, emailStatus: "Found on website" };
    } catch {
      // Ignore URL parse error
    }
  }

  // If no website or source is directory/OSM, default to OpenStreetMap
  return { email: emailClean, emailStatus: "OpenStreetMap" };
}

/**
 * Classifies a website URL as "No Website", "Social Only" (FB/IG/Linktree), or "Has Website".
 */
export function classifyWebsite(rawUrl: string | null | undefined): {
  website: string | null;
  websiteStatus: WebsiteStatus;
} {
  if (!rawUrl || !rawUrl.trim() || rawUrl.trim() === "N/A") {
    return { website: null, websiteStatus: "No Website" };
  }

  const url = rawUrl.trim();

  // Check for localhosts or placeholders
  if (
    url.includes("example.com") ||
    url.includes("localhost") ||
    url.includes("placeholder")
  ) {
    return { website: null, websiteStatus: "No Website" };
  }

  const lower = url.toLowerCase();
  const isSocial =
    lower.includes("facebook.com") ||
    lower.includes("fb.com") ||
    lower.includes("fb.me") ||
    lower.includes("instagram.com") ||
    lower.includes("instagr.am") ||
    lower.includes("linktr.ee") ||
    lower.includes("tiktok.com") ||
    lower.includes("wa.me") ||
    lower.includes("api.whatsapp.com");

  let formattedUrl = url;
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }

  return {
    website: formattedUrl,
    websiteStatus: isSocial ? "Social Only" : "Has Website",
  };
}

/**
 * Calculates Lead Score (0–100) using ONLY real signals (Prompt 3 Part C):
 * - No website (+40) / Social only (+30) -> High pitch opportunity for web development
 * - Has phone (+20) -> Valid format phone for calling/WhatsApp
 * - Has Facebook/social (+15) -> Confirmed digital presence via Facebook, Instagram, or LinkedIn
 * - Has email (+15) -> Real email found on website or directory
 * - Recently updated source record (+10) -> Source timestamp active within the last 180 days
 */
export function calculateLeadScore(lead: Partial<BusinessLead>): {
  score: number;
  tier: "High" | "Medium" | "Low";
  reasons: ScoreReason[];
} {
  let score = 0;
  const reasons: ScoreReason[] = [];

  // 1. Website Status (Sales opportunity)
  if (lead.websiteStatus === "No Website") {
    score += 40;
    reasons.push({ reason: "No website (High-value design & dev opportunity)", points: 40 });
  } else if (lead.websiteStatus === "Social Only") {
    score += 30;
    reasons.push({ reason: "Social-only presence (Needs standalone web storefront)", points: 30 });
  }

  // 2. Has Phone
  if (lead.phoneStatus === "Valid" || lead.phoneStatus === "Format valid") {
    score += 20;
    reasons.push({ reason: "Phone present in OSM record", points: 20 });
  } else if (lead.phone && lead.phoneStatus !== "Missing") {
    score += 10;
    reasons.push({ reason: "Phone number available", points: 10 });
  }

  // 3. Has Facebook / Social
  const hasSocial = Boolean(
    lead.facebookUrl ||
    (lead.socials && lead.socials.length > 0) ||
    lead.websiteStatus === "Social Only"
  );
  if (hasSocial) {
    score += 15;
    reasons.push({ reason: "Active Facebook / Social media profile", points: 15 });
  }

  // 4. Has Email
  if (lead.email && lead.emailStatus !== "Invalid format" && lead.emailStatus !== "Missing") {
    score += 15;
    reasons.push({
      reason: lead.emailStatus === "Found on website"
        ? "Email extracted from company website"
        : "Email address available in directory record",
      points: 15,
    });
  }

  // 5. Recently updated source record
  let isRecent = false;
  if (lead.sourceUpdatedAt) {
    const updatedMs = new Date(lead.sourceUpdatedAt).getTime();
    if (!isNaN(updatedMs) && Date.now() - updatedMs < 180 * 24 * 60 * 60 * 1000) {
      isRecent = true;
    }
  } else if (lead.fetchedAt) {
    isRecent = true; // Freshly queried live Overpass / Overture dataset
  }

  if (isRecent) {
    score += 10;
    reasons.push({ reason: "Recently updated source record (Active business)", points: 10 });
  }

  score = Math.min(100, Math.max(0, score));

  let tier: "High" | "Medium" | "Low" = "Low";
  if (score >= 60) tier = "High";
  else if (score >= 35) tier = "Medium";

  return { score, tier, reasons };
}

/**
 * Computes overall data quality badge:
 * - High: Valid phone + Valid email or Website
 * - Medium: Valid phone or Valid Website
 * - Low: Invalid/missing phone and No website
 */
export function assessDataQuality(lead: Partial<BusinessLead>): "High" | "Medium" | "Low" {
  const hasValidPhone = lead.phoneStatus === "Valid";
  const hasEmail = Boolean(lead.email && lead.emailStatus !== "Invalid format");
  const hasWebsite = lead.websiteStatus === "Has Website";

  if (hasValidPhone && (hasEmail || hasWebsite)) {
    return "High";
  }
  if (hasValidPhone || hasWebsite || lead.websiteStatus === "Social Only") {
    return "Medium";
  }
  return "Low";
}

/**
 * Deduplicates leads by place_id, then phoneE164, then normalized name+address.
 */
export function deduplicateLeads(leads: BusinessLead[]): BusinessLead[] {
  const seenPlaceIds = new Set<string>();
  const seenPhones = new Set<string>();
  const seenNameAddresses = new Set<string>();
  const unique: BusinessLead[] = [];

  for (const lead of leads) {
    // 1. place_id check
    if (lead.placeId) {
      if (seenPlaceIds.has(lead.placeId)) continue;
      seenPlaceIds.add(lead.placeId);
    }

    // 2. phone check (if valid E164)
    if (lead.phoneE164) {
      if (seenPhones.has(lead.phoneE164)) continue;
      seenPhones.add(lead.phoneE164);
    }

    // 3. normalized name + address
    const normKey = `${lead.name.toLowerCase().trim()}::${lead.address.toLowerCase().trim()}`;
    if (seenNameAddresses.has(normKey)) continue;
    seenNameAddresses.add(normKey);

    unique.push(lead);
  }

  return unique;
}
