"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Smartphone,
  Shield,
  FileText,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BusinessLead } from "@/lib/data-integrity";
import { WebsiteAuditResult } from "@/app/api/audit/route";

interface WebsiteAuditModalProps {
  lead: BusinessLead | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOutreach?: () => void;
}

export function WebsiteAuditModal({
  lead,
  isOpen,
  onClose,
  onOpenOutreach,
}: WebsiteAuditModalProps) {
  const [audit, setAudit] = useState<WebsiteAuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !lead || !lead.website) {
      setAudit(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: lead.website }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.audit) {
          setAudit(data.audit);
        } else {
          setError(data?.error?.message || "Failed to audit website.");
        }
      })
      .catch((err) => {
        setError(err.message || "Network error auditing website.");
      })
      .finally(() => setLoading(false));
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Website Audit: {lead.name}</span>
              </h3>
              <a
                href={lead.website || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono max-w-[280px] truncate"
              >
                <span>{lead.website}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Running server-side website health audit...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {audit && (
            <div className="space-y-4">
              {/* Overall Score Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  audit.hasOutdatedSigns
                    ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                    : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {audit.hasOutdatedSigns ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>High-Priority Redesign Prospect</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Modern Baseline Passed</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {audit.notes}
                  </p>
                </div>

                <Badge
                  variant={audit.hasOutdatedSigns ? "warning" : "success"}
                  className="text-xs font-mono font-bold"
                >
                  {audit.responseTimeMs}ms
                </Badge>
              </div>

              {/* 4 Health Diagnostics */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* 1. HTTPS */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      HTTPS SSL
                    </span>
                    {audit.isHttps ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {audit.isHttps ? "Secure (HTTPS)" : "Insecure (HTTP)"}
                  </div>
                </div>

                {/* 2. Response Time */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Server Speed
                    </span>
                    {audit.responseTimeMs < 2000 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white font-mono">
                    {audit.responseTimeMs} ms
                  </div>
                </div>

                {/* 3. Mobile Viewport */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      Mobile Viewport
                    </span>
                    {audit.hasViewportMeta ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {audit.hasViewportMeta ? "Mobile Ready" : "Not Responsive"}
                  </div>
                </div>

                {/* 4. SEO Meta */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      SEO Meta Tags
                    </span>
                    {audit.metaDescription ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white truncate">
                    {audit.metaDescription ? "Configured" : "Missing Meta Desc"}
                  </div>
                </div>
              </div>

              {/* Identified Issues / Pitch Angles */}
              {audit.outdatedReasons.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Pitch Angles for Web Proposal
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {audit.outdatedReasons.map((r, i) => (
                      <li key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>

          {audit && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onClose();
                onOpenOutreach?.();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-semibold shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pitch Redesign via WhatsApp / Email</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
