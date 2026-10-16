import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/data-integrity";

const emailCache = new Map<string, { email: string | null; status: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let rawWebsite = body.website;

    if (!rawWebsite || typeof rawWebsite !== "string") {
      return NextResponse.json(
        {
          success: true,
          email: null,
          emailStatus: "Missing",
          message: "No website available to search for email.",
        }
      );
    }

    if (!rawWebsite.startsWith("http://") && !rawWebsite.startsWith("https://")) {
      rawWebsite = `https://${rawWebsite}`;
    }

    // Check cache
    const cached = emailCache.get(rawWebsite);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        email: cached.email,
        emailStatus: cached.status,
        emailProvenance: cached.email ? "found_on_website" : undefined,
        cached: true,
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawWebsite);
    } catch {
      return NextResponse.json(
        {
          success: true,
          email: null,
          emailStatus: "Missing",
          message: "Invalid website URL format.",
        }
      );
    }

    const domain = parsedUrl.hostname.replace(/^www\./, "");
    const baseOrigin = parsedUrl.origin;

    const urlsToCrawl = [
      rawWebsite,
      `${baseOrigin}/contact`,
      `${baseOrigin}/contact-us`,
      `${baseOrigin}/about`,
      `${baseOrigin}/about-us`,
    ];

    const foundEmails: string[] = [];

    const fetchPage = async (url: string) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, {
          headers: {
            "User-Agent": "LeadGenPro-EmailBot/2.0 (+https://leadgenpro.dev)",
            Accept: "text/html",
          },
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);

        if (!res.ok) return "";
        return await res.text();
      } catch {
        return "";
      }
    };

    // Crawl concurrently
    const htmls = await Promise.all(urlsToCrawl.map((u) => fetchPage(u)));

    for (const html of htmls) {
      if (!html) continue;

      // 1. Check mailto: links
      const mailtoMatches = html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
      for (const m of mailtoMatches) {
        if (m[1]) foundEmails.push(m[1].trim());
      }

      // 2. Check visible email regex
      const textMatches = html.matchAll(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi);
      for (const m of textMatches) {
        if (m[1]) foundEmails.push(m[1].trim());
      }
    }

    // Run Section 2 validation on discovered emails
    let validEmail: string | null = null;
    let validStatus: any = "Missing";

    for (const raw of foundEmails) {
      const validated = validateEmail(raw, rawWebsite);
      if (validated.email && validated.emailStatus !== "Invalid format") {
        validEmail = validated.email;
        validStatus = validated.emailStatus;
        // Prioritize matching domain
        if (validStatus === "Found on website") {
          break;
        }
      }
    }

    emailCache.set(rawWebsite, {
      email: validEmail,
      status: validStatus,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      email: validEmail,
      emailStatus: validStatus,
      emailProvenance: validEmail ? "found_on_website" : undefined,
      domain,
      searchedPages: urlsToCrawl.length,
      found: Boolean(validEmail),
      cached: false,
    });
  } catch (error: any) {
    console.error("[Email Finder Error]:", error);
    return NextResponse.json(
      { error: { code: "EMAIL_FIND_FAILED", message: "Email search could not be completed." } },
      { status: 500 }
    );
  }
}
