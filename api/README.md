# MCP Observatory — Hosted Scan API

Cloudflare Worker that provides a hosted HTTP API for scanning MCP servers.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/scan` | Scan an HTTP MCP server |
| `GET` | `/api/v1/scan/:runId` | Retrieve a cached scan result |
| `GET` | `/api/v1/badge/:runId` | Get an SVG health badge |
| `GET` | `/api/v1/health` | Health check |

### POST /api/v1/scan

Request body:

```json
{ "url": "https://your-mcp-server.example.com/mcp" }
```

Returns a `RunArtifact` JSON object with health score, check results, and
performance metrics. Results are cached in KV for 24 hours.

Rate limit: 10 requests per minute per IP.

> **Note:** Local process targets (`{ "command": "..." }`) are rejected.
> Use the CLI for local servers.

### GET /api/v1/badge/:runId

Returns an SVG badge (shields.io style) showing the health score and grade.
Suitable for embedding in README files:

```markdown
![MCP Health](https://your-worker.workers.dev/api/v1/badge/run_abc123)
```

## Setup

```bash
cd api
npm install
```

### Create the KV namespace

```bash
npx wrangler kv namespace create SCAN_CACHE
```

Copy the returned namespace ID into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SCAN_CACHE"
id = "<paste-id-here>"
```

### Local development

```bash
npm run dev
```

Wrangler will create a local KV store automatically.

### Deploy

```bash
npm run deploy
```

## Architecture

The worker cannot import the full observatory (Node.js dependencies), so it
implements a simplified scanner that:

1. Sends an `initialize` JSON-RPC request to the target URL
2. Runs `tools/list`, `prompts/list`, and `resources/list` in parallel
3. Computes a health score using the same algorithm as the CLI
4. Returns a `RunArtifact`-compatible JSON response

Both Streamable HTTP (JSON responses) and SSE transports are supported for
reading responses from MCP servers.
