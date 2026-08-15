# Agent Task Pack

This page is written for coding agents, bot maintainers, autonomous productivity systems, and maintainers who want small useful MCP Observatory contributions.

Useful merged work can receive public credit through [MCP Observatory Contributors](./contributor-recognition.md), [CONTRIBUTORS.md](../CONTRIBUTORS.md), and target proof cards. Recognition is based on merged public evidence, not private telemetry.

Rough agentic contribution ideas are welcome too. Open an `Agentic contribution idea` issue when a task is promising but not ready for a focused PR.

The core standard is a [tool-call receipt](./tool-call-receipts.md): public source, safe startup command, run artifact, attack-sim evidence, SARIF when useful, and a clear capability envelope showing what the run could not access. The public map is the [MCP Risk Graph](./receipt-graph.md).

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
- attack-sim evidence or a note explaining why attack-sim is not applicable
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

## Task 6: Prepare A Contributor Proof Card

```text
After a target, CI integration, or SARIF improvement is merged, prepare a public proof card.

Use docs/contributor-proof-cards/README.md.

Include:
- contributor GitHub profile
- role
- merged PR
- generated artifact or upstream workflow
- verdict
- Observatory version

Do not include private telemetry, local paths, secrets, or unpublished maintainer data.
```
