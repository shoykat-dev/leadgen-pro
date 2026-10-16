"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BusinessLead,
  validatePhone,
  validateEmail,
  classifyWebsite,
  calculateLeadScore,
  assessDataQuality,
  deduplicateLeads,
} from "@/lib/data-integrity";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (leads: BusinessLead[]) => void;
  existingLeads?: BusinessLead[];
}

export function CsvImportModal({
  isOpen,
  onClose,
  onImportComplete,
  existingLeads = [],
}: CsvImportModalProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "summary">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState<string>("");

  // Column mappings
  const [mappings, setMappings] = useState<{
    name: string;
    category: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    rating: string;
    reviews: string;
    placeId: string;
  }>({
    name: "",
    category: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    rating: "",
    reviews: "",
    placeId: "",
  });

  // Summary counts
  const [summary, setSummary] = useState<{
    totalRows: number;
    imported: number;
    skippedDuplicates: number;
    invalid: number;
    importedLeads: BusinessLead[];
  }>({
    totalRows: 0,
    imported: 0,
    skippedDuplicates: 0,
    invalid: 0,
    importedLeads: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Simple CSV parser supporting quoted strings
  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === "," && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);
    return { headers, rows };
  };

  // Auto-detect column headers (Outscraper / Google Maps CSV / Generic)
  const autoDetectMappings = (headers: string[]) => {
    const findMatch = (candidates: string[]): string => {
      for (const cand of candidates) {
        const match = headers.find(
          (h) => h.toLowerCase() === cand || h.toLowerCase().includes(cand)
        );
        if (match) return match;
      }
      return "";
    };

    return {
      name: findMatch(["name", "business name", "title", "company"]),
      category: findMatch(["category", "type", "sub_type", "industry"]),
      phone: findMatch(["phone", "phone number", "telephone", "mobile"]),
      email: findMatch(["email", "e-mail", "contact email"]),
      website: findMatch(["website", "site", "url", "domain"]),
      address: findMatch(["address", "full_address", "formatted_address", "street"]),
      rating: findMatch(["rating", "review_rating", "stars"]),
      reviews: findMatch(["reviews", "reviews_count", "user_rating_count"]),
      placeId: findMatch(["place_id", "google_id", "placeid", "id"]),
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (headers.length > 0) {
        setCsvHeaders(headers);
        setRawRows(rows);
        setMappings(autoDetectMappings(headers));
        setStep("mapping");
      }
    };
    reader.readAsText(file);
  };

  // Process rows through Section 2 validation layer
  const handleProcessImport = () => {
    const getVal = (row: string[], colHeader: string): string => {
      const idx = csvHeaders.indexOf(colHeader);
      return idx >= 0 && row[idx] !== undefined ? row[idx].trim() : "";
    };

    const parsedLeads: BusinessLead[] = [];
    let invalidCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const name = mappings.name ? getVal(row, mappings.name) : "";
      if (!name || name.length < 2) {
        invalidCount++;
        continue;
      }

      const rawPhone = mappings.phone ? getVal(row, mappings.phone) : "";
      const rawEmail = mappings.email ? getVal(row, mappings.email) : "";
      const rawWebsite = mappings.website ? getVal(row, mappings.website) : "";
      const address = mappings.address ? getVal(row, mappings.address) : "";
      const category = mappings.category ? getVal(row, mappings.category) : "Imported Lead";
      const placeId = mappings.placeId ? getVal(row, mappings.placeId) : undefined;
      const rawRating = mappings.rating ? parseFloat(getVal(row, mappings.rating)) : null;
      const rawReviews = mappings.reviews ? parseInt(getVal(row, mappings.reviews), 10) : null;

      // Section 2 Data Integrity Validations
      const phoneRes = validatePhone(rawPhone, "BD");
      const webRes = classifyWebsite(rawWebsite);
      const emailRes = validateEmail(rawEmail, webRes.website);

      const leadPartial: Partial<BusinessLead> = {
        name,
        category,
        address,
        phoneStatus: phoneRes.phoneStatus,
        websiteStatus: webRes.websiteStatus,
        email: emailRes.email,
        emailStatus: emailRes.emailStatus,
        rating: isNaN(rawRating as any) ? null : rawRating,
        userRatingCount: isNaN(rawReviews as any) ? null : rawReviews,
      };

      const scoreRes = calculateLeadScore(leadPartial);
      const dataQuality = assessDataQuality(leadPartial);

      const lead: BusinessLead = {
        id: `csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        placeId: placeId || undefined,
        source: "csv_import",
        name,
        category,
        address: address || "Location via CSV",
        phone: phoneRes.phone,
        phoneE164: phoneRes.phoneE164,
        phoneStatus: phoneRes.phoneStatus,
        canWhatsApp: phoneRes.canWhatsApp,
        email: emailRes.email,
        emailStatus: emailRes.emailStatus,
        emailProvenance: emailRes.email ? "csv" : undefined,
        website: webRes.website,
        websiteStatus: webRes.websiteStatus,
        hasWebsite: webRes.websiteStatus === "Has Website",
        rating: leadPartial.rating,
        userRatingCount: leadPartial.userRatingCount,
        googleMapsUri: placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : null,
        googleMapsUrl: placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : null,
        dataQuality,
        leadScore: scoreRes.score,
        leadScoreTier: scoreRes.tier,
        fetchedAt: new Date().toISOString(),
        crmStatus: "New",
      };

      parsedLeads.push(lead);
    }

    // Deduplicate against internal set and existingLeads
    const uniqueIncoming = deduplicateLeads(parsedLeads);
    const existingPlaceIds = new Set(existingLeads.map((l) => l.placeId).filter(Boolean));
    const existingPhones = new Set(existingLeads.map((l) => l.phoneE164).filter(Boolean));

    const finalLeads: BusinessLead[] = [];
    let duplicatesCount = parsedLeads.length - uniqueIncoming.length;

    for (const lead of uniqueIncoming) {
      if (lead.placeId && existingPlaceIds.has(lead.placeId)) {
        duplicatesCount++;
        continue;
      }
      if (lead.phoneE164 && existingPhones.has(lead.phoneE164)) {
        duplicatesCount++;
        continue;
      }
      finalLeads.push(lead);
    }

    setSummary({
      totalRows: rawRows.length,
      imported: finalLeads.length,
      skippedDuplicates: duplicatesCount,
      invalid: invalidCount,
      importedLeads: finalLeads,
    });

    setStep("summary");
  };

  const handleFinish = () => {
    onImportComplete(summary.importedLeads);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Google Maps / Outscraper CSV Import</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  100% Free
                </Badge>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-column mapping with phone, email & website validation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/30 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-4">
                  Click to choose CSV file
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Supports Google Maps scraper exports, Outscraper files, and custom CSV lists.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-Cost & Free:</strong> Imported leads bypass Google API calls and enter your verified pipeline with phone E.164 sanitization, junk email rejection, and lead scoring.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & PREVIEW */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Verify Detected Column Mapping
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    File: <span className="font-mono">{fileName}</span> ({rawRows.length} rows detected)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("upload")}
                  className="text-xs"
                >
                  Change File
                </Button>
              </div>

              {/* Mappings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                {[
                  { key: "name", label: "Business Name *", required: true },
                  { key: "category", label: "Category / Type" },
                  { key: "phone", label: "Phone Number" },
                  { key: "email", label: "Email Address" },
                  { key: "website", label: "Website URL" },
                  { key: "address", label: "Address / Street" },
                  { key: "rating", label: "Rating (Stars)" },
                  { key: "reviews", label: "Reviews Count" },
                  { key: "placeId", label: "Google Place ID" },
                ].map((col) => (
                  <div key={col.key} className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {col.label}
                    </label>
                    <select
                      value={(mappings as any)[col.key] || ""}
                      onChange={(e) =>
                        setMappings({ ...mappings, [col.key]: e.target.value })
                      }
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <option value="">-- Do not map --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table (first 3 rows) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">
                  Data Preview (First 3 Rows)
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Website</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rawRows.slice(0, 3).map((r, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            {mappings.name ? r[csvHeaders.indexOf(mappings.name)] || "-" : "-"}
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            {mappings.category ? r[csvHeaders.indexOf(mappings.category)] || "-" : "-"}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {mappings.phone ? r[csvHeaders.indexOf(mappings.phone)] || "-" : "-"}
                          </td>
                          <td className="py-2 px-3 text-blue-600 dark:text-blue-400">
                            {mappings.website ? r[csvHeaders.indexOf(mappings.website)] || "-" : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUMMARY */}
          {step === "summary" && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  CSV Import Validation Complete
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Validated against Section 2 data integrity rules.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    Imported
                  </div>
                  <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">
                    {summary.imported}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500 font-semibold">
                    Skipped (Duplicates)
                  </div>
                  <div className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {summary.skippedDuplicates}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                  <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                    Invalid / Empty
                  </div>
                  <div className="text-xl font-bold text-amber-800 dark:text-amber-200 mt-0.5">
                    {summary.invalid}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>

          {step === "mapping" && (
            <Button
              type="button"
              size="sm"
              disabled={!mappings.name}
              onClick={handleProcessImport}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-semibold shadow-xs"
            >
              <span>Validate & Import {rawRows.length} Leads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}

          {step === "summary" && (
            <Button
              type="button"
              size="sm"
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Add {summary.imported} Leads to Workspace</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
