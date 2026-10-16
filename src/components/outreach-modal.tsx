"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Mail,
  Phone,
  Copy,
  Check,
  ExternalLink,
  X,
  AlertTriangle,
  Send,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BusinessLead } from "@/lib/data-integrity";
import {
  DEFAULT_OUTREACH_TEMPLATES,
  OutreachTemplate,
  fillTemplate,
} from "@/lib/outreach-templates";

interface OutreachModalProps {
  lead: BusinessLead | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (leadId: string, newStatus: string) => void;
  searchLocation?: { city?: string; area?: string };
}

export function OutreachModal({
  lead,
  isOpen,
  onClose,
  onStatusUpdated,
  searchLocation,
}: OutreachModalProps) {
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("en-no-web-1");
  const [customBody, setCustomBody] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [userSettings, setUserSettings] = useState({
    myName: "Sabbir Hossain",
    myService: "Full-Stack Web Developer & WordPress Specialist",
    portfolioLink: "https://sabbirhossain.dev",
  });

  // Load user settings on open
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) {
          setUserSettings(data.settings);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Filter templates for current channel
  const channelTemplates = useMemo(() => {
    return DEFAULT_OUTREACH_TEMPLATES.filter((t) => t.channel === channel);
  }, [channel]);

  // Reset selected template when channel changes
  useEffect(() => {
    if (channelTemplates.length > 0) {
      const match = channelTemplates.find((t) => t.id === selectedTemplateId);
      if (!match) {
        setSelectedTemplateId(channelTemplates[0].id);
      }
    }
  }, [channel, channelTemplates, selectedTemplateId]);

  // Fill active template with lead variables
  useEffect(() => {
    if (!lead) return;
    const tpl = DEFAULT_OUTREACH_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;

    const filled = fillTemplate(tpl.body, {
      business_name: lead.name,
      category: lead.category,
      city: searchLocation?.city || "your city",
      area: searchLocation?.area || "your area",
      my_name: userSettings.myName,
      my_service: userSettings.myService,
      portfolio_link: userSettings.portfolioLink,
    });

    setCustomBody(filled);

    if (tpl.subject) {
      const filledSub = fillTemplate(tpl.subject, {
        business_name: lead.name,
        category: lead.category,
        city: searchLocation?.city || "your city",
        area: searchLocation?.area || "your area",
        my_name: userSettings.myName,
        my_service: userSettings.myService,
        portfolio_link: userSettings.portfolioLink,
      });
      setCustomSubject(filledSub);
    } else {
      setCustomSubject("");
    }
  }, [lead, selectedTemplateId, userSettings, searchLocation]);

  if (!isOpen || !lead) return null;

  const phoneValidForWhatsApp = lead.canWhatsApp && lead.phoneE164;
  const hasEmail = Boolean(lead.email && lead.emailStatus !== "Invalid format");

  // Handle outreach launch
  const handleLaunchOutreach = async () => {
    // 1. Log to DB
    try {
      await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          channel,
          message: customBody,
        }),
      });
      onStatusUpdated?.(lead.id, "Contacted");
    } catch (err) {
      console.warn("Outreach log error:", err);
    }

    // 2. Open external protocol
    if (channel === "whatsapp" && phoneValidForWhatsApp) {
      const cleanE164 = lead.phoneE164!.replace(/[^0-9]/g, "");
      const waUrl = `https://wa.me/${cleanE164}?text=${encodeURIComponent(customBody)}`;
      window.open(waUrl, "_blank");
    } else if (channel === "email" && lead.email) {
      const mailtoUrl = `mailto:${lead.email}?subject=${encodeURIComponent(
        customSubject || `Web development proposal for ${lead.name}`
      )}&body=${encodeURIComponent(customBody)}`;
      window.location.href = mailtoUrl;
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Outreach to {lead.name}</span>
                <Badge
                  variant={lead.websiteStatus === "No Website" ? "destructive" : "outline"}
                  className="text-[10px] px-2 py-0.5"
                >
                  {lead.websiteStatus}
                </Badge>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lead.category} • {lead.address}
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

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Channel Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                channel === "whatsapp"
                  ? "bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
              <span>WhatsApp Pitch</span>
              {phoneValidForWhatsApp ? (
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                  {lead.phoneE164}
                </span>
              ) : (
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded">
                  Unverified
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                channel === "email"
                  ? "bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-300" />
              <span>Email Pitch</span>
              {hasEmail ? (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded max-w-[120px] truncate">
                  {lead.email}
                </span>
              ) : (
                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                  No Email
                </span>
              )}
            </button>
          </div>

          {/* Validation Warnings */}
          {channel === "whatsapp" && !phoneValidForWhatsApp && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Phone number format unverified</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Direct WhatsApp link is disabled because {lead.phone || "the phone"} is not a verified E.164 mobile number. You can call the business or edit the phone number in My Leads.
                </p>
              </div>
            </div>
          )}

          {channel === "email" && !hasEmail && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No direct email on file</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Google Places does not supply email addresses. For businesses without a website, WhatsApp and phone calls are the primary conversion channel.
                </p>
              </div>
            </div>
          )}

          {/* Template Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Message Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {channelTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Email Subject Line (if email) */}
          {channel === "email" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Subject
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>
          )}

          {/* Message Body Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Personalized Message (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy text"}</span>
              </button>
            </div>
            <textarea
              rows={channel === "email" ? 9 : 6}
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyMessage}
              className="text-xs gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Message"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={
                (channel === "whatsapp" && !phoneValidForWhatsApp) ||
                (channel === "email" && !hasEmail)
              }
              onClick={handleLaunchOutreach}
              className={`text-xs gap-1.5 font-semibold shadow-xs ${
                channel === "whatsapp"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {channel === "whatsapp" ? "Open WhatsApp & Log" : "Send Email & Log"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
