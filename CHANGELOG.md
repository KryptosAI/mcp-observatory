# Changelog

All notable changes to MCP Observatory will be documented in this file.

## Unreleased

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
