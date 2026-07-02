# GitHub Code Scanning For MCP Servers

MCP servers are becoming agent dependencies. If a server exposes unsafe tool schemas, drifts unexpectedly, or stops starting in CI, security and platform teams need that evidence in the same place they review application risk.

MCP Observatory can now turn MCP compatibility, schema quality, security, and diagnostic evidence into SARIF findings that GitHub Code Scanning can display on pull requests and in the repository Security tab.

## One Command

Generate SARIF locally:

```bash
npx @kryptosai/mcp-observatory test npx -y my-mcp-server --sarif mcp-observatory.sarif
```

Generate a GitHub Action that uploads findings:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif
```

The generated workflow includes the permission GitHub requires for Code Scanning upload:

```yaml
permissions:
  contents: read
  security-events: write
```

## What Becomes A Finding

Observatory normalizes existing check evidence into GitHub-native findings:

- MCP security findings
- schema-quality issues
- failed compatibility checks
- legacy diagnostic artifacts
- fatal startup and runtime errors

Each finding includes a stable ID, severity, category, check ID, target subject, recommendation, control tags, and SARIF rule metadata.

## Why This Matters

Security teams already review SARIF and Code Scanning alerts. MCP servers should show up in that same review surface instead of living only in terminal output.

Use this when you want:

- MCP compatibility evidence on every pull request
- security review signals without a hosted account
- an audit trail for agent tool dependencies
- a low-friction release gate for public MCP servers
- a bridge from OSS checks to production MCP governance

## Conservative By Default

SARIF upload is opt-in. Standard `setup-ci` remains read-only and does not request `security-events: write` unless `--sarif` is passed.

For local checks, `--sarif <file>` writes the report and preserves normal terminal output and exit behavior.

## Example CI Step

```yaml
name: MCP Observatory

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  mcp-observatory:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: KryptosAI/mcp-observatory/action@v0.27.0
        with:
          command: npx -y my-mcp-server
          deep: true
          security: true
          upload-sarif: true
```

## Launch Copy

Short:

> MCP Observatory turns MCP server checks into GitHub Code Scanning findings.

Long:

> MCP servers are becoming production dependencies for AI agents. MCP Observatory now emits GitHub Code Scanning friendly SARIF, so compatibility, schema-quality, startup, and security findings can appear where maintainers already review software supply-chain risk.
