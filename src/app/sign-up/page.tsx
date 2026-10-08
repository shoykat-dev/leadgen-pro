import { SignUp } from "@clerk/nextjs";
import { Zap } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center relative overflow-hidden px-4 py-12">
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            LeadGen <span className="text-blue-600">Pro</span>
          </h1>
        </div>

        <div className="w-full p-6 rounded-2xl bg-white border border-slate-200 shadow-xl flex justify-center">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
          />
        </div>
      </div>
    </div>
  );
}
