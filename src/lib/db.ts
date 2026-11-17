import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createClient, type Client } from "@libsql/client";
import type { BusinessLead } from "./data-integrity";

/**
 * Database layer with two backends behind one async interface:
 *
 * - TURSO (hosted libSQL): active ONLY when both TURSO_DATABASE_URL and
 *   TURSO_AUTH_TOKEN are set (Vercel env vars). This is the production
 *   backend — it persists the Overture import, CRM leads, budget usage and
 *   caches across deploys, which Vercel's ephemeral filesystem cannot do.
 * - LOCAL SQLite (node:sqlite): the fallback when the Turso vars are absent.
 *   Local dev and all tests run on this path with no account needed, exactly
 *   as before — same file (data/leadgen.db), same tables, same seed.
 *
 * Credentials come from environment variables only, never from code or docs.
 * No Turso account, database, or token is created by this code.
 */

export function isTursoEnabled(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

// Minimal async driver interface shared by both backends.
interface DbDriver {
  exec(sql: string): Promise<void>;
  get<T = any>(sql: string, ...params: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, ...params: any[]): Promise<T[]>;
  run(sql: string, ...params: any[]): Promise<void>;
}

/** Local SQLite driver: synchronous node:sqlite behind the async interface. */
class LocalDriver implements DbDriver {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async run(sql: string, ...params: any[]): Promise<void> {
    this.db.prepare(sql).run(...params);
  }
}

/** Turso (hosted libSQL) driver over HTTP. Rows support object access by column name. */
class TursoDriver implements DbDriver {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async exec(sql: string): Promise<void> {
    await this.client.executeMultiple(sql);
  }

  async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
    const rs = await this.client.execute({ sql, args: toLibsqlArgs(params) });
    return rs.rows[0] as T | undefined;
  }

  async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    const rs = await this.client.execute({ sql, args: toLibsqlArgs(params) });
    return rs.rows as T[];
  }

  async run(sql: string, ...params: any[]): Promise<void> {
    await this.client.execute({ sql, args: toLibsqlArgs(params) });
  }
}

/** libSQL accepts null but not undefined — normalize before sending. */
function toLibsqlArgs(params: any[]): any[] {
  return params.map((p) => (p === undefined ? null : p));
}

function getDbPath(): string {
  // If running in Vercel Serverless or AWS Lambda, use writable /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join("/tmp", "leadgen-data");
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      const tmpDbPath = path.join(tmpDir, "leadgen.db");
      const bundledDb = path.join(process.cwd(), "data", "leadgen.db");
      if (!fs.existsSync(tmpDbPath) && fs.existsSync(bundledDb)) {
        try {
          fs.copyFileSync(bundledDb, tmpDbPath);
        } catch {}
      }
      return tmpDbPath;
    } catch {
      return ":memory:";
    }
  }

  // Local environment
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, "leadgen.db");
  } catch {
    return ":memory:";
  }
}

let driverInstance: DbDriver | null = null;
let initPromise: Promise<DbDriver> | null = null;

async function getDriver(): Promise<DbDriver> {
  if (driverInstance) return driverInstance;
  if (!initPromise) initPromise = initDriver();
  return initPromise;
}

async function initDriver(): Promise<DbDriver> {
  if (isTursoEnabled()) {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL as string,
      authToken: process.env.TURSO_AUTH_TOKEN as string,
    });
    const driver = new TursoDriver(client);
    try {
      await initTables(driver);
    } catch (err) {
      // Tables already exist in production. If creation is blocked (e.g. Turso
      // free-tier write quota exceeded), continue — reads still work and the
      // Overture search only needs reads.
      console.warn("[DB] initTables failed; continuing with reads only:", err);
    }
    driverInstance = driver;
    console.log("[DB] Using Turso (libSQL) hosted database.");
    return driver;
  }

  const dbPath = getDbPath();
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(dbPath);
  } catch (err) {
    console.warn("Failed to open SQLite at", dbPath, "falling back to in-memory :memory:", err);
    try {
      db = new DatabaseSync(":memory:");
    } catch (memErr) {
      console.error("Critical: In-memory SQLite failed:", memErr);
      throw memErr;
    }
  }
  const driver = new LocalDriver(db);
  try {
    await initTables(driver);
  } catch (err) {
    // Tables already exist in production. If creation is blocked, continue —
    // reads still work and the Overture search only needs reads.
    console.warn("[DB] initTables failed; continuing with reads only:", err);
  }
  driverInstance = driver;
  return driver;
}

