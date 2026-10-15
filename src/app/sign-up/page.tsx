import { Suspense } from "react";
import { Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CustomAuthCard } from "@/components/custom-auth-card";

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center relative overflow-hidden px-4 py-12 transition-colors duration-300">
      {/* Top right Theme Toggle */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            LeadGen <span className="text-blue-600 dark:text-blue-400">Pro</span>
          </h1>
        </div>

        <Suspense
          fallback={
            <div className="w-full max-w-md h-96 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <CustomAuthCard mode="sign-up" />
        </Suspense>
      </div>
    </div>
  );
}
