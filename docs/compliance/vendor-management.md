# Vendor Management

## Sub-processors

| Vendor | Service | Data Processed | SOC 2 | DPA |
|---|---|---|---|---|
| Cloudflare | Workers, KV, D1, Pages | Telemetry, artifacts, static assets | Yes | Standard terms |
| GitHub | Source code, CI/CD, Issues | Source code, build logs | Yes | Standard terms |
| npm | Package registry | Distribution | N/A | N/A |
| Identity Provider (WorkOS/Auth0) | SSO/OIDC | Email, org membership | Yes | Required |

## Vendor Assessment

### Cloudflare
- SOC 2 Type II certified
- Data encrypted in transit (TLS 1.3)
- Workers run in isolated V8 isolates (no cross-tenant access)
- KV and D1 are managed services with no customer-managed encryption keys

### GitHub
- SOC 2 Type II certified
- Repository contents at rest are encrypted
- Actions logs retained for 90 days
- Secrets stored encrypted and never exposed in logs

### npm
- Public registry — no customer data involved
- Package integrity verified via lockfile hashes (`npm ci`)

### Identity Provider
- Must be SOC 2 Type II certified
- Must offer Data Processing Agreement (DPA)
- Must support OIDC and SAML
- Must provide audit logs and admin console

## Annual Review

Sub-processors are reviewed annually for:
- Continued SOC 2 certification
- Security incident history
- Service reliability (uptime SLA)
- Pricing and contract changes
