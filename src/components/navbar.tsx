"use client";

import React, { useState } from "react";
import { useUser, useClerk, UserButton } from "@clerk/nextjs";
import { Zap, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountModal } from "@/components/account-modal";

export function Navbar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Sabbir Hossain";

  const handleSignOut = async () => {
    document.cookie = "leadgen_guest=; path=/; max-age=0";
    try {
      await signOut({ redirectUrl: "/sign-in" });
    } catch {
      window.location.href = "/sign-in";
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                LeadGen
              </span>
              <span className="text-xl font-bold tracking-tight text-blue-600">
                Pro
              </span>
            </div>
          </div>

          {/* User profile & Sign Out controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* User chip / quick profile trigger */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setIsAccountOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all text-sm group"
              title="Click to view Account Info"
            >
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={displayName}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-blue-500/40"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
              )}
              <span
                suppressHydrationWarning
                className="font-medium text-slate-800 group-hover:text-slate-900 max-w-[120px] sm:max-w-[180px] truncate"
              >
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700 transition-transform group-hover:translate-y-0.5" />
            </button>

            {/* Direct Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="hidden sm:inline-flex items-center gap-1.5 border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Button>

            {/* Clerk UserButton */}
            <div className="flex items-center pl-1 border-l border-slate-200">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-full ring-2 ring-blue-500/20 hover:ring-blue-500 transition-all",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Account Info Modal */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />
    </>
  );
}