async function initTables(db: DbDriver) {
  // 1. API Usage Tracking (for daily & monthly budget guards)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS api_usage (
      key TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      updated_at TEXT
    );
  `);

  // 2. Google Places API Response Cache (keyed by normalized query, up to 30 days)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS places_cache (
      cache_key TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  // 3. My Leads (CRM) Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS my_leads (
      id TEXT PRIMARY KEY,
      place_id TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT,
      phone TEXT,
      phone_e164 TEXT,
      phone_status TEXT,
      email TEXT,
      email_status TEXT,
      website TEXT,
      website_status TEXT,
      address TEXT,
      rating REAL,
      user_rating_count INTEGER,
      google_maps_uri TEXT,
      lead_score INTEGER,
      data_quality TEXT,
      crm_status TEXT DEFAULT 'New',
      notes TEXT,
      tags TEXT,
      last_contacted_at TEXT,
      next_follow_up_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 4. Area Scan Jobs Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scan_jobs (
      id TEXT PRIMARY KEY,
      area_name TEXT NOT NULL,
      country_code TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL, -- 'pending' | 'running' | 'paused' | 'completed' | 'cancelled'
      total_categories INTEGER DEFAULT 0,
      completed_categories INTEGER DEFAULT 0,
      total_calls_used INTEGER DEFAULT 0,
      results_count INTEGER DEFAULT 0,
      coverage_report_json TEXT,
      task_queue_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 5. Saved Searches Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      params_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 6. Outreach Logs Table (records WhatsApp, Call, Email clicks with timestamp)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_logs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 7. User Settings Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 8. Overture Maps Places Table (CDLA/ODbL free dataset)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS overture_places (
      id TEXT PRIMARY KEY,
      gers_id TEXT,
      name TEXT NOT NULL,
      category TEXT,
      categories TEXT,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      phones TEXT,
      emails TEXT,
      websites TEXT,
      socials TEXT,
      facebook_url TEXT,
      address_freeform TEXT,
      locality TEXT,
      region TEXT,
      postcode TEXT,
      country TEXT,
      operating_status TEXT,
      confidence REAL,
      sources TEXT,
      sources_json TEXT,
      release_version TEXT,
      release_tag TEXT,
      imported_at TEXT,
      last_seen_release TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_overture_places_lat_lon ON overture_places(lat, lon);
  `);
  const extraCols = ["gers_id", "category", "facebook_url", "address_freeform", "locality", "region", "postcode", "country", "operating_status", "confidence", "sources_json", "release_tag", "imported_at", "last_seen_release"];
  for (const col of extraCols) {
    try {
      await db.exec(`ALTER TABLE overture_places ADD COLUMN ${col} TEXT;`);
    } catch {}
  }

  // 9. Real Website Enrichment Cache (30-day TTL)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS website_enrichment_cache (
      domain_key TEXT PRIMARY KEY,
      website_url TEXT NOT NULL,
      email TEXT,
      email_source_url TEXT,
      email_status TEXT,
      phones_json TEXT,
      whatsapp_number TEXT,
      whatsapp_source_url TEXT,
      checked_at TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  try {
    await db.exec(`ALTER TABLE website_enrichment_cache ADD COLUMN whatsapp_number TEXT;`);
  } catch {}
  try {
    await db.exec(`ALTER TABLE website_enrichment_cache ADD COLUMN whatsapp_source_url TEXT;`);
  } catch {}

  // 10. Auto-seed Overture Places if empty (essential for Vercel /tmp DB & fresh clones).
  // Works on both backends: on Turso it seeds the empty hosted table once, and the
  // real import later upserts alongside it (UPSERT on id, no duplicates).
  // NOTE (audit 2026-11-16): data/overture_places_bd.json is a 12-row hand-assembled
  // snapshot for Banani/Gulshan (Dhaka) — NOT a real Overture extract (its GERS-style
  // ids are sequential, and there is no import log behind it). Treat its contacts as
  // unverified until replaced by a real Overture import (scripts/import_overture.py).
  // Outside Bangladesh the table is empty, so the Overture merge adds nothing there.
  try {
    const row = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM overture_places");
    if (!row || row.count === 0) {
      const seedFile = path.join(process.cwd(), "data", "overture_places_bd.json");
      if (fs.existsSync(seedFile)) {
        const rawJson = fs.readFileSync(seedFile, "utf-8");
        const places = JSON.parse(rawJson);
        const insertSql = `
          INSERT INTO overture_places (
            id, gers_id, name, category, categories, lat, lon, phones, emails, websites, socials, facebook_url,
            address_freeform, locality, region, postcode, country, operating_status, confidence,
            sources, sources_json, release_version, release_tag, imported_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING
        `;

        for (const p of places) {
          const gersId = p.gers_id || p.id;
          const socials = p.socials || [];
          const fb = p.facebook_url || socials.find((s: string) => s.toLowerCase().includes("facebook.com") || s.toLowerCase().includes("fb.com")) || null;
          const categories = p.categories || (p.category ? [p.category] : []);
          const primaryCat = p.category || (categories.length > 0 ? categories[0] : null);
          const addr = (p.addresses && p.addresses.length > 0) ? p.addresses[0] : {};

          await db.run(
            insertSql,
            p.id,
            gersId,
            p.name,
            primaryCat,
            JSON.stringify(categories),
            p.lat,
            p.lon,
            JSON.stringify(p.phones || []),
            JSON.stringify(p.emails || []),
            JSON.stringify(p.websites || []),
            JSON.stringify(socials),
            fb,
            addr.freeform || p.address_freeform || null,
            addr.locality || p.locality || null,
            addr.region || p.region || null,
            addr.postcode || p.postcode || null,
            addr.country || p.country || "BD",
            p.operating_status || "open",
            p.confidence || 0.85,
            JSON.stringify(p.sources || []),
            p.sources_json || JSON.stringify(p.sources || []),
            p.release_version || "2024-09-18.0",
            p.release_tag || p.release_version || "2024-09-18.0",
            p.imported_at || new Date().toISOString(),
            p.updated_at || new Date().toISOString()
          );
        }
      }
    }
  } catch (seedErr) {
    console.warn("[Overture DB Auto-Seed Warning]:", seedErr);
  }
}

