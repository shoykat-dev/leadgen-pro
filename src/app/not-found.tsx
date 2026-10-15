"use client";

import React from "react";
import { useAuth } from "@clerk/nextjs";
import { ErrorState } from "@/components/error-state";
import { Compass, Home, LogIn } from "lucide-react";

export default function NotFound() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 p-4 transition-colors">
      <ErrorState
        code={404}
        title="Page Not Found"
        message="The page you are looking for does not exist, has been moved, or is temporarily unavailable."
        primaryAction={{
          label: "Go to Home",
          href: "/",
          icon: <Home className="w-4 h-4" />,
        }}
        secondaryAction={
          isSignedIn
            ? {
                label: "Go to Directory",
                href: "/",
                icon: <Compass className="w-4 h-4" />,
              }
            : {
                label: "Go to Sign In",
                href: "/sign-in",
                icon: <LogIn className="w-4 h-4" />,
              }
        }
      />
    </div>
  );
}
