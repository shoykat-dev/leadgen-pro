import { Suspense } from "react";
import { Globe, Mail, ShieldCheck, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CustomAuthCard } from "@/components/custom-auth-card";

export default function SignInPage() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center relative overflow-hidden px-4 py-8 sm:py-12 transition-colors duration-300">
      {/* Top right Theme Toggle */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left column: Branding & Value Proposition */}
        <div className="order-2 lg:order-1 lg:col-span-6 space-y-6 text-left">
          <div className="space-y-3 hidden lg:block">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                LeadGen <span className="text-blue-600 dark:text-blue-400">Pro</span>
              </h1>
            </div>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
              The premier B2B lead generation tool for web designers, agencies, and cold outreach specialists. Discover untapped business leads worldwide.
            </p>
          </div>

          {/* Key Advantages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs">
              <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                <Globe className="w-4 h-4" />
                <span>Worldwide Directory</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Access businesses across 190+ countries and thousands of cities worldwide.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs">
              <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 text-sm font-semibold">
                <Mail className="w-4 h-4" />
                <span>Emails & Phones</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Direct phone numbers, contact emails, and physical addresses extracted on demand.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-sm font-semibold">
                <Zap className="w-4 h-4" />
                <span>Missing Website Filter</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Isolate local businesses that lack a website and close high-ticket web design deals.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>DRM Data Protected</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Proprietary lead database secured with advanced anti-scraping and privacy shields.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Custom SignIn component with friendly errors */}
        <div className="order-1 lg:order-2 lg:col-span-6 flex flex-col justify-center items-center">
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center text-center mb-6">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm mb-3">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              LeadGen <span className="text-blue-600 dark:text-blue-400">Pro</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sign in to access global business leads & verified contacts
            </p>
          </div>

          <Suspense
            fallback={
              <div className="w-full max-w-md h-96 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <CustomAuthCard mode="sign-in" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
