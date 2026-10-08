import { SignIn } from "@clerk/nextjs";
import { Globe, Mail, ShieldCheck, Zap } from "lucide-react";
import { GuestLoginButton } from "@/components/guest-login-button";

export default function SignInPage() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center relative overflow-hidden px-4 py-12">
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left column: Branding & Value Proposition */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                LeadGen <span className="text-blue-600">Pro</span>
              </h1>
            </div>
            <p className="text-base text-slate-600 leading-relaxed max-w-lg">
              The premier B2B lead generation tool for web designers, agencies, and cold outreach specialists. Discover untapped business leads worldwide.
            </p>
          </div>

          {/* Key Advantages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-2.5 text-blue-600 text-sm font-semibold">
                <Globe className="w-4 h-4" />
                <span>Worldwide Directory</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Access businesses across 190+ countries and thousands of cities worldwide.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-2.5 text-indigo-600 text-sm font-semibold">
                <Mail className="w-4 h-4" />
                <span>Emails & Phones</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Direct phone numbers, contact emails, and physical addresses extracted on demand.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-2.5 text-rose-600 text-sm font-semibold">
                <Zap className="w-4 h-4" />
                <span>Missing Website Filter</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Isolate local businesses that lack a website and close high-ticket web design deals.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-2.5 text-emerald-600 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>1-Click CSV Export</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Instant download formatted for Apollo, Instantly, Lemlist, or your favorite CRM.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: Clerk SignIn component + Quick Demo */}
        <div className="lg:col-span-6 flex flex-col justify-center items-center">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col justify-center items-center">
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
            <GuestLoginButton />
          </div>
        </div>
      </div>
    </div>
  );
}
