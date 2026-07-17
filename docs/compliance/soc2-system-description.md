# SOC 2 System Description

## Service Overview

MCP Observatory Cloud is a hosted service that provides MCP server safety evaluation, artifact storage, and fleet health monitoring for teams that build and deploy AI agent applications.

The service consists of:
- **API Worker** (`api/src/worker.ts`) — Cloudflare Worker handling scan requests, artifact uploads, and health badge generation. Backed by Cloudflare KV (`SCAN_CACHE` namespace).
- **Telemetry Worker** — Separate Cloudflare Worker backed by Cloudflare D1 (SQLite). Ingests anonymized telemetry from the open-source CLI.
- **Cloudflare Pages Dashboard** (`dashboard/`) — Static Web Application serving the public Safety Index and Fleet Monitor.

## System Boundary

In-scope for SOC 2:
- API Worker (artifact upload, hosted scanning, badge generation)
- Telemetry Worker (event ingestion, statistics)
- Cloudflare Pages (static dashboard hosting)
- CLI cloud upload path (`cloud upload` command)

Out of scope:
- Open-source CLI (runs on user machines, not our infrastructure)
- GitHub App (runs in user's GitHub Actions, uses their secrets)
- Local metrics database (SQLite on user machines)

## Infrastructure

| Component | Provider | Region | Data Storage |
|---|---|---|---|
| API Worker | Cloudflare Workers | Global (auto) | KV (SCAN_CACHE) |
| Telemetry Worker | Cloudflare Workers | Global (auto) | D1 (SQLite) |
| Dashboard | Cloudflare Pages | Global (auto) | Static files |
| Secrets | Cloudflare Secrets | Encrypted at rest | wrangler.toml |

## Data Flows

1. **Telemetry ingestion**: CLI → POST /v1/events → Telemetry Worker → D1
2. **Artifact upload**: CLI → POST /api/v1/artifacts → API Worker → KV
3. **Hosted scan**: CLI → POST /api/v1/scan → API Worker → KV
4. **Dashboard**: Browser → GET → Cloudflare Pages (static)

## Trust Criteria Mapping

| Criterion | How Addressed |
|---|---|
| Security | Bearer token auth, TLS everywhere (Cloudflare edge), no persistent user data at rest in KV |
| Availability | Cloudflare Workers global distribution (inherent HA), KV replication |
| Processing Integrity | Input validation via Zod schemas, output integrity via SHA-256 hashing |
| Confidentiality | Auth required for all data endpoints, telemetry anonymized by default |
| Privacy | Documented in PRIVACY.md; telemetry is opt-out, no PII except opt-in email |
