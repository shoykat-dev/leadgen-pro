import { NextRequest, NextResponse } from "next/server";
import { getAreasForHierarchyCity } from "@/lib/location-hierarchy";
import { getOrBuildCityAreas } from "@/lib/dynamic-areas";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get("countryCode") || "BD";
    const cityName = searchParams.get("city") || "";
    const stateCode = searchParams.get("stateCode") || "";

    if (!cityName) {
      return NextResponse.json(
        { error: "City name parameter is required." },
        { status: 400 }
      );
    }

    // 1. Check curated hierarchy first (Prompt 5: Curated entries keep priority wherever they exist)
    const curatedAreas = getAreasForHierarchyCity(countryCode, stateCode, cityName);
    const isCurated =
      curatedAreas.length > 0 &&
      !curatedAreas.some((a) => a.includes("Central Business District (CBD)"));

    if (isCurated) {
      return NextResponse.json({
        success: true,
        areas: curatedAreas,
        isCurated: true,
        source: "curated",
      });
    }

    // 2. Dynamic Fallback: query Nominatim + Overpass suburbs/neighbourhoods with 30-day cache
    const dynamicResult = await getOrBuildCityAreas(cityName, countryCode);

    return NextResponse.json({
      success: true,
      areas: dynamicResult.areas,
      isCurated: false,
      source: dynamicResult.source,
    });
  } catch (error: any) {
    console.error("[GET /api/areas Error]:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to resolve areas for city.",
        areas: ["City centre"],
      },
      { status: 500 }
    );
  }
}
