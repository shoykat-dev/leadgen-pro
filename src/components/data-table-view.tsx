"use client";

import React, { useState, useMemo } from "react";
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
  onLeadStatusChanged?: (leadId: string, status: string) => void;
  onRefreshLeads?: () => void;
}

type WebsiteFilterType = "all" | "no_website" | "social_only" | "has_website";

export function DataTableView({
  leads,
  searchLocation,
  categoryLabel,
  onLeadStatusChanged,
  onRefreshLeads,
}: DataTableViewProps) {
  // Filters state
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilterType>("all");
  const [phoneFilter, setPhoneFilter] = useState<boolean>(false);
  const [emailFilter, setEmailFilter] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [minReviews, setMinReviews] = useState<number>(0);
  const [scoreTierFilter, setScoreTierFilter] = useState<string>("all");
  const [hideContacted, setHideContacted] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"score" | "rating" | "reviews" | "name">("score");

  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Modal states
  const [outreachLead, setOutreachLead] = useState<BusinessLead | null>(null);
  const [auditLead, setAuditLead] = useState<BusinessLead | null>(null);
  const [mapLead, setMapLead] = useState<BusinessLead | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Email finder on-demand state per row
  const [findingEmailId, setFindingEmailId] = useState<string | null>(null);
  const [isFindingAllEmails, setIsFindingAllEmails] = useState<boolean>(false);
  const [localEmails, setLocalEmails] = useState<Record<string, { email: string | null; status: string }>>({});

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

      // 4. Min Rating
      if (minRating > 0 && (lead.rating || 0) < minRating) return false;

      // 5. Min Reviews
      if (minReviews > 0 && (lead.userRatingCount || 0) < minReviews) return false;

      // 6. Score Tier
      if (scoreTierFilter !== "all" && lead.leadScoreTier !== scoreTierFilter) return false;

      // 7. Hide Contacted
      if (hideContacted && lead.crmStatus === "Contacted") return false;

      // 8. Search query
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
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "reviews") return (b.userRatingCount || 0) - (a.userRatingCount || 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [
    leads,
    websiteFilter,
    phoneFilter,
    emailFilter,
    minRating,
    minReviews,
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
      "Rating",
      "Reviews",
      "Phone",
      "Phone E164",
      "Phone Status",
      "Email",
      "Email Status",
      "Email Source",
      "Website",
      "Website Status",
      "Address",
      "Data Quality",
      "Lead Score",
      "Score Tier",
      "Google Maps URL",
      "Fetched Date",
    ];

    const rows = targetLeads.map((l) => {
      const activeEmail = localEmails[l.id]?.email || l.email;
      const activeEmailStatus = localEmails[l.id]?.status || l.emailStatus;
      const gMapsUrl =
        l.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${l.name}, ${l.address}`
        )}`;

      return [
        `"${l.name.replace(/"/g, '""')}"`,
        `"${l.category.replace(/"/g, '""')}"`,
        l.rating || "",
        l.userRatingCount || "",
        `"${(l.phone || "").replace(/"/g, '""')}"`,
        `"${(l.phoneE164 || "").replace(/"/g, '""')}"`,
        `"${l.phoneStatus}"`,
        `"${(activeEmail || "").replace(/"/g, '""')}"`,
        `"${activeEmailStatus}"`,
        `"${l.emailProvenance || "google"}"`,
        `"${(l.website || "").replace(/"/g, '""')}"`,
        `"${l.websiteStatus}"`,
        `"${l.address.replace(/"/g, '""')}"`,
        `"${l.dataQuality}"`,
        l.leadScore,
        `"${l.leadScoreTier}"`,
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Left: Website Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => setWebsiteFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              websiteFilter === "no_website"
                ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-red-700 hover:bg-red-50/50"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span>No Website ({noWebsiteCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setWebsiteFilter("social_only")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              websiteFilter === "social_only"
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-amber-700 hover:bg-amber-50/50"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Social Only ({socialOnlyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setWebsiteFilter("has_website")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              websiteFilter === "has_website"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-50/50"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Has Website ({hasWebsiteCount})</span>
          </button>
        </div>

        {/* Right: Quick Search & Export */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search in results..."
              className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {hasWebsiteCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFindAllEmails}
              disabled={isFindingAllEmails}
              className="h-8 text-xs gap-1.5 shrink-0 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              title="Automatically search emails on all websites in results"
            >
              {isFindingAllEmails ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{isFindingAllEmails ? "Finding Emails..." : "Find All Emails"}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBulkSave}
            disabled={processedLeads.length === 0}
            className="h-8 text-xs gap-1.5 shrink-0 border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Save {selectedLeadIds.size > 0 ? `(${selectedLeadIds.size})` : "All"} to CRM
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleExportCSV("all")}
            disabled={processedLeads.length === 0}
            className="h-8 text-xs gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Secondary Filter & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Has Valid Phone Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Valid Phone Only</span>
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
            <span className="text-slate-500">Lead Score:</span>
            <select
              value={scoreTierFilter}
              onChange={(e) => setScoreTierFilter(e.target.value)}
              className="h-7 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Tiers</option>
              <option value="High">High Priority (60+)</option>
              <option value="Medium">Medium (35-59)</option>
              <option value="Low">Low (0-34)</option>
            </select>
          </div>

          {/* Min Reviews */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Min Reviews:</span>
            <select
              value={minReviews}
              onChange={(e) => setMinReviews(parseInt(e.target.value, 10))}
              className="h-7 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value={0}>Any</option>
              <option value={20}>20+ Reviews</option>
              <option value={50}>50+ Reviews</option>
            </select>
          </div>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-7 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[11px] font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="score">Lead Score (Highest)</option>
            <option value="reviews">Reviews Count</option>
            <option value="rating">Rating (Highest)</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
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
                <TableHead className="min-w-[130px] font-semibold py-3 px-3">Rating / Reviews</TableHead>
                <TableHead className="min-w-[180px] font-semibold py-3 px-3">Address</TableHead>
                <TableHead className="min-w-[180px] font-semibold py-3 px-4 text-right">Outreach Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {processedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-20 text-center space-y-2">
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
                        <div className="space-y-0.5">
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
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span>{lead.category}</span>
                            <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                              {lead.source === "google_places" ? "Google" : lead.source}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Lead Score Badge with breakdown tooltip */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div
                          className="inline-flex items-center gap-1.5 cursor-help group"
                          title={`Lead Score: ${lead.leadScore}/100\n• Website Status: ${lead.websiteStatus} (${
                            lead.websiteStatus === "No Website"
                              ? "+40"
                              : lead.websiteStatus === "Social Only"
                              ? "+30"
                              : "+0"
                          })\n• Phone: ${lead.phoneStatus === "Valid" ? "+15" : "+0"}\n• Email: ${
                            lead.email ? "+10" : "+0"
                          }\n• Rating/Reviews: ${
                            (lead.rating || 0) >= 4 ? "+10" : "+0"
                          }`}
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
                            <div className="text-[10px]">
                              {lead.phoneStatus === "Valid" ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  ✓ Verified Mobile
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                  Format Unverified
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
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
                              <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                                {activeEmailStatus}
                              </span>
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
                          <span className="text-xs text-slate-400">N/A</span>
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

                      {/* Rating / Reviews */}
                      <TableCell className="py-3 px-3 align-middle text-xs">
                        {lead.rating ? (
                          <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>{lead.rating.toFixed(1)}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({lead.userRatingCount || 0})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
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
