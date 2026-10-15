"use client";

import React from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  User,
  Mail,
  Shield,
  Calendar,
  LogOut,
  X,
  Sparkles,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!isOpen) return null;

  const fullName = user?.fullName || user?.firstName || "LeadGen Pro User";
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress || "Not provided";
  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Active Member";

  const lastSignIn = user?.lastSignInAt
    ? new Date(user.lastSignInAt).toLocaleString()
    : "Current Session";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-6 shadow-2xl text-slate-900 dark:text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={fullName}
              className="w-14 h-14 rounded-full border-2 border-blue-500 shadow-xs object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-xs">
              {fullName.charAt(0)}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{fullName}</h2>
              <Badge variant="default" className="text-[10px] tracking-wide bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60">
                PRO PLAN
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {primaryEmail}
            </p>
          </div>
        </div>

        {/* User Info Details Grid */}
        <div className="space-y-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Account Security & Session Info
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block">User ID</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate block">
                  {user?.id || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block">Member Since</span>
                <span className="text-slate-700 dark:text-slate-300 block">{createdAt}</span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block">Last Active</span>
                <span className="text-slate-700 dark:text-slate-300 block">{lastSignIn}</span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block">Auth Provider</span>
                <span className="text-emerald-700 dark:text-emerald-400 block font-medium">
                  Clerk Secure Auth
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              document.cookie = "leadgen_guest=; path=/; max-age=0";
              try {
                await signOut({ redirectUrl: "/sign-in" });
              } catch {
                window.location.href = "/sign-in";
              }
            }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Now
          </Button>
        </div>
      </div>
    </div>
  );
}
