# scripts/

Tools that support the worlds-site build and its operational reporting.

- [`pull.mjs`](pull.mjs) — pulls the published documents this site quotes
  (realm-spec, appliance, appliance-kit) into `vendor/` at build time. Run
  automatically by `npm run dev` and `npm run build`; see the file for the
  local-override env vars.
- [`install_stats.py`](install_stats.py) — reads the install-click analytics
  table in BigQuery and prints one of a handful of pre-built reports. See below.

---

## `install_stats.py`

Prints "who is clicking the Copy button on the install snippet, on what OS,
on what day" from the BigQuery table that carries those events.

### The pipeline it queries

```
Copy button click (src/components/Install.astro)
       │  navigator.sendBeacon
       ▼
GET /track/install?os=windows        <── firebase.json rewrite
       │
       ▼
Cloud Function `logInstallClick`     <── functions/index.js
       │  console.log(JSON.stringify({event: "install_click", os, ...}))
       ▼
Cloud Logging (resource.type=cloud_run_revision, service=loginstallclick)
       │  Log sink `firebase-hosting-requests`, filter includes both hosting
       │  request logs (aspirational) and the function's stdout (today).
       ▼
BigQuery: embabel-me-prod.worlds_site_analytics.run_googleapis_com_stdout_*
       │
       ▼
install_stats.py --variant N          ← you are here
```

Everything past the fetch is one-way: the beacon fires and forgets, the
Function returns 204, the log line lands, the sink routes it, the row lives
in BigQuery. See [environments/prod/me_analytics.tf][tf] in the
embabel-infra repo for the durable infra.

[tf]: https://github.com/embabel/embabel-infra/blob/main/environments/prod/me_analytics.tf

### Prerequisites

- Python 3.9+
- Google Cloud SDK (`gcloud` and `bq` on PATH)
- A Google account with `roles/bigquery.dataViewer` on `embabel-me-prod`
  (Owners and Editors have it by default)

The script pre-flights all three -- if any is missing it tells you what to do.

### Usage

```powershell
# Interactive menu, PowerShell-friendly:
python scripts\install_stats.py

# Skip the menu:
python scripts\install_stats.py --variant 1

# Filter to a window:
python scripts\install_stats.py --variant 4 --days 7

# See the SQL that would run, run nothing:
python scripts\install_stats.py --variant 2 --sql-only

# Print the menu and exit:
python scripts\install_stats.py --list

# Skip the gcloud pre-flight (rare -- when the check itself is broken):
python scripts\install_stats.py --variant 3 --no-auth-check
```

macOS / Linux is identical, `/` for path separators.

### The variants

| # | Report | Best for |
|---|---|---|
| 1 | Per day + daily totals + grand total | "How many people copied today? Yesterday? Ever?" |
| 2 | Per day + daily totals + **per-OS totals** + grand total | Same as 1, plus "Windows vs Linux over all time." |
| 3 | Summary only (per OS across all time) | One-glance answer: Windows vs Linux, total. |
| 4 | Per day per OS (raw, no totals) | Export to a spreadsheet or chart. |
| 5 | Top user agents | Spotting bots or oddities in the traffic. |
| 6 | Recent hits (raw) | Sanity-check that the pipeline is live. |

### First run

The pipeline was assembled on 2026-09-20. Before that, no data exists —
Cloud Logging sinks do not backfill historical entries. Reports before
2026-09-20 will be empty, not broken.

Each day BigQuery creates a fresh `run_googleapis_com_stdout_YYYYMMDD` table;
the query's wildcard (`_*`) catches all of them.

### Sign-in flow

On a fresh machine the script will notice you are not signed into `gcloud`
and offer to run `gcloud auth login` for you. Say yes, complete the browser
flow, and the script continues. On a machine that IS signed in but with the
wrong Google account, it tells you which account it saw and offers to
re-authenticate.

To bypass the sign-in prompt and be told the raw command instead — useful
in CI, or when the browser flow will not work — pipe the script to `cat`
(non-interactive stdin) or pass `--no-auth-check` and let `bq` fail with its
own message.

### Adding a variant

Add a `Variant(...)` entry to `VARIANTS` in `install_stats.py`. Each entry has
a label, a description, and a SQL string with two placeholders:

- `{table}` — the fully-qualified analytics table wildcard
- `{where_extra}` — an optional `AND DATE(timestamp) >= ...` filter when the
  caller passes `--days`

Nothing else needs to change; the menu, help text, and argument handling all
re-read `VARIANTS` at import time.

### Cost

Every query scans one day of tiny structured log rows — well under 1 MB
per day, versus BigQuery's 1 TB/month free tier. Reports run on demand and
cost effectively nothing at expected worlds-site traffic.
