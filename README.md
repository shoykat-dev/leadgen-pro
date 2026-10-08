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
