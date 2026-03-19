# MCP Observatory

[![CI](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@kryptosai/mcp-observatory)](https://www.npmjs.com/package/@kryptosai/mcp-observatory)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)

Find problems in your MCP servers before your users do.

You update a server, a tool silently breaks, and your agent starts failing. MCP Observatory catches that. It connects to your servers, checks every capability, actually calls tools to make sure they work, and diffs runs to catch what changed.

<p align="center">
  <img src="./docs/demo.svg" alt="MCP Observatory scan output" width="820">
</p>

## Quick Start

Scan every MCP server in your Claude config:

```bash
npx @kryptosai/mcp-observatory
```

Check a specific server:

```bash
npx @kryptosai/mcp-observatory run -- npx -y @modelcontextprotocol/server-everything
```

Add it to Claude Code as an MCP server:

```bash
claude mcp add mcp-observatory -- npx -y @kryptosai/mcp-observatory serve
```

Or add it manually to your config:

```json
{
  "mcpServers": {
    "mcp-observatory": {
      "command": "npx",
      "args": ["-y", "@kryptosai/mcp-observatory", "serve"]
    }
  }
}
```

## What It Does

**Check capabilities** — connects to a server and verifies tools, prompts, and resources respond correctly.

**Invoke tools** — goes beyond listing. Actually calls safe tools (no required params / readOnlyHint) and reports which ones work and which ones crash.

```bash
npx @kryptosai/mcp-observatory scan --invoke-tools
```

**Detect schema drift** — diffs two runs and surfaces added/removed fields, type changes, and breaking parameter changes.

```bash
npx @kryptosai/mcp-observatory diff --base run-a.json --head run-b.json
```

**Recommend servers** — scans your project for languages, frameworks, databases, and cloud providers, then cross-references the [MCP registry](https://registry.modelcontextprotocol.io) to suggest servers you're missing. Ask your agent "what MCP servers should I add?" and it figures out the rest.

**Watch for regressions** — re-runs checks on an interval and alerts when something changes.

```bash
npx @kryptosai/mcp-observatory run --watch -- npx -y @modelcontextprotocol/server-filesystem .
```

## Commands

| Command | What it does |
|---------|-------------|
| `scan` | Auto-discover servers from config files and check them all (default) |
| `run` | Check one server and save a run artifact |
| `check` | Run a single capability check (tools, prompts, resources, tools-invoke) |
| `diff` | Compare two runs — regressions, recoveries, schema drift |
| `report` | Render a run as terminal, JSON, markdown, or HTML |
| `serve` | Run as an MCP server — exposes scan, check, diff, suggest as tools |

### Scan locations

When you run `scan`, it looks for MCP configs in:

- `~/.claude.json` (Claude Code)
- `~/Library/Application Support/Claude/claude_desktop_config.json` (Claude Desktop, macOS)
- `%APPDATA%/Claude/claude_desktop_config.json` (Claude Desktop, Windows)
- `.claude.json` and `.mcp.json` (current directory)

## MCP Server Mode

When running as an MCP server (`serve`), your AI agent gets five tools:

| Tool | What it does |
|------|-------------|
| `scan` | Discover and check all configured servers |
| `check_server` | Check a specific server by command |
| `diff_runs` | Compare two saved run artifacts |
| `get_last_run` | Return the most recent run for a target |
| `suggest_servers` | Scan your environment and recommend servers you're missing |

An AI tool that checks other AI tools. It's a tool testing tools that serve tools.*

<sub>* I'm a dude playing a dude disguised as another dude.</sub>

## Compatibility

Works with any MCP server that uses standard transports:

| Transport | Examples | Adapter |
|-----------|----------|---------|
| **stdio** (most servers) | [filesystem](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem), [memory](https://www.npmjs.com/package/@modelcontextprotocol/server-memory), [context7](https://www.npmjs.com/package/@upstash/context7-mcp), [brave-search](https://www.npmjs.com/package/@modelcontextprotocol/server-brave-search), [sentry](https://www.npmjs.com/package/@sentry/mcp-server), [notion](https://www.npmjs.com/package/@notionhq/notion-mcp-server), [stripe](https://www.npmjs.com/package/@stripe/mcp) | `local-process` |
| **HTTP/SSE** (remote) | [Cloudflare](https://developers.cloudflare.com/mcp/), [Exa](https://exa.ai), [Tavily](https://tavily.com) | `http` |
| **Docker** | All `@modelcontextprotocol/server-*` images | `local-process` via `docker run -i` |

Servers needing API keys work via `env` in the target config. Python servers work via `uvx`. See the [full compatibility matrix](./docs/compatibility.md) for tested servers and known issues.

### HTTP / SSE targets

```json
{
  "targetId": "my-remote-server",
  "adapter": "http",
  "url": "http://localhost:3000/mcp",
  "authToken": "optional-bearer-token",
  "timeoutMs": 15000
}
```

### Target config files

For more control (env vars, metadata, custom timeout):

```json
{
  "targetId": "filesystem-server",
  "adapter": "local-process",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
  "timeoutMs": 15000
}
```

```bash
npx @kryptosai/mcp-observatory run --target ./target.json
```

## Limitations

- Servers requiring interactive OAuth (e.g., Google Drive) need pre-authentication before Observatory can connect
- Custom WebSocket transports (e.g., BrowserTools MCP) are not supported
- A few servers time out or close before init — see [known issues](./docs/known-issues.md) and [compatibility](./docs/compatibility.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines. The fastest way to contribute is to add a real passing target with a distinct capability shape, a clearer report surface, or a cleaner startup diagnosis.
