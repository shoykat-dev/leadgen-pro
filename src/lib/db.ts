import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { BusinessLead } from "./data-integrity";

function getDbPath(): string {
  // If running in Vercel Serverless or AWS Lambda, use writable /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join("/tmp", "leadgen-data");
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return path.join(tmpDir, "leadgen.db");
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

let dbInstance: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = getDbPath();
    try {
      dbInstance = new DatabaseSync(dbPath);
      initTables(dbInstance);
    } catch (err) {
      console.warn("Failed to open SQLite at", dbPath, "falling back to in-memory :memory:", err);
      try {
        dbInstance = new DatabaseSync(":memory:");
        initTables(dbInstance);
      } catch (memErr) {
        console.error("Critical: In-memory SQLite failed:", memErr);
        throw memErr;
      }
    }
  }
  return dbInstance;
}

function initTables(db: DatabaseSync) {
  // 1. API Usage Tracking (for daily & monthly budget guards)
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_usage (
      key TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      updated_at TEXT
    );
  `);

  // 2. Google Places API Response Cache (keyed by normalized query, up to 30 days)
  db.exec(`
    CREATE TABLE IF NOT EXISTS places_cache (
      cache_key TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  // 3. My Leads (CRM) Table
  db.exec(`
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
  db.exec(`
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      params_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 6. Outreach Logs Table (records WhatsApp, Call, Email clicks with timestamp)
  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_logs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 7. User Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
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

export function getBudgetStatus(confirmedExtraDailyCalls: number = 0): BudgetStatus {
  const dailyLimit = parseInt(process.env.GOOGLE_DAILY_CALL_LIMIT || "30", 10) + confirmedExtraDailyCalls;
  const monthlyLimit = parseInt(process.env.GOOGLE_MONTHLY_CALL_LIMIT || "900", 10);

  try {
    const db = getDb();
    const now = new Date();
    const dayKey = `day_${now.toISOString().slice(0, 10)}`; // e.g. day_2026-10-16
    const monthKey = `month_${now.toISOString().slice(0, 7)}`; // e.g. month_2026-10

    const getStmt = db.prepare("SELECT count FROM api_usage WHERE key = ?");
    const dailyRow = getStmt.get(dayKey) as { count: number } | undefined;
    const monthlyRow = getStmt.get(monthKey) as { count: number } | undefined;

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

export function incrementGoogleApiCallCount(): void {
  const db = getDb();
  const now = new Date();
  const dayKey = `day_${now.toISOString().slice(0, 10)}`;
  const monthKey = `month_${now.toISOString().slice(0, 7)}`;
  const isoNow = now.toISOString();

  const upsert = db.prepare(`
    INSERT INTO api_usage (key, count, updated_at)
    VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
  `);

  upsert.run(dayKey, isoNow);
  upsert.run(monthKey, isoNow);
}

// ==========================================
// 2. RESPONSE CACHING (Max 30 days)
// ==========================================

export function getCachedPlacesResponse(cacheKey: string): any | null {
  const db = getDb();
  const now = Date.now();
  const stmt = db.prepare("SELECT data_json, expires_at FROM places_cache WHERE cache_key = ?");
  const row = stmt.get(cacheKey) as { data_json: string; expires_at: number } | undefined;

  if (!row) return null;

  if (row.expires_at < now) {
    // Expired
    db.prepare("DELETE FROM places_cache WHERE cache_key = ?").run(cacheKey);
    return null;
  }

  try {
    return JSON.parse(row.data_json);
  } catch {
    return null;
  }
}

export function setCachedPlacesResponse(cacheKey: string, data: any, ttlDays: number = 30): void {
  const db = getDb();
  const now = Date.now();
  const expiresAt = now + ttlDays * 24 * 60 * 60 * 1000;
  const jsonStr = JSON.stringify(data);

  const stmt = db.prepare(`
    INSERT INTO places_cache (cache_key, data_json, created_at, expires_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET data_json = excluded.data_json, expires_at = excluded.expires_at
  `);
  stmt.run(cacheKey, jsonStr, now, expiresAt);
}

// ==========================================
// 3. MY LEADS (CRM REPOSITORY)
// ==========================================

export function getAllSavedLeads(): BusinessLead[] {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM my_leads ORDER BY updated_at DESC");
  const rows = stmt.all() as any[];

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

export function saveLead(lead: BusinessLead): void {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
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
  `);

  stmt.run(
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

export function updateLeadStatus(id: string, status: string, notes?: string, followUpDate?: string): void {
  const db = getDb();
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

  db.prepare(query).run(...params);
}

export function deleteSavedLead(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM my_leads WHERE id = ? OR place_id = ?").run(id, id);
}

// ==========================================
// 4. SCAN JOBS REPOSITORY
// ==========================================

export function saveScanJob(job: any): void {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
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
  `);

  stmt.run(
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

export function getScanJob(id: string): any | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM scan_jobs WHERE id = ?").get(id) as any;
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

export function logOutreach(leadId: string, channel: string, message?: string): void {
  const db = getDb();
  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO outreach_logs (id, lead_id, channel, message, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, leadId, channel, message || null, now);

  // Update lead CRM status to Contacted if it exists in my_leads
  updateLeadStatus(leadId, "Contacted");
}

export function getOutreachLogs(leadId?: string): any[] {
  const db = getDb();
  if (leadId) {
    return db.prepare("SELECT * FROM outreach_logs WHERE lead_id = ? ORDER BY created_at DESC").all(leadId) as any[];
  }
  return db.prepare("SELECT * FROM outreach_logs ORDER BY created_at DESC LIMIT 100").all() as any[];
}

export function getUserSetting(key: string, defaultVal: string = ""): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM user_settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? row.value : defaultVal;
}

export function setUserSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO user_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

