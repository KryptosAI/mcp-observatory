# Changelog

All notable changes to MCP Observatory will be documented in this file.

The format is intentionally simple while the project is pre-1.0:

- `Added`
- `Changed`
- `Fixed`
- `Docs`

## Unreleased

### Changed

- reserved for follow-up work after `v0.1.0`

## v0.1.0 - 2026-03-19

### Added

- initial CLI with `run`, `diff`, and `report`
- stable `1.0.0` artifact schema with top-level `gate`
- published JSON Schema files for run and diff artifacts
- local-process adapter built on the official MCP TypeScript SDK
- fixture server, sample artifacts, and Markdown reporting
- real-server smoke coverage and a nightly/manual matrix workflow
- checked-in real-server artifacts for filesystem, everything, and ref-tools servers
- CODEOWNERS, release metadata, and contributor-facing examples

### Changed

- README repositioned as a landing page and adoption asset
- release process expanded to support tagged GitHub releases before npm publishing

### Docs

- architecture and performance notes
- known-issues documentation for ecosystem setup caveats
- release notes template aligned to GitHub release categories
