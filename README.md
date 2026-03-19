# MCP Observatory

[![CI](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml)
[![Real Server Matrix](https://github.com/KryptosAI/mcp-observatory/actions/workflows/real-server-matrix.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/real-server-matrix.yml)
[![npm](https://img.shields.io/npm/v/@kryptosai/mcp-observatory)](https://www.npmjs.com/package/@kryptosai/mcp-observatory)
[![Latest Release](https://img.shields.io/github/v/release/KryptosAI/mcp-observatory?display_name=tag)](https://github.com/KryptosAI/mcp-observatory/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)

An AI tool that checks other AI tools. It's a tool testing tools that serve tools.*

<sub>* I'm a dude playing a dude disguised as another dude.</sub>

Checks capabilities, invokes tools, detects schema drift, and diffs runs over time. Supports local stdio and remote HTTP/SSE targets.

<p align="center">
  <img src="./docs/demo.svg" alt="MCP Observatory scan output" width="820">
</p>

## Install

```bash
npx @kryptosai/mcp-observatory
```

That's it. Running with no arguments auto-discovers your MCP servers from Claude Code and Claude Desktop configs and checks them all.

To check a specific server, pass the command directly:

```bash
npx @kryptosai/mcp-observatory run -- npx -y @modelcontextprotocol/server-everything
npx @kryptosai/mcp-observatory run --invoke-tools -- npx -y @modelcontextprotocol/server-everything
npx @kryptosai/mcp-observatory check tools -- npx -y @modelcontextprotocol/server-filesystem .
```

Or use a target config file for more options (env vars, metadata, custom timeout):

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

## Server Compatibility

Works with **~95% of the MCP server ecosystem** across both standard transports:

| Transport | Examples | Adapter |
|-----------|----------|---------|
| **stdio** (most servers) | [filesystem](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem), [memory](https://www.npmjs.com/package/@modelcontextprotocol/server-memory), [sequential-thinking](https://www.npmjs.com/package/@modelcontextprotocol/server-sequential-thinking), [context7](https://www.npmjs.com/package/@upstash/context7-mcp), [brave-search](https://www.npmjs.com/package/@modelcontextprotocol/server-brave-search), [sentry](https://www.npmjs.com/package/@sentry/mcp-server), [notion](https://www.npmjs.com/package/@notionhq/notion-mcp-server), [stripe](https://www.npmjs.com/package/@stripe/mcp), [eslint](https://www.npmjs.com/package/@eslint/mcp) | `local-process` |
| **HTTP/SSE** (remote) | [Cloudflare](https://developers.cloudflare.com/mcp/), [Exa](https://exa.ai), [Tavily](https://tavily.com) | `http` |
| **Docker** | All `@modelcontextprotocol/server-*` images | `local-process` via `docker run -i` |

Servers needing API keys work via `env` in the target config. Python servers work via `uvx`. See the **[full compatibility matrix](./docs/compatibility.md)** for tested servers, setup examples, and known incompatibilities.

## Working Surface

- `run`: execute checks against one target and persist a run artifact
- `diff`: compare two runs and classify regressions, recoveries, and schema drift
- `report`: turn a saved run artifact into readable terminal, JSON, or Markdown output
- `scan`: auto-discover MCP servers from local config files and check them all (default command)
- `check`: run a single capability check (tools, prompts, resources, or tools-invoke)

## Scan

Auto-discover MCP server configs from Claude Code, Claude Desktop, and project-level config files, then run checks against every discovered server. This is the default command — running `mcp-observatory` with no arguments runs scan:

```bash
mcp-observatory
mcp-observatory scan
mcp-observatory scan --config ~/.claude.json
mcp-observatory scan --invoke-tools
```

Scanned locations (in order):
- `~/.claude.json` (Claude Code)
- `~/Library/Application Support/Claude/claude_desktop_config.json` (Claude Desktop, macOS)
- `%APPDATA%/Claude/claude_desktop_config.json` (Claude Desktop, Windows)
- `.claude.json` (current directory)
- `.mcp.json` (current directory)

## Check

Run a single capability check for faster iteration:

```bash
mcp-observatory check tools --target ./my-server.json
mcp-observatory check prompts --target ./my-server.json
mcp-observatory check resources --target ./my-server.json
mcp-observatory check tools-invoke --target ./my-server.json
```

## Tool Invocation

Go beyond listing — actually call tools and verify they execute. Only safe tools are invoked: those with no required parameters or with `readOnlyHint` annotation. Arguments are auto-generated from the tool's JSON Schema.

```bash
mcp-observatory scan --invoke-tools
mcp-observatory run --target ./my-server.json --invoke-tools
mcp-observatory check tools-invoke --target ./my-server.json
```

## Schema Drift

When diffing two runs, schema changes are detected automatically. Added/removed required fields, property changes, and type changes are surfaced alongside status regressions:

```bash
mcp-observatory diff --base run-a.json --head run-b.json
```

Example output:
```
Schema Drift:
- search (tools): added required field 'limit', changed 'query' type from 'number' to 'string'
- old-tool (tools): removed
```

## Watch

Re-run checks on an interval and output only when something changes:

```bash
mcp-observatory run --target ./my-server.json --watch
mcp-observatory run --target ./my-server.json --watch --interval 60
```

Press Ctrl+C to stop.

## HTTP / SSE Targets

In addition to local-process stdio, you can check remote MCP servers over HTTP (Streamable HTTP and SSE):

```json
{
  "targetId": "my-remote-server",
  "adapter": "http",
  "url": "http://localhost:3000/mcp",
  "authToken": "optional-bearer-token",
  "timeoutMs": 15000
}
```

```bash
mcp-observatory run --target ./remote-target.json
mcp-observatory run --target ./remote-target.json --invoke-tools
```

## HTML Reports

Generate a self-contained HTML report from any run or diff artifact:

```bash
mcp-observatory report --run ./run-artifact.json --format html --output report.html
mcp-observatory diff --base run-a.json --head run-b.json --format html --output diff.html
```

Open the file in any browser — no server required, shareable via Slack/email/GitHub comments.

## Use as an MCP Server

mcp-observatory can also run as an MCP server itself, letting any AI agent check MCP server health directly in conversation. Yes, that means your AI uses a tool to check whether its other tools work. We've reached peak meta.

Add it to your Claude config:

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

This exposes four tools to your AI agent:

| Tool | What it does |
|------|-------------|
| `scan` | Discover and check all configured servers |
| `check_server` | Check a specific server by command |
| `diff_runs` | Compare two saved run artifacts |
| `get_last_run` | Return the most recent run for a target |

Or start it manually: `mcp-observatory serve`

## Limitations

- Servers requiring interactive OAuth (e.g., Google Drive) need pre-authentication before Observatory can connect
- Custom WebSocket transports (e.g., BrowserTools MCP) are not supported
- A few servers time out or close before init — see [known issues](./docs/known-issues.md) and [compatibility](./docs/compatibility.md)

## Repo-Local Validation

If you do want the repo-local path, use the fixture flow:

```bash
npm install
npm run cli -- run --target tests/fixtures/sample-target-config.json
npm run cli -- diff --base tests/fixtures/sample-run-a.json --head tests/fixtures/sample-run-b.json
npm run cli -- report --run tests/fixtures/sample-run-b.json --format markdown --output examples/results/sample-report.md
```

This path exists to validate the repo itself. It is not the only way to use the tool.

## Artifact Contract

Every artifact is versioned and intentionally boring:

- `artifactType`: `run` or `diff`
- `schemaVersion`: currently `1.0.0`
- `gate`: `pass` or `fail`

Compatibility rules:

- additive changes stay within `1.x`
- breaking artifact changes require a major schema bump

Published schemas:

- [schemas/run-artifact.schema.json](./schemas/run-artifact.schema.json)
- [schemas/diff-artifact.schema.json](./schemas/diff-artifact.schema.json)

Validate checked-in artifacts locally:

```bash
npm run validate:artifacts
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution bar and the kinds of work likely to be declined.

The fastest way to contribute something credible is to add evidence:

- a real passing target with a distinct capability shape
- a clearer report surface
- a cleaner startup diagnosis

## Known Issues

See [docs/known-issues.md](./docs/known-issues.md) for the difference between `unsupported` and `failed`, and [docs/compatibility.md](./docs/compatibility.md) for the full compatibility matrix including servers that don't work and why.
