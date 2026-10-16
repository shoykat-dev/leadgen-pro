"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  ExternalLink,
  Trash2,
  Edit3,
  Download,
  Filter,
  Search,
  AlertCircle,
  Tag,
  MessageSquare,
  Sparkles,
  X,
  LayoutGrid,
  Table as TableIcon,
  Copy,
  Check,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BusinessLead } from "@/lib/data-integrity";
import { OutreachModal } from "@/components/outreach-modal";

interface MyLeadsViewProps {
  onOpenOutreachModal: (lead: BusinessLead) => void;
}

const CRM_STATUSES = ["All", "New", "Contacted", "Replied", "Meeting", "Won", "Lost"] as const;

export function MyLeadsView({ onOpenOutreachModal }: MyLeadsViewProps) {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<BusinessLead | null>(null);
  const [editNotes, setEditNotes] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("New");
  const [editFollowUp, setEditFollowUp] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-detect mobile screen on mount to default to cards
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setViewMode("cards");
    }
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadLeads = () => {
    setLoading(true);
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        if (data?.leads) {
          setLeads(data.leads);
        }
      })
      .catch((e) => console.warn("Failed to load saved leads", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // Today ISO date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Follow-up due leads (Due today or overdue)
  const followUpDueLeads = useMemo(() => {
    return leads.filter((l) => {
      if (!l.nextFollowUpDate) return false;
      return l.nextFollowUpDate <= todayStr && l.crmStatus !== "Won" && l.crmStatus !== "Lost";
    });
  }, [leads, todayStr]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "All" && l.crmStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = l.name.toLowerCase().includes(q);
        const matchesCategory = l.category.toLowerCase().includes(q);
        const matchesAddress = l.address.toLowerCase().includes(q);
        return matchesName || matchesCategory || matchesAddress;
      }
      return true;
    });
  }, [leads, statusFilter, searchQuery]);

  // Update lead status/notes handler
  const handleSaveEdit = async () => {
    if (!selectedLeadForEdit) return;
    try {
      await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLeadForEdit.id,
          status: editStatus,
          notes: editNotes,
          nextFollowUpDate: editFollowUp || null,
        }),
      });
      loadLeads();
      setSelectedLeadForEdit(null);
    } catch (e) {
      console.warn("Update failed", e);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to remove this lead from My Leads?")) return;
    try {
      await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
      setLeads((prev) => prev.filter((l) => l.id !== id && l.placeId !== id));
    } catch (e) {
      console.warn("Delete failed", e);
    }
  };

  // Export to CSV with Lemlist / Instantly / Apollo headers
  const handleExportCRM = () => {
    if (filteredLeads.length === 0) return;
    const headers = [
      "Company Name",
      "Industry",
      "Phone",
      "Phone E164",
      "Email",
      "Website",
      "Website Status",
      "Address",
      "CRM Status",
      "Lead Score",
      "Data Quality",
      "Last Contacted",
      "Next Follow Up",
      "Notes",
    ];

    const rows = filteredLeads.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.category.replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.phoneE164 || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${(l.website || "").replace(/"/g, '""')}"`,
      `"${l.websiteStatus}"`,
      `"${l.address.replace(/"/g, '""')}"`,
      `"${l.crmStatus || "New"}"`,
      l.leadScore,
      `"${l.dataQuality}"`,
      `"${l.lastContactedAt || ""}"`,
      `"${l.nextFollowUpDate || ""}"`,
      `"${(l.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LeadGenPro_MyLeads_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Follow-Up Due Priority Banner (Section 12) */}
      {followUpDueLeads.length > 0 && (
        <div className="p-3 sm:p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                Follow-Up Due Today & Overdue ({followUpDueLeads.length})
              </h3>
            </div>
            <Badge variant="warning" className="text-[10px] sm:text-xs">
              Action Required
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
            {followUpDueLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between shadow-2xs gap-2"
              >
                <div className="min-w-0 pr-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {lead.name}
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 font-mono mt-0.5">
                    Due: {lead.nextFollowUpDate}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onOpenOutreachModal(lead)}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 px-2.5"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Follow Up
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRM Filter & Tools Bar */}
      <div className="flex flex-col gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Status Tabs - swipeable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {CRM_STATUSES.map((status) => {
            const count =
              status === "All"
                ? leads.length
                : leads.filter((l) => l.crmStatus === status).length;

            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-900/50"
                }`}
              >
                {status} <span className="opacity-75 font-mono text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Second Row: Search, View Mode Toggle, Export */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved leads..."
              className="w-full h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Cards vs Table view toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCRM}
              disabled={filteredLeads.length === 0}
              className="h-8 text-xs gap-1.5 rounded-xl px-2.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Export</span> CSV
            </Button>
          </div>
        </div>
      </div>

      {/* CRM Content */}
      {loading ? (
        <div className="py-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading saved leads from local SQLite database...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="py-16 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No leads found in this view
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Save high-scoring leads from directory searches or import CSV files to track your pipeline here.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        /* RESPONSIVE MOBILE & DESKTOP CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredLeads.map((lead) => {
            const cleanPhoneDigits = (lead.phoneE164 || lead.phone || "").replace(/[^0-9]/g, "");
            const hasPhone = Boolean(lead.phone && lead.phone !== "N/A");

            return (
              <div
                key={lead.id}
                className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Header: Name, Status badge & Category */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {lead.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {lead.category} • {lead.address}
                      </p>
                    </div>

                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        lead.crmStatus === "Won"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                          : lead.crmStatus === "Contacted"
                          ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                          : lead.crmStatus === "Meeting"
                          ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                          : lead.crmStatus === "Replied"
                          ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {lead.crmStatus || "New"}
                    </span>
                  </div>

                  {/* Badges: Website Status & Follow-Up */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <Badge
                      variant={lead.websiteStatus === "No Website" ? "destructive" : "outline"}
                      className="text-[10px] py-0"
                    >
                      {lead.websiteStatus}
                    </Badge>

                    {lead.nextFollowUpDate && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                          lead.nextFollowUpDate <= todayStr
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Follow-Up: {lead.nextFollowUpDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Row (Phone, WhatsApp, Email) */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  {/* Phone */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{lead.phone || "No phone"}</span>
                    </div>

                    {hasPhone && (
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`tel:${cleanPhoneDigits}`}
                          className="h-6 px-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:bg-blue-50"
                          title="Call directly"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${cleanPhoneDigits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-6 px-2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 hover:bg-emerald-100"
                          title="Open WhatsApp chat"
                        >
                          <span>WA</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  {lead.email && (
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-blue-600 dark:text-blue-400 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline shrink-0 font-medium"
                      >
                        Email
                      </a>
                    </div>
                  )}

                  {/* Notes snippet */}
                  {lead.notes && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-2">
                      &quot;{lead.notes}&quot;
                    </div>
                  )}
                </div>

                {/* Card Actions: Pitch, Edit, Delete */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    size="sm"
                    onClick={() => onOpenOutreachModal(lead)}
                    className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Pitch & Follow-Up</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedLeadForEdit(lead);
                      setEditStatus(lead.crmStatus || "New");
                      setEditNotes(lead.notes || "");
                      setEditFollowUp(lead.nextFollowUpDate || "");
                    }}
                    className="h-8 w-8 p-0 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    title="Edit Status & Notes"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteLead(lead.id)}
                    className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Delete lead"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-[11px] text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold min-w-[200px]">Business Name</th>
                  <th className="py-3 px-3 font-semibold min-w-[100px]">Status</th>
                  <th className="py-3 px-3 font-semibold min-w-[160px]">Contacts</th>
                  <th className="py-3 px-3 font-semibold min-w-[120px]">Website</th>
                  <th className="py-3 px-3 font-semibold min-w-[120px]">Next Follow-Up</th>
                  <th className="py-3 px-3 font-semibold min-w-[160px]">Notes</th>
                  <th className="py-3 px-4 font-semibold text-right min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-[220px]">
                      <div className="truncate font-semibold">{lead.name}</div>
                      <div className="text-[11px] text-slate-500 font-normal truncate">
                        {lead.category} • {lead.address}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          lead.crmStatus === "Won"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200"
                            : lead.crmStatus === "Contacted"
                            ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200"
                            : lead.crmStatus === "Meeting"
                            ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200"
                            : lead.crmStatus === "Replied"
                            ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {lead.crmStatus || "New"}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono space-y-0.5">
                      {lead.phone ? (
                        <div className="text-slate-800 dark:text-slate-200">{lead.phone}</div>
                      ) : (
                        <div className="text-slate-400">No phone</div>
                      )}
                      {lead.email && (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 truncate max-w-[150px]">
                          {lead.email}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <Badge
                        variant={lead.websiteStatus === "No Website" ? "destructive" : "outline"}
                        className="text-[10px]"
                      >
                        {lead.websiteStatus}
                      </Badge>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      {lead.nextFollowUpDate ? (
                        <span
                          className={
                            lead.nextFollowUpDate <= todayStr
                              ? "text-amber-600 dark:text-amber-400 font-bold"
                              : "text-slate-600 dark:text-slate-400"
                          }
                        >
                          {lead.nextFollowUpDate}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 max-w-[180px] text-slate-600 dark:text-slate-400 truncate">
                      {lead.notes || <span className="text-slate-400 italic">No notes</span>}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenOutreachModal(lead)}
                          className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title="Open WhatsApp/Email Pitch"
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Outreach
                        </Button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLeadForEdit(lead);
                            setEditStatus(lead.crmStatus || "New");
                            setEditNotes(lead.notes || "");
                            setEditFollowUp(lead.nextFollowUpDate || "");
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Status / Notes"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Status & Follow-Up Modal */}
      {selectedLeadForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[280px]">
                Edit Lead: {selectedLeadForEdit.name}
              </h3>
              <button
                onClick={() => setSelectedLeadForEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  CRM Pipeline Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-medium"
                >
                  {CRM_STATUSES.filter((s) => s !== "All").map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Next Follow-Up Date
                </label>
                <input
                  type="date"
                  value={editFollowUp}
                  onChange={(e) => setEditFollowUp(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Notes & Context
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Sent WhatsApp pitch; owner said to message again on Monday"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLeadForEdit(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