// ==========================================
// 1. HARD BUDGET GUARD FUNCTIONS
// ==========================================

export interface BudgetStatus {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  canCallGoogle: boolean;
  reason?: string;
}

export async function getBudgetStatus(confirmedExtraDailyCalls: number = 0): Promise<BudgetStatus> {
  const dailyLimit = parseInt(process.env.GOOGLE_DAILY_CALL_LIMIT || "30", 10) + confirmedExtraDailyCalls;
  const monthlyLimit = parseInt(process.env.GOOGLE_MONTHLY_CALL_LIMIT || "900", 10);

  try {
    const db = await getDriver();
    const now = new Date();
    const dayKey = `day_${now.toISOString().slice(0, 10)}`; // e.g. day_2026-10-16
    const monthKey = `month_${now.toISOString().slice(0, 7)}`; // e.g. month_2026-10

    const dailyRow = await db.get<{ count: number }>("SELECT count FROM api_usage WHERE key = ?", dayKey);
    const monthlyRow = await db.get<{ count: number }>("SELECT count FROM api_usage WHERE key = ?", monthKey);

    const dailyUsed = dailyRow ? dailyRow.count : 0;
    const monthlyUsed = monthlyRow ? monthlyRow.count : 0;

    if (monthlyUsed >= monthlyLimit) {
      return {
        dailyUsed,
        dailyLimit,
        monthlyUsed,
        monthlyLimit,
        canCallGoogle: false,
        reason: "Free Google monthly limit reached. You can still import leads from CSV or add manually.",
      };
    }

    if (dailyUsed >= dailyLimit) {
      return {
        dailyUsed,
        dailyLimit,
        monthlyUsed,
        monthlyLimit,
        canCallGoogle: false,
        reason: "Free Google daily limit reached. You can still import leads from CSV or add manually.",
      };
    }

    return {
      dailyUsed,
      dailyLimit,
      monthlyUsed,
      monthlyLimit,
      canCallGoogle: true,
    };
  } catch (err) {
    console.warn("Budget status query fallback on serverless:", err);
    return {
      dailyUsed: 0,
      dailyLimit,
      monthlyUsed: 0,
      monthlyLimit,
      canCallGoogle: true,
    };
  }
}

