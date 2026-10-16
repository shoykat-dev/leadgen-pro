"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Radar,
  Play,
  Pause,
  RotateCcw,
  StopCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Layers,
  Database,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ALL_BUSINESS_SERVICES } from "@/lib/directory-data";
import {
  WEB_RELEVANT_CATEGORIES,
  CategoryCoverageReport,
  AreaCoverageReport,
} from "@/lib/area-scan";
import { BusinessLead } from "@/lib/data-integrity";

interface AreaScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaName: string;
  cityName: string;
  countryCode: string;
  onLeadsDiscovered: (leads: BusinessLead[]) => void;
}

type ScanMode = "web_relevant" | "selected" | "all";

export function AreaScanModal({
  isOpen,
  onClose,
  areaName,
  cityName,
  countryCode,
  onLeadsDiscovered,
}: AreaScanModalProps) {
  const [scanMode, setScanMode] = useState<ScanMode>("web_relevant");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(["restaurant", "cafe", "dental_clinic"]);
  const [estimate, setEstimate] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [confirmedExtraDailyCalls, setConfirmedExtraDailyCalls] = useState<number>(0);

  // Scan execution state
  const [scanState, setScanState] = useState<"idle" | "running" | "paused" | "completed" | "stopped">("idle");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [discoveredLeads, setDiscoveredLeads] = useState<BusinessLead[]>([]);
  const [coverageReports, setCoverageReports] = useState<CategoryCoverageReport[]>([]);
  const [totalCallsUsed, setTotalCallsUsed] = useState<number>(0);
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<boolean>(false);
  const pauseRef = useRef<boolean>(false);

  // Determine active category queue
  const categoriesToScan = useMemo(() => {
    if (scanMode === "web_relevant") {
      return WEB_RELEVANT_CATEGORIES.map((id) => {
        const match = ALL_BUSINESS_SERVICES.find((s) => s.id === id);
        return { id, label: match?.label || id };
      });
    }
    if (scanMode === "all") {
      return ALL_BUSINESS_SERVICES.map((s) => ({ id: s.id, label: s.label }));
    }
    return selectedCategoryIds.map((id) => {
      const match = ALL_BUSINESS_SERVICES.find((s) => s.id === id);
      return { id, label: match?.label || id };
    });
  }, [scanMode, selectedCategoryIds]);

  // Load estimate whenever scanMode or categories change
  useEffect(() => {
    if (!isOpen) return;
    setIsEstimating(true);
    const catIds = categoriesToScan.map((c) => c.id);

    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "estimate",
        categories: catIds,
        areaName: `${areaName}, ${cityName}`,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.estimate) {
          setEstimate(data.estimate);
        }
      })
      .catch((e) => console.warn("Estimate failed", e))
      .finally(() => setIsEstimating(false));
  }, [isOpen, scanMode, categoriesToScan, areaName, cityName]);

  // Reset state when opened for a new area
  useEffect(() => {
    if (isOpen) {
      abortRef.current = false;
      pauseRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Start or resume scan
  const handleStartScan = async () => {
    setErrorMessage(null);
    setScanState("running");
    abortRef.current = false;
    pauseRef.current = false;

    let index = currentIndex;
    let leadsAcc = [...discoveredLeads];
    let reportsAcc = [...coverageReports];
    let callsAcc = totalCallsUsed;

    while (index < categoriesToScan.length) {
      if (abortRef.current) {
        setScanState("stopped");
        break;
      }

      if (pauseRef.current) {
        setScanState("paused");
        setCurrentIndex(index);
        break;
      }

      const cat = categoriesToScan[index];
      setCurrentIndex(index);
      setProgressPercent(Math.round(((index + 1) / categoriesToScan.length) * 100));

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "scan_category",
            areaName: `${areaName}, ${cityName}`,
            countryCode,
            categoryId: cat.id,
            categoryLabel: cat.label,
            confirmedExtraDailyCalls,
            enableAdaptiveTiling: true,
          }),
        });

        const data = await res.json();

        if (data.blockedByBudget) {
          setErrorMessage(data.message || "Daily Google limit reached.");
          setScanState("paused");
          setCurrentIndex(index);
          break;
        }

        if (data.success) {
          const newLeads = data.leads || [];
          leadsAcc = [...leadsAcc, ...newLeads];
          setDiscoveredLeads(leadsAcc);
          onLeadsDiscovered(leadsAcc);

          if (data.coverage) {
            reportsAcc.push(data.coverage);
            setCoverageReports([...reportsAcc]);
            callsAcc += data.coverage.callsUsed || 0;
            setTotalCallsUsed(callsAcc);
          }

          if (data.budget) {
            setBudgetStatus(data.budget);
          }
        }
      } catch (err: any) {
        console.warn(`Scan step for ${cat.label} failed:`, err);
      }

      index++;
      setCurrentIndex(index);

      // Graceful 600ms delay between Google calls
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    if (index >= categoriesToScan.length) {
      setScanState("completed");
      setProgressPercent(100);
    }
  };

  const handlePauseScan = () => {
    pauseRef.current = true;
    setScanState("paused");
  };

  const handleCancelScan = () => {
    abortRef.current = true;
    setScanState("stopped");
  };

  const handleResetScan = () => {
    abortRef.current = true;
    pauseRef.current = false;
    setScanState("idle");
    setCurrentIndex(0);
    setProgressPercent(0);
    setDiscoveredLeads([]);
    setCoverageReports([]);
    setTotalCallsUsed(0);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Radar className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Area Coverage Scan Engine</span>
                <Badge variant="outline" className="text-[10px] sm:text-[11px] font-mono">
                  {areaName}, {cityName}
                </Badge>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Systematic Google Places discovery with adaptive quadrant tiling.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Mode Selector (Only when idle) */}
          {scanState === "idle" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Web-service-relevant categories */}
                <button
                  type="button"
                  onClick={() => setScanMode("web_relevant")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    scanMode === "web_relevant"
                      ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Web-Service Relevant
                    </span>
                    <Badge variant="info" className="text-[10px]">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    21 prime target industries (restaurants, clinics, salons, gyms, law firms, real estate).
                  </p>
                </button>

                {/* 2. Selected Categories */}
                <button
                  type="button"
                  onClick={() => setScanMode("selected")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    scanMode === "selected"
                      ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Selected Categories
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Scan only chosen categories to minimize Google call usage.
                  </p>
                </button>

                {/* 3. All Services A to Z */}
                <button
                  type="button"
                  onClick={() => setScanMode("all")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    scanMode === "all"
                      ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    All Services (A to Z)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Iterates all 99 services. Requires multi-day execution under daily quota limit.
                  </p>
                </button>
              </div>

              {/* Pre-Scan Estimate Panel (Section 4 item 6) */}
              {estimate && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Pre-Scan Quota Estimate
                    </span>
                    <span className="text-slate-500 font-normal">
                      Budget Guard Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[10px] text-slate-500">Categories to Scan</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        {estimate.categoriesCount}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[10px] text-slate-500">Est. Google Calls</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                        {estimate.minCalls} – {estimate.maxCalls}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[10px] text-slate-500">Today's Remaining</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {estimate.remainingToday} / {estimate.dailyLimit}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-[10px] text-slate-500">Monthly Remaining</div>
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {estimate.remainingMonth} / {estimate.monthlyLimit}
                      </div>
                    </div>
                  </div>

                  {estimate.categoriesCount > estimate.remainingToday && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Exceeds remaining daily limit ({estimate.remainingToday} calls)</p>
                        <p className="text-[11px] mt-0.5 opacity-90">
                          The scan will automatically pause when today's limit is reached and save partial results. You can resume tomorrow, or confirm using extra calls today:
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-[11px] font-semibold">Allow extra calls today:</label>
                          <input
                            type="number"
                            min="0"
                            max={estimate.remainingMonth}
                            value={confirmedExtraDailyCalls}
                            onChange={(e) => setConfirmedExtraDailyCalls(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 h-7 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Google Places limits results to 20 per page (max 60). Adaptive tiling splits dense areas into 4 quadrants to maximize discovery without exceeding your budget.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Running / Paused / Completed Status Screen */}
          {scanState !== "idle" && (
            <div className="space-y-4">
              {/* Progress Bar & Current Operation */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                    <span>
                      Scanning category {currentIndex + 1} of {categoriesToScan.length}:{" "}
                      <span className="text-blue-600 dark:text-blue-400">
                        {categoriesToScan[currentIndex]?.label || "Finalizing..."}
                      </span>
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {progressPercent}%
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Google Calls Used: {totalCallsUsed}</span>
                  <span>Discovered Leads: {discoveredLeads.length} unique</span>
                  <Badge
                    variant={
                      scanState === "completed"
                        ? "success"
                        : scanState === "paused"
                        ? "warning"
                        : "info"
                    }
                    className="capitalize text-[10px]"
                  >
                    {scanState}
                  </Badge>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* COVERAGE REPORT PANEL (Section 4 item 8) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Live Area Coverage Report</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {coverageReports.length} categories logged
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Category</th>
                        <th className="py-2.5 px-2 font-semibold text-center">Calls</th>
                        <th className="py-2.5 px-2 font-semibold text-center">Raw</th>
                        <th className="py-2.5 px-2 font-semibold text-center">Unique Kept</th>
                        <th className="py-2.5 px-2 font-semibold text-center">Quadrants</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Completeness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {coverageReports.map((c) => (
                        <tr key={c.categoryId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {c.categoryLabel}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                            {c.callsUsed}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-500">
                            {c.rawResults}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {c.keptAfterValidation}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-500">
                            {c.tilesSubdivided > 0 ? `${c.tilesSubdivided} tiles` : "None"}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                c.completeness === "Complete"
                                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                                  : c.completeness === "Probably complete"
                                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                                  : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                              }`}
                              title={c.reason}
                            >
                              {c.completeness}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {coverageReports.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            Starting scan... results will appear here in real time.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Honest Note per Section 4 item 10 */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">Honest Coverage Notice:</strong> Google Places limits results per search and this tool operates strictly within the official free tier. Completeness labels reflect whether the 20-place page cap was reached and whether adaptive quadrant tiling was performed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            {scanState === "completed" ? "Done" : "Close"}
          </Button>

          <div className="flex items-center gap-2">
            {scanState === "idle" && (
              <Button
                type="button"
                size="sm"
                onClick={handleStartScan}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-semibold shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Launch Area Scan</span>
              </Button>
            )}

            {scanState === "running" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePauseScan}
                  className="text-xs gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelScan}
                  className="text-xs gap-1.5"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </Button>
              </>
            )}

            {scanState === "paused" && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStartScan}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Scan</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetScan}
                  className="text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              </>
            )}

            {scanState === "completed" && (
              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>View {discoveredLeads.length} Leads</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
