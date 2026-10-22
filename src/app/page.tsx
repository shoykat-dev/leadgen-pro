"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SearchPanel } from "@/components/search-panel";
import { DataTableView } from "@/components/data-table-view";
import { MyLeadsView } from "@/components/my-leads-view";
import { AreaScanModal } from "@/components/area-scan-modal";
import { CsvImportModal } from "@/components/csv-import-modal";
import { AddLeadModal } from "@/components/add-lead-modal";
import { SettingsModal } from "@/components/settings-modal";
import { OutreachModal } from "@/components/outreach-modal";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { BusinessLead } from "@/lib/data-integrity";
import {
  Users,
  Globe2,
  GlobeX,
  PhoneCall,
  Radar,
  FileSpreadsheet,
  PlusCircle,
  Settings,
  Layers,
  BookmarkCheck,
  ShieldAlert,
  Info,
  CheckCircle2,
  MapPin,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"search" | "crm">("search");
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Budget status from /api/search
  const [budget, setBudget] = useState<{
    dailyUsed: number;
    dailyLimit: number;
    monthlyUsed: number;
    monthlyLimit: number;
    canCallGoogle: boolean;
  }>({
    dailyUsed: 0,
    dailyLimit: 30,
    monthlyUsed: 0,
    monthlyLimit: 900,
    canCallGoogle: true,
  });
  const [hasApiKey, setHasApiKey] = useState(false);

  // Active search location info
  const [searchLocation, setSearchLocation] = useState({
    country: "Bangladesh",
    countryCode: "BD",
    state: "Dhaka",
    city: "Dhaka",
    area: "Banani",
  });
  const [radiusMeters, setRadiusMeters] = useState<number>(2000);
  const [categoryLabel, setCategoryLabel] = useState<string>("Restaurant & Fine Dining");
  const [searchMeta, setSearchMeta] = useState<{
    cached?: boolean;
    lastUpdated?: string;
    resultHeaderNote?: string;
  }>({});

  // Modal open states
  const [isAreaScanOpen, setIsAreaScanOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeOutreachLead, setActiveOutreachLead] = useState<BusinessLead | null>(null);

  const refreshBudget = () => {
    fetch("/api/search")
      .then((r) => r.json())
      .then((d) => {
        if (d?.budget) setBudget(d.budget);
        if (d?.hasApiKey !== undefined) setHasApiKey(Boolean(d.hasApiKey));
      })
      .catch(() => {});
  };

  useEffect(() => {
    setMounted(true);
    refreshBudget();
  }, []);

  // When dropdown changes (e.g. Country/State/City/Area), reset previous leads and update results heading immediately
  const handleLocationChange = (loc: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
    area: string;
  }) => {
    setSearchLocation({
      country: loc.country,
      countryCode: loc.countryCode,
      state: loc.state,
      city: loc.city,
      area: loc.area,
    });
    setLeads([]);
    setSearchMeta({});
  };

  const handleSearchResults = (params: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
    area: string;
    radiusMeters?: number;
    category: string;
    categoryLabel: string;
    leads: BusinessLead[];
    cached?: boolean;
    lastUpdated?: string;
    resultHeaderNote?: string;
  }) => {
    setSearchLocation({
      country: params.country,
      countryCode: params.countryCode,
      state: params.state,
      city: params.city,
      area: params.area,
    });
    if (params.radiusMeters) {
      setRadiusMeters(params.radiusMeters);
    }
    setCategoryLabel(params.categoryLabel);
    setLeads(params.leads);
    setSearchMeta({
      cached: params.cached,
      lastUpdated: params.lastUpdated,
      resultHeaderNote: params.resultHeaderNote,
    });
    refreshBudget();
  };

  // Metrics (Section 7)
  const totalLeads = leads.length;
  const noWebsiteLeads = leads.filter((l) => l.websiteStatus === "No Website").length;
  const socialOnlyLeads = leads.filter((l) => l.websiteStatus === "Social Only").length;
  const hasWebsiteLeads = leads.filter((l) => l.websiteStatus === "Has Website").length;

  const withPhoneLeads = leads.filter((l) => l.phone && l.phoneStatus !== "Missing").length;
  const withEmailLeads = leads.filter((l) => l.email && l.emailStatus !== "Missing").length;

  // FIX Contactable per Section 7: unique businesses with at least one contact method (never add together)
  const contactableLeads = leads.filter(
    (l) => (l.phone && l.phoneStatus !== "Missing") || (l.email && l.emailStatus !== "Missing")
  ).length;

  if (!mounted) {
    return (
      <div
        className="min-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200"
        suppressHydrationWarning
      >
        <Navbar />
        <main className="flex-1 max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center space-y-4">
          <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Initializing LeadGen Pro Workspace...
          </p>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200"
      suppressHydrationWarning
    >
      <Navbar />

      <main className="flex-1 max-w-[1560px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-3.5 sm:space-y-5">
        {/* Top Header Strip: Mode Switcher, Google Usage Meter & Settings Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Main Navigation Tabs */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "search"
                  ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Discovery Engine</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("crm")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "crm"
                  ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>My Leads (CRM)</span>
            </button>
          </div>

          {/* Right: Usage Meter & Settings */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Google Usage Meter or Free Search Badge */}
            {hasApiKey ? (
              <div
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-300 shadow-2xs"
                title="Official Google Places API (New) Free-Tier Safe Call Usage"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">
                  Google Calls:
                </span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-[11px] sm:text-xs">
                  {budget.monthlyUsed} / {budget.monthlyLimit}
                </span>
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  (Today: {budget.dailyUsed} / {budget.dailyLimit})
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 shadow-2xs"
                title="100% Free Live Discovery Engine (No Credit Card or Google Billing Required)"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-[11px] sm:text-xs">Live Free Search</span>
                <span className="text-[10px] sm:text-[11px] opacity-80 hidden xs:inline font-medium">
                  (No Card Needed)
                </span>
              </div>
            )}

            {/* Outreach Settings Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 text-xs gap-1.5 border-slate-200 dark:border-slate-800 shrink-0 px-2.5 sm:px-3"
              title="Configure freelance outreach settings & scripts"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>

        {/* TAB 1: DISCOVERY ENGINE */}
        {activeTab === "search" && (
          <AppErrorBoundary
            fallbackTitle="Directory view encountered an issue"
            fallbackMessage="An unexpected error occurred while displaying directory data."
          >
            {/* 5 Cascading Search Engine with Area Scan & Import buttons */}
            <SearchPanel
              onSearch={handleSearchResults}
              onLocationChange={handleLocationChange}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              onOpenAreaScan={(loc) => {
                setSearchLocation((prev) => ({
                  ...prev,
                  area: loc.area,
                  city: loc.city,
                  countryCode: loc.countryCode,
                }));
                setIsAreaScanOpen(true);
              }}
              onOpenCsvImport={() => setIsCsvImportOpen(true)}
              onOpenAddLead={() => setIsAddLeadOpen(true)}
            />

            {/* Quick Analytics Metrics Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              {/* Card 1: Total Leads */}
              <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs space-y-0.5 sm:space-y-1 transition-colors duration-200">
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Total Leads</span>
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {totalLeads}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {searchLocation.area}, {searchLocation.city}
                </div>
              </div>

              {/* Card 2: Without Website (High Priority Cold Outreach) */}
              <div className="p-3 sm:p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 shadow-xs space-y-0.5 sm:space-y-1 transition-colors duration-200">
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-red-700 dark:text-red-300 font-semibold">
                  <span className="truncate">No Website</span>
                  <GlobeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400 tracking-tight">
                  {noWebsiteLeads}
                </div>
                <div className="text-[10px] sm:text-[11px] text-red-600/80 dark:text-red-300/80 font-medium truncate">
                  {socialOnlyLeads > 0 ? `+${socialOnlyLeads} social only` : "Prime prospects"}
                </div>
              </div>

              {/* Card 3: Has Website */}
              <div className="p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-xs space-y-0.5 sm:space-y-1 transition-colors duration-200">
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                  <span className="truncate">Has Website</span>
                  <Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-300 tracking-tight">
                  {hasWebsiteLeads}
                </div>
                <div className="text-[10px] sm:text-[11px] text-emerald-700/80 dark:text-emerald-400/80 truncate">
                  Redesign & SEO audit
                </div>
              </div>

              {/* Card 4: Contactable Leads (Unique Count - Section 7) */}
              <div className="p-3 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 shadow-xs space-y-0.5 sm:space-y-1 transition-colors duration-200">
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-blue-700 dark:text-blue-300 font-semibold">
                  <span className="truncate">Contactable</span>
                  <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-300 tracking-tight">
                  {contactableLeads}
                </div>
                <div className="text-[10px] sm:text-[11px] text-blue-700/80 dark:text-blue-400/80 truncate">
                  {withPhoneLeads} phone, {withEmailLeads} email
                </div>
              </div>
            </div>

            {/* Honest Empty State vs Results Header & Data Table */}
            {leads.length === 0 ? (
              <div className="p-6 sm:p-14 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-center space-y-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
                  <Radar className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white px-2">
                    {searchLocation.area
                      ? `Ready to discover local businesses in ${searchLocation.area}, ${searchLocation.city}`
                      : searchLocation.city
                      ? `Select an area to discover local businesses in ${searchLocation.city}`
                      : "Select a location to discover local businesses"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto px-2">
                    Choose an action below to start building your outreach pipeline. Pure genuine source data with zero mock records.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2 sm:gap-2.5 pt-2 max-w-lg mx-auto">
                  <Button
                    type="button"
                    onClick={() => setIsAreaScanOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-semibold h-10 sm:h-9 rounded-xl shadow-xs justify-center"
                  >
                    <Radar className="w-3.5 h-3.5 animate-pulse" />
                    <span>Launch Area Coverage Scan</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCsvImportOpen(true)}
                    className="text-xs gap-1.5 font-semibold h-10 sm:h-9 rounded-xl border-slate-200 dark:border-slate-700 justify-center"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Import from CSV</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddLeadOpen(true)}
                    className="text-xs gap-1.5 font-semibold h-10 sm:h-9 rounded-xl border-slate-200 dark:border-slate-700 justify-center"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Add Lead Manually</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Results Header: "X businesses found within {radius} of {Area}" */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        {searchMeta.resultHeaderNote
                          ? `${searchMeta.resultHeaderNote} within ${
                              radiusMeters >= 1000 && radiusMeters % 1000 === 0
                                ? `${radiusMeters / 1000}km`
                                : `${radiusMeters}m`
                            } of ${
                              searchLocation.area.toLowerCase().includes("city centre") ||
                              searchLocation.area.toLowerCase() === "city centre"
                                ? `${searchLocation.city} centre`
                                : searchLocation.area
                            }`
                          : `${leads.length} businesses found within ${
                              radiusMeters >= 1000 && radiusMeters % 1000 === 0
                                ? `${radiusMeters / 1000}km`
                                : `${radiusMeters}m`
                            } of ${
                              searchLocation.area.toLowerCase().includes("city centre") ||
                              searchLocation.area.toLowerCase() === "city centre"
                                ? `${searchLocation.city} centre`
                                : searchLocation.area
                            }`}
                      </h2>
                      <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold">
                        {categoryLabel}
                      </Badge>
                      {searchMeta.lastUpdated && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Last updated: {searchMeta.lastUpdated}</span>
                          {searchMeta.cached && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 ml-0.5">
                              Cached
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      OpenStreetMap Overpass radius search with strict Haversine distance post-filtering ({radiusMeters}m limit)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>Target Radius: <strong>{radiusMeters}m</strong></span>
                    </div>
                  </div>
                </div>

                <DataTableView
                  leads={leads}
                  searchLocation={searchLocation}
                  categoryLabel={categoryLabel}
                  radiusMeters={radiusMeters}
                  onLeadStatusChanged={(leadId, status) => {
                    setLeads((prev) =>
                      prev.map((l) => (l.id === leadId ? { ...l, crmStatus: status as any } : l))
                    );
                  }}
                />
              </div>
            )}
          </AppErrorBoundary>
        )}

        {/* TAB 2: MY LEADS (CRM) */}
        {activeTab === "crm" && (
          <MyLeadsView
            onOpenOutreachModal={(lead) => setActiveOutreachLead(lead)}
          />
        )}
      </main>

      {/* Area Scan Modal */}
      <AreaScanModal
        isOpen={isAreaScanOpen}
        onClose={() => setIsAreaScanOpen(false)}
        areaName={searchLocation.area}
        cityName={searchLocation.city}
        countryCode={searchLocation.countryCode}
        onLeadsDiscovered={(discovered) => {
          setLeads(discovered);
          refreshBudget();
        }}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        existingLeads={leads}
        onImportComplete={(imported) => {
          setLeads((prev) => [...imported, ...prev]);
        }}
      />

      {/* Manual Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        defaultLocation={searchLocation}
        onLeadAdded={(newLead) => {
          setLeads((prev) => [newLead, ...prev]);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Outreach Pitch Modal */}
      {activeOutreachLead && (
        <OutreachModal
          lead={activeOutreachLead}
          isOpen={Boolean(activeOutreachLead)}
          onClose={() => setActiveOutreachLead(null)}
          searchLocation={searchLocation}
        />
      )}

      {/* Clean Footer with Google Attribution & Legal Links (Section 5 & 13) */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] py-6 text-xs text-slate-500 dark:text-slate-400 mt-12 transition-colors duration-200">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 text-center sm:text-left">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              © 2026 LeadGen Pro. B2B Lead Generation & Outreach Engine.
            </p>
            <p className="text-[11px] text-slate-500">
              Complies with GDPR, CAN-SPAM Act, and local regulations. Places data attribution: Google Maps Platform.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
