# MCP Observatory GitHub Action

Test your MCP servers for breaking changes, security issues, and schema drift — directly in CI.

## Quick Start

```yaml
name: MCP Server Check
on: [pull_request]

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
| `comment-on-pr` | Post report as PR comment | `true` |
| `set-status` | Set a commit status check (green/red) on the HEAD SHA | `true` |
| `targets` | Path to MCP config file for multi-server matrix scan | |
| `github-token` | Token for PR comments and commit statuses | `${{ github.token }}` |
| `node-version` | Node.js version | `22` |

## Outputs

| Output | Description |
|--------|-------------|
| `gate` | Overall result: `pass` or `fail` |
| `artifact-path` | Path to the run artifact JSON |

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

### Verify against baseline

```yaml
- uses: KryptosAI/mcp-observatory/action@main
  with:
    command: npx -y my-mcp-server
    baseline: .mcp-observatory/cassettes/baseline.cassette.json
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
