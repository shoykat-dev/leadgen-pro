import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";

export type LeadSource = "google_places" | "csv_import" | "manual" | "free_directory";
export type EmailProvenance = "found_on_website" | "csv" | "manual" | "google" | "osm" | "overture";
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
  // Phase 5 Worldwide Correctness fields
  hasStreetAddress?: boolean;
  secondaryLocation?: string;
  contactWarning?: string | null;
  emailWarning?: string | null;
  phoneWarning?: string | null;
  // How this lead was matched to its category: "tag" = its own OSM tag matched,
  // "name" = name-keyword match only (badged "Matched by name" in the UI),
  // "overture" = Overture-only lead, "google"/"csv"/"manual" = other sources.
  matchType?: "tag" | "name" | "overture" | "google" | "csv" | "manual";
  distanceMeters?: number | null;
  // Phase 6 Contact Enrichment fields (WhatsApp + Email + Best Channel)
  whatsapp?: string | null;
  whatsappNumber?: string | null;
  whatsappLink?: string | null;
  whatsappConfirmed?: boolean;
  whatsappStatus?: "WhatsApp (business-listed)" | "Mobile number — WhatsApp not confirmed" | "Not listed as WhatsApp" | "None";
  whatsappSource?: string | null;
  facebookSource?: string | null;
  instagramUrl?: string | null;
  instagramSource?: string | null;
  bestChannel?: "whatsapp" | "email" | "facebook" | "instagram" | "phone" | "none";
  bestChannelValue?: string | null;
  bestChannelLabel?: string | null;
  isContactable?: boolean;
  contactTagSource?: Record<string, string>;
}

/**
 * Computes lead contactability and best outreach channel per Phase 6 Step 6.
 * Priority: WhatsApp (confirmed only) > Email > Facebook > Instagram > Phone
 */
export function computeLeadContactability(lead: Partial<BusinessLead>): {
  isContactable: boolean;
  bestChannel: "whatsapp" | "email" | "facebook" | "instagram" | "phone" | "none";
  bestChannelValue: string | null;
  bestChannelLabel: string;
} {
  const hasWhatsapp = Boolean(lead.whatsappConfirmed && (lead.whatsappNumber || lead.whatsapp));
  const hasEmail = Boolean(lead.email && lead.emailStatus !== "Missing");
  const hasFacebook = Boolean(lead.facebookUrl && lead.facebookUrl.trim().length > 0);
  const hasInstagram = Boolean(lead.instagramUrl && lead.instagramUrl.trim().length > 0);
  const hasPhone = Boolean(lead.phone && lead.phoneStatus !== "Missing");

  const isContactable = hasWhatsapp || hasEmail || hasFacebook || hasInstagram || hasPhone;

  let bestChannel: "whatsapp" | "email" | "facebook" | "instagram" | "phone" | "none" = "none";
  let bestChannelValue: string | null = null;
  let bestChannelLabel = "None";

  if (hasWhatsapp) {
    bestChannel = "whatsapp";
    bestChannelValue = lead.whatsappLink || (lead.whatsappNumber ? `https://wa.me/${lead.whatsappNumber}` : lead.whatsapp || null);
    bestChannelLabel = "WhatsApp";
  } else if (hasEmail) {
    bestChannel = "email";
    bestChannelValue = lead.email || null;
    bestChannelLabel = "Email";
  } else if (hasFacebook) {
    bestChannel = "facebook";
    bestChannelValue = lead.facebookUrl || null;
    bestChannelLabel = "Facebook";
  } else if (hasInstagram) {
    bestChannel = "instagram";
    bestChannelValue = lead.instagramUrl || null;
    bestChannelLabel = "Instagram";
  } else if (hasPhone) {
    bestChannel = "phone";
    bestChannelValue = lead.phone || null;
    bestChannelLabel = "Phone";
  }

  // Mutate lead object so properties are directly attached
  lead.isContactable = isContactable;
  lead.bestChannel = bestChannel;
  lead.bestChannelValue = bestChannelValue;
  lead.bestChannelLabel = bestChannelLabel;

  if (!lead.whatsappConfirmed) {
    lead.whatsappConfirmed = false;
    lead.whatsappLink = null;
    lead.whatsappNumber = null;
    lead.whatsappSource = null;
    if (!lead.whatsappStatus || lead.whatsappStatus === "None") {
      lead.whatsappStatus = lead.canWhatsApp
        ? "Mobile number — WhatsApp not confirmed"
        : "None";
    }
  }

  return {
    isContactable,
    bestChannel,
    bestChannelValue,
    bestChannelLabel,
  };
}

