"use client";

import React from "react";
import { ErrorState } from "@/components/error-state";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 p-4 transition-colors">
      <ErrorState
        code="403"
        icon={<ShieldX className="w-8 h-8 text-rose-500" />}
        title="Access Restricted"
        message="You do not have permission to view this page. If you believe this is an error, please contact administrator support."
        primaryAction={{
          label: "Go to Home",
          href: "/",
          icon: <Home className="w-4 h-4" />,
        }}
        secondaryAction={{
          label: "Go back",
          onClick: () => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          },
          icon: <ArrowLeft className="w-4 h-4" />,
        }}
      />
    </div>
  );
}
