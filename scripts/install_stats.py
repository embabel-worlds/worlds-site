#!/usr/bin/env python3
"""Interactive report over the worlds-site install-click BigQuery table.

Runs one of a handful of pre-built queries against
embabel-me-prod.worlds_site_analytics.run_googleapis_com_stdout_* and prints
the result. Uses the local `bq` CLI rather than the google-cloud-bigquery
client library so the only dependency is the gcloud SDK you already have.

Usage:
    python install_stats.py                # interactive menu
    python install_stats.py --variant 1    # skip the menu
    python install_stats.py --variant 4 --days 7
    python install_stats.py --list         # show the menu, exit

Requires: bq CLI on PATH, authenticated to a Google account with
roles/bigquery.dataViewer on embabel-me-prod.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

PROJECT = "embabel-me-prod"
TABLE   = "`embabel-me-prod.worlds_site_analytics.run_googleapis_com_stdout_*`"
EVENT   = "install_click"


@dataclass
class Variant:
    """One report the user can pick from the menu."""
    label: str
    description: str
    # SQL body -- must reference {table} and may reference {where_extra}. The
    # runner fills {table} with TABLE and {where_extra} with any --days filter.
    sql: str

    def build(self, days: int | None) -> str:
        where_extra = ""
        if days is not None:
            where_extra = f"AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)"
        return self.sql.format(table=TABLE, where_extra=where_extra)


# The catalogue. Add a Variant here to add a menu entry -- everything else is
# generic. Keep the SQL free of trailing semicolons; bq query does not want them.
VARIANTS: list[Variant] = [
    Variant(
        label="Per day + daily totals + grand total",
        description="One row per (day, os), a daily total row across OS, and one grand-total row.",
        # Derived columns first (CTE), then GROUPING SETS on plain column
        # names. BigQuery's GROUPING SETS analyzer complains about SELECT
        # expressions that wrap a GROUP BY expression in another function
        # (e.g. CAST(DATE(timestamp) AS STRING) over GROUP BY DATE(timestamp))
        # -- easier to precompute than to argue with.
        #
        # Output columns are named "day_" and "os_" (with a trailing
        # underscore) rather than "day" and "os" -- BQ silently drops the
        # COALESCE when a SELECT alias shares the underlying CTE column's
        # name, and the NULL rows for the total buckets come through
        # unlabeled. Observed on this exact query.
        sql="""
            WITH events AS (
              SELECT DATE(timestamp) AS day, jsonPayload.os AS os
              FROM {table}
              WHERE jsonPayload.event = 'install_click' {where_extra}
            )
            SELECT
              COALESCE(CAST(day AS STRING), 'GRAND TOTAL') AS day_,
              COALESCE(os, 'total') AS os_,
              COUNT(*) AS clicks
            FROM events
            GROUP BY GROUPING SETS ((day, os), (day), ())
            ORDER BY day NULLS LAST, os NULLS LAST
        """,
    ),
    Variant(
        label="Per day + daily totals + per-OS totals + grand total",
        description="The above, plus one row per OS across all days.",
        sql="""
            WITH events AS (
              SELECT DATE(timestamp) AS day, jsonPayload.os AS os
              FROM {table}
              WHERE jsonPayload.event = 'install_click' {where_extra}
            )
            SELECT
              COALESCE(CAST(day AS STRING), 'GRAND TOTAL') AS day_,
              COALESCE(os, 'total') AS os_,
              COUNT(*) AS clicks
            FROM events
            GROUP BY GROUPING SETS ((day, os), (day), (os), ())
            ORDER BY day NULLS LAST, os NULLS LAST
        """,
    ),
    Variant(
        label="Summary only (per OS across all time)",
        description="One row per OS + a grand-total row. No per-day breakdown.",
        sql="""
            SELECT
              COALESCE(jsonPayload.os, 'GRAND TOTAL') AS os,
              COUNT(*) AS clicks
            FROM {table}
            WHERE jsonPayload.event = 'install_click' {where_extra}
            GROUP BY ROLLUP(jsonPayload.os)
            ORDER BY jsonPayload.os NULLS LAST
        """,
    ),
    Variant(
        label="Per day per OS (raw, no totals)",
        description="Flat matrix suitable for exporting to a spreadsheet.",
        sql="""
            SELECT
              DATE(timestamp) AS day,
              jsonPayload.os  AS os,
              COUNT(*)        AS clicks
            FROM {table}
            WHERE jsonPayload.event = 'install_click' {where_extra}
            GROUP BY day, os
            ORDER BY day DESC, os
        """,
    ),
    Variant(
        label="Top user agents",
        description="Who is doing the clicking -- useful for filtering out bots.",
        sql="""
            SELECT
              jsonPayload.userAgent AS user_agent,
              COUNT(*)              AS clicks
            FROM {table}
            WHERE jsonPayload.event = 'install_click' {where_extra}
            GROUP BY user_agent
            ORDER BY clicks DESC
            LIMIT 20
        """,
    ),
    Variant(
        label="Recent hits (raw)",
        description="Latest 50 individual click events -- verify the pipeline is live.",
        sql="""
            SELECT
              timestamp,
              jsonPayload.os  AS os,
              jsonPayload.userAgent AS user_agent,
              jsonPayload.referer AS referer
            FROM {table}
            WHERE jsonPayload.event = 'install_click' {where_extra}
            ORDER BY timestamp DESC
            LIMIT 50
        """,
    ),
]


def print_menu() -> None:
    print("\nInstall-click report — pick a variant:\n")
    for i, v in enumerate(VARIANTS, 1):
        print(f"  {i}. {v.label}")
        print(f"     {v.description}")
    print()


def prompt_choice() -> int:
    while True:
        raw = input(f"Choose 1-{len(VARIANTS)} [1]: ").strip() or "1"
        if raw.isdigit() and 1 <= int(raw) <= len(VARIANTS):
            return int(raw)
        print(f"  Not a number between 1 and {len(VARIANTS)}. Try again.")


def prompt_days() -> int | None:
    raw = input("Filter to last N days? [blank = all history]: ").strip()
    if not raw:
        return None
    if raw.isdigit() and int(raw) > 0:
        return int(raw)
    print("  Not a positive integer -- treating as 'all history'.")
    return None


def run_bq(sql: str) -> int:
    """Feed SQL to `bq query` via stdin, so no argv quoting to fight.

    Returns bq's exit code. bq prints its result table (or an error) directly
    to this process's stdout/stderr -- we do not capture, so long queries
    stream and colours pass through.
    """
    # shutil.which resolves to bq.cmd on Windows (the gcloud SDK ships bq as
    # a .cmd shim, not a .exe). Python subprocess with a bare "bq" argv[0]
    # cannot find .cmd extensions without shell=True; passing the resolved
    # full path works uniformly on every platform without the shell.
    bq = shutil.which("bq")
    if bq is None:
        print("ERROR: 'bq' not on PATH. Install gcloud SDK and add it to PATH.", file=sys.stderr)
        return 127

    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql)
        sql_path = Path(f.name)
    try:
        with sql_path.open("r", encoding="utf-8") as fh:
            return subprocess.call(
                [bq, "query",
                 f"--project_id={PROJECT}",
                 "--use_legacy_sql=false",
                 "--format=pretty"],
                stdin=fh,
            )
    finally:
        sql_path.unlink(missing_ok=True)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--variant", type=int, help=f"Skip the menu (1-{len(VARIANTS)}).")
    p.add_argument("--days", type=int, help="Filter to the last N days.")
    p.add_argument("--list", action="store_true", help="Show the menu and exit.")
    p.add_argument("--sql-only", action="store_true", help="Print the SQL that would run, do not execute.")
    args = p.parse_args()

    if args.list:
        print_menu()
        return 0

    if args.variant is not None:
        if not (1 <= args.variant <= len(VARIANTS)):
            print(f"--variant must be 1..{len(VARIANTS)}", file=sys.stderr)
            return 2
        choice = args.variant
    else:
        print_menu()
        choice = prompt_choice()

    days = args.days
    if days is None and args.variant is None:
        days = prompt_days()

    sql = VARIANTS[choice - 1].build(days)

    if args.sql_only:
        print(sql)
        return 0

    label = VARIANTS[choice - 1].label
    range_note = f"last {days} day(s)" if days else "all history"
    print(f"\nRunning: {label}   ({range_note})\n")
    return run_bq(sql)


if __name__ == "__main__":
    sys.exit(main())
