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
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"
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
- uses: KryptosAI/mcp-observatory/action@v0.25.1
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
