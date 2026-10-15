"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, RefreshCw, X } from "lucide-react";
import { AuthErrorInfo } from "@/lib/auth-errors";

interface AuthErrorAlertProps {
  error: AuthErrorInfo | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function AuthErrorAlert({
  error,
  onDismiss,
  onRetry,
  className = "",
}: AuthErrorAlertProps) {
  if (!error) return null;

  return (
    <div
      role="alert"
      className={`w-full rounded-xl border border-rose-500/30 dark:border-rose-500/40 bg-rose-50/90 dark:bg-rose-950/40 p-4 text-slate-900 dark:text-slate-100 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <div className="h-8 w-8 rounded-lg bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-300 leading-tight">
            {error.title}
          </h4>
          <p className="text-xs text-rose-700 dark:text-rose-200/90 mt-1 leading-relaxed">
            {error.message}
          </p>

          {/* Action Buttons */}
          {(error.action || error.secondaryAction) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {error.action && error.action.href ? (
                <Link
                  href={error.action.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                >
                  <span>{error.action.label}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              ) : error.action && error.action.onClick ? (
                <button
                  type="button"
                  onClick={error.action.onClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                >
                  <span>{error.action.label}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : null}

              {error.secondaryAction && (
                <button
                  type="button"
                  onClick={() => {
                    if (error.secondaryAction?.onClick) {
                      error.secondaryAction.onClick();
                    } else if (onRetry) {
                      onRetry();
                    } else if (onDismiss) {
                      onDismiss();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-300 dark:border-rose-800 bg-white/80 dark:bg-slate-900/80 hover:bg-rose-100/50 dark:hover:bg-slate-800 text-rose-800 dark:text-rose-300 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{error.secondaryAction.label}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 p-1 rounded-md transition-colors shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
