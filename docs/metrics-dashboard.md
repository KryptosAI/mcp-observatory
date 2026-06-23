# Local Metrics Dashboard

MCP Observatory includes a private laptop dashboard for collecting telemetry, GitHub activity, and npm download data going forward.

The dashboard is intentionally local. It stores raw telemetry in a SQLite database on your laptop, then renders a sanitized static HTML view that is safe to screenshot or skim without exposing raw emails, hostnames, private URLs, tokens, or private command bodies.

The layout follows an App Store Connect-style breakdown:

- Overview
- Acquisition
- Downloads
- Usage
- Reliability

Daily rows are shown newest to oldest so the most recent project activity is always at the top.

## Refresh

```bash
npm run metrics:refresh
npm run metrics:serve
```

Outputs are written to:

- `.mcp-observatory-metrics/observatory.sqlite`
- `.mcp-observatory-metrics/dashboard/index.html`
- `.mcp-observatory-metrics/dashboard/latest.json`
- `.mcp-observatory-metrics/logs/`

The local metrics directory is ignored by git and should not be published.

## Data Sources

The collector stores each source independently. If one source fails, the dashboard still builds from the last good SQLite data and records the failure in the Reliability section.

| Source | Data |
| --- | --- |
| Telemetry | Existing Cloudflare D1 export flow via `scripts/export-telemetry-d1.ts` |
| GitHub | clones, views, referrers, popular paths, repo snapshot, latest release, open issue/PR counts, workflow runs |
| npm | public daily downloads for `@kryptosai/mcp-observatory` |

GitHub traffic APIs have a limited visible window, so the collector stores snapshots locally going forward. npm daily buckets can lag; the dashboard labels npm data as complete public days rather than assuming current-day zero.

## Credentials

GitHub collection uses either:

```bash
gh auth login
```

or:

```bash
export GH_TOKEN=...
```

Telemetry collection uses the same Wrangler configuration as the existing telemetry export script. If the config is not auto-discovered, set:

```bash
export MCP_OBSERVATORY_TELEMETRY_WRANGLER_CONFIG=/path/to/wrangler.toml
export MCP_OBSERVATORY_TELEMETRY_D1_DATABASE=mcp-observatory-telemetry
```

No npm token is required for public download counts.

## Commands

```bash
npm run metrics:collect   # collect telemetry, GitHub, and npm into SQLite
npm run metrics:build     # render HTML from the existing SQLite database
npm run metrics:refresh   # collect + build
npm run metrics:open      # open the static read-only dashboard
npm run metrics:serve     # open the local dashboard with an Update Data button
```

The **Update Data** button is available in `metrics:serve` mode. A static `file://` dashboard cannot run local commands from the browser, so `metrics:open` shows the same data but disables the button.

For tests or offline recovery, you can seed telemetry from an existing export:

```bash
npm run metrics:refresh -- --telemetry-input telemetry-exports/events-flat-full.json
```

## Optional Hourly Refresh

Generate a small local refresh wrapper:

```bash
npx tsx scripts/metrics-dashboard.ts scheduler
```

The generated script lives under `.mcp-observatory-metrics/` and can be called by `launchd` or cron. It uses the same refresh command and writes logs to `.mcp-observatory-metrics/logs/refresh.log`.

## Privacy

Raw telemetry remains available in the local SQLite database for account intelligence and product analytics. The dashboard view uses sanitized aggregates by default:

- company domains, not raw emails
- aggregate source and command counts, not private command bodies
- GitHub and npm public metrics
- collection errors and freshness status

Do not commit `.mcp-observatory-metrics/`, telemetry exports, private reports, or screenshots that reveal raw data.
