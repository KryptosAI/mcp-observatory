# Access Control Policy

## Authentication

MCP Observatory Cloud supports two authentication methods:

1. **Bearer Token (legacy)** — `MCP_OBSERVATORY_CLOUD_TOKEN` environment variable. Set via `wrangler secret put`. Compared as a string constant in the Worker.

2. **OpenID Connect / SSO (current)** — Industry-standard OIDC via managed identity provider (WorkOS, Auth0, or Google). Users authenticate through their browser; the CLI receives a JWT access token.

## Authorization Model

- **Artifact upload**: Requires valid authentication token. Artifacts are scoped to the authenticated organization.
- **Artifact listing**: Users can only list artifacts belonging to their own organization (derived from token claims).
- **Hosted scanning**: Requires a separate `HOSTED_SCAN_TOKEN` with its own scope.
- **Public endpoints**: Health check (`/api/v1/health`), badge rendering (`/api/v1/badge/:runId`), and the static dashboard require no authentication.

## Access Revocation

- **Bearer tokens**: Revoked by rotating the Cloudflare secret via `wrangler secret put` and deploying.
- **OIDC tokens**: Short-lived (1 hour default). Refresh tokens can be revoked via the identity provider's admin console.
- **Org access**: Managed through the identity provider's group/team membership. Removing a user from the org immediately prevents access.

## Least Privilege

- API Worker has access only to its designated KV namespace (`SCAN_CACHE`).
- Telemetry Worker has access only to its designated D1 database.
- No cross-worker data access.
- CLI has no direct database access — all data operations go through the API Worker.

## Key Management

- Signing keys for OIDC are managed by the identity provider, not by MCP Observatory.
- Cloudflare secrets are encrypted at rest and never exposed in logs or source code.
- Environment variables containing secrets are never printed, logged, or stored in telemetry.
