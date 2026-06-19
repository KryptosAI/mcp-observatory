# MCP Server Compatibility

MCP Observatory supports two transport adapters — **local-process (stdio)** and **HTTP (Streamable HTTP + SSE)** — which together cover ~95% of the MCP server ecosystem.

This document tracks which servers work, how to configure them, and what patterns are not yet supported.

## Tested and Passing

These servers have been tested directly with MCP Observatory and produce valid results.

| Server | Package | Transport | Setup | Tools | Prompts | Resources |
|--------|---------|-----------|-------|-------|---------|-----------|
| Everything | [`@modelcontextprotocol/server-everything`](https://www.npmjs.com/package/@modelcontextprotocol/server-everything) | stdio | Zero-config | ✅ pass | ✅ pass | ✅ pass |
| Filesystem | [`@modelcontextprotocol/server-filesystem`](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem) | stdio | Path args | ✅ pass | — unsupported | — unsupported |
| Context7 | [`@upstash/context7-mcp`](https://www.npmjs.com/package/@upstash/context7-mcp) | stdio | Zero-config | ✅ pass | — unsupported | — unsupported |
| Puppeteer | [`puppeteer-mcp-server`](https://www.npmjs.com/package/puppeteer-mcp-server) | stdio | Zero-config | ✅ pass | — unsupported | ✅ pass |
| OpenTofu | [`@opentofu/opentofu-mcp-server`](https://www.npmjs.com/package/@opentofu/opentofu-mcp-server) | stdio | Zero-config | ✅ pass | — unsupported | ✅ pass |
| Ref Tools | [`ref-tools-mcp`](https://www.npmjs.com/package/ref-tools-mcp) | stdio | Zero-config | ✅ pass | ✅ pass | — unsupported |
| Promptopia | [`promptopia-mcp`](https://www.npmjs.com/package/promptopia-mcp) | stdio | Zero-config | ✅ pass | ✅ pass | — unsupported |
| GitHub MCP | Docker-based | stdio | `GITHUB_PERSONAL_ACCESS_TOKEN` | ✅ pass | ✅ pass | ✅ pass |

## Compatible (stdio, zero-config or env vars only)

These servers use standard stdio transport and should work with MCP Observatory. Most just need an API key as an env var.

### Zero-config (just `npx`)

| Server | Package | Command |
|--------|---------|---------|
| Sequential Thinking | [`@modelcontextprotocol/server-sequential-thinking`](https://www.npmjs.com/package/@modelcontextprotocol/server-sequential-thinking) | `npx -y @modelcontextprotocol/server-sequential-thinking` |
| Memory | [`@modelcontextprotocol/server-memory`](https://www.npmjs.com/package/@modelcontextprotocol/server-memory) | `npx -y @modelcontextprotocol/server-memory` |
| ESLint | [`@eslint/mcp`](https://www.npmjs.com/package/@eslint/mcp) | `npx -y @eslint/mcp` |
| SAP UI5 | [`@ui5/mcp-server`](https://www.npmjs.com/package/@ui5/mcp-server) | `npx -y @ui5/mcp-server` |

### API key via env var

| Server | Package | Env Var | Command |
|--------|---------|---------|---------|
| Brave Search | [`@modelcontextprotocol/server-brave-search`](https://www.npmjs.com/package/@modelcontextprotocol/server-brave-search) | `BRAVE_API_KEY` | `npx -y @modelcontextprotocol/server-brave-search` |
| Sentry | [`@sentry/mcp-server`](https://www.npmjs.com/package/@sentry/mcp-server) | `SENTRY_AUTH_TOKEN` | `npx -y @sentry/mcp-server` |
| Tavily | [`tavily-mcp`](https://www.npmjs.com/package/tavily-mcp) | `TAVILY_API_KEY` | `npx -y tavily-mcp` |
| Firecrawl | [`firecrawl-mcp`](https://www.npmjs.com/package/firecrawl-mcp) | `FIRECRAWL_API_KEY` | `npx -y firecrawl-mcp` |
| HubSpot | [`@hubspot/mcp-server`](https://www.npmjs.com/package/@hubspot/mcp-server) | API key | `npx -y @hubspot/mcp-server` |
| LaunchDarkly | [`@launchdarkly/mcp-server`](https://www.npmjs.com/package/@launchdarkly/mcp-server) | API key | `npx -y @launchdarkly/mcp-server` |
| Notion | [`@notionhq/notion-mcp-server`](https://www.npmjs.com/package/@notionhq/notion-mcp-server) | `OPENAPI_MCP_HEADERS` | `npx -y @notionhq/notion-mcp-server` |
| Stripe | [`@stripe/mcp`](https://www.npmjs.com/package/@stripe/mcp) | `--api-key` arg | `npx -y @stripe/mcp --api-key ${STRIPE_API_KEY}` |

Target config example with env vars:

```json
{
  "targetId": "brave-search",
  "adapter": "local-process",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": { "BRAVE_API_KEY": "your-key-here" },
  "timeoutMs": 15000
}
```

### Positional args required

| Server | Package | Args | Command |
|--------|---------|------|---------|
| Filesystem | [`@modelcontextprotocol/server-filesystem`](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem) | Directory paths | `npx -y @modelcontextprotocol/server-filesystem /path/to/dir` |
| PostgreSQL | [`@modelcontextprotocol/server-postgres`](https://www.npmjs.com/package/@modelcontextprotocol/server-postgres) | Connection URL | `npx -y @modelcontextprotocol/server-postgres postgres://...` |
| SQLite | [`@modelcontextprotocol/server-sqlite`](https://www.npmjs.com/package/@modelcontextprotocol/server-sqlite) | `--db-path` | `npx -y @modelcontextprotocol/server-sqlite --db-path ./db.sqlite` |
| Redis | [`@modelcontextprotocol/server-redis`](https://www.npmjs.com/package/@modelcontextprotocol/server-redis) | Redis URL | `npx -y @modelcontextprotocol/server-redis redis://localhost:6379` |
| Git | [`mcp-server-git`](https://pypi.org/project/mcp-server-git/) | `--repository` | `uvx mcp-server-git --repository /path/to/repo` |
| Nx | [`nx-mcp`](https://www.npmjs.com/package/nx-mcp) | Workspace path | `npx -y nx-mcp --workspace /path` |

### Python servers (via `uvx`)

Python-based MCP servers work with the `local-process` adapter as long as `uv` is installed:

```json
{
  "targetId": "git-server",
  "adapter": "local-process",
  "command": "uvx",
  "args": ["mcp-server-git", "--repository", "."],
  "timeoutMs": 15000
}
```

## Compatible (HTTP/SSE remote)

These servers expose a hosted HTTP endpoint. Use the `http` adapter:

| Server | URL | Auth |
|--------|-----|------|
| Cloudflare | `https://observability.mcp.cloudflare.com/mcp` | API token via `authToken` |
| Exa | `https://mcp.exa.ai/mcp` | `EXA_API_KEY` via `authToken` |
| Tavily (remote) | `https://mcp.tavily.com/mcp` | Bearer token via `authToken` |
| Context7 (remote) | `https://mcp.context7.com/mcp` | Optional API key |

Target config example:

```json
{
  "targetId": "cloudflare",
  "adapter": "http",
  "url": "https://observability.mcp.cloudflare.com/mcp",
  "authToken": "your-cloudflare-api-token",
  "timeoutMs": 15000
}
```

## Compatible (Docker)

Many MCP servers ship Docker images. These work with the `local-process` adapter — Docker's `-i` flag attaches stdin/stdout, which is standard stdio transport.

```json
{
  "targetId": "github-docker",
  "adapter": "local-process",
  "command": "docker",
  "args": ["run", "-i", "--rm",
    "-e", "GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PERSONAL_ACCESS_TOKEN}",
    "ghcr.io/github/github-mcp-server"],
  "timeoutMs": 30000
}
```

```bash
mcp-observatory run -- docker run -i --rm ghcr.io/github/github-mcp-server
```

All official `@modelcontextprotocol/server-*` packages publish Docker images that work this way.

## Known Incompatible

These servers do not work with MCP Observatory due to transport or architecture constraints:

| Server | Why | Workaround |
|--------|-----|------------|
| BrowserTools MCP | Custom WebSocket transport between Chrome extension, middleware, and MCP server | None — non-standard transport |
| Google Drive | Requires interactive OAuth browser flow before first use | Pre-authenticate manually, then run Observatory |
| `@modelcontextprotocol/server-map` | Times out under stdio harness | May need specific startup args |
| `@modelcontextprotocol/server-threejs` | Closes connection before init | App-oriented, not a pure stdio server |
| `@modelcontextprotocol/server-pdf` | Times out under probe setup | May need specific startup args |
| `@jsonresume/mcp` | Closes connection before init | May expect different invocation |

## Transport Coverage

MCP Observatory covers both standard MCP transports:

| Transport | Adapter | Status |
|-----------|---------|--------|
| **stdio** (subprocess, JSON-RPC over stdin/stdout) | `local-process` | ✅ Supported |
| **Streamable HTTP** (POST to endpoint, SSE response) | `http` | ✅ Supported |
| **HTTP+SSE** (deprecated, separate GET/POST endpoints) | `http` (fallback) | ✅ Supported |
| WebSocket (non-standard) | — | ❌ Not supported |

Per the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports), stdio and Streamable HTTP are the two standard transports. The deprecated HTTP+SSE transport is handled automatically via SDK fallback.

## Ecosystem Stats

Based on analysis of the top 30+ MCP servers by npm downloads:

- **~85%** use stdio as primary transport → covered by `local-process` adapter
- **~10%** are HTTP-only remote services → covered by `http` adapter
- **~5%** support both stdio and HTTP → both adapters work
- **<1%** use non-standard transports (WebSocket) → not supported
