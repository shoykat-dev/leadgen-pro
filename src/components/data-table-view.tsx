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
  LayoutList,
  Columns,
  Map as MapIcon,
  Globe,
  Compass,
  Navigation,
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
import { BusinessLead } from "@/app/api/places/route";
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
}

type FilterType = "all" | "with_website" | "without_website";
type ViewMode = "table" | "split" | "map";

export function DataTableView({
  leads,
  searchLocation,
  categoryLabel,
}: DataTableViewProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMapLead, setSelectedMapLead] = useState<BusinessLead | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [activeSplitLeadId, setActiveSplitLeadId] = useState<string | null>(null);

  // Derived counts
  const totalCount = leads.length;
  const withWebsiteCount = useMemo(
    () => leads.filter((l) => l.hasWebsite).length,
    [leads]
  );
  const withoutWebsiteCount = useMemo(
    () => leads.filter((l) => !l.hasWebsite).length,
    [leads]
  );

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // 1. Website Status filter
      if (filter === "with_website" && !lead.hasWebsite) return false;
      if (filter === "without_website" && lead.hasWebsite) return false;

      // 2. In-table search filter
      if (tableSearch.trim()) {
        const query = tableSearch.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesPhone = lead.phone.toLowerCase().includes(query);
        const matchesEmail = lead.email.toLowerCase().includes(query);
        const matchesAddress = lead.address.toLowerCase().includes(query);
        return matchesName || matchesPhone || matchesEmail || matchesAddress;
      }

      return true;
    });
  }, [leads, filter, tableSearch]);

  // Active lead for Split/Map views
  const activeLead = useMemo(() => {
    if (activeSplitLeadId) {
      const found = filteredLeads.find((l) => l.id === activeSplitLeadId);
      if (found) return found;
    }
    return filteredLeads[0] || null;
  }, [filteredLeads, activeSplitLeadId]);

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    if (text === "N/A" || !text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;

    const headers = [
      "Business Name",
      "Category",
      "Phone Number",
      "Email",
      "Address",
      "Website Status",
      "Website URL",
      "Latitude",
      "Longitude",
      "Google Maps Link",
      "Google Maps Directions",
    ];

    const rows = filteredLeads.map((lead) => {
      const placeQuery = encodeURIComponent(`${lead.name}, ${lead.address}`);
      const gMaps =
        lead.googleMapsUrl ||
        `https://www.google.com/maps/search/?api=1&query=${placeQuery}`;
      const gDirections =
        lead.googleMapsDirectionsUrl ||
        `https://www.google.com/maps/dir/?api=1&destination=${placeQuery}`;

      return [
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.category.replace(/"/g, '""')}"`,
        `"${lead.phone.replace(/"/g, '""')}"`,
        `"${lead.email.replace(/"/g, '""')}"`,
        `"${lead.address.replace(/"/g, '""')}"`,
        `"${lead.hasWebsite ? "Has Website" : "No Website"}"`,
        `"${(lead.website || "").replace(/"/g, '""')}"`,
        lead.lat,
        lead.lon,
        `"${gMaps}"`,
        `"${gDirections}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `LeadGenPro_${searchLocation.area || searchLocation.city}_${filter}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayLocation = [
    searchLocation.area || searchLocation.city,
    searchLocation.state || searchLocation.country,
  ]
    .filter(Boolean)
    .join(", ");

  const defaultLocationQuery = encodeURIComponent(
    `${searchLocation.area || searchLocation.city}, ${searchLocation.state || searchLocation.country}`
  );

  return (
    <div className="w-full space-y-4">
      {/* Top Header & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Found {totalCount} businesses in {displayLocation}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span className="text-blue-600 font-medium">Targeting {categoryLabel}</span>
            <span>•</span>
            <span className="text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500 inline" />
              Direct Google Maps Geolocation
            </span>
          </p>
        </div>

        {/* Action Controls: View Switcher & CSV Export */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Table View (List with details)"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "split"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Split View (List + Interactive Google Map)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split View</span>
            </button>

            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "map"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Google Map View (Full screen map with lead cards)"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Map View</span>
            </button>
          </div>

          {/* Export to CSV Button */}
          <Button
            onClick={handleExportCSV}
            disabled={filteredLeads.length === 0}
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export to CSV ({filteredLeads.length})</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {/* All */}
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              filter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All ({totalCount})
          </button>

          {/* With Website */}
          <button
            onClick={() => setFilter("with_website")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              filter === "with_website"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs"
                : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50"
            }`}
          >
            With Website ({withWebsiteCount})
          </button>

          {/* Without Website */}
          <button
            onClick={() => setFilter("without_website")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              filter === "without_website"
                ? "bg-red-50 text-red-700 border border-red-200 shadow-xs ring-1 ring-red-400"
                : "text-slate-600 hover:text-red-700 hover:bg-red-50/50"
            }`}
          >
            Without Website ({withoutWebsiteCount})
          </button>
        </div>

        {/* In-table Quick Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search within results..."
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* 1. TABLE VIEW */}
      {viewMode === "table" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Mobile swipe helper badge */}
          <div className="md:hidden px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Swipe table horizontally to view all fields</span>
            <span className="text-blue-600 font-bold flex items-center gap-1">← Drag to Scroll →</span>
          </div>

          <div className="w-full overflow-x-auto custom-table-scrollbar">
            <Table className="min-w-[940px] w-full">
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[240px] text-slate-700 font-semibold text-xs">Business Name</TableHead>
                  <TableHead className="w-[160px] text-slate-700 font-semibold text-xs">Phone Number</TableHead>
                  <TableHead className="w-[190px] text-slate-700 font-semibold text-xs">Email / Contact</TableHead>
                  <TableHead className="min-w-[220px] text-slate-700 font-semibold text-xs">Address</TableHead>
                  <TableHead className="w-[140px] text-slate-700 font-semibold text-xs text-center">Website Status</TableHead>
                  <TableHead className="w-[170px] text-slate-700 font-semibold text-xs text-right">Google Maps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-48 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                        <p className="text-base font-semibold text-slate-800">
                          No matching businesses found
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          {tableSearch
                            ? `No results matched "${tableSearch}". Clear your search query to see all results.`
                            : "Try selecting a broader city, nearby region, or different business category."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => {
                    const phoneHasVal = lead.phone && lead.phone !== "N/A";
                    const emailHasVal = lead.email && lead.email !== "N/A";

                    return (
                      <TableRow
                        key={lead.id}
                        className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Business Name */}
                        <TableCell className="font-semibold text-slate-900">
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                              {lead.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {lead.category}
                            </div>
                          </div>
                        </TableCell>

                        {/* Phone Number */}
                        <TableCell>
                          {phoneHasVal ? (
                            <div className="flex items-center gap-1.5 group">
                              <a
                                href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                                className="text-xs font-mono text-slate-800 hover:text-blue-600 transition-colors"
                              >
                                {lead.phone}
                              </a>
                              <button
                                onClick={() => handleCopy(lead.phone, `phone-${lead.id}`)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded transition-opacity"
                                title="Copy Phone"
                              >
                                {copiedId === `phone-${lead.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">N/A</span>
                          )}
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          {emailHasVal ? (
                            <div className="flex items-center gap-1.5 group">
                              <a
                                href={`mailto:${lead.email}`}
                                className="text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline transition-colors max-w-[150px] truncate"
                                title={lead.email}
                              >
                                {lead.email}
                              </a>
                              <button
                                onClick={() => handleCopy(lead.email, `email-${lead.id}`)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded transition-opacity"
                                title="Copy Email"
                              >
                                {copiedId === `email-${lead.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">N/A</span>
                          )}
                        </TableCell>

                        {/* Address */}
                        <TableCell className="text-xs text-slate-600 max-w-[240px]">
                          <span className="line-clamp-2" title={lead.address}>
                            {lead.address}
                          </span>
                        </TableCell>

                        {/* Website Status Badge */}
                        <TableCell className="text-center">
                          {lead.hasWebsite ? (
                            <a
                              href={
                                lead.website?.startsWith("http")
                                  ? lead.website
                                  : `https://${lead.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 group"
                            >
                              <Badge
                                variant="success"
                                className="px-2.5 py-1 text-[11px] font-semibold cursor-pointer group-hover:bg-emerald-100"
                              >
                                Has Website
                                <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-70 group-hover:opacity-100" />
                              </Badge>
                            </a>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="px-2.5 py-1 text-[11px] font-semibold"
                            >
                              No Website
                            </Badge>
                          )}
                        </TableCell>

                        {/* Google Maps Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMapLead(lead)}
                              className="h-8 px-2.5 rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 hover:text-slate-900 shadow-xs inline-flex items-center gap-1.5"
                              title="Open Google Maps Exact Location Preview"
                            >
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                              <span>Map Pin</span>
                            </Button>

                            <a
                              href={
                                lead.googleMapsUrl ||
                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name}, ${lead.address}`)}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all shrink-0 shadow-xs"
                              title="Open business directly in Google Maps"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
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

      {/* 2. SPLIT VIEW */}
      {viewMode === "split" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Scrollable List of Businesses */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-slate-200 bg-white text-slate-500">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p>No businesses found for this filter</p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = activeLead?.id === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => setActiveSplitLeadId(lead.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-400 shadow-sm ring-1 ring-blue-300"
                        : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {lead.name}
                        </h4>
                        <p className="text-[11px] text-blue-600 mt-0.5 font-medium">
                          {lead.category}
                        </p>
                      </div>
                      {lead.hasWebsite ? (
                        <Badge variant="success" className="text-[10px] shrink-0">
                          Has Website
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] shrink-0">
                          No Website
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-1">
                      {lead.address}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                      <span className="font-mono text-[11px]">
                        {lead.phone !== "N/A" ? lead.phone : "No phone"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMapLead(lead);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-[11px] flex items-center gap-1 font-medium"
                        >
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>Exact Pin</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Embedded Google Map for Exact Selected Place */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            {/* Top Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 truncate max-w-[280px]">
                    {activeLead ? activeLead.name : `Google Map - ${displayLocation}`}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate max-w-[320px]">
                    {activeLead ? activeLead.address : "Specific place interactive pin"}
                  </p>
                </div>
              </div>

              {activeLead && (
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-slate-200 bg-white text-slate-700 hover:text-slate-900"
                  >
                    <a
                      href={
                        activeLead.googleMapsDirectionsUrl ||
                        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${activeLead.name}, ${activeLead.address}`)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Compass className="w-3 h-3 text-blue-600 mr-1" />
                      <span>Directions</span>
                    </a>
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <a
                      href={
                        activeLead.googleMapsUrl ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activeLead.name}, ${activeLead.address}`)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      <span>Open on Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-80" />
                    </a>
                  </Button>
                </div>
              )}
            </div>

            {/* Embedded Google Map focusing on exact single-pin location */}
            <div className="relative w-full h-[520px] bg-slate-100 overflow-hidden">
              <iframe
                key={activeLead?.id || "default"}
                title={`Google Map - ${activeLead?.name || displayLocation}`}
                src={
                  activeLead
                    ? activeLead.googleMapsEmbedUrl ||
                      `https://maps.google.com/maps?q=${encodeURIComponent(`${activeLead.name}, ${activeLead.address}`)}&hl=en&z=16&output=embed`
                    : `https://maps.google.com/maps?q=${encodeURIComponent(displayLocation)}&hl=en&z=14&output=embed`
                }
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />

              {/* Floating Verified Business Information Card on Split Map */}
              {activeLead && (
                <div className="absolute top-3 left-3 z-10 max-w-[280px] sm:max-w-xs rounded-xl bg-white/95 backdrop-blur-md p-3 shadow-xl border border-slate-200/90 pointer-events-auto">
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 block">
                        {activeLead.category}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {activeLead.name}
                      </h4>
                    </div>
                    {activeLead.hasWebsite ? (
                      <Badge variant="success" className="text-[9px] px-1.5 py-0.5 shrink-0">
                        Website
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 shrink-0">
                        No Web
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 flex items-start gap-1 leading-tight mb-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{activeLead.address}</span>
                  </p>

                  <div className="border-t border-slate-100 pt-1.5 space-y-1 text-[11px]">
                    {activeLead.phone && activeLead.phone !== "N/A" && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                          <Phone className="w-3 h-3 text-blue-500" /> Phone:
                        </span>
                        <a
                          href={`tel:${activeLead.phone.replace(/[^0-9+]/g, "")}`}
                          className="font-mono font-medium hover:text-blue-600 text-[10px]"
                        >
                          {activeLead.phone}
                        </a>
                      </div>
                    )}
                    {activeLead.email && activeLead.email !== "N/A" && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                          <Mail className="w-3 h-3 text-indigo-500" /> Email:
                        </span>
                        <a
                          href={`mailto:${activeLead.email}`}
                          className="font-mono text-blue-600 hover:underline text-[10px] truncate max-w-[150px]"
                        >
                          {activeLead.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. FULL MAP VIEW */}
      {viewMode === "map" && (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          {/* Map Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Google Maps Lead Navigator</span>
                  <Badge variant="outline" className="border-slate-300 text-slate-700 text-[10px]">
                    {filteredLeads.length} Leads
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500">
                  Targeted business:{" "}
                  <span className="text-blue-600 font-semibold">
                    {activeLead?.name || displayLocation}
                  </span>
                </p>
              </div>
            </div>

            {activeLead && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setSelectedMapLead(activeLead)}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-200 bg-white text-slate-700 hover:text-slate-900"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500 mr-1" />
                  <span>Exact Pin Details</span>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <a
                    href={
                      activeLead.googleMapsUrl ||
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activeLead.name}, ${activeLead.address}`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-80" />
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Full Height Map */}
          <div className="relative w-full h-[540px] bg-slate-100 overflow-hidden">
            <iframe
              key={`full-${activeLead?.id || "default"}`}
              title={`Google Map - ${activeLead?.name || displayLocation}`}
              src={
                activeLead
                  ? activeLead.googleMapsEmbedUrl ||
                    `https://maps.google.com/maps?q=${encodeURIComponent(`${activeLead.name}, ${activeLead.address}`)}&hl=en&z=16&output=embed`
                  : `https://maps.google.com/maps?q=${encodeURIComponent(displayLocation)}&hl=en&z=14&output=embed`
              }
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />

            {/* Floating Business Information Overlay Card on Full Map */}
            {activeLead && (
              <div className="absolute top-3 left-3 z-10 max-w-[280px] sm:max-w-xs rounded-xl bg-white/95 backdrop-blur-md p-3 shadow-xl border border-slate-200/90 pointer-events-auto">
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 block">
                      {activeLead.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {activeLead.name}
                    </h4>
                  </div>
                  {activeLead.hasWebsite ? (
                    <Badge variant="success" className="text-[9px] px-1.5 py-0.5 shrink-0">
                      Website
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 shrink-0">
                      No Web
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 flex items-start gap-1 leading-tight mb-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{activeLead.address}</span>
                </p>

                <div className="border-t border-slate-100 pt-1.5 space-y-1 text-[11px]">
                  {activeLead.phone && activeLead.phone !== "N/A" && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                        <Phone className="w-3 h-3 text-blue-500" /> Phone:
                      </span>
                      <a
                        href={`tel:${activeLead.phone.replace(/[^0-9+]/g, "")}`}
                        className="font-mono font-medium hover:text-blue-600 text-[10px]"
                      >
                        {activeLead.phone}
                      </a>
                    </div>
                  )}
                  {activeLead.email && activeLead.email !== "N/A" && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                        <Mail className="w-3 h-3 text-indigo-500" /> Email:
                      </span>
                      <a
                        href={`mailto:${activeLead.email}`}
                        className="font-mono text-blue-600 hover:underline text-[10px] truncate max-w-[150px]"
                      >
                        {activeLead.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Horizontal Quick Lead Selector Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 overflow-x-auto flex items-center gap-2.5">
            {filteredLeads.map((lead) => {
              const isSelected = activeLead?.id === lead.id;
              return (
                <button
                  key={lead.id}
                  onClick={() => setActiveSplitLeadId(lead.id)}
                  className={`px-3 py-2 rounded-xl text-left border transition-all shrink-0 flex items-center gap-2.5 ${
                    isSelected
                      ? "bg-white border-blue-500 shadow-sm ring-1 ring-blue-400"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <MapPin
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? "text-rose-500" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900 max-w-[160px] truncate">
                      {lead.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {lead.hasWebsite ? (
                        <span className="text-emerald-600 font-medium">Has Website</span>
                      ) : (
                        <span className="text-red-600 font-medium">No Website</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Google Map Modal */}
      <GoogleMapModal
        lead={selectedMapLead}
        isOpen={Boolean(selectedMapLead)}
        onClose={() => setSelectedMapLead(null)}
      />
    </div>
  );
}
