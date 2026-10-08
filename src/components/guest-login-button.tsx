"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GuestLoginButton() {
  const router = useRouter();

  const handleGuestEnter = () => {
    // Set guest cookie for 24h
    document.cookie = "leadgen_guest=true; path=/; max-age=86400; SameSite=Lax";
    router.push("/");
    router.refresh();
  };

  return (
    <div className="w-full pt-3 text-center border-t border-slate-200 mt-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleGuestEnter}
        className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl transition-all"
      >
        <Eye className="w-3.5 h-3.5 text-blue-600" />
        <span>Direct Directory Access (Guest Mode)</span>
        <ArrowRight className="w-3 h-3 text-slate-400" />
      </Button>
    </div>
  );
}
