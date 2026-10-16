import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy | LeadGen Pro",
  description: "Privacy policy, data retention, GDPR and CAN-SPAM compliance details for LeadGen Pro.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-500">
                Last updated: October 2026 • LeadGen Pro
              </p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Directory</span>
            </Button>
          </Link>
        </div>

        {/* Policy Content */}
        <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              1. Information We Collect
            </h2>
            <p>
              LeadGen Pro is a B2B business discovery and outreach tool designed for freelance web developers. We collect:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Public Directory Data:</strong> Public business names, physical addresses, phone numbers, and websites queried through official Google Places API endpoints or uploaded via user-provided CSV files.
              </li>
              <li>
                <strong>Account Data:</strong> Basic profile credentials provided through Clerk authentication (such as name and email address).
              </li>
              <li>
                <strong>User Settings & CRM Data:</strong> Notes, pipeline status, and outreach logs stored in your local SQLite database.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              2. Zero Fake Data & Honest Provenance
            </h2>
            <p>
              LeadGen Pro strictly adheres to a zero-synthetic-data policy. We never invent, synthesize, or randomly generate phone numbers or email addresses. Contact data is displayed only when provided directly by official Google Places responses, retrieved from public business websites, or supplied via your manual CSV import.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              3. Google Places API Compliance & Data Caching
            </h2>
            <p>
              In accordance with Google Maps Platform Terms of Service:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Cached search responses are stored strictly for performance optimization and automatically expire within 30 days.
              </li>
              <li>
                Permanent records in your CRM store the unique Google <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">place_id</code> alongside user-entered notes and outreach logs.
              </li>
              <li>
                All Google-sourced listings provide direct links back to Google Maps for user verification.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              4. CAN-SPAM, GDPR, and Responsible B2B Outreach
            </h2>
            <p>
              When reaching out to prospective clients via email or WhatsApp:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                All default email templates include clear identification of the sender and an explicit opt-out mechanism (e.g. <em>&quot;To opt out of future emails, reply UNSUBSCRIBE&quot;</em>).
              </li>
              <li>
                Users are solely responsible for complying with local regulations regarding commercial communications, including the CAN-SPAM Act in the United States and GDPR regulations in the European Union.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              5. Contact Us
            </h2>
            <p>
              If you have any questions or data removal requests regarding LeadGen Pro, please contact us at{" "}
              <a href="mailto:privacy@leadgenpro.dev" className="text-blue-600 dark:text-blue-400 underline">
                privacy@leadgenpro.dev
              </a>.
            </p>
          </section>
        </div>

        {/* Footer Link */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>LeadGen Pro © 2026</span>
          <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
            View Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
