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

## Commercial path

The free wedge is local testing and public repository CI. Paid value is
production/private use through the hosted control plane:

- hosted CI history
- private repository reporting
- recurring security reviews
- support and rollout review
- fleet visibility and enterprise workflows

See COMMERCIAL.md and the repository boundary document for the split.