export async function incrementGoogleApiCallCount(): Promise<void> {
  const db = await getDriver();
  const now = new Date();
  const dayKey = `day_${now.toISOString().slice(0, 10)}`;
  const monthKey = `month_${now.toISOString().slice(0, 7)}`;
  const isoNow = now.toISOString();

  const upsert = `
    INSERT INTO api_usage (key, count, updated_at)
    VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
  `;

  await db.run(upsert, dayKey, isoNow);
  await db.run(upsert, monthKey, isoNow);
}

// ==========================================
// 2. RESPONSE CACHING (Max 30 days)
// ==========================================

export async function getCachedPlacesResponse(cacheKey: string): Promise<any | null> {
  const db = await getDriver();
  const now = Date.now();
  const row = await db.get<{ data_json: string; expires_at: number }>(
    "SELECT data_json, expires_at FROM places_cache WHERE cache_key = ?",
    cacheKey
  );

  if (!row) return null;

  if (row.expires_at < now) {
    // Expired
    await db.run("DELETE FROM places_cache WHERE cache_key = ?", cacheKey);
    return null;
  }

  try {
    return JSON.parse(row.data_json);
  } catch {
    return null;
  }
}

export async function setCachedPlacesResponse(cacheKey: string, data: any, ttlDays: number = 30): Promise<void> {
  const db = await getDriver();
  const now = Date.now();
  const expiresAt = now + ttlDays * 24 * 60 * 60 * 1000;
  const jsonStr = JSON.stringify(data);

  await db.run(
    `
    INSERT INTO places_cache (cache_key, data_json, created_at, expires_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET data_json = excluded.data_json, expires_at = excluded.expires_at
  `,
    cacheKey,
    jsonStr,
    now,
    expiresAt
  );
}

// ==========================================
// 3. MY LEADS (CRM REPOSITORY)
// ==========================================

export async function getAllSavedLeads(): Promise<BusinessLead[]> {
  const db = await getDriver();
  const rows = await db.all<any>("SELECT * FROM my_leads ORDER BY updated_at DESC");

  return rows.map((r) => ({
    id: r.id,
    placeId: r.place_id || undefined,
    source: "manual",
    name: r.name,
    category: r.category || "General",
    address: r.address || "",
    phone: r.phone || null,
    phoneE164: r.phone_e164 || null,
    phoneStatus: (r.phone_status as any) || "Missing",
    canWhatsApp: Boolean(r.phone_status === "Valid" && r.phone_e164),
    email: r.email || null,
    emailStatus: (r.email_status as any) || "Missing",
    website: r.website || null,
    websiteStatus: (r.website_status as any) || "No Website",
    rating: r.rating,
    userRatingCount: r.user_rating_count,
    googleMapsUri: r.google_maps_uri,
    leadScore: r.lead_score || 0,
    leadScoreTier: r.lead_score >= 60 ? "High" : r.lead_score >= 35 ? "Medium" : "Low",
    dataQuality: (r.data_quality as any) || "Medium",
    crmStatus: r.crm_status || "New",
    notes: r.notes || "",
    lastContactedAt: r.last_contacted_at,
    nextFollowUpDate: r.next_follow_up_date,
    fetchedAt: r.created_at,
  }));
}

export async function saveLead(lead: BusinessLead): Promise<void> {
  const db = await getDriver();
  const now = new Date().toISOString();

  await db.run(
    `
    INSERT INTO my_leads (
      id, place_id, name, category, phone, phone_e164, phone_status,
      email, email_status, website, website_status, address,
      rating, user_rating_count, google_maps_uri, lead_score,
      data_quality, crm_status, notes, tags, last_contacted_at,
      next_follow_up_date, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
    ON CONFLICT(place_id) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      phone_e164 = excluded.phone_e164,
      email = excluded.email,
      website = excluded.website,
      crm_status = excluded.crm_status,
      notes = excluded.notes,
      last_contacted_at = excluded.last_contacted_at,
      next_follow_up_date = excluded.next_follow_up_date,
      updated_at = excluded.updated_at
  `,
    lead.id,
    lead.placeId || lead.id,
    lead.name,
    lead.category,
    lead.phone,
    lead.phoneE164,
    lead.phoneStatus,
    lead.email,
    lead.emailStatus,
    lead.website,
    lead.websiteStatus,
    lead.address,
    lead.rating || null,
    lead.userRatingCount || null,
    lead.googleMapsUri || null,
    lead.leadScore,
    lead.dataQuality,
    lead.crmStatus || "New",
    lead.notes || "",
    "",
    lead.lastContactedAt || null,
    lead.nextFollowUpDate || null,
    lead.fetchedAt || now,
    now
  );
}

