#!/usr/bin/env python3
"""
Overture Maps Foundation Places Import Script (Two-Stage Pipeline)
Dataset License: CDLA-Permissive-2.0 / ODbL
Backed by Meta, Microsoft, Amazon, and TomTom.

STAGE 1:
  Extracts a per-country slice from remote parquet on S3
  (s3://overturemaps-us-west-2/release/<RELEASE>/theme=places/type=place/*)
  with column projection + bounding box pushdown into
  `overture_<cc>.parquet` (one file per country; large countries are tiled).

STAGE 2:
  Loads each parquet into SQLite `overture_places` table with UPSERT on `gers_id`.
  Stamps release_tag and imported_at. Re-running is idempotent and never creates duplicates.

USAGE (local SQLite — dev and testing):
  python scripts/import_overture.py --countries GB,DE,FR --release 2026-01-01.0 --db data/leadgen.db
  python scripts/import_overture.py --countries US,CA   # auto-tiled (CONUS + southern Canada)
  python scripts/import_overture.py --countries BD       # default; also loads the BD seed on failure

USAGE (Turso hosted database — production):
  # 1. Extract + filter into a JSONL file (no database write):
  python scripts/import_overture.py --countries GB,DE,FR --release 2026-01-01.0 --export-jsonl data/overture_eu.jsonl
  # 2. Load the JSONL into Turso (credentials from environment variables only):
  TURSO_DATABASE_URL=libsql://<your-db>.turso.io TURSO_AUTH_TOKEN=<token> node scripts/load_overture_turso.mjs data/overture_eu.jsonl

FILTERING (mandatory): the extract keeps ONLY places with at least one contact
signal (phone, email, website, or social link) and only the requested
countries. Turso Free allows 5 GB storage and 10M rows written/month — a full
unfiltered multi-country import would not fit. Import Europe first (the
target market), then US/CA; re-runs are idempotent (UPSERT on GERS id), so a
large import can be split across days if the monthly write budget requires it.

NOTE: Vercel's filesystem is ephemeral, so an import run here does NOT persist
on the deployed site. Run this on a PC against the hosted database the site
will actually read from, then deploy the site against that database.
"""

import os
import sys
import json
import math
import sqlite3
import argparse
from datetime import datetime, timezone

# Per-country bounding boxes (min_lon, min_lat, max_lon, max_lat).
# FR is metropolitan France only; ES is mainland + Balearics; US is CONUS only;
# CA is the southern band where nearly all businesses sit (north of 70 is cut).
COUNTRY_BBOXES = {
    "BD": (88.0, 20.3, 92.7, 26.7),
    "GB": (-8.0, 49.8, 1.9, 60.9),
    "DE": (5.8, 47.2, 15.1, 55.1),
    "FR": (-5.2, 41.3, 10.0, 51.1),
    "NL": (3.3, 50.7, 7.3, 53.6),
    "ES": (-9.4, 35.9, 4.4, 43.9),
    "IT": (6.6, 35.4, 18.6, 47.1),
    "PL": (14.1, 49.0, 24.2, 54.9),
    "US": (-125.0, 24.5, -66.9, 49.4),
    "CA": (-141.0, 41.7, -52.6, 70.0),
}

DEFAULT_COUNTRIES = ["BD"]

# Max tile size for large countries (degrees). US/CA are split into tiles so no
# single S3 extract is too large to finish.
MAX_TILE_LON_SPAN = 12.0
MAX_TILE_LAT_SPAN = 10.0


def bbox_dict(bbox):
    min_lon, min_lat, max_lon, max_lat = bbox
    return {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat}


def tile_bbox(bbox):
    """Splits a bbox into tiles of at most MAX_TILE_* degrees. Small countries yield one tile."""
    min_lon, min_lat, max_lon, max_lat = bbox
    lon_steps = max(1, math.ceil((max_lon - min_lon) / MAX_TILE_LON_SPAN))
    lat_steps = max(1, math.ceil((max_lat - min_lat) / MAX_TILE_LAT_SPAN))
    tiles = []
    for i in range(lon_steps):
        for j in range(lat_steps):
            tiles.append((
                min_lon + i * (max_lon - min_lon) / lon_steps,
                min_lat + j * (max_lat - min_lat) / lat_steps,
                min_lon + (i + 1) * (max_lon - min_lon) / lon_steps,
                min_lat + (j + 1) * (max_lat - min_lat) / lat_steps,
            ))
    return tiles

