# LeadGen Pro — B2B Lead Discovery & Outreach Engine

LeadGen Pro is a professional B2B lead generation and cold outreach platform built for freelance web developers. It identifies local businesses worldwide — **foreign markets first (Europe, then USA and Canada)** — particularly businesses **without a website** or with **outdated web presences**, allowing you to contact them directly via WhatsApp, phone, or email to offer modern web solutions. Bangladesh is supported as a search market but is **not** the primary target.

---

## 🌟 Key Features

1. **Zero-Fake-Data Guarantee**:
   - Zero mock, placeholder, seeded, or synthetic leads anywhere in the application. Every displayed value traces to a real record in OpenStreetMap, Overture Maps, the business's own website, or a user CSV import / manual entry.
   - Missing data is shown as "Not available" — never guessed or pattern-generated.
   - Strict junk detection rejecting dummy phone patterns (e.g. repeated-digit runs like `111111`, sequential digits like `123456`/`345678`, trailing `000000`) and junk email domains (`example.com`, `localhost`, `sentry`, `wixpress`). Placeholder-looking numbers get a "Suspicious number — verify before use" flag and are never labelled "Format valid".
   - **URL validation**: malformed website/social values from directory records are dropped, never displayed as links — an email stored as a website, a backslash in the URL, or a doubled domain (`facebook.com/www.facebook.com/...`) counts as "not available". A social URL is never built from an email address, and a Facebook field holding an Instagram link is rejected.
   - **Honest website label**: "No website in directory record" means only that no website was found in the directory data — the business may still have a real site (chains usually do).

2. **Free Data Sources (Primary)**:
   - **OpenStreetMap / Overpass API** — the live search engine. Multi-tag mapping per category (101 categories), 4-mirror rotation with automatic failover, per-mirror timeout, and a mandatory Haversine post-filter on the final result list so every lead is inside the stated radius of the selected area.
   - **Name-keyword fallback** — service trades (cleaning, plumbers, electricians, roofers) are rarely category-tagged in OSM, so a second query matches business names against per-category keywords and unions the results with the tag set. Name-only matches are badged **"Matched by name — verify category"** and carry `Match Type: Name` in the CSV. Strict gates apply: an element whose own tag maps to a different category is never name-matched in, dry cleaning never enters Cleaning, and every name match needs commercial context (a business tag, a contact tag, or a commercial building).
   - **60-second budget + honest partial results** — every Overpass attempt in a search shares one deadline (tag query, per-tag split fallback, name query). If the deadline cuts a fetch short, the search returns what was collected with a "Partial results — data source busy, showing N businesses" note instead of failing; partial results are never cached. The client aborts at 65s with a retry offer.
   - **Coverage Audit** — one click ("Coverage Audit" in the search panel) counts tag + name matches for all 101 categories in the chosen area, flags weak categories (<5 businesses), and downloads the table as CSV.
   - **Area precision** — every area centre is reverse-geocoded against real geography and every radius fits its district (Paris 1st 1000 m, Sydney CBD 1500 m, Downtown Dubai 1200 m, Downtown Toronto 2000 m, Soho 1000 m). A guardrail caps any central-district radius above 2000 m.
   - **Overture Maps Places** (CDLA Permissive 2.0) — merged into search results by name + coordinates (within 100 m), with per-field source badges (OSM / Overture). Unmatched in-radius Overture rows are added as extra leads only when their Overture categories genuinely match the target category (whole-word keyword gate + food-category exclusions).
   - **7-Day Response Caching**: area + category + radius results are cached server-side (in-memory + `.cache/`) and served instantly on repeat searches with a "Last updated" date.
   - **Current limitation (honest)**: the repo ships only a 12-row Bangladesh snapshot (`data/overture_places_bd.json`, Banani/Gulshan) auto-seeded into the local database. It is a hand-assembled snapshot, not a verified Overture extract. Outside Bangladesh the Overture table is empty, so the merge currently adds nothing there — run the real import (see below) to enable it for Europe / North America.

3. **Area Coverage Scan Engine** (requires the optional Google key — see below):
   - Systematic scanning of target neighborhoods and cities.
   - **Scan Modes**: (a) Web-service-relevant priority categories (21 prime industries), (b) Selected categories, (c) All 101 services A to Z.
   - **Adaptive Quadrant Tiling**: If a dense area hits Google's page cap (20 results), the engine automatically splits the viewport into 4 quadrants (SW, SE, NW, NE) to discover hidden businesses within budget.
   - **Honest Coverage Report**: Displays category-by-category status: *Complete*, *Probably complete*, or *Possibly incomplete* with exact reasons.

4. **Lead Scoring Formula (0–100)** — contactability first, opportunity second (see `calculateLeadScore` in `src/lib/data-integrity.ts`). Max 90. Tiers: High ≥ 60, Medium ≥ 35:
   - **Opportunity**: no website in directory record +25 / social only +15 / has website +5 (redesign/SEO opportunity — and no lead ever scores 0)
   - **Email**: +25 (the primary outreach channel)
   - **WhatsApp-capable mobile**: +20, else valid phone +10, else listed phone +5
   - **Facebook / Instagram / social**: +10
   - **Recently updated source record**: +10
   - An uncontactable lead can reach at most 35 (Medium); High requires at least one real channel plus opportunity.
   - Ratings and review counts are **not** scored: the free search path never invents them (they stay empty).

