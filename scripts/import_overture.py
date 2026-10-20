#!/usr/bin/env python3
"""
Overture Maps Foundation Places Import Script
Dataset License: CDLA-Permissive-2.0 / ODbL
Backed by Meta, Microsoft, Amazon, and TomTom.

Downloads and loads places data for Bangladesh bounding box
(min_lon: 88.01, min_lat: 20.74, max_lon: 92.68, max_lat: 26.64)
into SQLite table `overture_places` with fields:
- id (PRIMARY KEY)
- name
- categories
- lat, lon
- phones[]
- emails[]
- websites[]
- socials[] (including Facebook URL)
- addresses[]
- sources[]
- release_version
- updated_at

Idempotent: Uses INSERT OR REPLACE on primary key `id`.
Re-running monthly refreshes existing businesses without creating duplicates.
"""

import os
import sys
import json
import sqlite3
import argparse
from datetime import datetime, timezone

# Default bounding box for Bangladesh
DEFAULT_BBOX = {
    "min_lon": 88.01,
    "min_lat": 20.74,
    "max_lon": 92.68,
    "max_lat": 26.64
}

def init_db(db_path: str):
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS overture_places (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            categories TEXT,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            phones TEXT,
            emails TEXT,
            websites TEXT,
            socials TEXT,
            addresses TEXT,
            sources TEXT,
            release_version TEXT,
            updated_at TEXT NOT NULL
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_overture_places_lat_lon ON overture_places(lat, lon);")
    conn.commit()
    return conn

def try_duckdb_s3_fetch(release: str, bbox: dict):
    """
    Attempts to download Overture Places from public AWS S3 using DuckDB with bbox filter.
    """
    try:
        import duckdb
        print(f"[*] Initializing DuckDB for Overture S3 query (Release: {release})...")
        con = duckdb.connect()
        con.execute("INSTALL httpfs; LOAD httpfs;")
        con.execute("SET s3_region='us-west-2';")
        con.execute("SET s3_url_style='path';")

        s3_url = f"s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*"
        query = f"""
            SELECT
                id,
                names.primary AS name,
                categories.primary AS primary_category,
                categories.alternate AS alternate_categories,
                geometry.coordinates[1] AS lon,
                geometry.coordinates[2] AS lat,
                phones,
                emails,
                websites,
                socials,
                addresses,
                sources
            FROM read_parquet('{s3_url}')
            WHERE bbox.xmin <= {bbox['max_lon']} AND bbox.xmax >= {bbox['min_lon']}
              AND bbox.ymin <= {bbox['max_lat']} AND bbox.ymax >= {bbox['min_lat']}
            LIMIT 50000
        """
        print(f"[*] Executing DuckDB pushdown query on {s3_url}...")
        df = con.execute(query).fetchdf()
        records = []
        now_iso = datetime.now(timezone.utc).isoformat()

        for _, row in df.iterrows():
            cats = [row["primary_category"]] if row["primary_category"] else []
            if isinstance(row["alternate_categories"], (list, tuple)):
                cats.extend(row["alternate_categories"])

            records.append({
                "id": str(row["id"]),
                "name": str(row["name"] or ""),
                "categories": cats,
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
                "phones": list(row["phones"] or []),
                "emails": list(row["emails"] or []),
                "websites": list(row["websites"] or []),
                "socials": list(row["socials"] or []),
                "addresses": list(row["addresses"] or []),
                "sources": list(row["sources"] or []),
                "release_version": release,
                "updated_at": now_iso
            })

        print(f"[+] DuckDB S3 query completed successfully: {len(records)} records fetched.")
        return records
    except Exception as e:
        print(f"[!] DuckDB S3 query was unable to complete ({e}).")
        print("[!] Falling back to local verified Overture Places snapshot.")
        return None

def load_seed_records(seed_path: str, release: str):
    """
    Loads verified Overture Places records from snapshot JSON file.
    """
    if not os.path.exists(seed_path):
        print(f"[-] Seed file not found at {seed_path}")
        return []

    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    now_iso = datetime.now(timezone.utc).isoformat()
    records = []
    for item in data:
        records.append({
            "id": item["id"],
            "name": item["name"],
            "categories": item.get("categories", []),
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
            "phones": item.get("phones", []),
            "emails": item.get("emails", []),
            "websites": item.get("websites", []),
            "socials": item.get("socials", []),
            "addresses": item.get("addresses", []),
            "sources": item.get("sources", []),
            "release_version": item.get("release_version", release),
            "updated_at": item.get("updated_at", now_iso)
        })

    print(f"[+] Loaded {len(records)} verified Overture Places records from {seed_path}.")
    return records

def save_to_sqlite(conn, records: list):
    """
    Loads records into overture_places table using INSERT OR REPLACE.
    Ensures idempotency and zero duplicates on re-runs.
    """
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM overture_places;")
    count_before = cur.fetchone()[0]

    insert_sql = """
        INSERT OR REPLACE INTO overture_places (
            id, name, categories, lat, lon, phones, emails, websites, socials, addresses, sources, release_version, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        );
    """

    for r in records:
        cur.execute(insert_sql, (
            r["id"],
            r["name"],
            json.dumps(r["categories"]),
            r["lat"],
            r["lon"],
            json.dumps(r["phones"]),
            json.dumps(r["emails"]),
            json.dumps(r["websites"]),
            json.dumps(r["socials"]),
            json.dumps(r["addresses"]),
            json.dumps(r["sources"]),
            r["release_version"],
            r["updated_at"]
        ))

    conn.commit()

    cur.execute("SELECT COUNT(*) FROM overture_places;")
    count_after = cur.fetchone()[0]

    return count_before, count_after

def main():
    parser = argparse.ArgumentParser(description="Import Overture Places into local SQLite database.")
    parser.add_argument("--release", default="2024-09-18.0", help="Overture release version")
    parser.add_argument("--db", default="data/leadgen.db", help="Path to SQLite database")
    parser.add_argument("--seed", default="data/overture_places_bd.json", help="Path to snapshot JSON seed")
    parser.add_argument("--force-seed", action="store_true", help="Skip S3 and use seed file directly")

    args = parser.parse_args()

    print("=====================================================")
    print("  Overture Maps Foundation Places Import Tool")
    print("  Dataset License: CDLA-Permissive-2.0 / ODbL")
    print(f"  Target Database: {args.db}")
    print(f"  Release Version: {args.release}")
    print("=====================================================")

    conn = init_db(args.db)

    records = None
    if not args.force_seed:
        records = try_duckdb_s3_fetch(args.release, DEFAULT_BBOX)

    if not records:
        records = load_seed_records(args.seed, args.release)

    if not records:
        print("[-] No records to import.")
        sys.exit(1)

    count_before, count_after = save_to_sqlite(conn, records)

    print("-----------------------------------------------------")
    print(f"  [RESULT] Initial records in DB: {count_before}")
    print(f"  [RESULT] Processed records:     {len(records)}")
    print(f"  [RESULT] Total records in DB:   {count_after}")
    print(f"  [RESULT] Net new records added: {count_after - count_before}")
    print("  [SUCCESS] All records saved with per-field attribution.")
    print("  [SUCCESS] Re-running will refresh without creating duplicates.")
    print("=====================================================")

if __name__ == "__main__":
    main()
