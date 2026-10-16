import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchGooglePlaces } from "@/lib/google-places";
import { searchFreeLiveDirectory } from "@/lib/free-search";
import { getBudgetStatus } from "@/lib/db";

export async function GET() {
  try {
    const budget = getBudgetStatus();
    return NextResponse.json({
      success: true,
      budget,
      hasApiKey: Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim()),
    });
  } catch (error: any) {
    console.error("[GET /api/search Budget Error]:", error);
    return NextResponse.json(
      {
        error: {
          code: "BUDGET_CHECK_FAILED",
          message: "Unable to retrieve current Google API budget status.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    const { userId } = await auth();

    // 1. Enforce authentication for Google Places API calls (Guests cannot trigger Google billable calls)
    if (apiKey && !userId) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required to query live Google Places API. You can explore saved leads or use CSV import in Guest mode.",
          },
        },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Malformed request payload.",
          },
        },
        { status: 400 }
      );
    }

    const {
      query,
      categoryId,
      countryCode = "BD",
      rectangle,
      pageToken,
      pageSize = 20,
      confirmedExtraDailyCalls = 0,
    } = body;

    if (!query && !categoryId) {
      return NextResponse.json(
        {
          error: {
            code: "MISSING_QUERY",
            message: "A search query or category is required.",
          },
        },
        { status: 400 }
      );
    }

    // 2. Query Google Places API (New) or Free Live Directory
    let searchResult;

    if (apiKey) {
      searchResult = await searchGooglePlaces({
        query: query || categoryId,
        categoryId,
        countryCode,
        rectangle,
        pageToken,
        pageSize,
        confirmedExtraDailyCalls,
      });
    } else {
      const freeRes = await searchFreeLiveDirectory({
        query: query || categoryId,
        category: categoryId,
        categoryLabel: body.categoryLabel || categoryId,
        country: body.country,
        countryCode: body.countryCode || countryCode,
        state: body.state,
        city: body.city,
        area: body.area,
        lat: body.lat,
        lon: body.lon,
      });
      searchResult = {
        leads: freeRes.leads,
        nextPageToken: undefined,
        callsUsed: 0,
        cached: false,
        totalFetched: freeRes.leads.length,
      };
    }

    const budget = getBudgetStatus();

    return NextResponse.json({
      success: true,
      total: searchResult.leads.length,
      leads: searchResult.leads,
      nextPageToken: searchResult.nextPageToken,
      callsUsed: searchResult.callsUsed,
      cached: searchResult.cached,
      budget,
    });
  } catch (error: any) {
    console.error("[API error in /api/search]:", error.message);

    const message = error.message || "Failed to fetch leads from Google Places.";
    let statusCode = 500;

    if (message.includes("not configured")) {
      statusCode = 503;
    } else if (message.includes("quota") || message.includes("limit reached")) {
      statusCode = 429;
    } else if (message.includes("billing") || message.includes("not enabled")) {
      statusCode = 403;
    }

    return NextResponse.json(
      {
        error: {
          code: "PLACES_SEARCH_ERROR",
          message,
        },
      },
      { status: statusCode }
    );
  }
}
