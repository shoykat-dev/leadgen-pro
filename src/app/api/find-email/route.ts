import { NextRequest, NextResponse } from "next/server";
import { enrichLeadFromWebsite } from "@/lib/website-crawler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawWebsite = body.website;

    if (!rawWebsite || typeof rawWebsite !== "string" || !rawWebsite.trim()) {
      return NextResponse.json({
        success: true,
        email: null,
        emailStatus: "Missing",
        emailSourceUrl: null,
        message: "No website available to search for email.",
      });
    }

    const result = await enrichLeadFromWebsite(rawWebsite);

    return NextResponse.json({
      success: true,
      email: result.email,
      emailStatus: result.emailStatus,
      emailProvenance: result.email ? "found_on_website" : undefined,
      emailSourceUrl: result.emailSourceUrl,
      phone: result.phone,
      phoneStatus: result.phoneStatus,
      searchedPages: result.searchedUrls.length,
      searchedUrls: result.searchedUrls,
      found: Boolean(result.email),
      cached: result.cached || false,
    });
  } catch (error: any) {
    console.error("[Email Finder Route Error]:", error);
    return NextResponse.json(
      { error: { code: "EMAIL_FIND_FAILED", message: "Email search could not be completed." } },
      { status: 500 }
    );
  }
}
