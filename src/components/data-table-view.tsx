"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Download,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  Search,
  AlertCircle,
  Copy,
  Check,
  Globe,
  Star,
  Activity,
  BookmarkPlus,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Info,
  CheckSquare,
  Square,
  MessageSquare,
  SearchCode,
  CheckCircle2,
  LayoutGrid,
  List,
  SlidersHorizontal,
  PhoneCall,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { BusinessLead } from "@/lib/data-integrity";
import { OutreachModal } from "@/components/outreach-modal";
import { WebsiteAuditModal } from "@/components/website-audit-modal";
import { GoogleMapModal } from "@/components/google-map-modal";

interface DataTableViewProps {
  leads: BusinessLead[];
  searchLocation: {
    city: string;
    state: string;
    country: string;
    area?: string;
  };
  categoryLabel: string;
  radiusMeters?: number;
  onLeadStatusChanged?: (leadId: string, status: string) => void;
  onRefreshLeads?: () => void;
}

type WebsiteFilterType = "all" | "no_website" | "social_only" | "has_website";

export function DataTableView({
  leads,
  searchLocation,
  categoryLabel,
  radiusMeters = 2000,
  onLeadStatusChanged,
  onRefreshLeads,
}: DataTableViewProps) {
  // Mobile / Desktop View Mode (Cards vs Table)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setViewMode("table");
    }
  }, []);

  // Filters state
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilterType>("all");
  const [phoneFilter, setPhoneFilter] = useState<boolean>(false);
  const [emailFilter, setEmailFilter] = useState<boolean>(false);
  const [scoreTierFilter, setScoreTierFilter] = useState<string>("all");
  const [hideContacted, setHideContacted] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"score" | "name">("score");

  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // BUG 3 FIX: Reset all quick filters to default on every new search / parameter change
  useEffect(() => {
    setWebsiteFilter("all");
    setPhoneFilter(false);
    setEmailFilter(false);
    setScoreTierFilter("all");
    setHideContacted(false);
    setTableSearch("");
    setSelectedLeadIds(new Set());
  }, [leads, categoryLabel, searchLocation.area, searchLocation.city]);

  // Modal states
  const [outreachLead, setOutreachLead] = useState<BusinessLead | null>(null);
  const [auditLead, setAuditLead] = useState<BusinessLead | null>(null);
  const [mapLead, setMapLead] = useState<BusinessLead | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Email finder on-demand state per row
  const [findingEmailId, setFindingEmailId] = useState<string | null>(null);
  const [isFindingAllEmails, setIsFindingAllEmails] = useState<boolean>(false);
  const [localEmails, setLocalEmails] = useState<
    Record<string, { email: string | null; status: string; sourceUrl?: string | null }>
  >({});

  // Filtered and Sorted Leads
  const processedLeads = useMemo(() => {
    let list = leads.filter((lead) => {
      // 1. Website Status filter
      if (websiteFilter === "no_website" && lead.websiteStatus !== "No Website") return false;
      if (websiteFilter === "social_only" && lead.websiteStatus !== "Social Only") return false;
      if (websiteFilter === "has_website" && lead.websiteStatus !== "Has Website") return false;

      // 2. Phone Filter
      if (phoneFilter && (!lead.phone || lead.phoneStatus === "Missing")) return false;

      // 3. Email Filter
      const activeEmail = localEmails[lead.id]?.email || lead.email;
      if (emailFilter && (!activeEmail || lead.emailStatus === "Missing")) return false;

      // 4. Score Tier
      if (scoreTierFilter !== "all" && lead.leadScoreTier !== scoreTierFilter) return false;

      // 5. Hide Contacted
      if (hideContacted && lead.crmStatus === "Contacted") return false;

      // 6. Search query
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesPhone = (lead.phone || "").toLowerCase().includes(q);
        const matchesEmail = (activeEmail || "").toLowerCase().includes(q);
        const matchesAddress = lead.address.toLowerCase().includes(q);
        const matchesCategory = lead.category.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesEmail || matchesAddress || matchesCategory;
      }

      return true;
    });

    // Sort
    list.sort((a, b) => {
      if (sortBy === "score") return b.leadScore - a.leadScore;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [
    leads,
    websiteFilter,
    phoneFilter,
    emailFilter,
    scoreTierFilter,
    hideContacted,
    tableSearch,
    sortBy,
    localEmails,
  ]);

  // Derived counts for filter badges
  const totalCount = leads.length;
  const noWebsiteCount = useMemo(() => leads.filter((l) => l.websiteStatus === "No Website").length, [leads]);
  const socialOnlyCount = useMemo(() => leads.filter((l) => l.websiteStatus === "Social Only").length, [leads]);
  const hasWebsiteCount = useMemo(() => leads.filter((l) => l.websiteStatus === "Has Website").length, [leads]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.size === processedLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(processedLeads.map((l) => l.id)));
    }
  };

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Save to My Leads
  const handleBulkSave = async () => {
    const leadsToSave = leads.filter((l) =>
      selectedLeadIds.size > 0 ? selectedLeadIds.has(l.id) : true
    );
    if (leadsToSave.length === 0) return;

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: leadsToSave }),
      });
      setSavedSuccessMsg(`Saved ${leadsToSave.length} leads to My Leads!`);
      setTimeout(() => setSavedSuccessMsg(null), 3000);
    } catch (err) {
      console.warn("Failed to bulk save", err);
    }
  };

  // Save single lead
  const handleSaveSingleLead = async (lead: BusinessLead) => {
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead }),
      });
      setSavedSuccessMsg(`Saved ${lead.name} to My Leads!`);
      setTimeout(() => setSavedSuccessMsg(null), 2500);
    } catch (err) {
      console.warn("Failed to save lead", err);
    }
  };

  // On-demand Email Finder
  const handleFindEmail = async (lead: BusinessLead) => {
    if (!lead.website) return;
    setFindingEmailId(lead.id);

    try {
      const res = await fetch("/api/find-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: lead.website }),
      });
      const data = await res.json();
      if (data?.success) {
        setLocalEmails((prev) => ({
          ...prev,
          [lead.id]: {
            email: data.email,
            status: data.emailStatus || "Missing",
            sourceUrl: data.emailSourceUrl || null,
          },
        }));
      }
    } catch (e) {
      console.warn("Email find failed", e);
    } finally {
      setFindingEmailId(null);
    }
  };

  // Find all emails for leads with websites in parallel batches
  const handleFindAllEmails = async () => {
    const targets = processedLeads.filter(
      (l) => l.website && !localEmails[l.id]?.email && l.websiteStatus === "Has Website"
    );
    if (targets.length === 0 || isFindingAllEmails) return;

    setIsFindingAllEmails(true);
    const batchSize = 3;

    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (lead) => {
          setFindingEmailId(lead.id);
          try {
            const res = await fetch("/api/find-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ website: lead.website }),
            });
            const data = await res.json();
            if (data?.success) {
              setLocalEmails((prev) => ({
                ...prev,
                [lead.id]: {
                  email: data.email,
                  status: data.emailStatus || "Missing",
                  sourceUrl: data.emailSourceUrl || null,
                },
              }));
            }
          } catch (err) {
            console.warn("Batch email search failed for", lead.name, err);
          }
        })
      );
    }

    setFindingEmailId(null);
    setIsFindingAllEmails(false);
  };

  // Export CSV
  const handleExportCSV = (mode: "all" | "selected" = "all") => {
    const targetLeads =
      mode === "selected" && selectedLeadIds.size > 0
        ? processedLeads.filter((l) => selectedLeadIds.has(l.id))
        : processedLeads;

    if (targetLeads.length === 0) return;

    const headers = [
      "Company Name",
      "Industry",
      "Lead Sources",
      "Phone",
      "Phone E164",
      "Phone Status",
      "Phone Source",
      "Email",
      "Email Status",
      "Email Source",
      "Email Source URL",
      "Website",
      "Website Status",
      "Facebook / Social",
      "Address",
      "Lead Score",
      "Score Tier",
      "Score Reasons",
      "Google Maps URL",
      "Fetched Date",
    ];

    const rows = targetLeads.map((l) => {
      const activeEmail = localEmails[l.id]?.email || l.email;
      const activeEmailStatus = localEmails[l.id]?.status || l.emailStatus;
      const activeSourceUrl = localEmails[l.id]?.sourceUrl || l.emailSourceUrl;

      const leadSourceStr =
        l.leadSources && l.leadSources.length > 0
          ? l.leadSources.join(" + ").toUpperCase()
          : (l.source || "OSM").toUpperCase();

      const phoneSource = l.fieldAttribution?.phone || (l.phone ? "OSM" : "None");
      const emailSource =
        activeEmailStatus === "Found on website"
          ? "Found on website"
          : l.fieldAttribution?.email === "overture"
          ? "Overture"
          : activeEmail
          ? "OpenStreetMap"
          : "None";

      const facebookOrSocial =
        l.facebookUrl ||
        (l.socials && l.socials.length > 0 ? l.socials.map((s) => s.url).join(" ; ") : "");

      const scoreReasonsStr =
        l.scoreReasons && l.scoreReasons.length > 0
          ? l.scoreReasons.map((r) => `${r.reason} (+${r.points})`).join(" | ")
          : "";

      const gMapsUrl =
        l.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${l.name}, ${l.address}`
        )}`;

      return [
        `"${l.name.replace(/"/g, '""')}"`,
        `"${l.category.replace(/"/g, '""')}"`,
        `"${leadSourceStr}"`,
        `"${(l.phone || "").replace(/"/g, '""')}"`,
        `"${(l.phoneE164 || "").replace(/"/g, '""')}"`,
        `"${l.phoneStatus}"`,
        `"${phoneSource}"`,
        `"${(activeEmail || "").replace(/"/g, '""')}"`,
        `"${activeEmailStatus}"`,
        `"${emailSource}"`,
        `"${(activeSourceUrl || "").replace(/"/g, '""')}"`,
        `"${(l.website || "").replace(/"/g, '""')}"`,
        `"${l.websiteStatus}"`,
        `"${facebookOrSocial.replace(/"/g, '""')}"`,
        `"${l.address.replace(/"/g, '""')}"`,
        l.leadScore,
        `"${l.leadScoreTier}"`,
        `"${scoreReasonsStr.replace(/"/g, '""')}"`,
        `"${gMapsUrl}"`,
        `"${l.fetchedAt || ""}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `LeadGenPro_Leads_${searchLocation.area || searchLocation.city || "Export"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show on-screen confirmation toast
    setSavedSuccessMsg(`CSV downloaded: ${targetLeads.length} leads`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    if (!text || text === "N/A") return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {savedSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Primary Filter Strip & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Left: Website Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 w-full lg:w-auto -mx-1 px-1">
          <button
            type="button"
            onClick={() => setWebsiteFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              websiteFilter === "all"
                ? "bg-slate-900 dark:bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            All Leads ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setWebsiteFilter("no_website")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              websiteFilter === "no_website"
                ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-red-700 hover:bg-red-50/50"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
            <span>No Website ({noWebsiteCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setWebsiteFilter("social_only")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              websiteFilter === "social_only"
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-amber-700 hover:bg-amber-50/50"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Social Only ({socialOnlyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setWebsiteFilter("has_website")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              websiteFilter === "has_website"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-50/50"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Has Website ({hasWebsiteCount})</span>
          </button>
        </div>

        {/* Right: Quick Search, View Mode Switcher & Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Card View (Perfect for mobile)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Table View (Full spreadsheet)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Table</span>
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search leads..."
                className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action buttons row */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2">
            {hasWebsiteCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFindAllEmails}
                disabled={isFindingAllEmails}
                className="h-8 text-[11px] sm:text-xs gap-1.5 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 justify-center"
                title="Automatically search emails on all websites in results"
              >
                {isFindingAllEmails ? (
                  <span className="animate-spin text-xs">⏳</span>
                ) : (
                  <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                )}
                <span className="truncate">{isFindingAllEmails ? "Crawling..." : "Find Emails"}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBulkSave}
              disabled={processedLeads.length === 0}
              className="h-8 text-[11px] sm:text-xs gap-1.5 border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 justify-center"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                Save {selectedLeadIds.size > 0 ? `(${selectedLeadIds.size})` : "All"} to CRM
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV("all")}
              disabled={processedLeads.length === 0}
              className="h-8 text-[11px] sm:text-xs gap-1.5 justify-center col-span-2 sm:col-span-1"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Filter Toggle Button */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setShowMobileFilters((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>Filters & Sort</span>
            {(phoneFilter || emailFilter || hideContacted || scoreTierFilter !== "all") && (
              <span className="h-2 w-2 rounded-full bg-blue-600" />
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showMobileFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Secondary Filter & Sort Bar (Always on desktop, Collapsible on mobile) */}
      <div className={`${showMobileFilters ? "flex" : "hidden sm:flex"} flex-wrap items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:px-3 sm:py-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 text-xs`}>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Has Valid Phone Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Valid Phone</span>
          </label>

          {/* Has Email Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={emailFilter}
              onChange={(e) => setEmailFilter(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Has Email</span>
          </label>

          {/* Hide Contacted Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={hideContacted}
              onChange={(e) => setHideContacted(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Hide Contacted</span>
          </label>

          {/* Score Tier Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Score:</span>
            <select
              value={scoreTierFilter}
              onChange={(e) => setScoreTierFilter(e.target.value)}
              className="h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Tiers</option>
              <option value="High">High Priority (60+)</option>
              <option value="Medium">Medium (35-59)</option>
              <option value="Low">Low (0-34)</option>
            </select>
          </div>

        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <span className="text-slate-500 text-[11px]">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="score">Lead Score (Highest)</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* CONTENT: CARDS VIEW vs TABLE VIEW */}
      {processedLeads.length === 0 ? (
        <div className="p-8 sm:p-14 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-center space-y-3">
          <AlertCircle className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No businesses found matching current filters
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting filters, searching a broader area, or running an Area Scan above.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setWebsiteFilter("all");
              setPhoneFilter(false);
              setEmailFilter(false);
              setScoreTierFilter("all");
              setTableSearch("");
            }}
            className="text-xs rounded-xl"
          >
            Reset Filters
          </Button>
        </div>
      ) : viewMode === "cards" ? (
        /* RESPONSIVE MOBILE & DESKTOP CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {processedLeads.map((lead) => {
            const isSelected = selectedLeadIds.has(lead.id);
            const activeEmail = localEmails[lead.id]?.email || lead.email;
            const activeEmailStatus = localEmails[lead.id]?.status || lead.emailStatus;
            const phoneHasVal = lead.phone && lead.phoneStatus !== "Missing";
            const cleanPhoneDigits = (lead.phoneE164 || lead.phone || "").replace(/[^0-9]/g, "");

            return (
              <div
                key={lead.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 relative ${
                  isSelected
                    ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-400 dark:border-blue-600 shadow-sm"
                    : "bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Top row: Checkbox, Name, Category & Score Badge */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectLead(lead.id)}
                        className="mt-0.5 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {lead.name}
                          </h4>
                          {/* Small Source Badge */}
                          {lead.leadSources && lead.leadSources.includes("osm") && lead.leadSources.includes("overture") ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                              title="Merged from OpenStreetMap and Overture Places"
                            >
                              OSM + Overture
                            </span>
                          ) : lead.leadSources?.includes("overture") ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                              title="Source: Overture Maps Foundation"
                            >
                              Overture
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              title="Source: OpenStreetMap"
                            >
                              OSM
                            </span>
                          )}
                          {lead.facebookUrl && (
                            <a
                              href={lead.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 inline-flex items-center gap-0.5"
                              title="Visit Facebook Page"
                            >
                              <span>FB</span>
                              <ExternalLink className="w-2 h-2" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                          <span>{lead.category}</span>
                          <span>•</span>
                          <span className="truncate">{lead.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Lead Score Badge with real signal reasons */}
                    <div
                      className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold shrink-0 text-center cursor-help ${
                        lead.leadScoreTier === "High"
                          ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                          : lead.leadScoreTier === "Medium"
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                      title={`Lead Score: ${lead.leadScore}/100\n${(lead.scoreReasons || []).map((r) => `• ${r.reason}: +${r.points}`).join("\n")}`}
                    >
                      Score: {lead.leadScore}
                    </div>
                  </div>

                  {/* Outbound Google Maps Link & Website Status Row */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-xs">
                    {lead.googleMapsUri && (
                      <a
                        href={lead.googleMapsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        title="Verify business on Google Maps"
                      >
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>Verify on Google Maps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    {/* Website Status Badge */}
                    {lead.websiteStatus === "No Website" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100/80 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        No Website
                      </span>
                    ) : lead.websiteStatus === "Social Only" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Social Only
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={lead.website!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline max-w-[120px] truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lead.website!.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setAuditLead(lead)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                          title="Audit website speed and mobile usability"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Direct Contacts Bar (Phone, WhatsApp, Email) */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  {/* Phone & WhatsApp Row */}
                  <div className="flex items-center gap-2">
                    {phoneHasVal ? (
                      <>
                        <a
                          href={`tel:${lead.phoneE164 || lead.phone}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-400 text-xs font-semibold shadow-2xs truncate"
                          title="Tap to call directly from phone"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{lead.phone}</span>
                        </a>

                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50">
                          Format valid {lead.fieldAttribution?.phone === "overture" ? "(Overture)" : "(OSM)"}
                        </span>

                        {lead.canWhatsApp && (
                          <a
                            href={`https://wa.me/${cleanPhoneDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-2xs shrink-0"
                            title="Open WhatsApp chat directly"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-[11px]">WhatsApp</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 py-0.5">
                        Phone: <span className="font-medium text-slate-400">Not available</span>
                      </div>
                    )}
                  </div>

                  {/* Email Row */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {activeEmail ? (
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <a
                          href={`mailto:${activeEmail}`}
                          className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-mono text-[11px] truncate flex-1"
                          title={activeEmail}
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{activeEmail}</span>
                        </a>
                        {(() => {
                          const isFoundOnWebsite =
                            activeEmailStatus === "Found on website" &&
                            lead.websiteStatus !== "No Website" &&
                            Boolean(lead.website);
                          return (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium ${
                                isFoundOnWebsite
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                  : lead.fieldAttribution?.email === "overture"
                                  ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              }`}
                              title={
                                isFoundOnWebsite
                                  ? `Found on website: ${localEmails[lead.id]?.sourceUrl || lead.emailSourceUrl || lead.website}`
                                  : lead.fieldAttribution?.email === "overture"
                                  ? "Source: Overture Places"
                                  : "Source: OpenStreetMap"
                              }
                            >
                              {isFoundOnWebsite
                                ? "Found on website"
                                : lead.fieldAttribution?.email === "overture"
                                ? "Overture"
                                : "OpenStreetMap"}
                            </span>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => handleCopy(activeEmail, lead.id + "-email")}
                          className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                          title="Copy Email"
                        >
                          {copiedId === lead.id + "-email" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : lead.website && lead.websiteStatus === "Has Website" ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] text-slate-400">Email: <span className="text-slate-400">Not available</span></span>
                        <button
                          type="button"
                          onClick={() => handleFindEmail(lead)}
                          disabled={findingEmailId === lead.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100"
                        >
                          {findingEmailId === lead.id ? (
                            <span className="animate-spin">⏳ Crawling...</span>
                          ) : (
                            <>
                              <SearchCode className="w-3 h-3" />
                              <span>Find Email</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">Email: <span className="text-slate-400">Not available</span></div>
                    )}
                  </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setOutreachLead(lead)}
                    className="flex-1 h-9 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs justify-center"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pitch Client</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveSingleLead(lead)}
                    className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Save lead to CRM"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-blue-600" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMapLead(lead)}
                    className="h-9 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    title="View on Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* WIDE TABLE VIEW WITH MOBILE SWIPE HINT */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs overflow-hidden">
          {/* Mobile Swipe Hint Banner */}
          <div className="lg:hidden px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>👉 Swipe horizontally to view all columns</span>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className="text-blue-600 dark:text-blue-400 font-semibold underline"
            >
              Switch to Cards
            </button>
          </div>

          <div className="overflow-x-auto custom-table-scrollbar">
            <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="text-[11px] text-slate-500 hover:bg-transparent">
                <TableHead className="w-10 px-3 py-3">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 rounded text-slate-400 hover:text-slate-600"
                  >
                    {selectedLeadIds.size > 0 && selectedLeadIds.size === processedLeads.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="min-w-[220px] font-semibold py-3 px-3">Business Name & Category</TableHead>
                <TableHead className="min-w-[130px] font-semibold py-3 px-3">Lead Score</TableHead>
                <TableHead className="min-w-[170px] font-semibold py-3 px-3">Phone (E.164)</TableHead>
                <TableHead className="min-w-[190px] font-semibold py-3 px-3">Email Address</TableHead>
                <TableHead className="min-w-[140px] font-semibold py-3 px-3">Website Status</TableHead>
                <TableHead className="min-w-[180px] font-semibold py-3 px-3">Address</TableHead>
                <TableHead className="min-w-[180px] font-semibold py-3 px-4 text-right">Outreach Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {processedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-20 text-center space-y-2">
                    <AlertCircle className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      No businesses found matching current filters
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Try resetting filters, searching a broader area, or running an Area Scan above.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                processedLeads.map((lead) => {
                  const isSelected = selectedLeadIds.has(lead.id);
                  const activeEmail = localEmails[lead.id]?.email || lead.email;
                  const activeEmailStatus = localEmails[lead.id]?.status || lead.emailStatus;
                  const phoneHasVal = lead.phone && lead.phoneStatus !== "Missing";

                  return (
                    <TableRow
                      key={lead.id}
                      className={`border-b border-slate-100 dark:border-slate-800/80 transition-colors ${
                        isSelected
                          ? "bg-blue-50/40 dark:bg-blue-950/20"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="w-10 px-3 py-3 align-middle">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectLead(lead.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>

                      {/* Business Name & Attribution */}
                      <TableCell className="py-3 px-3 align-middle font-medium text-slate-900 dark:text-white">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600">
                            <span>{lead.name}</span>
                            {lead.googleMapsUri && (
                              <a
                                href={lead.googleMapsUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-500"
                                title="Verify on Google Maps"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                            <span>{lead.category}</span>
                            {/* Source Badge */}
                            {lead.leadSources && lead.leadSources.includes("osm") && lead.leadSources.includes("overture") ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                title="Merged from OpenStreetMap and Overture Places"
                              >
                                OSM + Overture
                              </span>
                            ) : lead.leadSources?.includes("overture") ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                                title="Source: Overture Maps Foundation"
                              >
                                Overture
                              </span>
                            ) : (
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                title="Source: OpenStreetMap"
                              >
                                OSM
                              </span>
                            )}
                            {lead.facebookUrl && (
                              <a
                                href={lead.facebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 inline-flex items-center gap-0.5"
                                title="Visit Facebook Page"
                              >
                                <span>FB</span>
                                <ExternalLink className="w-2 h-2" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Lead Score Badge with breakdown tooltip */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div
                          className="inline-flex items-center gap-1.5 cursor-help group"
                          title={`Lead Score: ${lead.leadScore}/100\n${(lead.scoreReasons || []).map((r) => `• ${r.reason}: +${r.points}`).join("\n")}`}
                        >
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                              lead.leadScoreTier === "High"
                                ? "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900"
                                : lead.leadScoreTier === "Medium"
                                ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            ★ {lead.leadScore}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            {lead.leadScoreTier}
                          </span>
                        </div>
                      </TableCell>

                      {/* Phone Number */}
                      <TableCell className="py-3 px-3 align-middle font-mono">
                        {phoneHasVal ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs font-medium text-slate-800 dark:text-slate-200">
                              <span>{lead.phone}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(lead.phone!, `p-${lead.id}`)}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title="Copy Phone"
                              >
                                {copiedId === `p-${lead.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[10px] flex items-center gap-1">
                              {lead.phoneStatus === "Valid" || lead.phoneStatus === "Format valid" ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Format valid
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                  Format unverified
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400">
                                ({lead.fieldAttribution?.phone === "overture" ? "Overture" : "OSM"})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Not available</span>
                        )}
                      </TableCell>

                      {/* Email */}
                      <TableCell className="py-3 px-3 align-middle font-mono">
                        {activeEmail ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 truncate max-w-[170px]">
                              <span className="truncate">{activeEmail}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(activeEmail, `e-${lead.id}`)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0"
                                title="Copy Email"
                              >
                                {copiedId === `e-${lead.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {(() => {
                                const isFoundOnWebsite =
                                  activeEmailStatus === "Found on website" &&
                                  lead.websiteStatus !== "No Website" &&
                                  Boolean(lead.website);
                                return (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                      isFoundOnWebsite
                                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                        : lead.fieldAttribution?.email === "overture"
                                        ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    }`}
                                    title={
                                      isFoundOnWebsite
                                        ? `Found on website: ${localEmails[lead.id]?.sourceUrl || lead.emailSourceUrl || lead.website}`
                                        : lead.fieldAttribution?.email === "overture"
                                        ? "Source: Overture Places"
                                        : "Source: OpenStreetMap"
                                    }
                                  >
                                    {isFoundOnWebsite
                                      ? "Found on website"
                                      : lead.fieldAttribution?.email === "overture"
                                      ? "Overture"
                                      : "OpenStreetMap"}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        ) : lead.websiteStatus === "Has Website" ? (
                          <button
                            type="button"
                            onClick={() => handleFindEmail(lead)}
                            disabled={findingEmailId === lead.id}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {findingEmailId === lead.id ? (
                              <span className="animate-spin text-xs">⏳</span>
                            ) : (
                              <SearchCode className="w-3 h-3" />
                            )}
                            <span>Find email</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Not available</span>
                        )}
                      </TableCell>

                      {/* Website Status & Audit */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="space-y-1">
                          {lead.websiteStatus === "Has Website" ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={lead.website || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full hover:bg-emerald-100 transition-colors"
                              >
                                <span>Has Website</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => setAuditLead(lead)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Run Website Health Audit"
                              >
                                <Activity className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : lead.websiteStatus === "Social Only" ? (
                            <a
                              href={lead.website || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full"
                            >
                              <span>Social Only</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                              No Website
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Address */}
                      <TableCell className="py-3 px-3 align-middle text-xs text-slate-600 dark:text-slate-400">
                        <span className="block truncate max-w-[200px]" title={lead.address}>
                          {lead.address}
                        </span>
                      </TableCell>

                      {/* Outreach & CRM Actions */}
                      <TableCell className="py-3 px-4 align-middle text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* WhatsApp / Outreach Pitch Button */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setOutreachLead(lead)}
                            className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 font-semibold shadow-2xs"
                            title="Outreach via WhatsApp or Email"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Pitch</span>
                          </Button>

                          {/* Save to CRM button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveSingleLead(lead)}
                            className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-blue-600"
                            title="Save to My Leads CRM"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                          </Button>

                          {/* Google Maps verify */}
                          {lead.googleMapsUri && (
                            <a
                              href={lead.googleMapsUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-600"
                              title="Verify on Google Maps"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      {/* Outreach Modal */}
      {outreachLead && (
        <OutreachModal
          lead={outreachLead}
          isOpen={Boolean(outreachLead)}
          onClose={() => setOutreachLead(null)}
          onStatusUpdated={(leadId, status) => {
            onLeadStatusChanged?.(leadId, status);
          }}
          searchLocation={searchLocation}
        />
      )}

      {/* Website Audit Modal */}
      {auditLead && (
        <WebsiteAuditModal
          lead={auditLead}
          isOpen={Boolean(auditLead)}
          onClose={() => setAuditLead(null)}
          onOpenOutreach={() => {
            const current = auditLead;
            setAuditLead(null);
            setOutreachLead(current);
          }}
        />
      )}

      {/* Map Pin Modal */}
      {mapLead && (
        <GoogleMapModal
          lead={mapLead}
          isOpen={Boolean(mapLead)}
          onClose={() => setMapLead(null)}
        />
      )}
    </div>
  );
}
