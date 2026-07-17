# Risk Assessment

## Threat Model

### Assets

| Asset | Classification | Location |
|---|---|---|
| Telemetry events (anonymized) | Internal | Cloudflare D1 |
| Uploaded run artifacts | Customer data | Cloudflare KV |
| Scan results (hosted) | Customer data | Cloudflare KV (transient) |
| Auth tokens / secrets | Critical | Cloudflare Secrets |
| Source code | Public | GitHub |

### Threat Scenarios

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Unauthorized artifact access | Low | Medium | Bearer token + OIDC auth; org-scoped queries |
| Token leakage in logs | Low | High | Secrets never logged; Cloudflare secrets encrypted |
| D1 data exfiltration | Low | Medium | No public D1 endpoints; stats endpoint behind token |
| Worker code injection | Very Low | High | Code review required; no eval() or dynamic imports |
| npm supply chain attack | Low | Medium | Lockfile committed; minimal dependencies (4 runtime) |
| Denial of wallet (excessive scans) | Medium | Low | Rate limiting on API Worker (10 req/min/IP) |
| OIDC provider compromise | Very Low | High | Managed provider with SOC 2; short-lived tokens |

### Risk Acceptance

- **Telemetry is not encrypted at rest in D1** — Accepted because telemetry is anonymized (no PII by default, email is opt-in only). D1 is Cloudflare-managed infrastructure.
- **KV is not encrypted at rest** — Accepted because KV entries have TTLs and contain only scan results (no secrets or PII). Cloudflare encrypts data in transit.

## Vulnerability Management

- Security vulnerabilities reported via `SECURITY.md`
- Dependabot enabled for automated dependency updates
- OpenSSF Scorecard runs on every push to main
- CodeQL security analysis runs on every PR
