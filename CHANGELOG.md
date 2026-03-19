# Changelog

All notable changes to MCP Observatory will be documented in this file.

The format is intentionally simple while the project is pre-1.0:

- `Added`
- `Changed`
- `Fixed`
- `Docs`

## Unreleased

### Changed

- README now leads with observed server behavior, explicit non-goals, and project status instead of generic launch framing
- contributor guidance now emphasizes evidence, smaller opinionated PRs, and the kinds of work likely to be declined

### Docs

- added `docs/field-notes.md` to record launch-day real-server observations and what they changed
- added `docs/decisions.md` to document the narrow semantics bar, CLI-first posture, and release bar
- expanded `docs/known-issues.md` with an explicit `unsupported` vs `failed` explanation
- updated release guidance so future notes stay observational rather than launch-like

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
