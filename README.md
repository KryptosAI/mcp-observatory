<p align="center">
  <img src="./docs/logo.svg" alt="MCP Observatory" width="820">
</p>

[![CI](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@kryptosai/mcp-observatory)](https://www.npmjs.com/package/@kryptosai/mcp-observatory)
[![npm downloads](https://img.shields.io/npm/dm/@kryptosai/mcp-observatory)](https://www.npmjs.com/package/@kryptosai/mcp-observatory)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)
[![Smithery](https://smithery.ai/badge/@kryptosai/mcp-observatory)](https://smithery.ai/server/@kryptosai/mcp-observatory)
[![mcp-observatory MCP server](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory/badges/score.svg)](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory)

**The GitHub-native CI and security gate for MCP servers before agents depend on them.**

Agents should not depend on tools nobody tests. MCP Observatory gives MCP servers the production safety rails every dependency eventually needs: CI checks, security scans, schema drift detection, PR reports, score badges, agent-accessible diagnostics, and GitHub Code Scanning findings.

Security launch path:

```bash
npx @kryptosai/mcp-observatory test npx -y my-mcp-server --sarif mcp-observatory.sarif
```

Or install the GitHub Action with Code Scanning upload:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif
```

See [GitHub Code Scanning for MCP servers](./docs/github-code-scanning-for-mcp.md).

Two more fast paths:

Cloned this repo? Start here: [`CLONED_THIS.md`](./CLONED_THIS.md). Want to contribute? Add one server to the [MCP Target Registry](./docs/target-registry.md).

Add MCP CI in one command:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server"
```

Upload normalized MCP findings to GitHub Code Scanning when you want a security-native release gate:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif
```

Add Observatory as an agent-accessible MCP server:

```bash
claude mcp add mcp-observatory -- npx -y @kryptosai/mcp-observatory serve
```

Building an autonomous agent, OpenClaw-style productivity machine, MCP gateway, or bot runtime? Start with the [agent runtime quickstart](./docs/agent-runtime-quickstart.md), copy the [OpenClaw MCP reliability agent template](./docs/openclaw-agent-template/SOUL.md), or point your agent at [`llms.txt`](./llms.txt) and [`AGENTS.md`](./AGENTS.md).

Or test a server immediately:

```bash
npx @kryptosai/mcp-observatory test npx -y @modelcontextprotocol/server-everything
```

Use it as a CLI, a GitHub Action, or an MCP server that lets your AI agent scan, test, record, replay, and verify other MCP servers autonomously.

<p align="center">
  <img src="./docs/demo.svg" alt="MCP Observatory scan output" width="820">
</p>

[![Observatory MCP server](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory/badges/card.svg)](https://glama.ai/mcp/servers/KryptosAI/mcp-observatory)

## Why MCP Observatory

MCP servers are becoming production dependencies. If agents rely on them, teams need a way to catch broken tools, unsafe schemas, schema drift, slow responses, and security footguns before those failures reach users.

Observatory gives maintainers and teams:

- **One-command CI setup** with `setup-ci --all`
- **GitHub PR comments** for compatibility, drift, and security findings
- **GitHub Code Scanning SARIF** for normalized MCP findings
- **Health score badges** for public trust signals
- **Record/replay/verify** workflows for regression testing
- **MCP server mode** so agents can inspect other MCP servers directly
- **Production support path** for hosted history, private repo reporting, certification, support, and fleet visibility

See [GitHub Code Scanning for MCP servers](./docs/github-code-scanning-for-mcp.md), the [target registry](./docs/target-registry.md), [target contribution guide](./docs/target-contribution-guide.md), [`setup-ci --doctor`](./docs/setup-ci-doctor.md), [MCP server security field guide](./docs/mcp-security-field-guide.md), [Safety Methodology](./docs/methodology.md), [MCP Server Safety Index](./docs/mcp-server-safety-index.md), [June 2026 safety field report](./docs/mcp-safety-field-report-2026-06.md), [reference evaluations](./docs/reference-evaluations.md), [MCP lock files](./docs/mcp-lock-files.md), [public proof](./docs/proof.md), [local metrics dashboard](./docs/metrics-dashboard.md), and [commercial support](./COMMERCIAL.md).

## For Security And Platform Teams

MCP servers are becoming part of the AI software supply chain. Agents need reliable, testable, auditable tools before those tools become dependencies in mission-critical workflows.

MCP Observatory gives security and platform teams MCP server CI, schema drift detection, security findings, SARIF/HTML/Markdown reports, GitHub Code Scanning upload, and a path toward certification or fleet visibility. Local OSS use stays free; production, private repo, and fleet usage can move through a paid pilot.

## Production Support

Local OSS use stays free under MIT. Teams running MCP in production can use [commercial support](./COMMERCIAL.md) for hosted reporting, private repo CI, recurring security reports, certification review, support, and fleet visibility.

Run `npx @kryptosai/mcp-observatory cloud`, open a pilot request from the issue chooser, or see [COMMERCIAL.md](./COMMERCIAL.md). Also see [privacy and telemetry](./PRIVACY.md) and [terms for production use](./TERMS.md).

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
| `test <cmd>` / `test --target <file>` | Test a specific server by command or target config |
| `record <cmd>` | Record a server session to a cassette file for offline replay |
| `replay <cassette>` | Replay a cassette offline — no live server needed |
| `verify <cassette> <cmd>` | Verify a live server still matches a recorded cassette |
| `diff <base> <head>` | Compare two run artifacts for regressions and schema drift |
| `watch <config>` | Watch a server for changes, alert on regressions |
| `suggest` | Detect your stack and recommend MCP servers from the registry |
| `serve` | Start as an MCP server for AI agents |
| `lock` | Snapshot MCP server schemas into a lock file |
| `lock verify` | Verify live servers match the lock file |
| `history` | Show health score trends for your MCP servers |
| `setup-ci` / `init-ci` | Create a GitHub Action and badge snippet for MCP compatibility/security checks |
| `setup-ci --sarif` | Generate a workflow that uploads normalized findings to GitHub Code Scanning |
| `setup-ci --doctor` | Inspect whether the repository has a complete CI adoption kit |
| `ci-report` | Generate CI report for GitHub issue creation |
| `enterprise-report` | Generate a static production/security report from run artifacts |
| `score <cmd>` | Score an MCP server's health (0-100) |
| `badge <cmd>` | Generate an SVG health score badge for README |
| `cloud` | Show hosted reporting, security review, and enterprise pilot options |

Run with no arguments for an interactive menu:

## What It Does

**Check capabilities** — connects to a server and verifies tools, prompts, and resources respond correctly.

**Invoke tools** — goes beyond listing. Actually calls safe tools (no required params / readOnlyHint) and reports which ones work and which ones crash.

```bash
npx @kryptosai/mcp-observatory scan deep
```

**Detect schema drift** — diffs two runs and surfaces added/removed fields, type changes, and breaking parameter changes.

```bash
npx @kryptosai/mcp-observatory diff run-a.json run-b.json
```

**Recommend servers** — scans your project for languages, frameworks, databases, and cloud providers, then cross-references the [MCP registry](https://registry.modelcontextprotocol.io) to suggest servers you're missing.

```bash
npx @kryptosai/mcp-observatory suggest
```

Or ask your agent "what MCP servers should I add?" when running in MCP server mode.

**Security scanning** — analyzes tool schemas for dangerous patterns: shell injection surfaces, broad filesystem access, missing auth, and credential leakage in responses.

```bash
npx @kryptosai/mcp-observatory test --security npx -y my-mcp-server
```

**Record / replay / verify** — capture a live session, replay it offline in CI, and verify nothing changed. Like [VCR](https://github.com/vcr/vcr) for MCP.

```bash
# Record a session
npx @kryptosai/mcp-observatory record npx -y @modelcontextprotocol/server-everything

# Replay offline (no server needed)
npx @kryptosai/mcp-observatory replay .mcp-observatory/cassettes/latest.cassette.json

# Verify the live server still matches
npx @kryptosai/mcp-observatory verify cassette.json npx -y @modelcontextprotocol/server-everything
```

**Watch for regressions** — re-runs checks on an interval and alerts when something changes.

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

Add Observatory to your MCP server's CI pipeline:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server"
```

Check the adoption kit:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```

Or create the workflow manually:

```yaml
# .github/workflows/observatory.yml
name: MCP Server Check
on: [pull_request]

permissions:
  contents: read

jobs:
  observatory:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: KryptosAI/mcp-observatory/action@v0.27.0
        with:
          command: npx -y my-mcp-server
          deep: true
          security: true
          comment-on-pr: false
          set-status: false
```

Action inputs:

| Input | Description | Default |
|-------|-------------|---------|
| `command` | Server command to test | (required if no `target`) |
| `target` | Path to target config JSON | |
| `targets` | Path to MCP config file for multi-server matrix scan | |
| `deep` | Also invoke safe tools | `false` |
| `security` | Run security analysis | `false` |
| `fail-on-regression` | Fail the action on issues | `true` |
| `fail-on-baseline-drift` | Fail the action when baseline verification detects drift | `true` |
| `comment-on-pr` | Post report as PR comment. Requires `pull-requests: write`. | `true` |
| `set-status` | Set a commit status check (green/red) on the HEAD SHA. Requires `statuses: write`. | `true` |
| `github-token` | Token for PR comments and commit statuses | `${{ github.token }}` |

The action can comment on PRs and set commit statuses when the workflow grants write permissions. `setup-ci` generates read-only third-party-friendly workflows by default and lets maintainers opt into comments/statuses later. `init-ci` remains available as a backward-compatible alias. See [`action/README.md`](./action/README.md) for all options.

Production teams can add hosted CI history, private-repo reporting, recurring security reports, certification review, support, and fleet visibility. Run `npx @kryptosai/mcp-observatory cloud`, see [COMMERCIAL.md](./COMMERCIAL.md), or open a pilot request from the issue chooser.

### Certified by MCP Observatory

MCP server maintainers can add a public compatibility/security signal to their README:

```md
[![MCP Observatory](https://img.shields.io/badge/MCP%20Observatory-enabled-2563eb)](https://github.com/KryptosAI/mcp-observatory)
```

Or generate a score badge from a live check:

```bash
npx @kryptosai/mcp-observatory badge npx -y my-mcp-server --output docs/mcp-health.svg
```

See the [certification distribution loop](./docs/certification-distribution.md) for the GitHub Action template, maintainer PR body, and badge rollout playbook.

Generate a pilot-ready production/security report from local run artifacts:

```bash
npx @kryptosai/mcp-observatory enterprise-report \
  --account "Your Company" \
  --format html \
  --output observatory-enterprise-report.html
```

For clearer internal account attribution in CI, set:

```bash
MCP_OBSERVATORY_ORG=your-company.com
MCP_OBSERVATORY_CONTACT=your-team-contact
```

Testing Feishu/Lark integrations? See the [Feishu/Lark MCP guide](./docs/feishu-lark-mcp.md).

### Lock Files

```bash
$ npx @kryptosai/mcp-observatory lock              # Snapshot all server schemas
$ npx @kryptosai/mcp-observatory lock verify        # Verify no drift since last lock
```

Lock files are the package-lock for AI tools: commit the MCP contract, then make every tool, schema, prompt, or resource drift visible in CI. See [MCP lock files](./docs/mcp-lock-files.md).

### Trend Tracking

```bash
$ npx @kryptosai/mcp-observatory history            # Show health trends over time
```

### Nightly Scans

```bash
$ npx @kryptosai/mcp-observatory ci-report          # Generate regression report for CI
```

## MCP Server Mode

**No other testing tool is itself an MCP server.** Add Observatory as a server and your AI agent can autonomously test, diagnose, and monitor your other MCP servers.

```bash
claude mcp add mcp-observatory -- npx -y @kryptosai/mcp-observatory serve
```

Your agent gets 10 tools:

| Tool | When to use it |
|------|---------------|
| `scan` | Check if all your configured MCP servers are healthy |
| `check_server` | Test a specific server before installing or after updating |
| `score_server` | Get a quick health score and grade for a server |
| `record` | Capture a baseline of a working server for future comparison |
| `replay` | Test against a recorded session — no live server needed |
| `verify` | Confirm a server update didn't break anything |
| `watch` | Check a server and see what changed since the last check |
| `diff_runs` | Find regressions between two check results |
| `get_last_run` | Retrieve previous check results for a server |
| `suggest_servers` | Discover MCP servers that match your project stack |

An AI tool that checks other AI tools. It is a tool testing tools that serve tools.

### Security

The MCP server runs inside AI hosts where an LLM chooses which tools to call. To prevent prompt-injection attacks:

- **Command allowlist:** Only `npx`, `node`, `python`, `python3`, `uvx`, `docker`, `deno`, `bun` are permitted as base executables. The CLI has no restrictions.
- **Path validation:** File-reading tools are constrained to the runs/cassettes directories.
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

Works with any MCP server that uses standard transports:

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
  "url": "https://mcp.example.com/mcp",
  "authToken": "${MCP_SERVER_TOKEN}",
  "headers": {
    "X-Api-Key": "$MCP_SERVER_API_KEY"
  },
  "timeoutMs": 15000
}
```

Target configs support `${VAR}`, `$VAR`, and `env:VAR` references in `authToken`, `headers`, and local-process `env` values.

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

Each tool has strengths. Observatory focuses on regression detection and CI-friendly workflows. mcp-recorder is great as a transparent proxy. MCPBench is the go-to for performance benchmarking. mcp-jest is ideal if you're already in a Jest workflow.

## Prior Art

The record/replay/verify pattern is inspired by:

- [VCR](https://github.com/vcr/vcr) (Ruby) — pioneered cassette-based HTTP record/replay
- [Polly.js](https://github.com/Netflix/pollyjs) (Netflix) — HTTP interaction recording for JavaScript
- [mcp-recorder](https://github.com/punkpeye/mcp-recorder) — MCP-specific traffic recording proxy
- [MCPBench](https://github.com/QuantGeekDev/mcpbench) — MCP server benchmarking
- [mcp-jest](https://github.com/nicobailon/mcp-jest) — Jest-style testing for MCP servers

## Limitations

- Servers requiring interactive OAuth (e.g., Google Drive) need pre-authentication before Observatory can connect
- Custom WebSocket transports (e.g., BrowserTools MCP) are not supported
- A few servers time out or close before init — see [known issues](./docs/known-issues.md) and [compatibility](./docs/compatibility.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines. The fastest way to contribute is to add a real passing target with a distinct capability shape, a clearer report surface, or a cleaner startup diagnosis.

---

If Observatory saved you a broken deploy, consider giving it a [star](https://github.com/KryptosAI/mcp-observatory). It helps others find the project.