5. **Contactability & Best Channel**:
   - A lead counts as **Contactable** if it has at least one real channel: confirmed WhatsApp, email, Facebook, Instagram, or phone.
   - **Best Channel** badge per lead, in priority order: WhatsApp > Email > Facebook > Instagram > Phone.
   - WhatsApp is only ever labelled "WhatsApp (business-listed)" when the business itself lists the number as WhatsApp (OSM `contact:whatsapp` tag or a `wa.me` link on its own website). A mobile-format number alone is shown as "Mobile number — WhatsApp not confirmed" and never gets a `wa.me` link.
   - Filters: Has WhatsApp / Has Email / Has Facebook / Contactable only. Filter-tab counts respect the other active filters, so the count on a tab always equals the rows shown — and the CSV export always contains exactly the rows the filter shows.
   - Results are paginated at 100 rows per page (card and table views) so a 3,000-row result never freezes the tab. Selection and CSV export still cover all filtered rows, not just the visible page.

6. **On-Demand Website Audit**:
   - Server-side health checker evaluating HTTPS security, response time (ms), mobile viewport responsiveness, page title, and meta description.
   - Highlights specific pitch angles (e.g. slow mobile loading, missing SEO) to close redesign clients.

7. **Honest Email Finder**:
   - Crawls the business's own domain homepage, `/contact`, and `/about` pages for public `mailto:` links and email addresses (8s timeout per page, respects `robots.txt`, 30-day cache).
   - Only emails actually extracted from the business's own site may carry the "Found on website" label, with the source page URL stored.
   - Validates syntax and flags whether the email matches the business's official domain.

8. **Free Fill-in Options**:
   - **CSV Import**: Auto-detects columns, applies data integrity validation, deduplicates against existing leads, and imports zero-cost records.
   - **Add Lead Manually**: Instant entry with real-time phone E.164 conversion and email validation.

9. **Multi-Channel Outreach Engine**:
   - **1-Click WhatsApp**: Formatted `https://wa.me/<E164>?text=<encoded_pitch>` links, only for business-listed WhatsApp numbers.
   - **Pre-Built Outreach Templates**: 3 English & 3 Bengali scripts for "No Website" prospects, 2 for "Outdated Website" redesigns, and email templates with standard unsubscribe lines.
   - Automatic activity logging in SQLite updating lead status to "Contacted" with timestamp.

10. **My Leads CRM**:
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

Copy `.env.example` to `.env.local` and configure your credentials (`.env.example` is not shipped — create it from the template below):

```env
# Clerk Authentication (required — the app redirects to /sign-in without it)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Google Places API (New) — OPTIONAL legacy path, see below. Leave unset for 100% free operation.
GOOGLE_PLACES_API_KEY=AIzaSy...

# Budget Guards (only used when the Google key is set)
GOOGLE_MONTHLY_CALL_LIMIT=900
GOOGLE_DAILY_CALL_LIMIT=30
```

> **Note**: With no `GOOGLE_PLACES_API_KEY` set, search runs entirely on the free directory (OpenStreetMap + Overture). This is the recommended configuration and how the production site runs.

---

## 🔌 Search Paths — Which Engine Runs?

Both search endpoints (`/api/places`, used by the main search UI, and `/api/search`) pick the engine the same way:

- **No Google key set** → `searchFreeLiveDirectory` (`src/lib/free-search.ts`): OpenStreetMap/Overpass + Overture merge. Free, unlimited, thousands of leads per search.
- **Google key set** → `searchGooglePlaces` (`src/lib/google-places.ts`): official Places API (New), max 20 results per call, hard budget guards (default 30/day, 900/month).

> ⚠️ **Google path warning**: Google Places ToS bans storing Place data in your own database and exporting it to a lead list/CSV. The Google path in this repo caches full responses in SQLite for 30 days and those leads flow into the same CSV export — **do not enable the Google key if you export leads**, unless you remove that caching/export path first. The free path has no such restriction (OSM ODbL + Overture CDLA both allow storage and export with attribution).

The **Area Coverage Scan** (`/api/scan`) is Google-only and does nothing useful without a key.

---

## 🗺️ Overture Maps Import (Real Data)

To replace the 12-row Bangladesh seed snapshot with real Overture data. Requirements: Python 3.10+ with `pip install duckdb pandas` (the extract reads Overture Parquet from S3 via DuckDB).

**Local SQLite (dev / testing only)** — the database lives on your PC, not on the deployed site:

```bash
# Europe first, then North America (large countries are auto-tiled)
python scripts/import_overture.py --countries GB,DE,FR,NL,ES,IT,PL --release <RELEASE> --db data/leadgen.db
python scripts/import_overture.py --countries US,CA --release <RELEASE> --db data/leadgen.db

# Bangladesh only (default; also loads the 12-row seed if the extract fails)
python scripts/import_overture.py --countries BD --release <RELEASE>
```