export async function updateLeadStatus(id: string, status: string, notes?: string, followUpDate?: string): Promise<void> {
  const db = await getDriver();
  const now = new Date().toISOString();

  let query = "UPDATE my_leads SET crm_status = ?, updated_at = ?";
  const params: any[] = [status, now];

  if (status === "Contacted") {
    query += ", last_contacted_at = ?";
    params.push(now);
  }
  if (notes !== undefined) {
    query += ", notes = ?";
    params.push(notes);
  }
  if (followUpDate !== undefined) {
    query += ", next_follow_up_date = ?";
    params.push(followUpDate);
  }

  query += " WHERE id = ? OR place_id = ?";
  params.push(id, id);

  await db.run(query, ...params);
}

export async function deleteSavedLead(id: string): Promise<void> {
  const db = await getDriver();
  await db.run("DELETE FROM my_leads WHERE id = ? OR place_id = ?", id, id);
}

// ==========================================
// 4. SCAN JOBS REPOSITORY
// ==========================================

export async function saveScanJob(job: any): Promise<void> {
  const db = await getDriver();
  const now = new Date().toISOString();

  await db.run(
    `
    INSERT INTO scan_jobs (
      id, area_name, country_code, mode, status,
      total_categories, completed_categories, total_calls_used,
      results_count, coverage_report_json, task_queue_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      completed_categories = excluded.completed_categories,
      total_calls_used = excluded.total_calls_used,
      results_count = excluded.results_count,
      coverage_report_json = excluded.coverage_report_json,
      task_queue_json = excluded.task_queue_json,
      updated_at = excluded.updated_at
  `,
    job.id,
    job.areaName,
    job.countryCode,
    job.mode,
    job.status,
    job.totalCategories,
    job.completedCategories,
    job.totalCallsUsed,
    job.resultsCount,
    JSON.stringify(job.coverageReport || {}),
    JSON.stringify(job.taskQueue || []),
    job.createdAt || now,
    now
  );
}

