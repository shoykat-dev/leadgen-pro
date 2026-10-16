import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service | LeadGen Pro",
  description: "Terms and conditions for using LeadGen Pro B2B lead generation platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Terms of Service
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

        {/* Content */}
        <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using LeadGen Pro, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must discontinue use of the application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              2. Permitted Use & Responsible Outreach
            </h2>
            <p>
              LeadGen Pro is provided strictly for legitimate business-to-business (B2B) communications between freelance professionals and prospective commercial clients.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>No Spamming:</strong> You agree not to use the contact information discovered through this service for high-volume automated spam, harassment, or unlawful promotional campaigns.
              </li>
              <li>
                <strong>Honoring Opt-Outs:</strong> If a business requests to not be contacted, you must immediately respect their preference and remove them from your outreach pipeline.
              </li>
              <li>
                <strong>No Scraping:</strong> You agree not to attempt to scrape or abuse Google Maps or other third-party services outside of our official free-tier APIs and user-imported CSVs.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              3. Data Accuracy Disclaimer
            </h2>
            <p>
              LeadGen Pro queries public listings via Google Places API and public web sources. While our data integrity layer validates formats, flags placeholders, and verifies E.164 phone numbers, we make no express warranties regarding the continuous operational status or availability of any listed commercial business.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              4. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, LeadGen Pro shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use this service, or any business outreach conduct undertaken by users.
            </p>
          </section>
        </div>

        {/* Footer Link */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>LeadGen Pro © 2026</span>
          <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
