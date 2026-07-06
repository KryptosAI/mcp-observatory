# Government And Enterprise MCP Readiness Pilot

MCP Observatory is a security release gate for MCP servers before deployment into sensitive, regulated, or mission-critical agentic AI environments.

## Problem Statement

MCP servers are a new security boundary. They expose tools, schemas, prompts, resources, filesystem access, browser automation, command execution, cloud APIs, and internal data paths directly to AI agents. Traditional dependency review catches package risk; it usually does not answer whether an agent-facing tool surface is safe to deploy.

Security teams need reproducible evidence before MCP servers become production dependencies.

## What The Audit Produces

An MCP Observatory pilot produces:

- profile-mapped audit reports using `--profile nsa-mcp`
- normalized findings with severity, confidence, evidence, recommendations, fingerprints, and control mappings
- SARIF output for GitHub Code Scanning
- trust status output: `enterprise_ready`, `scanned`, `needs_review`, `high_risk`, or `critical_risk`
- CI workflow examples for pull requests, scheduled checks, and security review artifacts
- remediation tracking across repeated scans

The `nsa-mcp` profile is not an official certification or government authorization. It operationalizes public security guidance into practical automated MCP checks for sensitive environments.

For buyer review, pair this pilot brief with the [public guidance crosswalk](./public-guidance-crosswalk.md), [procurement one-pager](./procurement-one-pager.md), and [security due diligence packet](./security-due-diligence.md).

## 30 Day Pilot

A practical 30 day pilot measures whether MCP Observatory can become the release gate for MCP server adoption.

Week 1:
- inventory MCP servers and target startup commands
- run baseline audits
- upload SARIF to GitHub Code Scanning for selected repos

Week 2:
- triage critical and high findings with security reviewers
- tune target configs and suppressions only where risk is accepted
- enable pull request audit checks for pilot repos

Week 3:
- remediate top findings
- rerun audits and compare trust status movement
- add scheduled weekly checks

Week 4:
- produce pilot summary with findings, false-positive feedback, remediation rate, and CI adoption status
- decide whether to expand to more repos or private fleet reporting

## Success Metrics

- number of MCP servers scanned
- critical and high findings discovered
- mean time to remediation
- percentage of findings fixed
- number of repos with CI gate enabled
- number of SARIF findings uploaded to GitHub Code Scanning
- false positive rate from security reviewer feedback

## Required Environment

The pilot needs:

- Node.js 20+
- reproducible MCP server startup commands or target JSON configs
- GitHub repository access for CI and SARIF upload when Code Scanning is in scope
- harmless fixtures for any tool invocation checks
- security reviewer feedback for false-positive classification

## Data Boundary

Local audit runs do not require hosted services.

By default, MCP Observatory should not collect secrets, environment dumps, file contents, command outputs, or private telemetry payloads. Audit artifacts should redact secret values and include only the evidence needed for security review.

If a hosted pilot is used, customer data boundaries should be documented before upload. The default local workflow can keep audit reports, SARIF, and score JSON inside the customer repository or CI artifact store.

## Workflow Fit

MCP Observatory fits existing security review surfaces:

- GitHub Actions runs the audit on pull requests and schedules
- SARIF uploads normalized findings to GitHub Code Scanning
- Markdown reports are published as CI artifacts for reviewer signoff
- score JSON can drive badges, dashboards, or release policy
- repeated audits measure remediation and drift

Start with:

```bash
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output mcp-audit.md
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format sarif --output mcp-audit.sarif
npx @kryptosai/mcp-observatory score npx -y my-mcp-server --profile nsa-mcp --format json
```
