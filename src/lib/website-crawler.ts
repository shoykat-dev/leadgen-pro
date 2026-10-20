import { validateEmail, validatePhone } from "./data-integrity";
import { getCachedWebsiteEnrichment, setCachedWebsiteEnrichment } from "./db";

export interface WebsiteEnrichmentResult {
  email: string | null;
  emailStatus: "Found on website" | "Missing";
  emailSourceUrl: string | null;
  phones: string[];
  phone: string | null;
  phoneStatus: string;
  searchedUrls: string[];
  cached?: boolean;
}

/**
 * Parses robots.txt to determine if a path is disallowed.
 */
function isDisallowedByRobots(robotsTxt: string, path: string): boolean {
  if (!robotsTxt) return false;

  const lines = robotsTxt.split("\n");
  let appliesToUs = false;

  for (let line of lines) {
    line = line.split("#")[0].trim();
    if (!line) continue;

    const [key, ...valParts] = line.split(":");
    const directive = key.trim().toLowerCase();
    const value = valParts.join(":").trim();

    if (directive === "user-agent") {
      appliesToUs = value === "*" || value.toLowerCase().includes("leadgenpro") || value.toLowerCase().includes("bot");
    } else if (appliesToUs && directive === "disallow") {
      if (value === "") continue;
      if (value === "/" && (path === "/" || path === "")) return true;
      if (path.startsWith(value)) return true;
    }
  }

  return false;
}

/**
 * Fetches robots.txt with a brief 2.5s timeout.
 */
async function fetchRobotsTxt(origin: string): Promise<string> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: {
        "User-Agent": "LeadGenPro-Crawler/3.0 (+https://leadgenpro.com/bot; respecting robots.txt)",
        Accept: "text/plain",
      },
      signal: AbortSignal.timeout(2500),
      redirect: "follow",
    });
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // If robots.txt doesn't exist or times out, proceed permissively
  }
  return "";
}

/**
 * Fetches a single webpage (HTML) with server-side 8s timeout, following redirects.
 */
async function fetchPageHtml(url: string, timeoutMs = 8000): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LeadGenPro-Enrichment/3.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html") && !contentType.includes("text")) {
      return null;
    }

    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } catch {
    return null;
  }
}

/**
 * Discovers a contact link from homepage HTML to ensure we fetch the exact contact page.
 */
function findContactLink(homepageHtml: string, baseOrigin: string): string {
  try {
    const hrefMatches = homepageHtml.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
    for (const match of hrefMatches) {
      const href = match[1].trim();
      const anchorText = match[2].toLowerCase();

      if (
        anchorText.includes("contact") ||
        anchorText.includes("reach us") ||
        anchorText.includes("get in touch") ||
        href.toLowerCase().includes("contact")
      ) {
        if (href.startsWith("http://") || href.startsWith("https://")) {
          // If on same domain
          const linkDomain = new URL(href).hostname.replace(/^www\./, "");
          const baseDomain = new URL(baseOrigin).hostname.replace(/^www\./, "");
          if (linkDomain === baseDomain) {
            return href;
          }
        } else if (href.startsWith("/")) {
          return `${baseOrigin}${href}`;
        } else if (!href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
          return `${baseOrigin}/${href}`;
        }
      }
    }
  } catch {
    // Fallback
  }
  return `${baseOrigin}/contact`;
}

/**
 * Extracts emails and phones from HTML page content.
 */
function extractContactsFromHtml(html: string, pageUrl: string, websiteUrl: string) {
  const emails: { email: string; sourceUrl: string }[] = [];
  const phones: string[] = [];

  // 1. mailto: links
  const mailtoMatches = html.matchAll(/href=["']mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^"']*)["']/gi);
  for (const m of mailtoMatches) {
    const clean = m[1].split("?")[0].trim();
    emails.push({ email: clean, sourceUrl: pageUrl });
  }

  // 2. Visible text emails
  const textMatches = html.matchAll(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi);
  for (const m of textMatches) {
    emails.push({ email: m[1].trim(), sourceUrl: pageUrl });
  }

  // 3. tel: links
  const telMatches = html.matchAll(/href=["']tel:([^"']+)["']/gi);
  for (const m of telMatches) {
    const cleanTel = m[1].trim();
    if (cleanTel.length >= 7) phones.push(cleanTel);
  }

  return { emails, phones };
}

/**
 * Enriches a lead with real emails and phones from its website.
 * Follows strict rules:
 * - 8s timeout
 * - Follow redirects
 * - Respect robots.txt
 * - Max 2 pages per business (homepage + contact page)
 * - 30-day cache in SQLite
 * - Only genuine discovered emails get source="website" and "Found on website" label
 * - Never fabricates an email or website URL
 */
