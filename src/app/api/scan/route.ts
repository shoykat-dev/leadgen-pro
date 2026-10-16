import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  calculateScanEstimate,
  splitRectangleIntoQuadrants,
  WEB_RELEVANT_CATEGORIES,
  SWEEP_QUERIES,
  CategoryCoverageReport,
  ViewportRectangle,
} from "@/lib/area-scan";
import { searchGooglePlaces } from "@/lib/google-places";
import { searchFreeLiveDirectory } from "@/lib/free-search";
import { getBudgetStatus, saveScanJob, getScanJob } from "@/lib/db";
import { ALL_BUSINESS_SERVICES } from "@/lib/directory-data";
import { deduplicateLeads, BusinessLead } from "@/lib/data-integrity";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    const { userId } = await auth();
    if (apiKey && !userId) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required to launch or run an Area Scan with Google Places API.",
          },
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // 1. ESTIMATE ACTION
    if (action === "estimate") {
      const { categories = [], areaName = "Target Area" } = body;
      const budget = getBudgetStatus();
      const estimate = calculateScanEstimate({ categories, areaName, budget });
      return NextResponse.json({ success: true, estimate });
    }

    // 2. SCAN CATEGORY STEP (with Adaptive Tiling & honest Coverage Reporting)
    if (action === "scan_category") {
      const {
        areaName,
        countryCode = "BD",
        categoryId,
        categoryLabel,
        rectangle,
        confirmedExtraDailyCalls = 0,
        enableAdaptiveTiling = true,
      } = body;

      if (!areaName || !categoryId) {
        return NextResponse.json(
          { error: { code: "MISSING_PARAMS", message: "areaName and categoryId are required." } },
          { status: 400 }
        );
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
      const budget = getBudgetStatus(confirmedExtraDailyCalls);
      if (apiKey && !budget.canCallGoogle) {
        return NextResponse.json({
          success: false,
          blockedByBudget: true,
          budget,
          message: budget.reason,
          leads: [],
          coverage: {
            categoryId,
            categoryLabel: categoryLabel || categoryId,
            callsUsed: 0,
            rawResults: 0,
            keptAfterValidation: 0,
            duplicatesRemoved: 0,
            tilesSubdivided: 0,
            completeness: "Possibly incomplete",
            reason: budget.reason,
          },
        });
      }

      const searchQuery = `${categoryLabel || categoryId} in ${areaName}`;
      let callsUsed = 0;
      let rawLeads: BusinessLead[] = [];
      let tilesSubdivided = 0;
      let completeness: "Complete" | "Probably complete" | "Possibly incomplete" = "Complete";
      let completenessReason: string | undefined = undefined;

      // Primary Search Call
      try {
        if (!apiKey) {
          const freeRes = await searchFreeLiveDirectory({
            query: searchQuery,
            category: categoryId,
            categoryLabel: categoryLabel || categoryId,
            countryCode,
            city: body.city || areaName,
            area: areaName,
          });
          rawLeads.push(...freeRes.leads);
          completeness = "Complete";
          completenessReason = "Scanned live open directory records.";
        } else {
          const firstResult = await searchGooglePlaces({
            query: searchQuery,
            categoryId,
            countryCode,
            rectangle,
            confirmedExtraDailyCalls,
          });

          callsUsed += firstResult.callsUsed;
          rawLeads.push(...firstResult.leads);

        // Check if cap was hit (20+ results with next page token)
        const hitCap = Boolean(firstResult.nextPageToken || firstResult.leads.length >= 20);

        if (hitCap && enableAdaptiveTiling && rectangle) {
          // Check budget before subdividing into 4 quadrants
          const currentBudget = getBudgetStatus(confirmedExtraDailyCalls);
          if (currentBudget.canCallGoogle && currentBudget.dailyUsed < currentBudget.dailyLimit - 2) {
            tilesSubdivided = 4;
            const quadrants = splitRectangleIntoQuadrants(rectangle);

            for (const quad of quadrants) {
              const quadBudget = getBudgetStatus(confirmedExtraDailyCalls);
              if (!quadBudget.canCallGoogle) {
                completeness = "Possibly incomplete";
                completenessReason = "Daily/monthly Google limit reached during adaptive tiling.";
                break;
              }

              try {
                const quadResult = await searchGooglePlaces({
                  query: searchQuery,
                  categoryId,
                  countryCode,
                  rectangle: quad,
                  confirmedExtraDailyCalls,
                });
                callsUsed += quadResult.callsUsed;
                rawLeads.push(...quadResult.leads);
              } catch (quadErr) {
                console.warn("[Quadrant Scan Err]:", quadErr);
              }
            }

            if (completeness === "Complete") {
              completeness = "Probably complete";
              completenessReason = "Subdivided into 4 quadrants to maximize density coverage.";
            }
          } else {
            completeness = "Possibly incomplete";
            completenessReason = "Results hit the 20-place page cap; adaptive tiling skipped due to remaining budget guard.";
          }
        }
      }
      } catch (err: any) {
        return NextResponse.json(
          {
            error: {
              code: "SCAN_STEP_FAILED",
              message: err.message || "Failed to search category.",
            },
          },
          { status: 500 }
        );
      }

      // Deduplicate results
      const uniqueLeads = deduplicateLeads(rawLeads);
      const duplicatesRemoved = rawLeads.length - uniqueLeads.length;

      const coverage: CategoryCoverageReport = {
        categoryId,
        categoryLabel: categoryLabel || categoryId,
        callsUsed,
        rawResults: rawLeads.length,
        keptAfterValidation: uniqueLeads.length,
        duplicatesRemoved,
        tilesSubdivided,
        completeness,
        reason: completenessReason,
      };

      const updatedBudget = getBudgetStatus(confirmedExtraDailyCalls);

      return NextResponse.json({
        success: true,
        leads: uniqueLeads,
        coverage,
        budget: updatedBudget,
      });
    }

    // 3. JOB PERSISTENCE (save or update scan job state)
    if (action === "save_job") {
      const { job } = body;
      if (!job || !job.id) {
        return NextResponse.json(
          { error: { code: "INVALID_JOB", message: "Valid job object with id is required." } },
          { status: 400 }
        );
      }
      saveScanJob(job);
      return NextResponse.json({ success: true, id: job.id });
    }

    // 4. GET JOB
    if (action === "get_job") {
      const { id } = body;
      const job = getScanJob(id);
      return NextResponse.json({ success: true, job });
    }

    return NextResponse.json(
      { error: { code: "UNKNOWN_ACTION", message: `Action '${action}' is not recognized.` } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[POST /api/scan error]:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message || "Area scan server error." } },
      { status: 500 }
    );
  }
}