def init_db(db_path: str):
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
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
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_overture_places_lat_lon ON overture_places(lat, lon);")
    
    # Ensure all columns exist for existing databases
    extra_cols = [
        "gers_id", "category", "facebook_url", "address_freeform", "locality",
        "region", "postcode", "country", "operating_status", "confidence",
        "sources_json", "release_tag", "imported_at", "last_seen_release"
    ]
    for col in extra_cols:
        try:
            cur.execute(f"ALTER TABLE overture_places ADD COLUMN {col} TEXT;")
        except Exception:
            pass
            
    conn.commit()
    return conn

def stage1_duckdb_s3_extract(release: str, output_parquet: str, bbox: dict, country: str):
    """
    Stage 1: Extracts one country (or tile) slice from remote S3 with column
    projection and bbox pushdown. Never runs SELECT * against S3 to prevent hanging.
    """
    try:
        import duckdb
        print(f"[*] [Stage 1] Connecting to DuckDB and initializing httpfs...")
        con = duckdb.connect()
        con.execute("INSTALL httpfs; LOAD httpfs;")
        con.execute("SET s3_region='us-west-2';")
        con.execute("SET s3_url_style='path';")

        s3_url = f"s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*"
        copy_sql = f"""
            COPY (
              SELECT
                id AS gers_id,
                names.primary AS name,
                categories.primary AS category,
                bbox.ymin AS lat,
                bbox.xmin AS lon,
                phones, emails, websites, socials,
                addresses[1].freeform AS address_freeform,
                addresses[1].locality AS locality,
                addresses[1].region AS region,
                addresses[1].postcode AS postcode,
                addresses[1].country AS country,
                operating_status, confidence,
                to_json(sources) AS sources_json
              FROM read_parquet('{s3_url}', hive_partitioning=1)
              WHERE bbox.minx >= {bbox['min_lon']} AND bbox.maxx <= {bbox['max_lon']}
                AND bbox.miny >= {bbox['min_lat']} AND bbox.ymax <= {bbox['max_lat']}
                AND (addresses[1].country = '{country}' OR addresses[1].country IS NULL)
                AND (operating_status IS NULL OR operating_status <> 'closed')
                AND names.primary IS NOT NULL
                -- Contact-signal filter (mandatory for Turso Free limits):
                -- keep only places with at least one phone, email, website, or social link.
                AND (coalesce(len(phones), 0) > 0 OR coalesce(len(emails), 0) > 0
                     OR coalesce(len(websites), 0) > 0 OR coalesce(len(socials), 0) > 0)
            ) TO '{output_parquet}';
        """
        print(f"[*] [Stage 1] Executing pushdown extract from S3 to {output_parquet}...")
        con.execute(copy_sql)
        print(f"[+] [Stage 1] Successfully generated {output_parquet}")
        return True
    except Exception as e:
        print(f"[!] [Stage 1] Remote DuckDB extract encountered: {e}")
        return False

def _as_list(value):
    """
    Safely converts a pandas/duckdb list cell to a Python list. Plain
    `value or []` crashes on numpy arrays (ambiguous truth value), so empty
    arrays and NULL cells are handled explicitly.
    """
    if value is None:
        return []
    try:
        import math
        if isinstance(value, float) and math.isnan(value):
            return []
    except (TypeError, ValueError):
        pass
    try:
        return list(value)
    except TypeError:
        return []


