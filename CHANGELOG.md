# Changelog

All notable changes to MCP Observatory will be documented in this file.

The format is intentionally simple while the project is pre-1.0:

- `Added`
- `Changed`
- `Fixed`
- `Docs`

## Unreleased

## v0.2.0 - 2026-03-19

### Added

- packed-install verification that proves the CLI works from a release tarball without cloning the repo
- a machine-readable real-server matrix summary at `examples/matrix-summary.json`
- a human-readable proof index at `examples/INDEX.md`
- checked-in real-server coverage for `promptopia-mcp` and `@opentofu/opentofu-mcp-server`
- a reusable standalone filesystem target at `examples/install/filesystem-target.json`
- release automation that builds release tarballs and publishes to npm when `NPM_TOKEN` is configured

### Changed

- package version bumped to `0.2.0` and the published CLI bin path now matches the actual build output
- README now prioritizes install proof, skeptic questions, and known-good matrix evidence
- release guidance now treats installability as part of the credibility bar instead of a deferred concern
- README now leads with observed server behavior, explicit non-goals, and project status instead of generic launch framing
- contributor guidance now emphasizes evidence, smaller opinionated PRs, and the kinds of work likely to be declined

### Docs

- added a launch scoreboard for the first 14 days after `v0.2.0`
- added a short technical launch note built around one regression diff and one startup diagnosis example
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
