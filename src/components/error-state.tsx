"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, ChevronDown, ChevronUp, ArrowLeft, Home, RefreshCw } from "lucide-react";

export interface ErrorAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export interface ErrorStateProps {
  code?: string | number;
  title: string;
  message: string;
  icon?: React.ReactNode;
  primaryAction?: ErrorAction;
  secondaryAction?: ErrorAction;
  technicalDetails?: string | null;
  className?: string;
}

export function ErrorState({
  code,
  title,
  message,
  icon,
  primaryAction,
  secondaryAction,
  technicalDetails,
  className = "",
}: ErrorStateProps) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const isDev = process.env.NODE_ENV === "development";

  // Default primary action: Go to Home
  const defaultPrimary: ErrorAction = {
    label: "Go to Home",
    href: "/",
    icon: <Home className="w-4 h-4" />,
  };

  // Default secondary action: Go back
  const defaultSecondary: ErrorAction = {
    label: "Go back",
    onClick: () => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/");
      }
    },
    icon: <ArrowLeft className="w-4 h-4" />,
  };

  const primary = primaryAction || defaultPrimary;
  const secondary = secondaryAction || defaultSecondary;

  return (
    <div
      className={`min-h-[70vh] w-full flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none ${className}`}
    >
      <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80" />

        {/* Brand Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
            LeadGen <span className="text-blue-600 dark:text-blue-400">Pro</span>
          </span>
        </div>

        {/* Big Code (e.g. 404, 500) or Custom Icon */}
        {code ? (
          <div className="relative mb-4">
            <span className="text-7xl sm:text-8xl font-black tracking-tighter text-slate-200 dark:text-slate-800 select-none">
              {code}
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-400 drop-shadow-sm">
                {code}
              </span>
            </div>
          </div>
        ) : icon ? (
          <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-5 shadow-xs">
            {icon}
          </div>
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5 shadow-xs">
            <RefreshCw className="h-7 w-7" />
          </div>
        )}

        {/* Title & Message */}
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-snug">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-sm">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {primary.href ? (
            <Link
              href={primary.href}
              className="w-full sm:w-auto min-w-[130px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
            >
              {primary.icon}
              <span>{primary.label}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={primary.onClick}
              className="w-full sm:w-auto min-w-[130px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              {primary.icon}
              <span>{primary.label}</span>
            </button>
          )}

          {secondary && (
            secondary.href ? (
              <Link
                href={secondary.href}
                className="w-full sm:w-auto min-w-[110px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-xs transition-all"
              >
                {secondary.icon}
                <span>{secondary.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondary.onClick}
                className="w-full sm:w-auto min-w-[110px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-xs transition-all cursor-pointer"
              >
                {secondary.icon}
                <span>{secondary.label}</span>
              </button>
            )
          )}
        </div>

        {/* Collapsible Technical Details for Development Only */}
        {isDev && technicalDetails && (
          <div className="w-full mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-left">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-mono transition-colors"
            >
              <span>Development Technical Details</span>
              {showDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showDetails && (
              <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-300 text-[10px] font-mono overflow-x-auto max-h-40 border border-slate-800 leading-normal">
                {technicalDetails}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
