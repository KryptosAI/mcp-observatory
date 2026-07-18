# MCP Observatory Cloud API

Base URL: `https://mcp-observatory-api.kryptosai.workers.dev`

All responses are JSON. Public endpoints require no authentication. CORS is enabled on all endpoints.

## Authentication

Protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens can be:
- **Legacy static token**: Set via `MCP_OBSERVATORY_CLOUD_TOKEN` env var or `CLOUD_UPLOAD_TOKEN` Cloudflare secret
- **OIDC JWT token**: Obtained via `mcp-observatory cloud login` (OIDC device authorization flow)

## Rate Limiting

Some endpoints enforce 10 requests per minute per IP.

## Endpoints

### Health Check

```
GET /api/v1/health
```

Returns `{"status":"ok","service":"mcp-observatory-api"}`.

---

### Artifact Upload

```
POST /api/v1/artifacts
Authorization: Bearer <token>
Content-Type: application/json

{ ... run artifact JSON ... }
```

Uploads a run artifact to cloud storage. Returns `{"uploaded":true,"runId":"..."}`.

---

### List Artifacts

```
GET /api/v1/artifacts/:org
Authorization: Bearer <token>
```

Lists uploaded artifacts for an organization.

---

### Hosted Scan

```
POST /api/v1/scan
Authorization: Bearer <token>
Content-Type: application/json

{"url":"https://mcp.example.com/mcp"}
```

Runs a scan against an HTTP MCP server. Returns the scan result.

---

### Get Scan Result

```
GET /api/v1/scan/:runId
```

Retrieves a cached scan result.

---

### Health Badge

```
GET /api/v1/badge/:runId
```

Returns an SVG health badge for a scan result.

---

## Safety Index (Public)

All Safety Index endpoints are public (no authentication required).

### List All Servers

```
GET /api/v1/safety-index/servers?page=1&perPage=20
```

Returns a paginated list of evaluated MCP servers.

**Response:**
```json
{
  "servers": [
    {
      "id": "everything-server",
      "name": "Official everything server",
      "packageName": "@modelcontextprotocol/server-everything",
      "category": "Reference",
      "riskClass": "Reference compatibility",
      "healthScore": 92,
      "grade": "A",
      "gate": "pass",
      "toolCount": 8,
      "promptCount": 2,
      "resourceCount": 1,
      "lastScanned": "2026-07-15T22:35:58Z"
    }
  ],
  "total": 175,
  "page": 1,
  "perPage": 20
}
```

---

### Server Detail

```
GET /api/v1/safety-index/servers/:id
```

Returns full evaluation details for a specific server.

**Response:** Includes all check results, health score dimensions, performance metrics, and security findings.

---

### Search

```
GET /api/v1/safety-index/search?q=postgres&category=Database&grade=A
```

Filters servers by name, category, grade, or risk class. All query parameters are optional.

---

### Categories

```
GET /api/v1/safety-index/categories
```

Returns all categories with server counts:
```json
{
  "categories": [
    {"name": "Reference", "count": 12},
    {"name": "Database", "count": 8}
  ]
}
```

---

### Server Tools

```
GET /api/v1/safety-index/servers/:id/tools
```

Returns tool schemas from the most recent scan:
```json
{
  "tools": [
    {"name": "query", "description": "Execute SQL query", "inputSchema": { ... }}
  ]
}
```

---

### Server Security Findings

```
GET /api/v1/safety-index/servers/:id/security
```

Returns security-specific findings with severity and rule mapping:
```json
{
  "findings": [
    {"severity": "medium", "rule": "filesystem-write-access", "message": "...", "cwe": "CWE-22"}
  ]
}
```

---

### Server Badge

```
GET /api/v1/safety-index/servers/:id/badge
Content-Type: image/svg+xml
```

Returns an SVG health badge for a Safety Index server.

---

### Risk Graph

```
GET /api/v1/safety-index/risk-graph
```

Returns the MCP risk graph (nodes and edges mapping server capability boundaries).

---

## Error Responses

All errors follow this format:
```json
{"error":"Error message"}
```

HTTP status codes:
- 200: Success
- 400: Bad request
- 401: Unauthorized (auth required)
- 404: Not found
- 429: Rate limited
- 501: Not configured
```
