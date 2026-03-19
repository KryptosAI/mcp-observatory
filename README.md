# MCP Observatory

[![CI](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/ci.yml)
[![Real Server Matrix](https://github.com/KryptosAI/mcp-observatory/actions/workflows/real-server-matrix.yml/badge.svg)](https://github.com/KryptosAI/mcp-observatory/actions/workflows/real-server-matrix.yml)
[![Latest Release](https://img.shields.io/github/v/release/KryptosAI/mcp-observatory?display_name=tag)](https://github.com/KryptosAI/mcp-observatory/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node >= 22](https://img.shields.io/badge/node-%3E%3D22-339933)](./package.json)

MCP Observatory exists because real MCP servers drift in ways conformance does not explain.

> Maintainer note, March 19, 2026: I started this repo after running a small real-server matrix and seeing two different truths at once. `@modelcontextprotocol/server-filesystem`, `@modelcontextprotocol/server-everything`, `ref-tools-mcp`, `@upstash/context7-mcp`, and `puppeteer-mcp-server` all worked, but they exposed meaningfully different capability shapes. At the same time, packages like `@modelcontextprotocol/server-map` and `@modelcontextprotocol/server-pdf` still timed out or closed early when treated as plain local-process stdio targets. Official conformance still matters. This repo exists because field evidence matters too.

If the project ever turns into generic MCP theater, that is a regression.

## Working Surface

The product surface is deliberately small:

- `run`: execute checks against one target and always persist a run artifact
- `diff`: compare two runs and classify regressions and recoveries
- `report`: turn a saved run artifact into readable terminal, JSON, or Markdown output

That is enough to answer a practical question: what changed, what regressed, what recovered, and what artifact proves it?

## Non-goals

This repo is not trying to be:

- a dashboard product
- a spec fork or alternate conformance suite
- broad MCP certification
- deep semantic correctness validation
- a promise that every MCP package is a drop-in stdio target

If that is the problem you need solved, this is the wrong tool.

## 60-Second Start

```bash
npm install
npm run cli -- run --target tests/fixtures/sample-target-config.json
npm run cli -- diff --base tests/fixtures/sample-run-a.json --head tests/fixtures/sample-run-b.json
# Observe obvious regression/recovery output in the terminal summary
```

This is the shortest path to seeing the project work end-to-end without depending on an external MCP server.

The flagship output is still the Markdown report:

```bash
npm run cli -- report --run tests/fixtures/sample-run-b.json --format markdown --output examples/results/sample-report.md
```

## What We Learned From Actual Servers

These are not hypothetical scenarios. They came from launch-day runs on March 19, 2026.

- `@modelcontextprotocol/server-filesystem` passed `tools` and cleanly surfaced `prompts` and `resources` as `unsupported`. That is a legitimate capability shape, not a failure.
- `@modelcontextprotocol/server-everything` passed `tools`, `prompts`, and `resources`. It is a good wide reference target, but it should not be mistaken for the average package.
- `ref-tools-mcp` passed `tools` and `prompts` while leaving `resources` unsupported. That is useful third-party diversity.
- `@upstash/context7-mcp` passed cleanly as a zero-config third-party tools server. That makes the matrix feel more like the real ecosystem and less like an official-demo loop.
- `puppeteer-mcp-server` passed as a zero-config tools-and-resources server, but still surfaced an unsupported optional resource-template endpoint. That is exactly the kind of useful caveat the report should make obvious.
- `@modelcontextprotocol/server-map`, `@modelcontextprotocol/server-pdf`, `@modelcontextprotocol/server-threejs`, and `@jsonresume/mcp` still do not behave like plain local-process stdio targets under the current harness. That is ecosystem signal first, product bug second.

See [docs/field-notes.md](./docs/field-notes.md) for the full launch-day observations and what they changed about the repo.

## Visual Proof

The quickest way to understand the repo is still to look at a diff artifact:

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

Checked-in evidence:

- [Sample fixture report](./examples/results/sample-report.md)
- [Everything server report](./examples/artifacts/everything-server-report.md)
- [Filesystem server report](./examples/artifacts/filesystem-server-report.md)
- [Puppeteer server report](./examples/artifacts/puppeteer-server-report.md)
- [Server PDF startup failure report](./examples/artifacts/server-pdf-startup-fail-report.md)
- [Examples overview](./examples/README.md)

## Real Server Coverage

Current passing matrix:

| Target | Server | Shape observed on 2026-03-19 | Tools | Prompts | Resources | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| [filesystem-server.json](./examples/targets/filesystem-server.json) | `@modelcontextprotocol/server-filesystem` | tool-heavy | pass | unsupported | unsupported | good baseline for unsupported vs failed |
| [everything-server.json](./examples/targets/everything-server.json) | `@modelcontextprotocol/server-everything` | broad capability reference | pass | pass | pass | best wide target in the current matrix |
| [ref-tools-server.json](./examples/targets/ref-tools-server.json) | `ref-tools-mcp` | prompts-heavy third-party case | pass | pass | unsupported | useful non-official signal |
| [context7-server.json](./examples/targets/context7-server.json) | `@upstash/context7-mcp` | tool-heavy third-party docs server | pass | unsupported | unsupported | zero-config third-party proof |
| [puppeteer-server.json](./examples/targets/puppeteer-server.json) | `puppeteer-mcp-server` | tools and resources | pass | unsupported | pass | useful browser-oriented third-party coverage |

Manual recipe:

```bash
npm run cli -- run --target examples/targets/filesystem-server.json
npm run cli -- run --target examples/targets/everything-server.json
npm run cli -- run --target examples/targets/ref-tools-server.json
npm run cli -- run --target examples/targets/context7-server.json
npm run cli -- run --target examples/targets/puppeteer-server.json
```

Repeatable script:

```bash
npm run integration:real
```

The same matrix also runs in GitHub Actions on a nightly schedule and by manual dispatch. That workflow exists to surface drift, not to make the main PR gate slower.

For known-bad startup probes that are useful for diagnosis work, see [examples/probes/server-pdf-startup-fail.json](./examples/probes/server-pdf-startup-fail.json) and the checked-in [failure report](./examples/artifacts/server-pdf-startup-fail-report.md).

## Project Status

- Current maturity: useful for local-process stdio targets, local regression checks, and CI smoke gating.
- Actively improving now: report readability, clearer startup failure messaging, and a more representative real-server matrix.
- Not ready yet: app-oriented packages, alternate transports, or deep semantic correctness beyond advertised/responded/minimal-shape checks.

If those are the requirements you care about most today, the repo is still early.

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

Validate the checked-in artifacts locally:

```bash
npm run validate:artifacts
```

## Semantics v1

`semantics` is intentionally narrow in v1. It only verifies:

- the capability is advertised
- the corresponding callable endpoint responds
- the response contains the minimal expected shape

It does not claim tool correctness, prompt quality, resource validity, or protocol completeness. That is a deliberate decision, not an unfinished sentence. The reasoning is documented in [docs/decisions.md](./docs/decisions.md).

## Current Priorities

The public queue is intentionally smaller than it was at launch. Current priorities are:

- [#3 Improve artifact output readability in the Markdown report](https://github.com/KryptosAI/mcp-observatory/issues/3)
- [#6 Improve CLI startup error messaging for connection and setup failures](https://github.com/KryptosAI/mcp-observatory/issues/6)
- [#1 Add a second resources-heavy real-server smoke target](https://github.com/KryptosAI/mcp-observatory/issues/1)
- [#2 Add a second prompts-capable real-server smoke target](https://github.com/KryptosAI/mcp-observatory/issues/2)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution bar and the kinds of work that are likely to be declined.

If you want the shortest path to a useful first contribution, start with one of the current priorities above and keep the diff small enough that the checked-in artifact or report still teaches something obvious.

## Release Posture

The repo is GitHub-release-first for now. npm publishing remains deferred on purpose.

- changelog: [CHANGELOG.md](./CHANGELOG.md)
- release process: [RELEASE.md](./RELEASE.md)
- release notes template: [docs/release-notes-template.md](./docs/release-notes-template.md)
- decisions log: [docs/decisions.md](./docs/decisions.md)

The current maintainer rule is simple: every release should include either a real-server learning, a report-quality improvement, or a schema trust improvement.

## Known Issues

See [docs/known-issues.md](./docs/known-issues.md) for the difference between `unsupported` and `failed`, plus the current list of packages that do not behave like drop-in stdio targets under the local-process harness.

## Security

See [SECURITY.md](./SECURITY.md) for disclosure guidance.
