import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeadGen Pro | High-Performance B2B Lead Generation Engine",
  description:
    "Ultra-fast, zero-cost B2B lead discovery engine. Discover local businesses, phone numbers, verified emails, and target businesses without websites for high-conversion web development cold outreach worldwide.",
  keywords: [
    "Lead Generation",
    "B2B Leads",
    "Cold Outreach",
    "Local Businesses",
    "Email Finder",
    "Worldwide Business Directory",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#2563eb",
          colorBackground: "#ffffff",
          colorForeground: "#0f172a",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "bg-white border border-slate-200 shadow-xl",
          navbar: "border-slate-200",
          headerTitle: "text-slate-900 font-bold",
          headerSubtitle: "text-slate-500",
          formButtonPrimary:
            "bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all",
          socialButtonsBlockButton:
            "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900",
          formFieldInput:
            "bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-500",
          footerActionLink: "text-blue-600 hover:text-blue-500",
        },
      }}
    >
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body
          suppressHydrationWarning
          className="min-h-full bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600/20 selection:text-blue-800"
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
