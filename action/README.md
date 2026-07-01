# MCP Observatory GitHub Action

Test your MCP servers for breaking changes, security issues, and schema drift — directly in CI.

## Quick Start

```yaml
name: MCP Server Check
on: [pull_request]

permissions:
  contents: read
  pull-requests: write
  statuses: write

jobs:
  observatory:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: KryptosAI/mcp-observatory/action@main
        with:
          command: npx -y my-mcp-server
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `command` | Server command to test | (required if no `target`) |
| `target` | Path to target config JSON | (alternative to `command`) |
| `baseline` | Path to baseline cassette for verification | |
| `deep` | Also invoke safe tools | `false` |
| `security` | Run security analysis | `false` |
| `fail-on-regression` | Fail the action on issues | `true` |
| `fail-on-baseline-drift` | Fail the action when baseline verification detects drift | `true` |
| `comment-on-pr` | Post report as PR comment | `true` |
| `set-status` | Set a commit status check (green/red) on the HEAD SHA | `true` |
| `upload-sarif` | Upload normalized findings to GitHub Code Scanning. Requires `security-events: write`. | `false` |
| `targets` | Path to MCP config file for multi-server matrix scan | |
| `github-token` | Token for PR comments and commit statuses | `${{ github.token }}` |
| `node-version` | Node.js version | `22` |
| `package-version` | npm package version to install; pin this for reproducible CI | `latest` |

GitHub may downgrade `GITHUB_TOKEN` to read-only on forked pull requests. In that case Observatory still runs the check and warns if it cannot post a PR comment or commit status.

## Outputs

| Output | Description |
|--------|-------------|
| `gate` | Overall result: `pass` or `fail` |
| `artifact-path` | Path to the run artifact JSON |
| `sarif-path` | Path to the generated SARIF report, when available |

## Examples

### Basic check

```yaml
- uses: KryptosAI/mcp-observatory/action@main
  with:
    command: npx -y @modelcontextprotocol/server-filesystem .
```

### Deep check with security scan

```yaml
- uses: KryptosAI/mcp-observatory/action@main
  with:
    command: npx -y my-mcp-server
    deep: true
    security: true
```

### Upload findings to GitHub Code Scanning

```yaml
permissions:
  contents: read
  security-events: write

steps:
  - uses: actions/checkout@v6
  - uses: KryptosAI/mcp-observatory/action@v0.26.1
    with:
      command: npx -y my-mcp-server
      security: true
      upload-sarif: true
```

### Pinned package version for production CI

```yaml
- uses: KryptosAI/mcp-observatory/action@main
  with:
    command: npx -y my-mcp-server
    package-version: 0.26.1
```

For stricter reproducibility, pin both the Action ref and the npm package version, for example `uses: KryptosAI/mcp-observatory/action@v0.26.1` plus `package-version: 0.26.1`.

### Verify against baseline

```yaml
- uses: KryptosAI/mcp-observatory/action@main
  with:
    command: npx -y my-mcp-server
    baseline: .mcp-observatory/cassettes/baseline.cassette.json
    fail-on-baseline-drift: true
```

### Using target config

```yaml
- uses: KryptosAI/mcp-observatory/action@main
  with:
    target: ./observatory-target.json
    deep: true
```

### Don't fail on issues

```yaml
- uses: KryptosAI/mcp-observatory/action@main
  with:
    command: npx -y my-mcp-server
    fail-on-regression: false
```
