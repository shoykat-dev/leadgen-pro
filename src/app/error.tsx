"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/error-state";
import { RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the full error strictly in console for developers/server logs
    console.error("[Runtime Application Error]:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 p-4 transition-colors">
      <ErrorState
        code="500"
        title="Something went wrong"
        message="Something went wrong while processing your request. Please try again or return to the directory."
        primaryAction={{
          label: "Try again",
          onClick: () => reset(),
          icon: <RefreshCw className="w-4 h-4" />,
        }}
        secondaryAction={{
          label: "Go to Home",
          href: "/",
          icon: <Home className="w-4 h-4" />,
        }}
        technicalDetails={
          process.env.NODE_ENV === "development"
            ? `${error.name}: ${error.message}${error.digest ? `\nDigest: ${error.digest}` : ""}${error.stack ? `\n\n${error.stack}` : ""}`
            : null
        }
      />
    </div>
  );
}