export async function enrichLeadFromWebsite(rawWebsiteUrl: string | null | undefined): Promise<WebsiteEnrichmentResult> {
  // Guard: Never invent or crawl an empty/missing website
  if (!rawWebsiteUrl || !rawWebsiteUrl.trim() || rawWebsiteUrl.trim() === "N/A") {
    return {
      email: null,
      emailStatus: "Missing",
      emailSourceUrl: null,
      phones: [],
      phone: null,
      phoneStatus: "Missing",
      searchedUrls: [],
    };
  }

  let formattedUrl = rawWebsiteUrl.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }

  // 1. Check 30-day SQLite cache
  const cached = getCachedWebsiteEnrichment(formattedUrl);
  if (cached) {
    console.log(`[WebsiteEnrichment Cache HIT] ${formattedUrl} -> ${cached.email || "No email"}`);
    return {
      email: cached.email,
      emailStatus: (cached.email ? "Found on website" : "Missing") as any,
      emailSourceUrl: cached.emailSourceUrl,
      phones: cached.phones,
      phone: cached.phones[0] || null,
      phoneStatus: cached.phones[0] ? "Format valid" : "Missing",
      searchedUrls: [formattedUrl],
      cached: true,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(formattedUrl);
  } catch {
    return {
      email: null,
      emailStatus: "Missing",
      emailSourceUrl: null,
      phones: [],
      phone: null,
      phoneStatus: "Missing",
      searchedUrls: [],
    };
  }

  const baseOrigin = parsed.origin;
  const searchedUrls: string[] = [];

  // 2. Check robots.txt (respect robots.txt rule)
  const robotsTxt = await fetchRobotsTxt(baseOrigin);

  // 3. Page 1: Homepage (max 2 pages per business rule)
  const candidateEmails: { email: string; sourceUrl: string }[] = [];
  const candidatePhones: string[] = [];
  let contactUrl = `${baseOrigin}/contact`;

  if (!isDisallowedByRobots(robotsTxt, parsed.pathname || "/")) {
    searchedUrls.push(formattedUrl);
    const homeRes = await fetchPageHtml(formattedUrl, 8000);
    if (homeRes) {
      const extracted = extractContactsFromHtml(homeRes.html, homeRes.finalUrl, formattedUrl);
      candidateEmails.push(...extracted.emails);
      candidatePhones.push(...extracted.phones);
      contactUrl = findContactLink(homeRes.html, baseOrigin);
    }
  }

  // 4. Page 2: Contact page (if needed, max 2 pages rule)
  if (searchedUrls.length < 2 && contactUrl && contactUrl !== formattedUrl) {
    try {
      const contactPath = new URL(contactUrl).pathname;
      if (!isDisallowedByRobots(robotsTxt, contactPath)) {
        searchedUrls.push(contactUrl);
        const contactRes = await fetchPageHtml(contactUrl, 8000);
        if (contactRes) {
          const extracted = extractContactsFromHtml(contactRes.html, contactRes.finalUrl, formattedUrl);
          candidateEmails.push(...extracted.emails);
          candidatePhones.push(...extracted.phones);
        }
      }
    } catch {
      // Ignore URL parse error
    }
  }

  // 5. Validate extracted emails using data-integrity rules
  let validEmail: string | null = null;
  let emailSourceUrl: string | null = null;

  for (const item of candidateEmails) {
    const val = validateEmail(item.email, formattedUrl);
    if (val.email && val.emailStatus !== "Invalid format") {
      validEmail = val.email;
      emailSourceUrl = item.sourceUrl;
      // Prioritize email matching business domain
      if (val.emailStatus === "Found on website") {
        break;
      }
    }
  }

  // Validate extracted phone
  const validPhones: string[] = [];
  for (const rawP of candidatePhones) {
    const pVal = validatePhone(rawP, "BD");
    if (pVal.phone && pVal.phoneStatus !== "Missing") {
      validPhones.push(pVal.phone);
    }
  }

  const finalEmailStatus = validEmail ? "Found on website" : "Missing";

  // 6. Save in SQLite cache for 30 days
  setCachedWebsiteEnrichment({
    websiteUrl: formattedUrl,
    email: validEmail,
    emailSourceUrl,
    emailStatus: finalEmailStatus,
    phones: validPhones,
    ttlDays: 30, // 30-day cache requirement
  });

  console.log(
    `[WebsiteEnrichment Done] ${formattedUrl} -> Email: ${validEmail || "Not available"} (Source URL: ${emailSourceUrl || "N/A"})`
  );

  return {
    email: validEmail,
    emailStatus: finalEmailStatus,
    emailSourceUrl,
    phones: validPhones,
    phone: validPhones[0] || null,
    phoneStatus: validPhones[0] ? "Format valid" : "Missing",
    searchedUrls,
    cached: false,
  };
}
