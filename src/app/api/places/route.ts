import { NextRequest, NextResponse } from "next/server";
import { BusinessLead } from "@/lib/data-integrity";
import { searchGooglePlaces } from "@/lib/google-places";
import { searchFreeLiveDirectory } from "@/lib/free-search";

export type { BusinessLead };

/**
 * Legacy places endpoint forwarder.
 * Redirects queries to official Google Places API (New) with zero mock/fake data.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { country, city, area, category, categoryLabel } = body;

    const queryParts = [categoryLabel || category, area, city, country].filter(Boolean);
    const query = queryParts.join(", ");

    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    let resultLeads: BusinessLead[] = [];
    let callsUsed = 0;
    let cached = false;
    let engineSource = "google_places";

    const resolvedCountryCode = (
      body.countryCode ||
      (country?.toLowerCase().includes("kingdom") || country?.toLowerCase().includes("uk")
        ? "GB"
        : country?.toLowerCase().includes("united states") || country?.toLowerCase().includes("usa")
        ? "US"
        : country?.toLowerCase().includes("canada")
        ? "CA"
        : country?.toLowerCase().includes("australia")
        ? "AU"
        : "BD")
    ).toUpperCase();

    if (apiKey) {
      const googleRes = await searchGooglePlaces({
        query,
        categoryId: category,
        countryCode: resolvedCountryCode,
      });
      resultLeads = googleRes.leads;
      callsUsed = googleRes.callsUsed;
      cached = googleRes.cached;
    } else {
      // 100% Free Live Directory Search (No card, No Google API key required)
      const freeRes = await searchFreeLiveDirectory({
        query,
        category,
        categoryLabel: categoryLabel || category,
        country,
        countryCode: resolvedCountryCode,
        state: body.state,
        city,
        area,
        lat: body.lat,
        lon: body.lon,
      });
      resultLeads = freeRes.leads;
      callsUsed = 0;
      cached = false;
      engineSource = "free_directory";
    }

    return NextResponse.json({
      success: true,
      total: resultLeads.length,
      category: categoryLabel || category,
      location: {
        city: city || area || "Target City",
        area: area || city,
        state: body.state,
        country,
      },
      businesses: resultLeads,
      callsUsed,
      cached,
      engineSource,
    });
  } catch (error: any) {
    console.error("[/api/places forwarder error]:", error.message);
    return NextResponse.json(
      {
        error: {
          code: "SEARCH_FAILED",
          message: error.message || "Failed to search places. Please try again.",
        },
        businesses: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "GET method is not supported on /api/places. Use POST with search parameters or /api/search.",
      },
    },
    { status: 405 }
  );
}
