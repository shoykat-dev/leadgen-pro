"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Info,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { getAuthErrorMessage, AuthErrorInfo } from "@/lib/auth-errors";
import { AuthErrorAlert } from "@/components/auth-error-alert";
import { GuestLoginButton } from "@/components/guest-login-button";

interface CustomAuthCardProps {
  mode: "sign-in" | "sign-up";
}

export function CustomAuthCard({ mode }: CustomAuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Clerk hooks
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email verification state for sign-up
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Error & notice states
  const [error, setError] = useState<AuthErrorInfo | null>(() => {
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    if (errorParam || errorDesc) {
      return getAuthErrorMessage(errorDesc || errorParam, mode);
    }
    return null;
  });

  const [infoNotice, setInfoNotice] = useState<string | null>(() => {
    const reasonParam = searchParams.get("reason");
    const messageParam = searchParams.get("message");
    if (reasonParam === "auth_required" || messageParam) {
      return messageParam || "Please sign in to continue to your destination.";
    }
    return null;
  });

  // Keep synced if search parameters change dynamically
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    const reasonParam = searchParams.get("reason");
    const messageParam = searchParams.get("message");

    if (errorParam || errorDesc) {
      const parsedError = getAuthErrorMessage(errorDesc || errorParam, mode);
      setError(parsedError);
    } else {
      setError(null);
    }

    if (reasonParam === "auth_required" || messageParam) {
      setInfoNotice(messageParam || "Please sign in to continue to your destination.");
    } else {
      setInfoNotice(null);
    }
  }, [searchParams, mode]);

  // Clear errors when typing
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (error) setError(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (error) setError(null);
  };

  // 1. Google OAuth Handler
  const handleGoogleAuth = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      if (mode === "sign-in") {
        if (!isSignInLoaded || !signIn) {
          throw new Error("Auth system is still initializing. Please wait a moment.");
        }
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sign-in/sso-callback",
          redirectUrlComplete: searchParams.get("redirect_url") || "/",
        });
      } else {
        if (!isSignUpLoaded || !signUp) {
          throw new Error("Auth system is still initializing. Please wait a moment.");
        }
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sign-up/sso-callback",
          redirectUrlComplete: searchParams.get("redirect_url") || "/",
        });
      }
    } catch (err: unknown) {
      console.error("[Auth] Google sign-in failure:", err);
      const friendlyError = getAuthErrorMessage(err, mode);
      setError(friendlyError);
      setIsGoogleLoading(false);
    }
  };

  // 2. Email & Password Sign-in
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;

    if (!email || !password) {
      setError({
        title: "Required Fields",
        message: "Please enter both your email and password.",
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId });
        const dest = searchParams.get("redirect_url") || "/";
        router.push(dest);
      } else {
        setError({
          title: "Sign-in Incomplete",
          message: "Additional verification is required. Please check your email.",
        });
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      console.error("[Auth] Sign-in failure:", err);
      const friendlyError = getAuthErrorMessage(err, "sign-in");
      setError(friendlyError);
      setIsSubmitting(false);
    }
  };

  // 3. Email & Password Sign-up
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;

    if (!email || !password) {
      setError({
        title: "Required Fields",
        message: "Please provide an email and password to create your account.",
      });
      return;
    }

    if (password.length < 8) {
      setError({
        title: "Password Too Short",
        message: "Password must be at least 8 characters long for account security.",
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signUp.create({
        emailAddress: email,
        password: password,
      });

      // Send verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
      setIsSubmitting(false);
    } catch (err: unknown) {
      console.error("[Auth] Sign-up failure:", err);
      const friendlyError = getAuthErrorMessage(err, "sign-up");
      setError(friendlyError);
      setIsSubmitting(false);
    }
  };

  // 4. Verify Email Code on Sign-up
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;

    setIsVerifying(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === "complete") {
        await setSignUpActive({ session: result.createdSessionId });
        const dest = searchParams.get("redirect_url") || "/";
        router.push(dest);
      } else {
        setError({
          title: "Verification Incomplete",
          message: "Please complete all account setup requirements.",
        });
        setIsVerifying(false);
      }
    } catch (err: unknown) {
      console.error("[Auth] Code verification failure:", err);
      setError({
        title: "Invalid Code",
        message: "The verification code is invalid or has expired. Please try again.",
      });
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
      {/* Friendly Informational Notice (e.g. redirected from protected page) */}
      {infoNotice && (
        <div className="mb-5 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2.5 shadow-2xs">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{infoNotice}</span>
        </div>
      )}

      {/* Styled Inline Error Alert Box (matching dark theme) */}
      <AuthErrorAlert
        error={error}
        onDismiss={() => setError(null)}
        onRetry={() => {
          setError(null);
          if (mode === "sign-in") {
            setEmail("");
            setPassword("");
          }
        }}
        className="mb-5"
      />

      {/* Sign-up Email Verification Screen */}
      {pendingVerification ? (
        <form onSubmit={handleVerificationSubmit} className="space-y-4">
          <div className="text-center mb-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-2">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Verify your Email
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              We sent a verification code to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="e.g. 123456"
              maxLength={8}
              autoFocus
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center font-mono tracking-widest text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || !verificationCode.trim()}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Code...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Verification</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPendingVerification(false)}
            className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mt-2"
          >
            ← Back to sign up
          </button>
        </form>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6 text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {mode === "sign-in"
                ? "Sign in to access global business leads and directory intelligence."
                : "Get started with high-converting B2B directory discovery."}
            </p>
          </div>

          {/* 1. Primary Google OAuth Button (with loading spinner & double-click guard) */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isGoogleLoading || isSubmitting}
            className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                {/* Google SVG Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white dark:bg-[#0f172a] px-3 text-slate-400 dark:text-slate-500 font-semibold tracking-wider">
                or with email
              </span>
            </div>
          </div>

          {/* 2. Email & Password Form */}
          <form
            onSubmit={mode === "sign-in" ? handleSignInSubmit : handleSignUpSubmit}
            className="space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full h-11 mt-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === "sign-in" ? "Signing in..." : "Creating account..."}</span>
                </>
              ) : (
                <>
                  <span>{mode === "sign-in" ? "Sign in with Email" : "Create Account"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Switcher between Sign-in and Sign-up */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === "sign-in" ? (
              <span>
                Don&apos;t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Sign up
                </Link>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Sign in
                </Link>
              </span>
            )}
          </div>

          {/* Guest Mode exploration button */}
          <div className="mt-3">
            <GuestLoginButton />
          </div>
        </>
      )}
    </div>
  );
}