def stage2_load_parquet_to_sqlite(parquet_path: str, conn, release_tag: str, country: str):
    """
    Stage 2: Reads extracted parquet and upserts rows into SQLite overture_places table.
    Rows without a country in the data inherit the slice's country (never a hardcoded default).
    """
    try:
        import duckdb
        con = duckdb.connect()
        df = con.execute(f"SELECT * FROM read_parquet('{parquet_path}')").fetchdf()
        now_iso = datetime.now(timezone.utc).isoformat()
        
        cur = conn.cursor()
        upsert_sql = """
            INSERT INTO overture_places (
                id, gers_id, name, category, categories, lat, lon,
                phones, emails, websites, socials, facebook_url,
                address_freeform, locality, region, postcode, country,
                operating_status, confidence, sources_json, release_version, release_tag,
                imported_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?
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
                sources_json = excluded.sources_json,
                release_version = excluded.release_version,
                release_tag = excluded.release_tag,
                imported_at = excluded.imported_at,
                updated_at = excluded.updated_at;
        """
        
        for _, row in df.iterrows():
            gers_id = str(row["gers_id"])
            socials_list = _as_list(row["socials"])
            fb_url = next((s for s in socials_list if "facebook.com" in s.lower() or "fb.com" in s.lower()), None)
            
            cur.execute(upsert_sql, (
                gers_id,
                gers_id,
                str(row["name"]),
                str(row["category"] or ""),
                json.dumps([str(row["category"])] if row["category"] else []),
                float(row["lat"]),
                float(row["lon"]),
                json.dumps(_as_list(row["phones"])),
                json.dumps(_as_list(row["emails"])),
                json.dumps(_as_list(row["websites"])),
                json.dumps(socials_list),
                fb_url,
                str(row["address_freeform"] or "") if row["address_freeform"] else None,
                str(row["locality"] or "") if row["locality"] else None,
                str(row["region"] or "") if row["region"] else None,
                str(row["postcode"] or "") if row["postcode"] else None,
                str(row["country"] or country),
                str(row["operating_status"] or "open"),
                float(row["confidence"] or 1.0),
                str(row["sources_json"] or "[]"),
                release_tag,
                release_tag,
                now_iso,
                now_iso
            ))
        conn.commit()
        return len(df)
    except Exception as e:
        print(f"[!] [Stage 2] Parquet load failed: {e}")
        return None

def export_parquet_to_jsonl(parquet_path: str, jsonl_path: str, country: str, release_tag: str):
    """
    Writes the extracted parquet rows to a JSONL file (one object per line) for
    loading into Turso with scripts/load_overture_turso.mjs. Appends when the
    file already exists (multi-tile countries share one file). Returns the
    number of rows written, or None on failure.
    """
    try:
        import duckdb
        con = duckdb.connect()
        df = con.execute(f"SELECT * FROM read_parquet('{parquet_path}')").fetchdf()
        now_iso = datetime.now(timezone.utc).isoformat()

        written = 0
        with open(jsonl_path, "a", encoding="utf-8") as f:
            for _, row in df.iterrows():
                gers_id = str(row["gers_id"])
                socials_list = _as_list(row["socials"])
                fb_url = next((s for s in socials_list if "facebook.com" in s.lower() or "fb.com" in s.lower()), None)
                record = {
                    "id": gers_id,
                    "gers_id": gers_id,
                    "name": str(row["name"]),
                    "category": str(row["category"] or ""),
                    "categories": [str(row["category"])] if row["category"] else [],
                    "lat": float(row["lat"]),
                    "lon": float(row["lon"]),
                    "phones": _as_list(row["phones"]),
                    "emails": _as_list(row["emails"]),
                    "websites": _as_list(row["websites"]),
                    "socials": socials_list,
                    "facebook_url": fb_url,
                    "address_freeform": str(row["address_freeform"] or "") if row["address_freeform"] else None,
                    "locality": str(row["locality"] or "") if row["locality"] else None,
                    "region": str(row["region"] or "") if row["region"] else None,
                    "postcode": str(row["postcode"] or "") if row["postcode"] else None,
                    "country": str(row["country"] or country),
                    "operating_status": str(row["operating_status"] or "open"),
                    "confidence": float(row["confidence"] or 1.0),
                    "sources_json": str(row["sources_json"] or "[]"),
                    "release_tag": release_tag,
                    "imported_at": now_iso,
                    "updated_at": now_iso,
                }
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
                written += 1
        return written
    except Exception as e:
        print(f"[!] JSONL export failed for {parquet_path}: {e}")
        return None


