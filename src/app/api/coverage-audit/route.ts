import { NextRequest, NextResponse } from "next/server";
import { getAreaConfig } from "@/lib/areas";
import { countCategoryCoverage } from "@/lib/free-search";
import { ALL_BUSINESS_SERVICES } from "@/lib/directory-data";

export const maxDuration = 60;

/**
 * Coverage audit: for a chosen area, counts how many businesses each category
 * finds (tag-matched + name-matched), so weak categories are visible at a
 * glance instead of discovered one search at a time.
 *
 * Batched: the client calls with offset/limit (default 10 per call) until
 * done=true. Counts are live on every call (no cache) — the audit is a
 * diagnostic, and stale counts would hide real coverage gaps.
 * Counts use the Overpass radius filter plus the same code-side rules as the
 * main pipeline, but without the final Haversine re-check on element
 * centres, so they are a close upper bound on the final result count.
 */

const BATCH_LIMIT = 10;
const BATCH_CONCURRENCY = 3;
/** A category with fewer than this many businesses in the area is "weak". */
const WEAK_THRESHOLD = 5;
/** Per-category budget (ms) so a batch always fits the function limit. */
const PER_CATEGORY_BUDGET_MS = 12000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { city, area, countryCode } = body;
    if (!city || !area) {
      return NextResponse.json(
        { error: "City and area are required for a coverage audit." },
        { status: 400 }
      );
    }

    const offset = Math.max(0, Number(body.offset) || 0);
    const limit = Math.min(20, Math.max(1, Number(body.limit) || BATCH_LIMIT));

    const areaConfig = getAreaConfig(area, city, null, null, countryCode);
    const batch = ALL_BUSINESS_SERVICES.slice(offset, offset + limit);

    const results: {
      categoryId: string;
      categoryLabel: string;
      tagCount: number;
      nameCount: number;
      total: number;
      weak: boolean;
    }[] = [];

    for (let i = 0; i < batch.length; i += BATCH_CONCURRENCY) {
      const chunk = batch.slice(i, i + BATCH_CONCURRENCY);
      const counts = await Promise.all(
        chunk.map((c) =>
          countCategoryCoverage(
            c.id,
            areaConfig.radiusMeters,
            areaConfig.centerLat,
            areaConfig.centerLon,
            PER_CATEGORY_BUDGET_MS
          )
        )
      );
      chunk.forEach((c, j) => {
        results.push({
          categoryId: c.id,
          categoryLabel: c.label,
          tagCount: counts[j].tagCount,
          nameCount: counts[j].nameCount,
          total: counts[j].total,
          weak: counts[j].total < WEAK_THRESHOLD,
        });
      });
    }

    return NextResponse.json({
      area: areaConfig.name,
      city: areaConfig.city,
      radiusMeters: areaConfig.radiusMeters,
      centerLat: areaConfig.centerLat,
      centerLon: areaConfig.centerLon,
      totalCategories: ALL_BUSINESS_SERVICES.length,
      offset,
      limit,
      done: offset + batch.length >= ALL_BUSINESS_SERVICES.length,
      results,
    });
  } catch (err: any) {
    console.error("[Coverage Audit] Failed:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Coverage audit failed. Please try again." },
      { status: 500 }
    );
  }
}
