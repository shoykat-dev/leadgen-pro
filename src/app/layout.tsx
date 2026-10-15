import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { ContentProtection } from "@/components/content-protection";
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
          borderRadius: "0.75rem",
        },
        elements: {
          card: "bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl",
          navbar: "border-slate-200 dark:border-slate-800",
          headerTitle: "text-slate-900 dark:text-white font-bold",
          headerSubtitle: "text-slate-500 dark:text-slate-400",
          formButtonPrimary:
            "bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all",
          socialButtonsBlockButton:
            "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
          formFieldInput:
            "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500",
          footerActionLink: "text-blue-600 dark:text-blue-400 hover:text-blue-500",
        },
      }}
    >
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <head>
          <meta name="color-scheme" content="light dark" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var stored = localStorage.getItem('leadgen_theme');
                    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    if (isDark) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                    var meta = document.querySelector('meta[name="color-scheme"]');
                    if (meta) {
                      meta.content = stored ? stored : 'light dark';
                    }
                  } catch (e) {}
                })();
              `,
            }}
          />
        </head>
        <body
          suppressHydrationWarning
          className="min-h-full bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600/20 selection:text-blue-800 transition-colors duration-200"
        >
          <ThemeProvider>
            <ContentProtection>{children}</ContentProtection>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