def load_seed_json(seed_path: str, conn, release_tag: str):
    """
    Fallback loader when DuckDB is not installed or when running offline.
    """
    if not os.path.exists(seed_path):
        print(f"[-] Seed file not found at {seed_path}")
        return 0

    with open(seed_path, "r", encoding="utf-8") as f:
        places = json.load(f)

    now_iso = datetime.now(timezone.utc).isoformat()
    cur = conn.cursor()
    
    upsert_sql = """
        INSERT INTO overture_places (
            id, gers_id, name, category, categories, lat, lon,
            phones, emails, websites, socials, facebook_url,
            address_freeform, locality, region, postcode, country,
            operating_status, confidence, sources_json, release_version, release_tag,
            imported_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?
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
            sources_json = excluded.sources_json,
            release_version = excluded.release_version,
            release_tag = excluded.release_tag,
            imported_at = excluded.imported_at,
            updated_at = excluded.updated_at;
    """

    for p in places:
        gers_id = p["id"]
        socials = p.get("socials", [])
        fb_url = next((s for s in socials if "facebook.com" in s.lower() or "fb.com" in s.lower()), None)
        addr = (p.get("addresses") or [{}])[0]
        
        cur.execute(upsert_sql, (
            gers_id,
            gers_id,
            p["name"],
            (p.get("categories") or [""])[0],
            json.dumps(p.get("categories", [])),
            float(p["lat"]),
            float(p["lon"]),
            json.dumps(p.get("phones", [])),
            json.dumps(p.get("emails", [])),
            json.dumps(p.get("websites", [])),
            json.dumps(socials),
            fb_url,
            addr.get("freeform"),
            addr.get("locality"),
            addr.get("region"),
            addr.get("postcode"),
            addr.get("country", "BD"),
            "open",
            1.0,
            json.dumps(p.get("sources", [])),
            p.get("release_version", release_tag),
            release_tag,
            now_iso,
            p.get("updated_at", now_iso)
        ))
    conn.commit()
    return len(places)