export async function getScanJob(id: string): Promise<any | null> {
  const db = await getDriver();
  const row = await db.get<any>("SELECT * FROM scan_jobs WHERE id = ?", id);
  if (!row) return null;
  return {
    id: row.id,
    areaName: row.area_name,
    countryCode: row.country_code,
    mode: row.mode,
    status: row.status,
    totalCategories: row.total_categories,
    completedCategories: row.completed_categories,
    totalCallsUsed: row.total_calls_used,
    resultsCount: row.results_count,
    coverageReport: row.coverage_report_json ? JSON.parse(row.coverage_report_json) : {},
    taskQueue: row.task_queue_json ? JSON.parse(row.task_queue_json) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==========================================
// 5. OUTREACH LOGS & SETTINGS REPOSITORY
// ==========================================

export async function logOutreach(leadId: string, channel: string, message?: string): Promise<void> {
  const db = await getDriver();
  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  await db.run(
    `
    INSERT INTO outreach_logs (id, lead_id, channel, message, created_at)
    VALUES (?, ?, ?, ?, ?)
  `,
    id,
    leadId,
    channel,
    message || null,
    now
  );

  // Update lead CRM status to Contacted if it exists in my_leads
  await updateLeadStatus(leadId, "Contacted");
}

export async function getOutreachLogs(leadId?: string): Promise<any[]> {
  const db = await getDriver();
  if (leadId) {
    return db.all<any>("SELECT * FROM outreach_logs WHERE lead_id = ? ORDER BY created_at DESC", leadId);
  }
  return db.all<any>("SELECT * FROM outreach_logs ORDER BY created_at DESC LIMIT 100");
}

export async function getUserSetting(key: string, defaultVal: string = ""): Promise<string> {
  const db = await getDriver();
  const row = await db.get<{ value: string }>("SELECT value FROM user_settings WHERE key = ?", key);
  return row ? row.value : defaultVal;
}

export async function setUserSetting(key: string, value: string): Promise<void> {
  const db = await getDriver();
  await db.run(
    `
    INSERT INTO user_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `,
    key,
    value
  );
}

// ==========================================
// 6. OVERTURE MAPS REPOSITORY (CDLA/ODbL)
// ==========================================

export interface OverturePlaceRecord {
  id: string;
  name: string;
  categories: string[];
  lat: number;
  lon: number;
  phones: string[];
  emails: string[];
  websites: string[];
  socials: string[];
  facebook_url?: string | null;
  addresses: any[];
  sources: any[];
  release_version?: string;
  updated_at?: string;
}

export async function upsertOverturePlace(place: OverturePlaceRecord): Promise<void> {
  const db = await getDriver();
  const now = place.updated_at || new Date().toISOString();
  const fb = (place.socials || []).find((s: string) => s.toLowerCase().includes("facebook.com") || s.toLowerCase().includes("fb.com")) || null;
  const freeform = place.addresses?.[0]?.freeform || null;
  const locality = place.addresses?.[0]?.locality || null;
  const region = place.addresses?.[0]?.region || null;
  const postcode = place.addresses?.[0]?.postcode || null;
  const country = place.addresses?.[0]?.country || "BD";
  const primaryCat = place.categories?.[0] || null;

  await db.run(
    `
    INSERT INTO overture_places (
      id, gers_id, name, category, categories, lat, lon, phones, emails, websites, socials, facebook_url,
      address_freeform, locality, region, postcode, country, operating_status, confidence,
      sources, sources_json, release_version, release_tag, imported_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      gers_id = excluded.gers_id,
      name = excluded.name,
      category = excluded.category,
      categories = excluded.categories,
      lat = excluded.lat,
      lon = excluded.lon,
      phones = excluded.phones,
      emails = excluded.emails,
      websites = excluded.websites,
      socials = excluded.socials,
      facebook_url = excluded.facebook_url,
      address_freeform = excluded.address_freeform,
      locality = excluded.locality,
      region = excluded.region,
      postcode = excluded.postcode,
      country = excluded.country,
      operating_status = excluded.operating_status,
      confidence = excluded.confidence,
      sources = excluded.sources,
      sources_json = excluded.sources_json,
      release_version = excluded.release_version,
      release_tag = excluded.release_tag,
      imported_at = excluded.imported_at,
      updated_at = excluded.updated_at
  `,
    place.id,
    place.id,
    place.name,
    primaryCat,
    JSON.stringify(place.categories || []),
    place.lat,
    place.lon,
    JSON.stringify(place.phones || []),
    JSON.stringify(place.emails || []),
    JSON.stringify(place.websites || []),
    JSON.stringify(place.socials || []),
    fb,
    freeform,
    locality,
    region,
    postcode,
    country,
    "open",
    1.0,
    JSON.stringify(place.sources || []),
    JSON.stringify(place.sources || []),
    place.release_version || "latest",
    place.release_version || "latest",
    now,
    now
  );
}

export async function upsertOverturePlaces(places: OverturePlaceRecord[]): Promise<{ insertedCount: number }> {
  for (const place of places) {
    await upsertOverturePlace(place);
  }
  return { insertedCount: places.length };
}

export async function getOverturePlaceCount(): Promise<number> {
  const db = await getDriver();
  const row = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM overture_places");
  return row ? row.count : 0;
}

export async function getOverturePlacesInBBox(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number
): Promise<OverturePlaceRecord[]> {
  const db = await getDriver();
  // Round 6: select only the columns the row mapping below reads. SELECT *
  // also shipped sources_json (~729 B/row, never read by the app) plus
  // gers_id/category/operating_status/confidence/release_tag/imported_at/
  // last_seen_release — ~32 MB of wire transfer for a dense bbox. No LIMIT:
  // the merge must see every row in the bbox.
  const rows = await db.all<any>(
    `
    SELECT id, name, categories, lat, lon, phones, emails, websites, socials,
      facebook_url, address_freeform, locality, region, postcode, country,
      sources, release_version, updated_at
    FROM overture_places
    WHERE lat BETWEEN ? AND ?
      AND lon BETWEEN ? AND ?
  `,
    minLat,
    maxLat,
    minLon,
    maxLon
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    categories: r.categories ? JSON.parse(r.categories) : [],
    lat: r.lat,
    lon: r.lon,
    phones: r.phones ? JSON.parse(r.phones) : [],
    emails: r.emails ? JSON.parse(r.emails) : [],
    websites: r.websites ? JSON.parse(r.websites) : [],
    socials: r.socials ? JSON.parse(r.socials) : [],
    facebook_url: r.facebook_url || null,
    // The table stores the address in flat columns (there is no addresses
    // column) — rebuild the address object from them so callers see the real
    // Overture address instead of an empty list.
    addresses:
      r.address_freeform || r.locality || r.region || r.postcode || r.country
        ? [
            {
              freeform: r.address_freeform || null,
              locality: r.locality || null,
              region: r.region || null,
              postcode: r.postcode || null,
              country: r.country || null,
            },
          ]
        : [],
    sources: r.sources ? JSON.parse(r.sources) : [],
    release_version: r.release_version,
    updated_at: r.updated_at,
  }));
}

