# NSA-MCP Audit CI Guide

Use this workflow when a repository needs MCP Observatory as a security release gate for an MCP server.

The `nsa-mcp` profile is not an official certification. It maps MCP Observatory findings to practical control areas for sensitive environments.

## Pull Request Audit

```yaml
name: MCP Observatory Audit

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: "0 9 * * 1"

permissions:
  contents: read
  security-events: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - run: npm ci
      - run: npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output mcp-audit.md --fail-on-high
      - run: npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format sarif --output mcp-audit.sarif
      - uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: mcp-audit.sarif
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: mcp-observatory-audit
          path: |
            mcp-audit.md
            mcp-audit.sarif
```

## Failing Policy

Use one of these gates:

```bash
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output mcp-audit.md --fail-on-critical
npx @kryptosai/mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output mcp-audit.md --fail-on-high
```

`--fail-on-critical` is appropriate while onboarding noisy repos. `--fail-on-high` is appropriate once maintainers have accepted the release gate.

## Badge Ready Score

The score command returns compact JSON for badge generators or dashboards:

```bash
npx @kryptosai/mcp-observatory score npx -y my-mcp-server --profile nsa-mcp --format json
```

Example:

```json
{
  "target_id": "my-mcp-server",
  "profile": "nsa-mcp",
  "score": 87,
  "status": "needs_review",
  "finding_count": 2
}
```

## Local Fixture Demo

This repository includes an intentionally insecure inert fixture:

```bash
npx tsx src/cli.ts audit examples/insecure-mcp-server --profile nsa-mcp --format markdown --output /tmp/nsa-mcp-audit-report.md
npx tsx src/cli.ts audit examples/insecure-mcp-server --profile nsa-mcp --format sarif --output /tmp/nsa-mcp-results.sarif
npx tsx src/cli.ts score examples/insecure-mcp-server --profile nsa-mcp --format json
```

Generated examples are checked in under [`docs/examples`](./examples/).
