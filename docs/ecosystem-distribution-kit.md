# Ecosystem Distribution Kit

Use this kit when submitting MCP Observatory to directories, marketplaces, newsletters, and awesome lists.

## One-Line Description

MCP Observatory is the CI and security gate for MCP servers before agents depend on them.

## Short Listing

MCP Observatory tests MCP servers for startup health, capability discovery, schema drift, common security footguns, health scoring, badges, and GitHub Action CI. It can run locally, in CI, or as an MCP server for agent-accessible diagnostics.

## Tags

- MCP
- MCP security
- AI security
- agent security
- developer tools
- CI/CD
- schema drift
- supply chain security
- testing
- GitHub Actions

## Primary CTA

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>" --sarif --schedule weekly
```

Repair/upgrade existing CI adoption:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor --fix
```

## Directory Targets

Prioritize surfaces where users already look for MCP infrastructure:

- MCP server directories
- MCP developer-tool lists
- AI security lists
- GitHub Action Marketplace
- awesome-MCP repositories
- agent framework docs and community lists
- npm package discovery through keywords and README copy

Current status:

| Surface | Status | Next action |
| --- | --- | --- |
| Smithery | Listed in README badge | Keep listing current after each release |
| Glama | Listed in README badge/card | Keep scorecard link below first-party positioning |
| MseeP | Listing exists; badge PR open | Claim listing; only accept neutral directory placement, not top-of-README badge |
| mcpservers.org / wong2 list | Website submission only; repo does not accept PRs | Submit through website manually when logged in |
| punkpeye/awesome-mcp-servers | Not listed as of July 6, 2026 | Open a single PR under Development Tools |
| appcypher/awesome-mcp-servers | Not listed as of July 6, 2026 | Open a single PR under Development Tools/Security if format fits |
| Official MCP Registry | Package is public; publishing requires registry workflow/auth | Add `server.json`/publisher path only after owner auth is available |

See [Agent And MCP Ecosystem Promotion Plan](./agent-ecosystem-promotion-plan.md) for the current claim, listing, agent prompt, company outreach, and weekly operating loop.

## Badge Policy

Use directory badges only when their wording is backed by public evidence that the project has reviewed.

- Plain directory listings are useful distribution.
- Plain text directory links are acceptable when the listing is accurate.
- Badges that imply `Audited`, `Certified`, `Verified`, or similar should wait for public scan/evaluation evidence.
- Do not approve fork PR checks for mass badge campaigns unless the provider is intentionally being adopted.

## Submission Checklist

- Link to the README.
- Link to `CLONED_THIS.md` for immediate adoption.
- Include the `setup-ci` command.
- Mention free local OSS use.
- Mention paid pilots only as production support: hosted history, private readiness review, drift/security reports, certification, support, and fleet visibility.
- Do not include private telemetry, account names, hostnames, emails, or customer claims.

## Marketplace Copy

Title:

> MCP Observatory CI

Description:

> Add MCP compatibility, schema drift, and security checks to GitHub Actions before agents depend on your server.

Snippet:

```yaml
- uses: KryptosAI/mcp-observatory/action@v0.27.0
  with:
    command: npx -y <server-package>
    deep: true
    security: true
```

## Paid Pilot Demo

Use a sanitized sample report when someone asks what the private review produces:

```bash
npx @kryptosai/mcp-observatory enterprise-report --sample --format html --output reports/sample-enterprise-report.html
```
