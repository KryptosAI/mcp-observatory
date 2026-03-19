# MCP Observatory

[![CI](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml)
[![Real Server Matrix](https://github.com/KryptosAI/mcp-observatory/actions/workflows/real-server-matrix.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/real-server-matrix.yml)
[![Latest Release](https://img.shields.io/github/v/release/KryptosAI/mcp-observatory?display_name=tag)](https://github.com/KryptosAI/mcp-observatory/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)

Regression evidence for Node/local-process stdio MCP targets.

Current status: GitHub-release-installable, tested against 7 real servers, and still at zero external adoption proof until that changes. The public package identity is `@kryptosai/mcp-observatory`; npm publishing is wired into the release flow but needs credentials before it becomes a live install path.

> Maintainer note, March 19, 2026: this repo exists because real MCP servers drift in ways conformance does not explain. Some servers pass cleanly with very different capability shapes. Others time out or close early when treated as plain stdio targets. Both outcomes are useful evidence.

## Install And Prove It

No clone required. The first public install path is the GitHub release tarball:

```bash
npx --yes https://github.com/KryptosAI/mcp-observatory/releases/download/v0.2.0/kryptosai-mcp-observatory-0.2.0.tgz --help
npx --yes https://github.com/KryptosAI/mcp-observatory/releases/download/v0.2.0/kryptosai-mcp-observatory-0.2.0.tgz --version
```

Create one tiny target config in any directory:

```json
{
  "targetId": "filesystem-cli-proof",
  "adapter": "local-process",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
  "timeoutMs": 15000,
  "metadata": {
    "package": "@modelcontextprotocol/server-filesystem",
    "purpose": "standalone-cli-proof"
  }
}
```

Run it:

```bash
npx --yes https://github.com/KryptosAI/mcp-observatory/releases/download/v0.2.0/kryptosai-mcp-observatory-0.2.0.tgz run --target ./filesystem-target.json
```

## Known-Good Matrix

Passing matrix refreshed on 2026-03-19:

| Target | Package | Tools | Prompts | Resources | Why it matters |
| --- | --- | --- | --- | --- | --- |
| [filesystem-server.json](./examples/targets/filesystem-server.json) | `@modelcontextprotocol/server-filesystem` | pass | unsupported | unsupported | baseline proof that unsupported is not failure |
| [everything-server.json](./examples/targets/everything-server.json) | `@modelcontextprotocol/server-everything` | pass | pass | pass | broad official reference target |
| [ref-tools-server.json](./examples/targets/ref-tools-server.json) | `ref-tools-mcp` | pass | pass | unsupported | third-party prompts-capable proof |
| [context7-server.json](./examples/targets/context7-server.json) | `@upstash/context7-mcp` | pass | unsupported | unsupported | zero-config third-party tools proof |
| [puppeteer-server.json](./examples/targets/puppeteer-server.json) | `puppeteer-mcp-server` | pass | unsupported | pass | browser-oriented resources case with an optional-endpoint caveat |
| [promptopia-server.json](./examples/targets/promptopia-server.json) | `promptopia-mcp` | pass | pass | unsupported | second third-party prompts-capable server |
| [opentofu-server.json](./examples/targets/opentofu-server.json) | `@opentofu/opentofu-mcp-server` | pass | unsupported | pass | second third-party resources-capable server |

To refresh the matrix locally:

```bash
npm run integration:real
```

## Working Surface

- `run`: execute checks against one target and persist a run artifact
- `diff`: compare two runs and classify regressions and recoveries
- `report`: turn a saved run artifact into readable terminal, JSON, or Markdown output
- `scan`: auto-discover MCP servers from local config files and check them all
- `check`: run a single capability check (tools, prompts, or resources)

## Scan

Auto-discover MCP server configs from Claude Code, Claude Desktop, and project-level config files, then run checks against every discovered server:

```bash
mcp-observatory scan
mcp-observatory scan --config ~/.claude.json
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
```

## Watch

Re-run checks on an interval and output only when something changes:

```bash
mcp-observatory run --target ./my-server.json --watch
mcp-observatory run --target ./my-server.json --watch --interval 60
```

Press Ctrl+C to stop.

## Do Not Use This If...

- you need non-stdio transports
- you need deep semantic correctness validation
- you need every MCP package on npm to work out of the box
- you need a dashboard instead of artifacts and reports

If those are the requirements, this repo is the wrong tool.

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

See [docs/known-issues.md](./docs/known-issues.md) for the difference between `unsupported` and `failed`, plus the current list of packages that do not behave like drop-in stdio targets under the local-process harness.
