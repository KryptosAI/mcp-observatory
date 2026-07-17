# Encryption Policy

## Data in Transit

- All API endpoints are served over HTTPS (TLS 1.3) via Cloudflare's edge.
- CLI-to-API communication uses HTTPS with certificate validation.
- Cloudflare Workers runtime enforces HTTPS for all outbound requests.
- HSTS is enabled via Cloudflare's default configuration.

## Data at Rest

- **Cloudflare KV**: Data is encrypted at rest by Cloudflare's infrastructure. No customer-managed encryption keys.
- **Cloudflare D1**: Data is encrypted at rest by Cloudflare's infrastructure. SQLite database files are stored encrypted.
- **Cloudflare Secrets**: Encrypted at rest using Cloudflare's secret management. Never exposed in logs, code, or configuration files.
- **Local auth tokens**: Stored in `~/.mcp-observatory/auth.json` with standard filesystem permissions (0600 on Unix). Not encrypted at rest on the user's machine.

## Cryptographic Standards

| Use Case | Algorithm | Key Size | Library |
|---|---|---|---|
| Ed25519 receipt signing | Ed25519 | 256-bit | Node.js `crypto` (built-in) |
| Artifact hashing | SHA-256 | 256-bit | Node.js `crypto` (built-in) |
| JWT verification (Worker) | RS256 / ES256 | 2048-bit RSA / 256-bit ECDSA | Web Crypto API (built-in) |
| TLS | TLS 1.3 | Varies | Cloudflare edge |

## Key Management

- Ed25519 signing keys are generated and stored by the end user. MCP Observatory never has access to private keys.
- JWT signing keys are managed by the identity provider. The API Worker only holds the public JWKS endpoint URL.
- API tokens for Cloudflare Worker secrets are rotated via `wrangler secret put`. No automated rotation currently implemented.

## Encryption at Rest for Customer Data

MCP Observatory Cloud does not currently implement application-level encryption for customer data stored in KV or D1. This is an accepted risk because:
1. KV entries have TTLs (transient storage)
2. D1 data is telemetry (anonymized by default)
3. Cloudflare encrypts data at rest at the infrastructure level

If application-level encryption becomes a customer requirement, we will implement envelope encryption using Cloudflare's Web Crypto API with per-tenant keys.
