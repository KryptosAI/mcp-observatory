# MCP Observatory proof

MCP Observatory is a working open-core MCP testing and security stack, not
only a landing page.

## Public product surface

- npm package: @kryptosai/mcp-observatory
- GitHub Action: KryptosAI/mcp-observatory
- local MCP server mode
- public Safety Index and reproducible evidence artifacts
- JSON, Markdown, HTML, JUnit, SARIF, and PR-comment reports
- schema drift detection, receipts, baselines, and diffs
- deterministic behavioral evaluation fixtures

Public proof should point to source, fixtures, generated artifacts, merged
integration work, or maintainer-visible issues. It should not rely on private
telemetry, inferred identities, or customer claims.

## Product proof

MCP Observatory can:

- install as an npm CLI
- test local-process and HTTP MCP targets
- run in GitHub Actions
- generate structured findings and CI gates
- generate health badges
- record, replay, and verify MCP sessions
- detect schema drift
- run lightweight MCP security checks
- create static enterprise reports from local artifacts

## Open-source adoption path

All Observatory features are free and MIT licensed. Run a scan, inspect reports and local history with `mcp-observatory dashboard`, then prepare a review task with `mcp-observatory clearframe`.

ClearFrame CLI and Mac are optional agent tools with their own account and usage terms. Observatory does not require them. See [the project policy](../COMMERCIAL.md) and [ClearFrame workflow](./clearframe.md).
