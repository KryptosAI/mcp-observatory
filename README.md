# MCP Observatory

```
  ███╗   ███╗ ██████╗██████╗
  ████╗ ████║██╔════╝██╔══██╗
  ██╔████╔██║██║     ██████╔╝
  ██║╚██╔╝██║██║     ██╔═══╝
  ██║ ╚═╝ ██║╚██████╗██║
  ╚═╝     ╚═╝ ╚═════╝╚═╝
     O B S E R V A T O R Y
```

[![CI](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@kryptosai/mcp-observatory)](https://www.npmjs.com/package/@kryptosai/mcp-observatory)
[![npm downloads](https://img.shields.io/npm/dm/@kryptosai/mcp-observatory)](https://www.npmjs.com/package/@kryptosai/mcp-observatory)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)
[![Smithery](https://smithery.ai/badge/@kryptosai/mcp-observatory)](https://smithery.ai/server/@kryptosai/mcp-observatory)
[![mcp-observatory MCP server](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory/badges/score.svg)](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory)

**The first testing tool that is itself an MCP server.** Your AI agent can scan, test, record, replay, and verify other MCP servers on its own — no human in the loop.

Use it as a CLI, a CI action, or give it to your agent as an MCP server and let it test your other servers for you.

<p align="center">
  <img src="./docs/demo.svg" alt="MCP Observatory scan output" width="820">
</p>

[![Observatory MCP server](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory/badges/card.svg)](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory)

## Quick Start

Scan every MCP server in your Claude config:

```bash
npx @kryptosai/mcp-observatory
```

Go deeper — also invoke safe tools to verify they actually run:

```bash
npx @kryptosai/mcp-observatory scan deep
```

Test a specific server:

```bash
npx @kryptosai/mcp-observatory test npx -y @modelcontextprotocol/server-everything
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

## Commands

| Command | What it does |
|---------|-------------|
| `scan` | Auto-discover servers from config files and check them all (default) |
| `scan deep` | Scan and also invoke safe tools to verify they execute |
| `test <cmd>` | Test a specific server by command |
| `record <cmd>` | Record a server session to a cassette file for offline replay |
| `replay <cassette>` | Replay a cassette offline — no live server needed |
| `verify <cassette> <cmd>` | Verify a live server still matches a recorded cassette |
| `diff <base> <head>` | Compare two run artifacts for regressions and schema drift |
| `watch <config>` | Watch a server for changes, alert on regressions |
| `report <artifact>` | Render a saved run artifact (terminal, markdown, json, html) |
| `suggest` | Detect your stack and recommend MCP servers from the registry |
| `serve` | Start as an MCP server for AI agents |
| **Integrations** | |
| `smithery scan` | Scan servers listed on [Smithery](https://smithery.ai) |
| `smithery report` | Generate a report from a Smithery scan |
| `smithery batch` | Batch-scan multiple Smithery servers |

Run with no arguments for an interactive menu:

## What It Does

**Check capabilities** — connects to a server, lists its tools/prompts/resources, and makes sure they respond.

**Invoke tools** — doesn't just list them. Actually calls safe tools (no required params / readOnlyHint) and tells you which ones work and which ones crash.

```bash
npx @kryptosai/mcp-observatory scan deep
```

**Detect schema drift** — diffs two runs and shows you added/removed fields, type changes, and breaking parameter changes.

```bash
npx @kryptosai/mcp-observatory diff run-a.json run-b.json
```

**Recommend servers** — looks at your project (languages, frameworks, databases, cloud providers) and checks the [MCP registry](https://registry.modelcontextprotocol.io) for servers you're missing.

```bash
npx @kryptosai/mcp-observatory suggest
```

Or ask your agent "what MCP servers should I add?" when running in MCP server mode.

**Security scanning** — checks tool schemas for dangerous patterns: shell injection surfaces, broad filesystem access, missing auth, credential leakage in responses.

```bash
npx @kryptosai/mcp-observatory test --security npx -y my-mcp-server
```

**Record / replay / verify** — capture a live session, replay it offline in CI, verify nothing changed. [VCR](https://github.com/vcr/vcr) for MCP.

```bash
# Record a session
npx @kryptosai/mcp-observatory record npx -y @modelcontextprotocol/server-everything

# Replay offline (no server needed)
npx @kryptosai/mcp-observatory replay .mcp-observatory/cassettes/latest.cassette.json

# Verify the live server still matches
npx @kryptosai/mcp-observatory verify cassette.json npx -y @modelcontextprotocol/server-everything
```

**Watch for regressions** — re-runs checks on an interval, alerts you when something changes.

```bash
npx @kryptosai/mcp-observatory watch target.json
```

### Scan locations

When you run `scan`, it looks for MCP configs in:

- `~/.claude.json` (Claude Code)
- `~/Library/Application Support/Claude/claude_desktop_config.json` (Claude Desktop, macOS)
- `%APPDATA%/Claude/claude_desktop_config.json` (Claude Desktop, Windows)
- `.claude.json` and `.mcp.json` (current directory)

## CI / GitHub Action

Drop Observatory into your CI pipeline:

```yaml
# .github/workflows/observatory.yml
name: MCP Server Check
on: [pull_request]

jobs:
  observatory:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: KryptosAI/mcp-observatory/action@main
        with:
          command: npx -y my-mcp-server
          security: true
```

Runs checks on every PR, comments a markdown report, blocks merge on regressions. See [`action/README.md`](./action/README.md) for all options.

## MCP Server Mode

**No other testing tool is itself an MCP server.** Add Observatory as a server and your AI agent can test, diagnose, and monitor your other servers on its own.

```bash
claude mcp add mcp-observatory -- npx -y @kryptosai/mcp-observatory serve
```

Your agent gets 10 tools:

| Tool | When to use it |
|------|---------------|
| `scan` | Check if all your configured MCP servers are healthy |
| `check_server` | Test a specific server before installing or after updating |
| `score_server` | Get a 0-100 health grade with A-F rating and per-category breakdown |
| `record` | Capture a baseline of a working server for future comparison |
| `replay` | Test against a recorded session — no live server needed |
| `verify` | Confirm a server update didn't break anything |
| `watch` | Check a server and see what changed since the last check |
| `diff_runs` | Find regressions between two check results |
| `get_last_run` | Retrieve previous check results for a server |
| `suggest_servers` | Discover MCP servers that match your project stack |

An AI tool that checks other AI tools. It's a tool testing tools that serve tools.*

<sub>* I'm a dude playing a dude disguised as another dude.</sub>

### Security

The MCP server runs inside AI hosts where an LLM picks which tools to call. To prevent prompt-injection attacks:

- **Command allowlist:** Only `npx`, `node`, `python`, `python3`, `uvx`, `docker`, `deno`, `bun` are allowed as base executables. The CLI has no restrictions.
- **Path validation:** File-reading tools can only access the runs/cassettes directories.
- **No arbitrary execution:** Use the CLI for unrestricted commands.

### CLI vs MCP: Intentional Differences

| Feature | CLI | MCP Server | Why |
|---------|-----|------------|-----|
| `watch` | Polling loop | Single check + diff | Request/response doesn't support long-polling |
| Interactive menu | Arrow-key navigation | Not available | MCP has no interactive UI |
| Color output | `--no-color` flag | Always plain text | MCP returns structured content |
| `report` | Renders saved artifacts | Not available | Agents read artifacts directly |
| `serve` | Starts MCP server | N/A | Is the MCP server |
| `run` | Reads target config files | Inline params | MCP tools accept params directly |
| `get_last_run` | Not available (use `ls` + `diff`) | Available | Convenience for agents |

## Compatibility

Works with any MCP server on standard transports:

| Transport | Examples | Adapter |
|-----------|----------|---------|
| **stdio** (most servers) | [filesystem](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem), [memory](https://www.npmjs.com/package/@modelcontextprotocol/server-memory), [context7](https://www.npmjs.com/package/@upstash/context7-mcp), [brave-search](https://www.npmjs.com/package/@modelcontextprotocol/server-brave-search), [sentry](https://www.npmjs.com/package/@sentry/mcp-server), [notion](https://www.npmjs.com/package/@notionhq/notion-mcp-server), [stripe](https://www.npmjs.com/package/@stripe/mcp) | `local-process` |
| **HTTP/SSE** (remote) | [Cloudflare](https://developers.cloudflare.com/mcp/), [Exa](https://exa.ai), [Tavily](https://tavily.com) | `http` |
| **Docker** | All `@modelcontextprotocol/server-*` images | `local-process` via `docker run -i` |

Servers needing API keys work via `env` in the target config. Python servers work via `uvx`. See the [full compatibility matrix](./docs/compatibility.md) for tested servers and known issues.

### Target config files

For more control (env vars, metadata, custom timeout):

```json
{
  "targetId": "filesystem-server",
  "adapter": "local-process",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
  "timeoutMs": 15000,
  "skipInvoke": false
}
```

```bash
npx @kryptosai/mcp-observatory run --target ./target.json
```

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

## How It Compares

| Feature | Observatory | [mcp-recorder](https://github.com/punkpeye/mcp-recorder) | [MCPBench](https://github.com/QuantGeekDev/mcpbench) | [mcp-jest](https://github.com/nicobailon/mcp-jest) |
|---------|:-----------:|:----------:|:-------:|:-------:|
| Auto-discover servers | ✅ | — | — | — |
| Check capabilities | ✅ | — | ✅ | ✅ |
| Invoke tools | ✅ | — | — | ✅ |
| Schema drift detection | ✅ | — | — | — |
| Record / replay | ✅ | ✅ | — | — |
| Verify against cassette | ✅ | — | — | — |
| Response snapshot diffs | ✅ | — | — | — |
| Benchmarking / latency | — | — | ✅ | — |
| Jest integration | — | — | — | ✅ |
| MCP proxy mode | — | ✅ | — | — |
| **Works as MCP server** | **✅** | — | — | — |

Each tool has its niche. Observatory is for regression detection and CI. mcp-recorder is great as a transparent proxy. MCPBench is the go-to for performance benchmarking. mcp-jest works well if you're already using Jest.

## Prior Art

Record/replay/verify is inspired by:

- [VCR](https://github.com/vcr/vcr) (Ruby) — pioneered cassette-based HTTP record/replay
- [Polly.js](https://github.com/Netflix/pollyjs) (Netflix) — HTTP interaction recording for JavaScript
- [mcp-recorder](https://github.com/punkpeye/mcp-recorder) — MCP-specific traffic recording proxy
- [MCPBench](https://github.com/QuantGeekDev/mcpbench) — MCP server benchmarking
- [mcp-jest](https://github.com/nicobailon/mcp-jest) — Jest-style testing for MCP servers

## Limitations

- Servers that need interactive OAuth (e.g., Google Drive) must be pre-authenticated before Observatory can connect
- Custom WebSocket transports (e.g., BrowserTools MCP) aren't supported
- Some servers time out or close before init -- see [known issues](./docs/known-issues.md) and [compatibility](./docs/compatibility.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The easiest way to help: add a real passing target with a distinct capability shape, improve the report output, or fix a startup diagnosis.

---

If Observatory saved you a broken deploy, consider giving it a [star](https://github.com/KryptosAI/mcp-observatory). It helps others find the project.
