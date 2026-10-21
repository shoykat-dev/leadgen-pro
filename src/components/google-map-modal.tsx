"use client";

import React, { useState } from "react";
import {
  X,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Navigation,
  Compass,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BusinessLead } from "@/app/api/places/route";

interface GoogleMapModalProps {
  lead: BusinessLead | null;
  isOpen: boolean;
  onClose: () => void;
}

type MapMode = "m" | "k" | "p"; // m: standard map, k: satellite, p: terrain

export function GoogleMapModal({ lead, isOpen, onClose }: GoogleMapModalProps) {
  const [mapMode, setMapMode] = useState<MapMode>("m");

  if (!isOpen || !lead) return null;

  // Exact single-business pinpoint Google Maps URLs with full Business Name & Address query
  const placeQuery = encodeURIComponent(`${lead.name}, ${lead.address}`);

  const embedUrl = lead.googleMapsEmbedUrl
    ? `${lead.googleMapsEmbedUrl}&t=${mapMode}`
    : `https://maps.google.com/maps?q=${placeQuery}&t=${mapMode}&hl=en&z=16&output=embed`;

  const directMapsUrl =
    lead.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${placeQuery}`;

  const directionsUrl =
    lead.googleMapsDirectionsUrl ||
    `https://www.google.com/maps/dir/?api=1&destination=${placeQuery}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] overflow-hidden shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col max-h-[94vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Map Pin Icon */}
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs shrink-0">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white max-w-[180px] xs:max-w-[280px] sm:max-w-[460px] truncate">
                  {lead.name}
                </h3>
                {lead.hasWebsite ? (
                  <Badge variant="success" className="text-[10px] py-0">
                    Has Website
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] py-0">
                    No Website
                  </Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate max-w-[220px] xs:max-w-[360px] sm:max-w-[600px]">
                <span className="text-blue-600 dark:text-blue-400 font-semibold shrink-0">{lead.category}</span>
                <span>•</span>
                <span className="text-slate-600 dark:text-slate-300 truncate">{lead.address}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Toolbar (Layers Switcher & Quick Launchers) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
          {/* Map Layer Switcher */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] mr-1 hidden sm:inline flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              Layer:
            </span>
            <button
              onClick={() => setMapMode("m")}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors ${
                mapMode === "m"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setMapMode("k")}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors ${
                mapMode === "k"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapMode("p")}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors ${
                mapMode === "p"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Terrain
            </button>
          </div>

          {/* Quick Direct Link */}
          <div className="flex items-center gap-2">
            <a
              href={directMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-[11px] font-semibold flex items-center gap-1 hover:underline px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-slate-100 dark:bg-slate-800"
            >
              <span>Full Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Embedded Interactive Google Map targeting this exact single pin */}
        <div className="relative w-full h-80 sm:h-[420px] bg-slate-100 overflow-hidden">
          <iframe
            key={`${lead.id}-${mapMode}`}
            title={`Google Map - ${lead.name}`}
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
          />

          {/* Floating Business Information Card on top of Map */}
          <div className="absolute top-3 left-3 z-10 max-w-[280px] sm:max-w-xs rounded-xl bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md p-3 shadow-xl border border-slate-200/90 dark:border-slate-700 pointer-events-auto">
            <div className="flex items-start justify-between gap-1.5 mb-1.5">
              <div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-600 dark:text-blue-400 block">
                  {lead.category}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                  {lead.name}
                </h4>
              </div>
              {lead.hasWebsite ? (
                <Badge variant="success" className="text-[9px] px-1.5 py-0.5 shrink-0">
                  Website
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 shrink-0">
                  No Web
                </Badge>
              )}
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1 leading-tight mb-2">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{lead.address}</span>
            </p>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 space-y-1 text-[11px]">
              {lead.phone && lead.phone !== "N/A" && (
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[10px]">
                    <Phone className="w-3 h-3 text-blue-500" /> Phone:
                  </span>
                  <a
                    href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                    className="font-mono font-medium hover:text-blue-600 dark:hover:text-blue-400 text-[10px]"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.email && lead.email !== "N/A" && (
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[10px]">
                    <Mail className="w-3 h-3 text-indigo-500" /> Email:
                  </span>
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-mono text-blue-600 dark:text-blue-400 hover:underline text-[10px] truncate max-w-[150px]"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Business Quick Details & External Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Phone */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 shadow-xs">
              <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Phone Number</span>
                {lead.phone && lead.phone !== "N/A" ? (
                  <a
                    href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                    className="text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-mono font-medium"
                  >
                    {lead.phone}
                  </a>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 font-mono">N/A</span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 shadow-xs">
              <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Email Address</span>
                {lead.email && lead.email !== "N/A" ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
                  >
                    {lead.email}
                  </a>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 font-mono">N/A</span>
                )}
              </div>
            </div>

            {/* Website */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 shadow-xs">
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Website Status</span>
                {lead.website ? (
                  <a
                    href={
                      lead.website.startsWith("http")
                        ? lead.website
                        : `https://${lead.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 hover:underline truncate block font-medium"
                  >
                    Visit Website
                  </a>
                ) : (
                  <span className="text-red-600 dark:text-red-400 font-medium">None (Cold Lead)</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline font-mono">
              GPS: {lead.lat != null && lead.lon != null ? `${lead.lat.toFixed(5)}, ${lead.lon.toFixed(5)}` : "Location mapped"}
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Close
              </Button>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-1.5"
              >
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Get driving directions in Google Maps"
                >
                  <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Directions</span>
                </a>
              </Button>

              <Button
                asChild
                size="sm"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <a
                  href={directMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open place directly in Google Maps application"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
