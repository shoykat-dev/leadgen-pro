"use client";

import React, { useState } from "react";
import { useUser, useClerk, UserButton } from "@clerk/nextjs";
import { Zap, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountModal } from "@/components/account-modal";
import { ThemeToggle } from "@/components/theme-toggle";

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
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/90 backdrop-blur-md shadow-xs transition-colors duration-200">
        <div className="max-w-[1560px] w-full mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shrink-0">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                LeadGen
              </span>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                Pro
              </span>
            </div>
          </div>

          {/* User profile & controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Theme / Night Mode Toggle */}
            <ThemeToggle />

            {/* User chip / quick profile trigger */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setIsAccountOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all text-xs sm:text-sm group"
              title="Click to view Account Info"
            >
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={displayName}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover ring-1 ring-blue-500/40 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                  <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              )}
              <span
                suppressHydrationWarning
                className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white max-w-[65px] xs:max-w-[90px] sm:max-w-[180px] truncate"
              >
                {displayName}
              </span>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-y-0.5 shrink-0 hidden xs:block" />
            </button>

            {/* Direct Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 text-slate-700 dark:text-slate-300 transition-colors shadow-xs px-2 sm:px-3 h-8 sm:h-9"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>

            {/* Clerk UserButton */}
            <div className="flex items-center pl-1 sm:pl-1.5 border-l border-slate-200 dark:border-slate-800">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-blue-500/20 hover:ring-blue-500 transition-all",
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