// Common junk/placeholder phone patterns to reject unconditionally
const JUNK_PHONE_PATTERNS = [
  /^(\d)\1{6,}$/, // Repeated digits e.g. 00000000, 1111111
  /(\d)\1{5,}/, // 6+ identical digits in a row ANYWHERE in the number (e.g. +91 22 1111 1111)
  /123456|234567|345678|456789|567890|678901|012345|987654|876543|765432|654321|543210/, // Sequential digits
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
  isSuspicious?: boolean;
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
        isSuspicious: true,
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
 * Validates a raw URL from a directory record. Directory data contains
 * malformed values — an email address stored as a website, a backslash in the
 * URL, a doubled domain — and those must never be displayed as links.
 * Returns the cleaned https URL, or null (meaning "not available").
 * Never invents a URL: a rejected value stays missing.
 */
export function validateRecordUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!url || url === "N/A") return null;

  const lower = url.toLowerCase();
  // An email address is not a URL; a backslash, quote or space means the
  // value is corrupted, not a link.
  if (
    url.includes("@") ||
    url.includes("\\") ||
    url.includes('"') ||
    url.includes("'") ||
    /\s/.test(url) ||
    lower.includes("example.com") ||
    lower.includes("localhost") ||
    lower.includes("placeholder")
  ) {
    return null;
  }

  let withScheme = url;
  if (!/^https?:\/\//i.test(withScheme)) {
    withScheme = `https://${withScheme}`;
  }

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (!host.includes(".") || !/^[a-z0-9.\-]+$/.test(host)) return null;
    if (host.startsWith(".") || host.endsWith(".") || host.includes("..")) return null;
    // A doubled domain in the path (facebook.com/www.facebook.com/6155...)
    // is corrupted data, not a usable link.
    const firstSegment = parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (/^[a-z0-9.\-]+\.[a-z]{2,}$/i.test(firstSegment)) return null;
    // Keep bare domains slash-free (https://example.com, not ...com/).
    if (parsed.pathname === "/" && !parsed.search && !parsed.hash) return parsed.origin;
    return parsed.toString();
  } catch {
    return null;
  }
}

const SOCIAL_DOMAINS: Record<"facebook" | "instagram", string[]> = {
  facebook: ["facebook.com", "fb.com", "fb.me"],
  instagram: ["instagram.com", "instagr.am"],
};

/**
 * Validates a full social URL against its platform. A facebook field holding
 * an instagram.com link (or vice versa) is rejected — the channel label must
 * match the link it points to. A bare platform homepage (no page path) is
 * not a business profile, so it is rejected too.
 */
