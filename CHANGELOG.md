# Changelog

All notable changes to MCP Observatory will be documented in this file.

## Unreleased

## v1.28.0 - 2026-07-06

### Added

- **MCP Receipts** — canonical portable trust artifacts for MCP servers, emitted as JSON or Markdown.
- **`receipt` command** — generate a standalone MCP receipt for any audit target.
- **`audit --receipt <file>`** — emit a receipt alongside JSON, Markdown, or SARIF audit reports.
- Open-core/commercial boundary docs that keep the evidence engine public while reserving private telemetry intelligence, buyer reports, and fleet workflows for paid pilots.

### Changed

- Release positioning moves from scanner/reporting toward reproducible MCP trust receipts for CI gates, public Safety Index entries, maintainers, agents, and buyers.

## v0.28.0 - 2026-07-05

### Added

- Install-time CI helper that detects MCP server projects, prints the exact `setup-ci` command, and can create the workflow automatically when `mcpObservatory.autoSetupCi` is enabled.
- Safe MCP Attack Simulator command for tool-poisoning, canary exposure, permission-boundary, and contract-drift evidence.
- Markdown, JSON, and SARIF output for Attack Simulator findings.
- README status badges and adoption links for CI, CodeQL, OpenSSF Scorecard, Dependabot, npm provenance, coverage, stars, downloads, and contributors.
- Coverage command and GitHub Actions coverage workflow with a 90% core line-coverage floor enforced.

### Changed

- README first screen now leads with trust signals and copy-paste adoption paths.

## v0.8.0 - 2026-03-20

### Added

- **CLI/MCP parity tests** — automated tests verifying CLI and MCP server produce equivalent check results, artifact structures, and tool coverage.
- **tools-invoke unit tests** — 12 tests covering `isSafeToInvoke`, `stubFromSchema`, and `runToolsInvokeCheck` with mocked clients.
- **HTTP adapter tests** — 6 tests covering connection failures, auth tokens, headers, timeouts, and recording mode.
- **CLI entrypoint tests** — 18 tests covering `--version`, `--help`, all subcommand help pages, `--format json/markdown`, fixture server runs, and error exits.
- **MCP `diff_runs` format param** — accepts `"json"` or `"markdown"` (default), closing the last CLI/MCP output format parity gap.
- **Intentional differences documented** — README and living test document all CLI/MCP parity gaps with explanations.

## v0.7.1 - 2026-03-20

### Security

- **MCP server: command allowlist** — only `npx`, `node`, `python`, `python3`, `uvx`, `docker`, `deno`, `bun` are permitted as base executables. Arbitrary command execution is blocked. Use the CLI for unrestricted commands.
- **GitHub Action: eliminate shell injection** — all variable expansions now use bash arrays and quoted parameters. PR comments use `--body-file` instead of inline `--body` to prevent content injection.
- **MCP server: path validation** — `diff_runs`, `get_last_run`, `replay`, and `verify` file paths are constrained to the runs/cassettes directory. `suggest_servers` `cwd` is constrained to the process working directory subtree.
- **Stderr buffer cap** — adapter stderr collection capped at 500 lines to prevent unbounded memory growth.

### Added

- **MCP server: `deep` and `security` params** — `check_server` and `scan` tools now accept `deep` (invoke safe tools) and `security` (run security analysis) boolean parameters, closing the CLI/MCP parity gap.
- **MCP server: request logging** — all tool calls log method name, status, and duration to stderr for observability.
- **17 new security tests** — command allowlist, path traversal, and prefix-matching attack coverage.

### Changed

- `get_last_run` MCP tool no longer accepts a custom `runsDir` parameter (security: prevents arbitrary directory reads).

## v0.7.0 - 2026-03-20

### Added

- **Security scanning** — `--security` flag analyzes tool schemas for shell injection, broad filesystem access, permissive schemas, and credential leakage in responses
- **GitHub Action** — composite action for CI pipelines (`KryptosAI/mcp-observatory/action@v0.28.0`), comments markdown reports on PRs
- **Public dashboard** — static HTML generator with server health table, SVG badges, trend visualization, and API JSON endpoint
- Matrix history tracking (last 90 runs) with trend dots on dashboard
- 14 new security-focused tests

### Changed

- `scan deep` now enables security scanning by default

## v0.6.0 - 2026-03-20

### Added

- full CLI/MCP server feature parity — every CLI command is now available as an MCP tool
- `suggest` command and MCP tool for environment-aware MCP server recommendations
- interactive arrow-key menu when invoked with no arguments

### Fixed

- q-quit and arrow key scrolling in interactive menu
- Glama MCP server card badge added to README

## v0.5.3 - 2026-03-19

### Added

- interactive menu when invoked with no command

## v0.5.1 - 2026-03-19

### Fixed

- help examples alignment for `npx` prefix

## v0.5.0 - 2026-03-19

### Added

- record/replay/verify: VCR-style testing for MCP servers
- cassette-based session capture and offline replay
- `verify` command to check a live server against a recorded cassette

## v0.4.1 - 2026-03-19

### Changed

- natural language commands: `scan deep`, `diff a b`, `watch`, `test`
- flags replaced with positional words for better first-run experience

## v0.4.0 - 2026-03-19

### Added

- MCP server mode via `serve` command
- `suggest_servers` tool: scans your project and recommends MCP servers from the registry
- `test` command for single-server testing
- server compatibility matrix documentation
- inline commands for `run` and `check`

### Changed

- scan output redesigned for instant time-to-value
- bold ASCII art logo on scan and help

### Fixed

- exit code 1 on failed runs
- copy-pasteable tip formatting

## v0.3.0 - 2026-03-19

### Added

- HTTP/SSE adapter with streamable-http fallback
- HTML and Markdown report generation
- tool invocation checks (safe tools with no required params)
- schema drift detection via `diff`
- auto-discovery of MCP servers from Claude config files

### Changed

- package published as `@kryptosai/mcp-observatory` on npm
- README rewritten for clarity and first impressions

## v0.2.0 - 2026-03-19

### Added

- packed-install verification that proves the CLI works from a release tarball
- real-server coverage matrix with checked-in artifacts
- release automation for npm publishing on tagged releases

### Changed

- README repositioned around install proof and real evidence

## v0.1.0 - 2026-03-19

### Added

- initial CLI with `run`, `diff`, and `report`
- stable `1.0.0` artifact schema with top-level `gate`
- local-process adapter built on the official MCP TypeScript SDK
- fixture server, sample artifacts, and Markdown reporting
- real-server smoke coverage for filesystem, everything, and ref-tools servers
