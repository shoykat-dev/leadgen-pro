import fs from "fs";
import path from "path";

export interface CachedDirectoryResult<T> {
  data: T;
  cachedAt: string;
  lastUpdated: string;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// In-memory cache layer for microsecond access
const memoryCache = new Map<
  string,
  {
    data: any;
    cachedAt: string;
    lastUpdated: string;
    expiresAt: number;
  }
>();

// File-system cache directory
function getCacheDir(): string {
  const dir = path.join(process.cwd(), ".cache", "leadgen-overpass");
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Fallback if read-only filesystem (e.g. some serverless containers)
  }
  return dir;
}

function sanitizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

export function buildCacheKey(areaId: string, categoryId: string): string {
  const cleanArea = sanitizeKey(areaId);
  const cleanCat = sanitizeKey(categoryId);
  return `${cleanArea}__${cleanCat}`;
}

export function formatLastUpdated(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Retrieves cached results if present and within 7 days TTL.
 */
export function getFromCache<T>(
  areaId: string,
  categoryId: string
): CachedDirectoryResult<T> | null {
  const key = buildCacheKey(areaId, categoryId);
  const now = Date.now();

  // 1. Check in-memory cache first
  const mem = memoryCache.get(key);
  if (mem) {
    if (mem.expiresAt > now) {
      return {
        data: mem.data,
        cachedAt: mem.cachedAt,
        lastUpdated: mem.lastUpdated,
      };
    }
    memoryCache.delete(key);
  }

  // 2. Check file-system cache
  try {
    const filePath = path.join(getCacheDir(), `${key}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.expiresAt && parsed.expiresAt > now) {
        // Populate memory cache for subsequent calls
        memoryCache.set(key, parsed);
        return {
          data: parsed.data,
          cachedAt: parsed.cachedAt,
          lastUpdated: parsed.lastUpdated,
        };
      } else {
        fs.unlinkSync(filePath);
      }
    }
  } catch {
    // Ignore file read errors
  }

  return null;
}

/**
 * Stores search results in the server-side cache with 7-day TTL.
 */
export function saveToCache<T>(
  areaId: string,
  categoryId: string,
  data: T
): CachedDirectoryResult<T> {
  const key = buildCacheKey(areaId, categoryId);
  const now = new Date();
  const cachedAt = now.toISOString();
  const lastUpdated = formatLastUpdated(cachedAt);
  const expiresAt = now.getTime() + CACHE_TTL_MS;

  const entry = {
    data,
    cachedAt,
    lastUpdated,
    expiresAt,
  };

  // 1. Save to in-memory cache
  memoryCache.set(key, entry);

  // 2. Persist to file-system cache
  try {
    const filePath = path.join(getCacheDir(), `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry), "utf-8");
  } catch {
    // Ignore file write errors
  }

  return {
    data,
    cachedAt,
    lastUpdated,
  };
}
