# MCP Safety Report

Latest generated baseline: June 20, 2026.

MCP servers are becoming production dependencies. When agents depend on a server, that server needs repeatable compatibility checks, security review, schema drift detection, and visible trust signals.

For a broader security framing, see the [MCP Server Security Field Guide](./mcp-security-field-guide.md). For public examples, see [Reference Evaluations](./reference-evaluations.md).

## What Observatory Checks

MCP Observatory checks:

- tools, prompts, and resources list/respond correctly
- advertised capabilities match observed behavior
- safe read-only tools can be invoked
- schemas are usable by agents
- security footguns are visible before production use
- runs can be compared for regressions and schema drift
- artifacts can be rendered as JSON, Markdown, HTML, JUnit, SARIF, or PR comments

## Aggregate Usage Snapshot

Safe aggregate telemetry from the latest local export:

| Metric | Value |
| --- | ---: |
| Total telemetry events | 10,918 |
| Total sessions | 7,380 |
| External sessions | 5,379 |
| External CI sessions | 2,446 |
| Attributed company/org sessions | 138 |
| GitHub clones in visible traffic window | 721 |
| Unique cloners in visible traffic window | 221 |

Top external commands:

1. `serve`
2. `run`
3. `diff`
4. `test`
5. `scan`
6. `history`

No raw emails, hostnames, private URLs, tokens, or response bodies are included in this report.

## Common MCP Failure Classes

From public sample artifacts and Observatory check categories, the most important failure classes are:

- server startup failure
- malformed or missing tools/list, prompts/list, or resources/list responses
- schema quality issues that make tools harder for agents to call correctly
- regressions between two runs
- unexpected drift from a recorded baseline
- broad filesystem/network/security-sensitive tool surfaces
- slow or unreliable connection behavior

## How Maintainers Add The Check

```bash
npx @kryptosai/mcp-observatory init-ci --all --command "npx -y my-mcp-server"
```

That creates a GitHub Action and a README badge snippet. The action can comment on PRs and fail when MCP compatibility or security checks regress.

## Production Path

Production teams can use MCP Observatory for:

- private repo CI history
- hosted reporting
- recurring security reports
- MCP certification
- support and rollout review
- fleet visibility across teams and repos

Contact `william@banksey.com` for pilots.

## Launch Post

MCP servers are becoming production dependencies.

I built MCP Observatory so MCP maintainers can add CI, security checks, schema drift detection, PR reports, and trust badges in one command:

```bash
npx @kryptosai/mcp-observatory init-ci --all --command "npx -y my-mcp-server"
```

Free for local OSS use. Paid pilots are available for hosted reporting, private repo CI, certification, support, and fleet visibility.
