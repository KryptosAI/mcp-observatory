# Security Due Diligence Packet

Use this page as the first-pass answer set for security, procurement, or pilot-review conversations.

## Product Boundary

MCP Observatory is a local-first CLI, GitHub Action workflow, and MCP server for testing MCP servers before agents depend on them.

It does not claim to prove that an MCP server is safe for every mission. It produces repeatable evidence for startup behavior, tool surface, schema quality, known security footguns, attack-readiness simulations, SARIF, and trust status.

## Data Handling

Default local audit behavior:

- no hosted service required
- no network upload required
- no secret value collection required
- no file content collection required
- no environment dump collection required
- report artifacts can remain inside the customer repo or CI artifact store

Secret-like values should be redacted. Findings should report names, patterns, rule IDs, and evidence excerpts only where needed for review.

## Deployment Model

Supported modes:

- local CLI run by developer or reviewer
- GitHub Actions workflow on pull requests and schedules
- SARIF upload to GitHub Code Scanning
- MCP server mode for agent-accessible diagnostics
- optional hosted reporting or private pilot workflows

## Controls Produced

Artifacts produced by an audit:

- Markdown report
- JSON report
- SARIF results
- compact score JSON
- check statuses
- normalized findings with fingerprints and recommendations
- profile control mappings

## Failure Policy

Audit does not fail by default. CI can opt into policy gates:

```bash
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output mcp-audit.md --fail-on-critical
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output mcp-audit.md --fail-on-high
```

This lets teams onboard in observation mode, then tighten enforcement after review.

## Supply Chain Posture

Current project trust signals include:

- GitHub Actions CI
- CodeQL
- OpenSSF Scorecard badge
- Dependabot
- npm package metadata
- MIT license
- documented security disclosure path
- packed-install dry-run validation in release workflows

## Review Questions

| Question | Short answer |
|---|---|
| Does local audit require cloud upload? | No. |
| Does the `nsa-mcp` profile imply NSA approval? | No. It is a public-guidance mapping only. |
| Can findings appear in GitHub Code Scanning? | Yes, via SARIF. |
| Can teams fail builds only on critical or high findings? | Yes, with explicit flags. |
| Can reports stay private? | Yes. |
| Can a reviewer reproduce results? | Yes, using the target command and profile in the report. |
| Does it execute destructive attack payloads? | No. Attack simulation is safe-mode metadata/schema/canary evidence. |

## Known Limitations

- Passing checks do not prove semantic safety.
- False positives require reviewer feedback and, where appropriate, documented suppressions.
- Some MCP servers require credentials or fixtures to test meaningful behavior safely.
- The first `nsa-mcp` profile is intentionally practical coverage, not a complete government control catalog.
