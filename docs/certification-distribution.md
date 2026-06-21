# Certification Distribution Loop

Use this when opening helpful PRs to MCP server projects. The motion is simple: run MCP Observatory, give the maintainer a useful security/compatibility check, and leave them with a badge/report they can keep.

## Offer

MCP Observatory gives MCP server maintainers:

- CI coverage for tools, prompts, resources, schema quality, and security checks
- A PR comment report on every change
- A README badge they can show publicly
- A local-first OSS path with no account required
- A paid production path only if they need hosted history, private repo reporting, support, certification, or fleet visibility

## Copy-Paste Badge

For repos that add the GitHub Action, suggest this README badge:

```md
[![MCP Observatory](https://img.shields.io/badge/MCP%20Observatory-enabled-2563eb)](https://github.com/KryptosAI/mcp-observatory)
```

For repos that generate a score badge, suggest:

```bash
npx @kryptosai/mcp-observatory badge npx -y <server-package> --output docs/mcp-health.svg
```

```md
[![MCP Health](./docs/mcp-health.svg)](https://github.com/KryptosAI/mcp-observatory)
```

## GitHub Action Template

Fast path:

```bash
npx @kryptosai/mcp-observatory init-ci --all --command "npx -y <server-package>"
```

That creates:

- `.github/workflows/mcp-observatory.yml`
- `docs/mcp-observatory-badge.md`
- `mcp-observatory.target.json`
- `docs/mcp-observatory-pr-body.md`
- `docs/mcp-observatory-issue.md`
- `docs/mcp-observatory-score-badge.md`

Manual template:

```yaml
name: MCP Observatory

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write
  statuses: write

jobs:
  mcp-observatory:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: KryptosAI/mcp-observatory/action@main
        with:
          command: npx -y <server-package>
          deep: true
          security: true
          comment-on-pr: true
```

For production CI, pin the package version:

```yaml
- uses: KryptosAI/mcp-observatory/action@main
  with:
    command: npx -y <server-package>
    package-version: 0.23.0
    deep: true
    security: true
```

For repos with a local target config:

```yaml
- uses: KryptosAI/mcp-observatory/action@main
  with:
    target: ./observatory-target.json
    deep: true
    security: true
```

## Maintainer PR Body

```md
This adds a lightweight MCP Observatory check for this server.

Why it helps:

- verifies MCP tools/prompts/resources still respond correctly
- catches schema drift and common security footguns before release
- posts a readable PR report for maintainers
- creates a public compatibility signal for users evaluating MCP servers

It runs locally/inside GitHub Actions and does not require an account. If the check is too strict for this repo, `fail-on-regression: false` can be used while keeping the PR report visible.
```

## Comment For Passing Repos

```md
Nice, this server passes MCP Observatory checks. If you want the signal in the README, you can add:

```md
[![MCP Observatory](https://img.shields.io/badge/MCP%20Observatory-enabled-2563eb)](https://github.com/KryptosAI/mcp-observatory)
```

That gives users a quick compatibility/security signal when they are choosing MCP servers.
```

## Targeting Order

Prioritize repos with:

- 100+ GitHub stars or visible npm downloads
- active releases in the last 90 days
- MCP servers used by developer tools, security, CI/CD, databases, browser automation, or enterprise SaaS
- no existing MCP compatibility/security CI
- clear package command that can run in GitHub Actions

Avoid drive-by PRs where the server requires private credentials, paid services, or destructive default actions.

## Directory Follow-Through

After a repo accepts the check or badge:

- ask the maintainer to mention “tested with MCP Observatory” in their MCP directory listing
- update the MCP Observatory launch/story docs with the accepted repo
- use accepted PRs as proof in enterprise outreach
- invite production users to hosted reporting or certification pilots