def main():
    parser = argparse.ArgumentParser(description="Overture Maps Places Two-Stage Importer.")
    parser.add_argument("--release", default="2024-09-18.0", help="Overture release version tag")
    parser.add_argument("--db", default="data/leadgen.db", help="Path to SQLite database")
    parser.add_argument(
        "--countries",
        default="BD",
        help="Comma-separated ISO country codes to import (default: BD). "
             f"Supported: {', '.join(sorted(COUNTRY_BBOXES))}",
    )
    parser.add_argument("--parquet-dir", default="data", help="Directory for stage 1 output parquet files")
    parser.add_argument("--parquet", default=None,
                        help="Single output parquet path (only used for a one-country, one-tile run)")
    parser.add_argument("--export-jsonl", default=None,
                        help="Export filtered rows to this JSONL file instead of loading into SQLite "
                             "(for Turso: load it with scripts/load_overture_turso.mjs)")
    parser.add_argument("--seed", default="data/overture_places_bd.json", help="Path to verified BD seed snapshot JSON")
    parser.add_argument("--force-seed", action="store_true", help="Directly load verified seed file without S3")

    args = parser.parse_args()

    countries = [c.strip().upper() for c in args.countries.split(",") if c.strip()]
    unknown = [c for c in countries if c not in COUNTRY_BBOXES]
    if unknown:
        print(f"[!] Unknown country code(s): {', '.join(unknown)}. Supported: {', '.join(sorted(COUNTRY_BBOXES))}")
        sys.exit(2)
    if not countries:
        countries = list(DEFAULT_COUNTRIES)

    print("================================================================================")
    print("  OVERTURE MAPS PLACES TWO-STAGE IMPORTER (CDLA-Permissive-2.0)")
    print("================================================================================")
    print(f"Target Database : {args.db}")
    print(f"Release Tag     : {args.release}")
    print(f"Countries       : {', '.join(countries)}")
    print("--------------------------------------------------------------------------------")

    os.makedirs(args.parquet_dir, exist_ok=True)

    # JSONL export mode (for Turso): extract + filter, write rows to a file,
    # no database touched. Load the file with scripts/load_overture_turso.mjs.
    if args.export_jsonl:
        if os.path.exists(args.export_jsonl):
            os.remove(args.export_jsonl)
        exported_total = 0
        failed_countries = []
        for country in countries:
            tiles = tile_bbox(COUNTRY_BBOXES[country])
            country_exported = 0
            for tile_idx, tile in enumerate(tiles):
                if len(tiles) == 1:
                    parquet_path = os.path.join(args.parquet_dir, f"overture_{country.lower()}.parquet")
                else:
                    parquet_path = os.path.join(args.parquet_dir, f"overture_{country.lower()}_t{tile_idx}.parquet")
                print(f"[*] [{country}] Tile {tile_idx + 1}/{len(tiles)}: bbox {tile}")
                ok = stage1_duckdb_s3_extract(args.release, parquet_path, bbox_dict(tile), country)
                if ok:
                    n = export_parquet_to_jsonl(parquet_path, args.export_jsonl, country, args.release)
                    if n:
                        country_exported += n
            if country_exported:
                exported_total += country_exported
                print(f"[+] [{country}] Exported {country_exported} places")
            else:
                failed_countries.append(country)
                print(f"[!] [{country}] No places exported (extract failed or empty)")
        print("--------------------------------------------------------------------------------")
        print(f"Exported {exported_total} filtered places to {args.export_jsonl}")
        print("Next step: load it into Turso with")
        print(f"  TURSO_DATABASE_URL=libsql://<your-db>.turso.io TURSO_AUTH_TOKEN=<token> node scripts/load_overture_turso.mjs {args.export_jsonl}")
        if failed_countries:
            print(f"Countries with no export: {', '.join(failed_countries)} — re-run for those countries only.")
        print("================================================================================\n")
        return

    conn = init_db(args.db)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM overture_places;")
    count_before = cur.fetchone()[0]

    loaded_total = 0
    failed_countries = []
    for country in countries:
        tiles = tile_bbox(COUNTRY_BBOXES[country])
        country_loaded = 0
        for tile_idx, tile in enumerate(tiles):
            if args.parquet and len(countries) == 1 and len(tiles) == 1:
                parquet_path = args.parquet
            elif len(tiles) == 1:
                parquet_path = os.path.join(args.parquet_dir, f"overture_{country.lower()}.parquet")
            else:
                parquet_path = os.path.join(args.parquet_dir, f"overture_{country.lower()}_t{tile_idx}.parquet")

            if args.force_seed:
                continue
            print(f"[*] [{country}] Tile {tile_idx + 1}/{len(tiles)}: bbox {tile}")
            ok = stage1_duckdb_s3_extract(args.release, parquet_path, bbox_dict(tile), country)
            if ok:
                n = stage2_load_parquet_to_sqlite(parquet_path, conn, args.release, country)
                if n:
                    country_loaded += n
        if country_loaded:
            loaded_total += country_loaded
            print(f"[+] [{country}] Loaded {country_loaded} places")
        else:
            failed_countries.append(country)
            print(f"[!] [{country}] No places loaded (extract failed or empty)")

    # Seed fallback is BD-only: the seed file holds 12 hand-checked Bangladesh rows.
    if "BD" in failed_countries or args.force_seed:
        print("[*] Loading verified BD snapshot records into SQLite...")
        seed_loaded = load_seed_json(args.seed, conn, args.release)
        loaded_total += seed_loaded
        if seed_loaded and "BD" in failed_countries:
            failed_countries.remove("BD")

    cur.execute("SELECT COUNT(*) FROM overture_places;")
    count_after = cur.fetchone()[0]

    # Real measured coverage metrics (no estimates)
    cur.execute("SELECT COUNT(*) FROM overture_places WHERE phones IS NOT NULL AND phones <> '[]';")
    phone_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM overture_places WHERE emails IS NOT NULL AND emails <> '[]';")
    email_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM overture_places WHERE websites IS NOT NULL AND websites <> '[]';")
    web_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM overture_places WHERE facebook_url IS NOT NULL AND facebook_url <> '';")
    fb_count = cur.fetchone()[0]

    cur.execute("SELECT country, COUNT(*) FROM overture_places GROUP BY country ORDER BY COUNT(*) DESC;")
    per_country = cur.fetchall()

    def pct(n):
        return f"{(n / count_after * 100):.1f}%" if count_after else "n/a"

    print("\n--------------------------------------------------------------------------------")
    print("  REAL MEASURED COVERAGE STATS (No Estimates):")
    print("--------------------------------------------------------------------------------")
    print(f"Total Places        : {count_after}")
    print(f"With Phone          : {phone_count} / {count_after} ({pct(phone_count)})")
    print(f"With Email          : {email_count} / {count_after} ({pct(email_count)})")
    print(f"With Website        : {web_count} / {count_after} ({pct(web_count)})")
    print(f"With Facebook URL   : {fb_count} / {count_after} ({pct(fb_count)})")
    print("  Per country:")
    for cc, n in per_country:
        print(f"    {cc or '(blank)'}: {n}")
    print("--------------------------------------------------------------------------------")
    print(f"Initial DB Count: {count_before} | Added: {count_after - count_before} | Idempotent: 0 duplicates")
    if failed_countries:
        print(f"Countries with no import: {', '.join(failed_countries)} — re-run for those countries only.")
    print("================================================================================\n")

if __name__ == "__main__":
    main()
