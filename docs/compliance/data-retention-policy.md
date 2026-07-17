# Data Retention & Disposal Policy

## Data Categories

| Category | Storage | Retention | Disposal |
|---|---|---|---|
| Telemetry events | Cloudflare D1 | 90 days | Automated via D1 scheduled cleanup (TBD) |
| Run artifacts (uploaded) | Cloudflare KV | 30 days (TTL) | Automatic expiration via KV TTL |
| Hosted scan results | Cloudflare KV | 1 hour (TTL) | Automatic expiration via KV TTL |
| Auth tokens (local) | User machine (`~/.mcp-observatory/auth.json`) | Until logout | `cloud logout` command deletes the file |
| npm download stats | D1 | Indefinite (aggregate only) | No PII |
| Build artifacts | GitHub Actions | 90 days (GitHub default) | GitHub auto-cleanup |

## Customer Data

- Uploaded run artifacts belong to the customer's organization.
- Customers can request data deletion by contacting `william@banksey.com`.
- Deletion is completed within 48 hours.
- No backups are maintained for KV data.

## Telemetry Data

- Telemetry is opt-out. Users can disable via `MCP_OBSERVATORY_TELEMETRY=0`.
- Telemetry does NOT collect: environment variables, file contents, tool response data, or personal information by default.
- Email is collected only when the user explicitly runs `mcp-observatory telemetry identify`.
- Machine fingerprint is a SHA-256 hash (not reversible to hostname).

## Data Disposal

- KV entries are automatically deleted when their TTL expires.
- D1 records are deleted via scheduled cleanup queries.
- Auth tokens on user machines are deleted when the user runs `cloud logout`.
