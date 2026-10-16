import { NextRequest, NextResponse } from "next/server";

export interface WebsiteAuditResult {
  url: string;
  isHttps: boolean;
  responseTimeMs: number;
  hasViewportMeta: boolean;
  title: string | null;
  metaDescription: string | null;
  hasOutdatedSigns: boolean;
  outdatedReasons: string[];
  statusCode: number;
  auditPassed: boolean;
  notes: string;
}

const auditCache = new Map<string, { data: WebsiteAuditResult; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let rawUrl = body.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "URL is required for audit." } },
        { status: 400 }
      );
    }

    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      rawUrl = `https://${rawUrl}`;
    }

    // Check memory cache
    const cached = auditCache.get(rawUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, audit: cached.data, cached: true });
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    let res: Response;
    try {
      res = await fetch(rawUrl, {
        method: "GET",
        headers: {
          "User-Agent": "LeadGenPro-AuditBot/2.0 (+https://leadgenpro.dev; Site Health Check)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
        redirect: "follow",
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const isTimeout = fetchErr.name === "AbortError";
      const failedResult: WebsiteAuditResult = {
        url: rawUrl,
        isHttps: rawUrl.startsWith("https://"),
        responseTimeMs: isTimeout ? 6000 : Date.now() - startTime,
        hasViewportMeta: false,
        title: null,
        metaDescription: null,
        hasOutdatedSigns: true,
        outdatedReasons: [isTimeout ? "Connection timed out (>6s)" : "Website unreachable or server down"],
        statusCode: 0,
        auditPassed: false,
        notes: isTimeout ? "Site is extremely slow or offline" : "Website unreachable",
      };
      return NextResponse.json({ success: true, audit: failedResult, cached: false });
    }

    clearTimeout(timeout);
    const responseTimeMs = Date.now() - startTime;
    const finalUrl = res.url || rawUrl;
    const isHttps = finalUrl.startsWith("https://");

    const html = await res.text().catch(() => "");
    const lowerHtml = html.toLowerCase();

    // 1. Check viewport meta tag (mobile-friendliness indicator)
    const hasViewportMeta = lowerHtml.includes('<meta name="viewport"') || lowerHtml.includes("<meta name='viewport'");

    // 2. Extract Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // 3. Extract Meta Description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null;

    // 4. Check for Outdated Signs
    const outdatedReasons: string[] = [];
    if (!isHttps) {
      outdatedReasons.push("Not using secure HTTPS");
    }
    if (responseTimeMs > 2500) {
      outdatedReasons.push(`Slow response time (${(responseTimeMs / 1000).toFixed(1)}s)`);
    }
    if (!hasViewportMeta) {
      outdatedReasons.push("Missing mobile viewport tag (not mobile-optimized)");
    }
    if (!title || title.length < 5) {
      outdatedReasons.push("Missing or incomplete page title");
    }
    if (!metaDescription) {
      outdatedReasons.push("Missing SEO meta description");
    }
    if (lowerHtml.includes("flash") || lowerHtml.includes(".swf")) {
      outdatedReasons.push("Uses obsolete Adobe Flash technology");
    }
    if (lowerHtml.includes("frameset") || lowerHtml.includes("<frame ")) {
      outdatedReasons.push("Uses outdated HTML frame layout");
    }

    const hasOutdatedSigns = outdatedReasons.length > 0;
    const auditPassed = !hasOutdatedSigns && res.status >= 200 && res.status < 400;

    const auditResult: WebsiteAuditResult = {
      url: finalUrl,
      isHttps,
      responseTimeMs,
      hasViewportMeta,
      title,
      metaDescription,
      hasOutdatedSigns,
      outdatedReasons,
      statusCode: res.status,
      auditPassed,
      notes: hasOutdatedSigns
        ? `Found ${outdatedReasons.length} improvement opportunities (Prime redesign prospect)`
        : "Website meets modern baseline standards",
    };

    auditCache.set(rawUrl, { data: auditResult, timestamp: Date.now() });

    return NextResponse.json({ success: true, audit: auditResult, cached: false });
  } catch (error: any) {
    console.error("[Audit Error]:", error);
    return NextResponse.json(
      { error: { code: "AUDIT_FAILED", message: error.message || "Audit could not be completed." } },
      { status: 500 }
    );
  }
}