export function validatePlatformUrl(
  rawUrl: string | null | undefined,
  platform: "facebook" | "instagram"
): string | null {
  const url = validateRecordUrl(rawUrl);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!SOCIAL_DOMAINS[platform].includes(host)) return null;
    if (!parsed.pathname.replace(/\//g, "")) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Builds a social profile URL from a raw directory value, which may be a
 * full URL, a domain-prefixed path, or a bare handle. Never builds a social
 * URL from an email address, and never prefixes a value that already
 * contains the platform domain (that would double it).
 */
export function buildSocialUrl(
  raw: string | null | undefined,
  platform: "facebook" | "instagram"
): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  // An email address is not a social handle ("@handle" is fine).
  if (value.includes("@") && !/^@[^@]+$/.test(value)) return null;

  const candidate = value.replace(/^@/, "");
  const lower = candidate.toLowerCase();
  const isUrlLike =
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    SOCIAL_DOMAINS[platform].some(
      (d) => lower === d || lower.startsWith(d + "/") || lower.startsWith("www." + d + "/")
    );

  if (isUrlLike) {
    return validatePlatformUrl(
      lower.startsWith("http") ? candidate : `https://${candidate}`,
      platform
    );
  }

  // Plain handle: letters, digits, dots, underscores, hyphens only.
  if (!/^[A-Za-z0-9._-]{2,}$/.test(candidate)) return null;
  const base =
    platform === "facebook" ? "https://www.facebook.com/" : "https://www.instagram.com/";
  return `${base}${candidate}`;
}

/**
 * Classifies a website URL as "No Website", "Social Only" (FB/IG/Linktree), or "Has Website".
 * Malformed values (email as website, backslash URL, doubled domain) are
 * rejected by validateRecordUrl and count as "No Website".
 */
export function classifyWebsite(rawUrl: string | null | undefined): {
  website: string | null;
  websiteStatus: WebsiteStatus;
} {
  const valid = validateRecordUrl(rawUrl);
  if (!valid) {
    return { website: null, websiteStatus: "No Website" };
  }

  let host = "";
  try {
    host = new URL(valid).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return { website: null, websiteStatus: "No Website" };
  }

  const socialHosts = [
    "facebook.com",
    "fb.com",
    "fb.me",
    "instagram.com",
    "instagr.am",
    "linktr.ee",
    "tiktok.com",
    "wa.me",
    "api.whatsapp.com",
  ];
  const isSocial = socialHosts.some((h) => host === h || host.endsWith("." + h));

  return {
    website: valid,
    websiteStatus: isSocial ? "Social Only" : "Has Website",
  };
}

/**
 * Honest display label for a website status. "No Website" in the record means
 * only that no website was found in the directory data — the business may
 * still have a real site (chains usually do), so the label says so.
 */
export function displayWebsiteStatus(status: WebsiteStatus | string | null | undefined): string {
  if (status === "No Website") return "No website in directory record";
  return status || "";
}

/**
 * Calculates Lead Score (0–100) using ONLY real signals. The score tracks
 * CONTACTABILITY first (can the owner actually reach this business?) and
 * OPPORTUNITY second (does it need a website?):
 * - Opportunity: no website in directory record (+25) / social only (+15) /
 *   has website (+5 — redesign/SEO opportunity, and no lead ever scores 0)
 * - Email (+25) — the primary outreach channel
 * - WhatsApp-capable mobile (+20), else valid phone (+10), else listed phone (+5)
 * - Facebook / Instagram / social (+10)
 * - Recently updated source record (+10)
 * Max 90. Tiers: High >= 60, Medium >= 35. An uncontactable lead can reach
 * at most 35 (Medium); High requires at least one real channel.
 */
export function calculateLeadScore(lead: Partial<BusinessLead>): {
  score: number;
  tier: "High" | "Medium" | "Low";
  reasons: ScoreReason[];
} {
  let score = 0;
  const reasons: ScoreReason[] = [];

  // 1. Website status (sales opportunity)
  if (lead.websiteStatus === "No Website") {
    score += 25;
    reasons.push({ reason: "No website in directory record (web design opportunity)", points: 25 });
  } else if (lead.websiteStatus === "Social Only") {
    score += 15;
    reasons.push({ reason: "Social-only presence (needs a standalone website)", points: 15 });
  } else if (lead.websiteStatus === "Has Website") {
    score += 5;
    reasons.push({ reason: "Has a website (redesign / SEO opportunity)", points: 5 });
  }

  // 2. Email (primary outreach channel)
  if (lead.email && lead.emailStatus !== "Invalid format" && lead.emailStatus !== "Missing") {
    score += 25;
    reasons.push({
      reason: lead.emailStatus === "Found on website"
        ? "Email extracted from company website"
        : "Email address available in directory record",
      points: 25,
    });
  }

  // 3. Phone / WhatsApp reachability
  const phoneFormatOk = lead.phoneStatus === "Valid" || lead.phoneStatus === "Format valid";
  if (lead.canWhatsApp && phoneFormatOk) {
    score += 20;
    reasons.push({ reason: "Mobile number — WhatsApp reachable", points: 20 });
  } else if (phoneFormatOk) {
    score += 10;
    reasons.push({ reason: "Phone present in OSM record", points: 10 });
  } else if (lead.phone && lead.phoneStatus !== "Missing") {
    score += 5;
    reasons.push({ reason: "Phone number listed (format not checked)", points: 5 });
  }

  // 4. Facebook / social presence
  const hasSocial = Boolean(
    lead.facebookUrl ||
    lead.instagramUrl ||
    (lead.socials && lead.socials.length > 0) ||
    lead.websiteStatus === "Social Only"
  );
  if (hasSocial) {
    score += 10;
    reasons.push({ reason: "Facebook / social profile available", points: 10 });
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
