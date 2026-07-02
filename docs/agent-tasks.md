# Agent Task Pack

This page is written for coding agents, bot maintainers, autonomous productivity systems, and maintainers who want small useful MCP Observatory contributions.

## Task 1: Add MCP Observatory CI To A Repo

```text
Add MCP Observatory CI for this MCP server.

Use the safest no-secret startup command available in the repo. Generate the full adoption kit with SARIF enabled, verify it with setup-ci --doctor, and open a focused PR that explains the check is read-only.

Commands:
npx @kryptosai/mcp-observatory test <safe startup command> --campaign agent-ci
npx @kryptosai/mcp-observatory setup-ci --all --command "<safe startup command>" --sarif --campaign agent-ci
npx @kryptosai/mcp-observatory setup-ci --doctor
```

## Task 2: Add One Safety Index Target

```text
Add one public MCP server target to MCP Observatory's Safety Index.

Requirements:
- public repo or public package
- no secrets
- no paid service dependency
- safe startup command
- generated JSON and Markdown evidence
- maintainer-friendly wording

Use docs/target-contribution-guide.md and docs/target-registry.md.
```

## Task 3: Generate SARIF For A Maintainer

```text
Run MCP Observatory against this MCP server and produce a SARIF artifact suitable for GitHub Code Scanning.

Command:
npx @kryptosai/mcp-observatory test <safe startup command> --sarif mcp-observatory.sarif --campaign agent-sarif

Summarize only the normalized findings and avoid publishing private telemetry, hostnames, tokens, or local paths beyond generated artifact paths.
```

## Task 4: Open A Useful Maintainer PR

```text
Open a small PR that adds read-only MCP Observatory checks.

Do:
- keep the PR focused on CI and evidence
- pin the action ref
- include setup-ci --doctor output
- say findings are review prompts, not public shaming

Do not:
- require private credentials
- add destructive tool calls
- include private telemetry
- change unrelated project code
```

## Task 5: Evaluate A Bot Runtime

```text
Find the MCP servers this agent or bot runtime depends on. For each server, identify a no-secret startup command, run MCP Observatory, and report whether the server is ready for CI, needs review before production, or is not reproducible.

Use:
npx @kryptosai/mcp-observatory test <safe startup command> --campaign bot-runtime-review
```