// ==========================================
// 7. REAL WEBSITE ENRICHMENT CACHE (30 Days TTL)
// ==========================================

export interface WebsiteEnrichmentRecord {
  domainKey: string;
  websiteUrl: string;
  email: string | null;
  emailSourceUrl: string | null;
  emailStatus: string;
  phones: string[];
  whatsappNumber?: string | null;
  whatsappSourceUrl?: string | null;
  checkedAt: string;
  expiresAt: number;
}

export async function getCachedWebsiteEnrichment(websiteUrl: string): Promise<WebsiteEnrichmentRecord | null> {
  try {
    const db = await getDriver();
    const domainKey = new URL(
      websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
    ).hostname.replace(/^www\./, "").toLowerCase();

    const now = Date.now();
    const row = await db.get<any>("SELECT * FROM website_enrichment_cache WHERE domain_key = ?", domainKey);

    if (!row) return null;

    if (row.expires_at < now) {
      await db.run("DELETE FROM website_enrichment_cache WHERE domain_key = ?", domainKey);
      return null;
    }

    return {
      domainKey: row.domain_key,
      websiteUrl: row.website_url,
      email: row.email,
      emailSourceUrl: row.email_source_url,
      emailStatus: row.email_status,
      phones: row.phones_json ? JSON.parse(row.phones_json) : [],
      whatsappNumber: row.whatsapp_number || null,
      whatsappSourceUrl: row.whatsapp_source_url || null,
      checkedAt: row.checked_at,
      expiresAt: row.expires_at,
    };
  } catch {
    return null;
  }
}

export async function setCachedWebsiteEnrichment(data: {
  websiteUrl: string;
  email: string | null;
  emailSourceUrl: string | null;
  emailStatus: string;
  phones?: string[];
  whatsappNumber?: string | null;
  whatsappSourceUrl?: string | null;
  ttlDays?: number;
}): Promise<void> {
  try {
    const db = await getDriver();
    const domainKey = new URL(
      data.websiteUrl.startsWith("http") ? data.websiteUrl : `https://${data.websiteUrl}`
    ).hostname.replace(/^www\./, "").toLowerCase();

    const now = Date.now();
    const ttlDays = data.ttlDays || 30; // 30-day requirement
    const expiresAt = now + ttlDays * 24 * 60 * 60 * 1000;
    const checkedAt = new Date().toISOString();

    await db.run(
      `
      INSERT INTO website_enrichment_cache (
        domain_key, website_url, email, email_source_url, email_status, phones_json, whatsapp_number, whatsapp_source_url, checked_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(domain_key) DO UPDATE SET
        website_url = excluded.website_url,
        email = excluded.email,
        email_source_url = excluded.email_source_url,
        email_status = excluded.email_status,
        phones_json = excluded.phones_json,
        whatsapp_number = excluded.whatsapp_number,
        whatsapp_source_url = excluded.whatsapp_source_url,
        checked_at = excluded.checked_at,
        expires_at = excluded.expires_at
    `,
      domainKey,
      data.websiteUrl,
      data.email,
      data.emailSourceUrl,
      data.emailStatus,
      JSON.stringify(data.phones || []),
      data.whatsappNumber || null,
      data.whatsappSourceUrl || null,
      checkedAt,
      expiresAt
    );
  } catch (err) {
    console.warn("Failed to set website enrichment cache", err);
  }
}