**Turso (production)** — the deployed site reads the hosted database, so the real import goes there:

```bash
# 1. Extract + filter into a JSONL file (no database write)
python scripts/import_overture.py --countries GB,DE,FR,NL,ES,IT,PL --release <RELEASE> --export-jsonl data/overture_eu.jsonl
# 2. Load the JSONL into Turso (credentials from environment variables only)
TURSO_DATABASE_URL=libsql://<your-db>.turso.io TURSO_AUTH_TOKEN=<token> node scripts/load_overture_turso.mjs data/overture_eu.jsonl
```

The importer accepts a country list (`--countries`, default `BD`) with per-country bounding boxes; US/CA are split into tiles (max 12° × 10°) so no single S3 extract is too large. Re-running is idempotent (UPSERT on `gers_id`). The search-time merge itself is country-agnostic: it activates automatically once rows exist in `overture_places`.

> ⚠️ **The import is filtered by design**: the extract keeps only places with at least one contact signal (phone, email, website, or social link) and only the requested countries. Turso Free allows 5 GB storage and 10M rows written/month — a full unfiltered multi-country import would not fit. Import Europe first (the target market), then US/CA; if the monthly write budget requires it, split the import across days — re-runs add no duplicates.

> ⚠️ Run the import on a PC against the hosted database the site will actually read from — Vercel's filesystem is ephemeral, so an import run against the deployed function does not persist.

---

## 🗄️ Database & Serverless Persistence Note

LeadGen Pro stores budget usage, response cache, scan jobs, and CRM leads in a database accessed through `src/lib/db.ts`. The driver is chosen by environment:

- **Turso (hosted libSQL)** when `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are both set — this is the production setup.
- **Local SQLite** (`./data/leadgen.db` via native `node:sqlite`) otherwise — local dev and all tests keep working with no Turso account.

The 12-row Bangladesh seed fallback works on both paths (it seeds an empty Overture table once, on first use).

> ⚠️ **Important Deployment Notice**:
> On serverless platforms like **Vercel**, the local filesystem is ephemeral and does not persist SQLite files across function cold-starts or redeployments. On every cold start the Overture table is re-seeded from the 12-row snapshot, and the file cache (`.cache/`) starts empty. So the deployed site must use Turso (below) — otherwise saved leads, scan jobs, and the real Overture import do not persist.

### Turso setup (production — one-time, ~5 minutes)

1. Create a free Turso account at https://turso.tech — sign up with GitHub, about 2 minutes, **no credit card required**.
2. Create a database (any name, e.g. `leadgen-pro`) in the Turso dashboard.
3. In the database settings, create an **auth token** and copy the database URL (`libsql://<name>-<user>.turso.io`).
4. In Vercel (Project → Settings → Environment Variables), add:
   - `TURSO_DATABASE_URL` = the database URL from step 3
   - `TURSO_AUTH_TOKEN` = the auth token from step 3
5. Redeploy (or push any commit — Vercel auto-deploys). The site switches to Turso automatically; no code change needed.

**Free-tier limits (Turso Free):** 5 GB storage, 100 databases, 500M rows read/month, 10M rows written/month. A database is archived after 10 days of inactivity — regular site use keeps it active. Supabase Free was considered and rejected: its 500 MB storage is too small for Overture place data.

**Credentials rule:** the URL and token live only in Vercel environment variables (and, for the one-off import, as shell environment variables on your PC). Never put them in code, config files, docs, or chat.

---

## 🧪 Automated Testing & QA

Run the comprehensive QA verification suite:

```bash
npm run qa
```

This automated script performs:
1. `.gitignore` audit (ensuring `.env*`, `*.sqlite`, `*.db`, and `data/` are never committed).
2. Secrets scan (verifying no Google API keys like `AIza...` exist in repository files or client bundles).
3. No-fake-data scanner (confirming zero hardcoded dummy phones, synthetic emails, mock arrays, or business-name generators exist in `src/`).
4. Data integrity unit tests (phone E.164 parsing, junk phone/email rejection, lead scoring formula, contactable counts).

Phase acceptance tests (live, hit the real Overpass API — slow, minutes each):

```bash
npm run test:phase1   # Data honesty + area accuracy
npm run test:phase2   # Category multi-tag mapping + reliability
npm run test:phase3   # Overture merge + website enrichment
npm run test:phase4   # Follow-up fixes
npm run test:phase5   # Worldwide correctness
npm run test:phase6   # Contact enrichment (WhatsApp + email)

npm run test:coverage # Name-keyword fallback + Overture gate (unit) + live London trade counts
```

---

## 📜 Compliance & Attribution

- **GDPR & CAN-SPAM**: All commercial communications should include clear sender identification and opt-out instructions. Default email templates provide an unsubscribe reply option.
- **OpenStreetMap**: Business data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL). Attribution is shown in the site footer.
- **Overture Maps**: Places data under CDLA Permissive 2.0.
- **Google Maps Platform**: Map links only (verification links per lead). No Google place data is stored or exported on the free path.
