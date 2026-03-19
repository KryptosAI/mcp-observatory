# MCP Observatory

[![CI](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml)
[![Real Server Matrix](https://github.com/KryptosAI/mcp-observatory/actions/workflows/real-server-matrix.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/real-server-matrix.yml)
[![Latest Release](https://img.shields.io/github/v/release/KryptosAI/mcp-observatory?display_name=tag)](https://github.com/KryptosAI/mcp-observatory/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node >= 22](https://img.shields.io/badge/node-%3E%3D22-339933)](./package.json)

MCP Observatory is a developer confidence harness for MCP authors and integrators.

It detects, stores, compares, and explains interoperability drift over time so you can answer the question most conformance tooling does not try to answer:

"What changed, what regressed, what recovered, and what artifact proves it?"

## Why This Exists

MCP adoption is accelerating, which means MCP breakage is getting more expensive.

Official conformance tooling is necessary, but it is not the same as regression intelligence. MCP Observatory exists to preserve historical evidence over time so teams can:

- spot capability drift before users do
- compare runs across versions and server changes
- publish a clear artifact that explains what broke or recovered
- build confidence in real-world MCP server behavior without inventing a dashboard first

## Who It Is For

- MCP server authors who want confidence before release
- integrators who need a repeatable way to compare servers or versions
- OSS contributors who want a concrete, evidence-driven surface to improve
- CI owners who need a machine-friendly gate plus a human-readable report

## Why Not Conformance?

Official MCP conformance tooling already exists.

MCP Observatory is not trying to replace conformance or redefine the protocol. It complements conformance by focusing on historical compatibility drift and evidence over time. The framing for this repo is consistent on purpose:

**This is a developer confidence tool for MCP authors and integrators.**

It is not a generic dashboard, not a trust platform, and not a spec fork.

## Where It Fits

| Surface | Primary question answered | Output style | Positioning |
| --- | --- | --- | --- |
| Official conformance | "Does this implementation satisfy the protocol contract right now?" | pass/fail conformance evidence | compliance baseline |
| MCP Observatory | "What changed over time, what regressed, and what recovered?" | versioned run artifacts, diffs, Markdown reports | developer confidence harness |
| Ad hoc local testing | "Did my one manual run look okay?" | transient console output | useful but not durable |

## Visual Proof

The fastest way to understand the product is to look at the artifact surface directly:

```text
MCP Observatory Diff
Base: run_20260318T120000000Z_a1b2c3d4
Head: run_20260318T130000000Z_e5f6g7h8
Gate: fail
Counts: regressions=2, recoveries=1, unchanged=1, added=0, removed=0
Regressions:
- tools: pass -> fail (Advertised capability failed during tools/list: server error)
- semantics: pass -> fail (At least one advertised capability did not respond successfully.)
Recoveries:
- prompts: unsupported -> pass (Advertised capability responded with the minimal expected shape (1 item).)
```

See the full checked-in reports:

- [Sample fixture report](./examples/results/sample-report.md)
- [Everything server report](./examples/artifacts/everything-server-report.md)
- [Filesystem server report](./examples/artifacts/filesystem-server-report.md)

## What You Get

- `run`: execute checks against a target config and persist a versioned run artifact
- `diff`: compare two run artifacts and classify regressions and recoveries
- `report`: render a saved run artifact as terminal, JSON, or polished Markdown
- stable artifact fields from day one: `artifactType`, `schemaVersion`, and `gate`
- focused checks only: `tools`, `prompts`, `resources`, and a narrow `semantics` pass

## 60-Second Start

```bash
npm install
npm run cli -- run --target tests/fixtures/sample-target-config.json
npm run cli -- diff --base tests/fixtures/sample-run-a.json --head tests/fixtures/sample-run-b.json
# Observe obvious regression/recovery output in the terminal summary
```

This is the shortest path to seeing the product work end-to-end with no external MCP dependency.

The flagship artifact is the Markdown report:

```bash
npm run cli -- report --run tests/fixtures/sample-run-b.json --format markdown --output examples/results/sample-report.md
```

## Real Server Coverage

The repo includes a small real-world smoke matrix across distinct MCP implementations:

| Target | Server | Shape | Tools | Prompts | Resources | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| [filesystem-server.json](./examples/targets/filesystem-server.json) | `@modelcontextprotocol/server-filesystem` | tool-heavy | pass | unsupported | unsupported | good basic stdio smoke |
| [everything-server.json](./examples/targets/everything-server.json) | `@modelcontextprotocol/server-everything` | resources-heavy | pass | pass | pass | best capability diversity today |
| [ref-tools-server.json](./examples/targets/ref-tools-server.json) | `ref-tools-mcp` | prompts-heavy | pass | pass | unsupported | third-party implementation signal |

Manual recipe:

```bash
npm run cli -- run --target examples/targets/filesystem-server.json
npm run cli -- run --target examples/targets/everything-server.json
npm run cli -- run --target examples/targets/ref-tools-server.json
```

Repeatable script:

```bash
npm run integration:real
```

The real-server matrix also runs in GitHub Actions as a separate nightly and manually-triggered workflow so ecosystem drift is visible without slowing normal PR CI.

## Artifact Contract

Every artifact is versioned and machine-friendly:

- `artifactType`: `run` or `diff`
- `schemaVersion`: currently `1.0.0`
- `gate`: `pass` or `fail`

Schema compatibility rules:

- additive changes stay within `1.x`
- any breaking artifact change requires a major schema bump

Published schemas:

- [schemas/run-artifact.schema.json](./schemas/run-artifact.schema.json)
- [schemas/diff-artifact.schema.json](./schemas/diff-artifact.schema.json)

Validate checked-in artifacts locally:

```bash
npm run validate:artifacts
```

## Semantics v1

The `semantics` check is intentionally narrow in v1. It only verifies:

- the capability is advertised
- the corresponding callable endpoint responds
- the response contains the minimal expected shape

It does not validate tool correctness, prompt quality, resource content, or protocol behavior beyond those three assertions.

## Target Config

Targets are JSON files with this shape:

```json
{
  "targetId": "fixture-server",
  "adapter": "local-process",
  "command": "node",
  "args": ["tests/fixtures/fixture-server.mjs"],
  "cwd": ".",
  "timeoutMs": 10000,
  "metadata": {
    "purpose": "golden-path"
  }
}
```

## Architecture

See [docs/architecture.md](./docs/architecture.md) for the short system map and [docs/performance.md](./docs/performance.md) for illustrative timing notes from checked-in artifacts.

## How To Pick An Issue

If you want the highest-leverage starting points, begin here:

- [#1 Add a second resources-heavy real-server smoke target](https://github.com/KryptosAI/mcp-observatory/issues/1)
- [#3 Improve artifact output readability in the Markdown report](https://github.com/KryptosAI/mcp-observatory/issues/3)
- [#5 Document unsupported vs failed semantics clearly](https://github.com/KryptosAI/mcp-observatory/issues/5)
- [#7 Add JSON Schema validation for run artifacts](https://github.com/KryptosAI/mcp-observatory/issues/7)
- [#10 Add example integrations folder for CI and PR comment usage](https://github.com/KryptosAI/mcp-observatory/issues/10)

The public work queue lives in GitHub Issues, and the `good first issue` label is curated intentionally.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for small, medium, and advanced contribution paths.

If you want the quickest useful contribution:

1. add or refine a real-server smoke case
2. improve one evidence message or report section
3. add one integration example or artifact validation improvement

See [examples/integrations](./examples/integrations) for lightweight CI and PR-comment wiring examples.

## Release Posture

The repo is ready for tagged GitHub releases before npm publishing.

- changelog: [CHANGELOG.md](./CHANGELOG.md)
- release process: [RELEASE.md](./RELEASE.md)
- release notes template: [docs/release-notes-template.md](./docs/release-notes-template.md)
- helper script: `npm run release:prep`
- npm publishing decision tracking: keep scoped for now, revisit later

## Known Issues

See [docs/known-issues.md](./docs/known-issues.md) for current integration caveats and why they matter to the ecosystem story.

## Security

See [SECURITY.md](./SECURITY.md) for disclosure guidance.
