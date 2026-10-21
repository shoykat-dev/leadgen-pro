"use client";

import React, { useState } from "react";
import { PlusCircle, X, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BusinessLead,
  validatePhone,
  validateEmail,
  classifyWebsite,
  calculateLeadScore,
  assessDataQuality,
} from "@/lib/data-integrity";
import { ALL_BUSINESS_SERVICES } from "@/lib/directory-data";

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: (lead: BusinessLead) => void;
  defaultLocation?: { city?: string; area?: string; country?: string };
}

export function AddLeadModal({
  isOpen,
  onClose,
  onLeadAdded,
  defaultLocation,
}: AddLeadModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Restaurant & Fine Dining");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState(
    defaultLocation?.area
      ? `${defaultLocation.area}, ${defaultLocation.city || "Dhaka"}, Bangladesh`
      : ""
  );
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  // Real-time validation checks
  const phoneVal = validatePhone(phone, "BD");
  const webVal = classifyWebsite(website);
  const emailVal = validateEmail(email, webVal.website);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const leadPartial: Partial<BusinessLead> = {
      name: name.trim(),
      category,
      address: address.trim(),
      phoneStatus: phoneVal.phoneStatus,
      websiteStatus: webVal.websiteStatus,
      email: emailVal.email,
      emailStatus: emailVal.emailStatus,
    };

    const scoreRes = calculateLeadScore(leadPartial);
    const quality = assessDataQuality(leadPartial);

    const newLead: BusinessLead = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source: "manual",
      name: name.trim(),
      category,
      address: address.trim(),
      phone: phoneVal.phone,
      phoneE164: phoneVal.phoneE164,
      phoneStatus: phoneVal.phoneStatus,
      canWhatsApp: phoneVal.canWhatsApp,
      email: emailVal.email,
      emailStatus: emailVal.emailStatus,
      emailProvenance: emailVal.email ? "manual" : undefined,
      website: webVal.website,
      websiteStatus: webVal.websiteStatus,
      hasWebsite: webVal.websiteStatus === "Has Website",
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${name.trim()}, ${address.trim()}`
      )}`,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${name.trim()}, ${address.trim()}`
      )}`,
      dataQuality: quality,
      leadScore: scoreRes.score,
      leadScoreTier: scoreRes.tier,
      fetchedAt: new Date().toISOString(),
      crmStatus: "New",
      notes: notes.trim() || undefined,
    };

    onLeadAdded(newLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Add Business Lead Manually
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Validated in real time with honest data provenance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Business Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Business Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dhaka Artisan Cafe & Lounge"
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category / Industry
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {ALL_BUSINESS_SERVICES.map((s) => (
                <option key={s.id} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phone Number
              </label>
              {phone && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    phoneVal.phoneStatus === "Valid"
                      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950"
                      : "text-amber-700 bg-amber-50 dark:bg-amber-950"
                  }`}
                >
                  {phoneVal.phoneStatus === "Valid" ? `E.164: ${phoneVal.phoneE164}` : "Format unverified"}
                </span>
              )}
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01700112233 or +88017..."
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              {email && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    emailVal.emailStatus === "Invalid format"
                      ? "text-red-700 bg-red-50 dark:bg-red-950"
                      : "text-blue-700 bg-blue-50 dark:bg-blue-950"
                  }`}
                >
                  {emailVal.emailStatus}
                </span>
              )}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. contact@business.com"
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Website */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Website / Social Link
              </label>
              {website && (
                <span className="text-[10px] font-semibold text-slate-500">
                  Status: {webVal.websiteStatus}
                </span>
              )}
            </div>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g. https://business.com or facebook.com/page"
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House, Road, Block, Area, City"
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Initial Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes / Context
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Visited in person; owner wants an online ordering system"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-semibold shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Lead</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
