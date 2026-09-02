# MCP Observatory Procurement One-Pager

## Positioning

MCP Observatory is an open source security release gate for MCP servers before deployment into sensitive, regulated, or mission-critical agentic AI environments.

It helps platform and security teams answer a concrete procurement question:

> Can this MCP server be safely introduced into an agent workflow, and what evidence supports that decision?

## What It Does

- runs MCP server startup, conformance, schema, security, and safe attack-readiness checks
- maps findings to the `nsa-mcp` public-guidance profile
- produces Markdown audit reports for reviewers
- emits SARIF for GitHub Code Scanning
- emits compact trust score JSON for CI gates, badges, or dashboards
- supports recurring GitHub Actions checks and remediation tracking

## Buyer Value

| Buyer concern | MCP Observatory answer |
|---|---|
| Tool boundary risk | Detects shell, filesystem, browser, network, secrets, and destructive tool surfaces. |
| Agent manipulation risk | Flags hidden instructions and unsafe autonomous behavior in tool metadata. |
| Security review workflow | Produces SARIF, Markdown, JSON, and CI artifacts. |
| Procurement evidence | Provides a public-guidance crosswalk and repeatable audit commands. |
| Adoption risk | Runs locally with no hosted dependency required. |
| Remediation tracking | Supports repeatable audits, CI gates, and future baseline diffing. |

## Release Gate Pilot

The fixed `$15,000` pilot covers 1-3 critical MCP servers over ten business days and includes:

- 1 to 3 named MCP servers scanned
- baseline `nsa-mcp` audit reports
- SARIF uploaded to GitHub Code Scanning for selected repos
- a CI gate and reproducible rerun configuration for the agreed scope
- reviewer false-positive feedback
- an approve, gate, or defer decision with owner-ready remediation

## Example Commands

```bash
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output mcp-audit.md
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format sarif --output mcp-audit.sarif
npx @kryptosai/mcp-observatory score npx -y my-mcp-server --profile nsa-mcp --format json
```

## Security And Data Boundary

Local audits do not require sending artifacts to a hosted service. Reports can stay inside the customer repository, CI logs, artifact store, or security tooling.

MCP Observatory should not collect secrets, environment dumps, file contents, or raw command outputs for audit reporting. Secret-like values are reported by name or pattern with values redacted.

## Procurement Notes

- License: MIT
- Runtime: Node.js 20+
- Integration points: CLI, GitHub Actions, SARIF, Markdown, JSON
- Hosted service: optional, not required for local audit evidence
- Certification or compliance-attestation claim: none
- Government endorsement claim: none
- Best fit: AI platform, AppSec, DevSecOps, AI assurance, software supply chain, and agent runtime security teams

## Useful Links

- [Government and enterprise pilot brief](./government-enterprise-pilot.md)
- [Public guidance crosswalk](./public-guidance-crosswalk.md)
- [NSA-MCP audit CI guide](./nsa-mcp-audit-ci.md)
- [Example audit report](./examples/nsa-mcp-audit-report.md)
- [Example SARIF](./examples/nsa-mcp-results.sarif)
- [Example score JSON](./examples/nsa-mcp-score.json)
