# MCP Observatory hosted client contract

The public CLI includes a thin compatibility client for explicit hosted
operations. The hosted implementation is private and lives in
KryptosAI/mcp-observatory-cloud.

## Endpoint configuration

The default artifact endpoint is:

https://mcp-observatory-api.kryptosai.workers.dev/api/v1/artifacts

Override it with MCP_OBSERVATORY_CLOUD_ENDPOINT or the cloud upload
--endpoint option. OIDC issuer and client configuration are also supplied by
the caller through the cloud login options or environment variables.

## Stable v1 routes

The existing hosted service preserves these routes:

| Method | Route | Client use |
| --- | --- | --- |
| GET | /api/v1/health | service health |
| POST | /api/v1/scan | authenticated HTTP MCP scan |
| GET | /api/v1/scan/:runId | retrieve a scan artifact |
| POST | /api/v1/artifacts | authenticated RunArtifact upload |
| GET | /api/v1/artifacts/:org | authenticated artifact index |
| GET | /api/v1/badge/:runId | SVG health badge |
| GET | /api/v1/safety-index/servers | public index listing |
| GET | /api/v1/safety-index/servers/:id | public server detail |
| GET | /api/v1/safety-index/search | public index search |
| GET | /api/v1/safety-index/categories | public categories |
| GET | /api/v1/safety-index/risk-graph | public risk graph |
| GET | /api/v1/safety-index/servers/:id/tools | public tools |
| GET | /api/v1/safety-index/servers/:id/security | public findings |
| GET | /api/v1/safety-index/servers/:id/badge | public SVG badge |

## Wire-format boundary

RunArtifact and the published artifact schemas are the compatibility
boundary. Clients should validate artifacts locally before upload and should
not assume private storage, retention, organization, or decision
implementation details.

Hosted authorization, organization validation, storage policy, retention,
rate limiting, and decision logic are private control-plane behavior.

## CLI examples

Upload an explicit local artifact:

    npx @kryptosai/mcp-observatory cloud upload .mcp-observatory/runs/latest.json

Use a staging-compatible endpoint:

    MCP_OBSERVATORY_CLOUD_ENDPOINT=https://staging.example/api/v1/artifacts \
      npx @kryptosai/mcp-observatory cloud upload run.json

The local scanner, evidence engine, report generators, and public dashboard
remain usable without an account or hosted credentials.
