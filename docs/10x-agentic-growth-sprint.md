# 10x Agentic Growth Sprint

This sprint turns MCP Observatory from a useful scanner into a receipt engine agents can rerun, cite, and contribute to.

## Goal

Increase latest-version external `attack-sim` and `setup-ci --sarif` sessions by making every successful check lead to a reproducible receipt and a CI gate.

## Operating Loop

1. Pick a public MCP server with a no-secret startup command.
2. Run a normal check plus safe attack simulation.
3. Publish the sanitized JSON artifact, Markdown report, action receipt, and CI command.
4. Send the maintainer a concise note with the reproduction command.
5. Invite agents to improve the target config, add a receipt, or open a CI PR.

## What Agents Should Do

- Add one safe Safety Index target.
- Improve a reproduction command that currently fails.
- Add a missing attack-sim fixture or rule proposal.
- Turn a passing result into `setup-ci --all --sarif --schedule weekly`.
- Open a small PR with artifacts and a maintainer note.

## What Counts

- Latest-version `attack-sim` sessions.
- `setup-ci --sarif` sessions.
- External CI sessions.
- Safety Index PRs or target additions.
- Maintainer replies that clarify safe startup commands.
- Paid pilot conversations from private MCP users.

## Guardrails

- Use only public commands and sanitized artifacts for public work.
- Do not run destructive probes.
- Do not collect or publish secrets, hostnames, private URLs, or raw telemetry rows.
- Prefer “needs review” over shame language.
- If a server needs credentials, move it to a private readiness review.

## Default Command Pack

```bash
npx @kryptosai/mcp-observatory attack-sim npx -y <server-package> --json attack-artifact.json --output attack-report.md --sarif attack-results.sarif
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>" --sarif --schedule weekly
```
