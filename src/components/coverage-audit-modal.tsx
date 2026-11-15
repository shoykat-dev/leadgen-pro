"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart3,
  X,
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  StopCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CoverageAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaName: string;
  cityName: string;
  countryCode: string;
}

interface CategoryAuditRow {
  categoryId: string;
  categoryLabel: string;
  tagCount: number;
  nameCount: number;
  total: number;
  weak: boolean;
}

const BATCH_LIMIT = 10;
/** Per-batch client timeout (ms); the server batch fits well inside this. */
const BATCH_TIMEOUT_MS = 55000;

export function CoverageAuditModal({
  isOpen,
  onClose,
  areaName,
  cityName,
  countryCode,
}: CoverageAuditModalProps) {
  const [rows, setRows] = useState<CategoryAuditRow[]>([]);
  const [totalCategories, setTotalCategories] = useState(0);
  const [radiusMeters, setRadiusMeters] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "cancelled" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const runAudit = useCallback(async () => {
    cancelRef.current = false;
    setStatus("running");
    setErrorMessage(null);
    setRows([]);
    setTotalCategories(0);
    setRadiusMeters(null);

    let offset = 0;
    try {
      for (;;) {
        if (cancelRef.current) {
          setStatus("cancelled");
          return;
        }
        const controller = new AbortController();
        abortRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch("/api/coverage-audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              city: cityName,
              area: areaName,
              countryCode,
              offset,
              limit: BATCH_LIMIT,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Coverage audit request failed.");
        }

        setTotalCategories(data.totalCategories || 0);
        if (typeof data.radiusMeters === "number") setRadiusMeters(data.radiusMeters);
        setRows((prev) => [...prev, ...(data.results || [])]);

        offset += (data.results || []).length;
        if (data.done || (data.results || []).length === 0) {
          setStatus("done");
          return;
        }
      }
    } catch (err: unknown) {
      if (cancelRef.current) {
        setStatus("cancelled");
        return;
      }
      const isTimeout =
        (err instanceof Error && err.name === "AbortError") ||
        (err instanceof DOMException && err.name === "AbortError");
      setErrorMessage(
        isTimeout
          ? "A coverage batch timed out — the data source is slow right now. Run it again to continue from the start."
          : err instanceof Error && err.message
          ? err.message
          : "Coverage audit failed. Please try again."
      );
      setStatus("error");
    }
  }, [areaName, cityName, countryCode]);

  // Auto-run when the modal opens; cancel any in-flight batch on close.
  useEffect(() => {
    if (!isOpen) {
      cancelRef.current = true;
      abortRef.current?.abort();
      return;
    }
    runAudit();
    return () => {
      cancelRef.current = true;
      abortRef.current?.abort();
    };
  }, [isOpen, runAudit]);

  if (!isOpen) return null;

  const doneCount = rows.length;
  const progressPercent =
    totalCategories > 0 ? Math.round((doneCount / totalCategories) * 100) : 0;
  const weakRows = rows.filter((r) => r.weak);
  const sortedRows = [...rows].sort((a, b) => a.total - b.total || a.categoryLabel.localeCompare(b.categoryLabel));

  const handleDownloadCsv = () => {
    if (rows.length === 0) return;
    const headers = ["Category", "Tag matches", "Name matches", "Total", "Weak (<5)"];
    const lines = sortedRows.map((r) =>
      [
        `"${r.categoryLabel.replace(/"/g, '""')}"`,
        r.tagCount,
        r.nameCount,
        r.total,
        r.weak ? "Yes" : "No",
      ].join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CoverageAudit_${areaName}_${cityName}.csv`.replace(/\s+/g, "_");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-md shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Coverage Audit</span>
                <Badge variant="outline" className="text-[10px] sm:text-[11px] font-mono">
                  {areaName}, {cityName}
                </Badge>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                How many businesses each category finds in this area
                {radiusMeters ? ` (radius ${radiusMeters}m)` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
            <span className="font-semibold flex items-center gap-1.5">
              {status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />}
              {status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              {status === "cancelled" && <StopCircle className="w-3.5 h-3.5 text-slate-400" />}
              {status === "error" && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
              {status === "running"
                ? `Auditing… ${doneCount}${totalCategories ? ` of ${totalCategories}` : ""} categories`
                : status === "done"
                ? `Done — ${doneCount} categories checked`
                : status === "cancelled"
                ? `Stopped — ${doneCount} categories checked`
                : status === "error"
                ? "Audit stopped with an error"
                : "Starting…"}
            </span>
            {status === "done" && weakRows.length > 0 && (
              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                {weakRows.length} weak {weakRows.length === 1 ? "category" : "categories"} (&lt;5 businesses)
              </span>
            )}
            {status === "done" && weakRows.length === 0 && doneCount > 0 && (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                No weak categories
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-violet-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {errorMessage && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
          {rows.length === 0 && status === "running" ? (
            <p className="text-xs text-slate-500 text-center py-8">
              Counting businesses per category — this takes a few minutes for all categories.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-2 font-semibold">Category</th>
                  <th className="py-2 px-2 font-semibold text-right">Tag</th>
                  <th className="py-2 px-2 font-semibold text-right">Name</th>
                  <th className="py-2 px-2 font-semibold text-right">Total</th>
                  <th className="py-2 pl-2 font-semibold">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr
                    key={r.categoryId}
                    className="border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <td className="py-2 pr-2 font-medium text-slate-900 dark:text-white">
                      {r.categoryLabel}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.tagCount}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.nameCount}</td>
                    <td className="py-2 px-2 text-right font-bold tabular-nums">{r.total}</td>
                    <td className="py-2 pl-2">
                      {r.weak ? (
                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-300">
                          Weak
                        </Badge>
                      ) : (
                        <span className="text-slate-400">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
            Counts use the radius filter; final search results are Haversine-checked against the
            area centre, so counts are a close upper bound. “Name” counts are businesses matched
            by name keyword only — they appear badged “Matched by name” in search results.
          </p>
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            {status === "running" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  cancelRef.current = true;
                  abortRef.current?.abort();
                }}
                className="h-8 text-xs gap-1.5"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runAudit}
                className="h-8 text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Run again
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCsv}
              disabled={rows.length === 0}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </Button>
          </div>
          <Button type="button" size="sm" onClick={onClose} className="h-8 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
