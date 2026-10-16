# LeadGen Pro — B2B Lead Discovery & Outreach Engine

LeadGen Pro is a professional, production-quality B2B lead generation and cold outreach platform built for freelance web developers. It identifies high-intent local businesses worldwide (with primary focus on Bangladesh), particularly businesses **without a website** or with **outdated web presences**, allowing you to contact them directly via WhatsApp, phone, or email to offer modern web solutions.

---

## 🌟 Key Features

1. **Zero-Fake-Data Guarantee**:
   - Zero mock, placeholder, seeded, or synthetic leads anywhere in the application.
   - Contact numbers and emails are shown only when retrieved from official Google Places listings, discovered on the business's own public website, or provided through user CSV import.
   - Strict junk detection rejecting dummy patterns (e.g. `123456`, `345678`, trailing `000000`), junk domains (`example.com`, `localhost`, `sentry`, `wixpress`), and false-positive image extensions (`.png@2x`).

2. **Official Google Places API (New) Integration**:
   - Uses `POST https://places.googleapis.com/v1/places:searchText` with official FieldMask constants.
   - API keys are handled strictly server-side and never exposed in client bundles.
   - **Hard Budget Guard**: Tracks daily and monthly calls in local SQLite. Default limits: `GOOGLE_MONTHLY_CALL_LIMIT=900`, `GOOGLE_DAILY_CALL_LIMIT=30`. Calls are automatically blocked when limits are reached with friendly user messages.
   - **30-Day Response Caching**: Normalized search queries and viewports are cached in SQLite for up to 30 days to avoid duplicate API calls.

3. **Area Coverage Scan Engine**:
   - Systematic scanning of target neighborhoods and cities.
   - **Scan Modes**: (a) Web-service-relevant priority categories (21 prime industries), (b) Selected categories, (c) All 99 services A to Z.
   - **Adaptive Quadrant Tiling**: If a dense area hits Google's page cap (20 results), the engine automatically splits the viewport into 4 quadrants (SW, SE, NW, NE) to discover hidden businesses within budget.
   - **Honest Coverage Report**: Displays category-by-category status: *Complete*, *Probably complete*, or *Possibly incomplete* with exact reasons.

4. **Lead Scoring Formula (0–100)**:
   - **No Website**: +40 points (prime cold outreach prospect)
   - **Social Only** (FB/Instagram/Linktree): +30 points
   - **Valid Phone (E.164)**: +15 points (WhatsApp ready)
   - **Valid Email**: +10 points
   - **Rating >= 4.0**: +10 points (established reputation)
   - **Reviews >= 50**: +10 points (>= 20: +5 points)

5. **On-Demand Website Audit**:
   - Server-side health checker evaluating HTTPS security, response time (ms), mobile viewport responsiveness, page title, and meta description.
   - Highlights specific pitch angles (e.g. slow mobile loading, missing SEO) to close redesign clients.

6. **Honest Email Finder**:
   - Crawls the business's own domain homepage, `/contact`, and `/about` pages for public `mailto:` links and email addresses.
   - Validates syntax and flags whether the email matches the business's official domain.

7. **Free Fill-in Options**:
   - **Google Maps / Outscraper CSV Import**: Auto-detects columns, applies Section 2 data integrity validation, deduplicates against existing leads, and imports zero-cost records.
   - **Add Lead Manually**: Instant entry with real-time phone E.164 conversion and email validation.

8. **Multi-Channel Outreach Engine**:
   - **1-Click WhatsApp**: Formatted `https://wa.me/<E164>?text=<encoded_pitch>` links with unverified phone guard.
   - **Pre-Built Outreach Templates**: 3 English & 3 Bengali scripts for "No Website" prospects, 2 for "Outdated Website" redesigns, and email templates with standard unsubscribe lines.
   - Automatic activity logging in SQLite updating lead status to "Contacted" with timestamp.

9. **My Leads CRM**:
   - Pipeline tracking with statuses: *New*, *Contacted*, *Replied*, *Meeting*, *Won*, *Lost*.
   - **Follow-up due alert**: Prioritizes leads requiring follow-up today or overdue.
   - Export formatted for CRM systems, Apollo, Instantly, and Lemlist.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: Local SQLite via native Node `node:sqlite` (`leadgen.db`)
- **Authentication**: Clerk (`@clerk/nextjs`, `@clerk/themes`)
- **Validation**: `libphonenumber-js`
- **Styling**: Tailwind CSS & Shadcn UI design system
- **Icons**: `lucide-react`

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` and configure your credentials:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Google Places API (New) - Server Side Only
GOOGLE_PLACES_API_KEY=AIzaSy...

# Budget Guards (Free Tier Protection)
GOOGLE_MONTHLY_CALL_LIMIT=900
GOOGLE_DAILY_CALL_LIMIT=30
```

> **Note**: If `GOOGLE_PLACES_API_KEY` is not provided, the app continues to function seamlessly with CSV imports, manual lead management, and CRM outreach.

---

## 🌐 Google Cloud Setup Guide

To obtain and restrict your Google Places API key:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `LeadGen-Pro`).
3. Enable billing (Google provides a monthly free tier credit for Places API).
4. Navigate to **APIs & Services > Library** and enable **Places API (New)**.
5. Navigate to **APIs & Services > Credentials** and click **Create Credentials > API Key**.
6. **Restrict the Key**:
   - Under **API restrictions**, select **Restrict key** and choose only **Places API (New)**.
   - Under **Application restrictions**, leave as None or restrict to your server IP. *Never expose this key in client-side code.*
7. Set up a Budget Alert in **Billing > Budgets & alerts** at $1 to ensure you are alerted before any unintended spend.

---

## 🗄️ Database & Serverless Persistence Note

LeadGen Pro stores budget usage, response cache, scan jobs, and CRM leads locally in `./data/leadgen.db` using native `node:sqlite`.

> ⚠️ **Important Deployment Notice**:  
> On serverless platforms like **Vercel**, the local filesystem is ephemeral and does not persist SQLite files across function cold-starts or redeployments.
> 
> To deploy permanently to production:
> - Use a free hosted SQLite-compatible database service like **Turso** (`@libsql/client`) or **Supabase** (PostgreSQL free tier).
> - All database queries in `src/lib/db.ts` are isolated behind a repository pattern, making it straightforward to swap the driver for Turso or Supabase.

---

## 🧪 Automated Testing & QA

Run the comprehensive QA verification suite:

```bash
npm run qa
```

This automated script performs:
1. `.gitignore` audit (ensuring `.env*`, `*.sqlite`, `*.db`, and `data/` are never committed).
2. Secrets scan (verifying no Google API keys like `AIza...` exist in repository files or client bundles).
3. No-fake-data scanner (confirming zero hardcoded dummy phones, synthetic emails, or mock arrays exist in `src/`).
4. Data integrity unit tests (phone E.164 parsing, junk email rejection, lead scoring formula, contactable counts, and adaptive quadrant tiling).

---

## 📜 Compliance & Attribution

- **GDPR & CAN-SPAM**: All commercial communications should include clear sender identification and opt-out instructions. Default email templates provide an unsubscribe reply option.
- **Google Maps Platform**: Public listings and place IDs are attributed to Google Maps Platform in accordance with terms of use.
