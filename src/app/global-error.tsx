"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/error-state";
import { RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Root Layout Error]:", error);
  }, [error]);

  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-[#090d16] text-slate-100 flex items-center justify-center p-4">
        <ErrorState
          code="500"
          title="Application Encountered an Error"
          message="A critical layout error occurred. Please try reloading the application or return to home."
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
      </body>
    </html>
  );
}
