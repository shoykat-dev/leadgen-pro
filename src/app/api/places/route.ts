import { NextRequest, NextResponse } from "next/server";
import { Country } from "country-state-city";
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

    let resolvedCountryCode = (body.countryCode || "").toUpperCase();
    if (!resolvedCountryCode && country) {
      const cLower = country.toLowerCase().trim();
      if (cLower.includes("kingdom") || cLower === "uk" || cLower === "great britain") {
        resolvedCountryCode = "GB";
      } else if (cLower.includes("united states") || cLower === "usa" || cLower === "us") {
        resolvedCountryCode = "US";
      } else if (cLower.includes("uae") || cLower.includes("emirates")) {
        resolvedCountryCode = "AE";
      } else {
        const cMatch = Country.getAllCountries().find(
          (c) => c.name.toLowerCase() === cLower || cLower.includes(c.name.toLowerCase())
        );
        if (cMatch) {
          resolvedCountryCode = cMatch.isoCode;
        }
      }
    }
    if (!resolvedCountryCode) {
      resolvedCountryCode = "BD";
    }

    let areaConfig = null;
    let lastUpdated: string | undefined = undefined;

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
        bypassCache: body.bypassCache,
        simulateMirror1Failure: body.simulateMirror1Failure,
      });
      resultLeads = freeRes.leads;
      areaConfig = freeRes.areaConfig;
      callsUsed = 0;
      cached = freeRes.cached || false;
      lastUpdated = freeRes.lastUpdated;
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
      areaConfig,
      businesses: resultLeads,
      callsUsed,
      cached,
      lastUpdated,
      engineSource,
    });
  } catch (error: any) {
    console.error("[/api/places forwarder error]:", error.message);
    const isBusy = error.message?.includes("busy") || error.message?.includes("Overpass");
    return NextResponse.json(
      {
        error: {
          code: isBusy ? "SOURCE_BUSY" : "SEARCH_FAILED",
          message: isBusy
            ? "Data source busy, please try again."
            : error.message || "Failed to search places. Please try again.",
        },
        businesses: [],
        total: 0,
      },
      { status: isBusy ? 503 : 500 }
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
