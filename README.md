# LeadGen Pro — Free B2B Lead Generation Engine

LeadGen Pro is an ultra-modern, high-performance B2B lead generation web application built with **Next.js (App Router)**, **TypeScript (Strict Mode)**, **Tailwind CSS**, **Shadcn UI**, and **Clerk Authentication**.

> **CRITICAL FEATURE: 100% FREE TO RUN**  
> This project uses **OpenStreetMap (Overpass API)** for real-time global business data extraction.  
> **No Google Places API, no paid subscriptions, and no credit cards are required.**

---

## 🚀 Key Features

1. **4 Cascading Dependent Dropdowns**:
   - **Country**: Populates all countries worldwide with flag emojis using `country-state-city` (Defaults to 🇧🇩 Bangladesh).
   - **State / Region**: Dynamically populates states based on selected country (Defaults to Dhaka Division).
   - **City / Area**: Dynamically populates cities based on selected state + custom neighborhood input (e.g. `Banani`, `Gulshan`, `Dhanmondi`).
   - **Business Category**: 12 high-intent niches (IT Agency & Software, Restaurants, Beauty Salons, Real Estate, Gyms, Clinics, Plumbers, Legal, Marketing, Hotels, Auto, Retail).

2. **Ultra-Fast Overpass OSM Engine**:
   - Parallel mirror querying across top OpenStreetMap Overpass servers with automated fallback.
   - Extracts Business Name, Phone Number, Verified Email / Gmail, Street Address, Website URL, Lat/Lng coordinates, and OpenStreetMap map view links.

3. **High-Conversion Cold Outreach Data Table**:
   - **Website Status Badges**:
     - 🟢 **Has Website**: Emerald badge with direct link to their site.
     - 🔴 **No Website**: Glowing red badge for high-ticket web design & marketing cold outreach.
   - **Filter Pills**: "All", "With Website", and "Without Website (count)" with active red glowing badge.
   - **Live In-Table Search**: Filter leads by name, phone, email, or address in real-time.
   - **Map Action**: 1-click "View Map" opening direct OpenStreetMap marker pin.
   - **1-Click CSV Export**: Instant download formatted for CRM, Apollo, Instantly, or Lemlist.

4. **Clerk Authentication & Dark Mode Layout**:
   - Modern Sign-In & Sign-Up page with value proposition cards.
   - Interactive user profile modal showing account security, session details, and sign-out controls.
   - 1-Click "Quick Live Demo" option for immediate testing without login friction.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS & Shadcn UI design system
- **Authentication**: Clerk (`@clerk/nextjs`, `@clerk/themes`)
- **Location Database**: `country-state-city`
- **Data Engine**: OpenStreetMap Overpass API (Free)
- **Icons**: `lucide-react`

---

## ⚙️ Running Locally

1. **Navigate to the project directory**:
   ```bash
   cd C:\Users\USER\.gemini\antigravity-ide\scratch\leadgen-pro
   ```

2. **Environment Variables** (`.env.local` is already configured):
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_aHVtYW5lLWJlZGJ1Zy05MjA2LmNsZXJrLmFjY291bnRzLmRldiQ
   CLERK_SECRET_KEY=sk_test_gnc63aMKHUGQOTGGz1ilMj2NySziIgpK0tQ4fBRGLu
   ```

3. **Start the Development Server**:
   ```bash
   npm.cmd run dev
   ```

4. **Open in your browser**:
   ```
   http://localhost:3000
   ```

---

## 🛡️ Error Handling & Friendly Auth Architecture

LeadGen Pro incorporates an enterprise-grade, human-friendly error handling system designed to prevent ugly stack traces, provider codes, or blank screens:

### 1. Centralized Auth Error Mapper (`src/lib/auth-errors.ts`)
All authentication errors (Google OAuth popups, SSO callbacks, email/password validation, rate limits) are mapped consistently to human-friendly messages via `getAuthErrorMessage(error, context)`. Raw provider errors and stack traces are logged exclusively to server/developer consoles.

| Scenario / Code | User-Facing Message | Inline Action |
| :--- | :--- | :--- |
| **Account Not Found** | *"No account found with this Google email. Please create an account first, then sign in."* | "Create account" + "Try another account" |
| **Popup Cancelled / Closed** | *"Sign-in was cancelled. Please try again."* | Retry |
| **Popup Blocked** | *"Your browser blocked the sign-in window. Please allow popups for this site and try again."* | Retry |
| **Access Denied / Refused** | *"Google sign-in permission was denied. Please try again and allow access."* | Retry |
| **Account Disabled / Locked** | *"This account has been disabled. Please contact support."* | "Contact support" |
| **Different Sign-In Method** | *"This email is already registered using a different method. Please sign in with your email and password."* | "Sign in with password" |
| **Network Error / Offline** | *"Network problem. Please check your internet connection and try again."* | Retry |
| **Incorrect Password / Email** | *"Incorrect email or password."* (preserves privacy) | Retry |
| **Rate Limited** | *"Too many attempts. Please wait a few minutes and try again."* | Retry |
| **Account Already Exists (Sign-up)** | *"This Google account already has an account. Please sign in instead."* | "Sign in" |
| **Generic / Unknown Error** | *"Something went wrong while signing in. Please try again."* | Retry |

### 2. Custom Error Pages & Boundaries
- **`app/not-found.tsx`**: Custom 404 page styled with dark theme branding, `noindex` meta, "Go to Home", and contextual back navigation ("Go to Directory" if signed in, "Go to Sign in" if signed out).
- **`app/error.tsx`**: Runtime error page providing a `reset()` button and "Go to Home" without exposing production stack traces.
- **`app/global-error.tsx`**: Root layout emergency boundary with standalone HTML/body structure.
- **`app/forbidden.tsx`**: Custom 403 Forbidden screen.
- **`AppErrorBoundary` (`src/components/app-error-boundary.tsx`)**: Component-level React error boundary preventing single widget errors from crashing the main directory layout.
- **`OfflineBanner` (`src/components/offline-banner.tsx`)**: Real-time network listener showing a floating status warning whenever connectivity drops.
- **Standardized API Errors**: `/api/places` returns consistent JSON `{ error: { code, message } }` with proper HTTP status codes, and `SearchPanel` renders inline dark-themed alerts with zero disruptive popups.
