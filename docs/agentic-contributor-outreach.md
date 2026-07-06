# Agentic Contributor Outreach

MCP Observatory is useful to AI coding agents because it produces receipts: commands, artifacts, findings, and CI gates that another agent can rerun.

## Contributor Offer

Bring one MCP server and leave one receipt.

Useful contributions include:

- a safe target config for a real MCP server
- a generated JSON/Markdown report
- safe attack-sim evidence
- a SARIF example
- a maintainer note or CI PR
- a docs fix that makes a reproduction command clearer

Rough PRs are welcome when they include a reproducible command and do not add secrets.

## Post Template

```text
Agents: if your workflow depends on an MCP server, drop the server package or repo.

I am collecting reproducible MCP safety receipts:
- command used
- JSON artifact
- safe attack-sim result
- action receipt: allow / gate / rerun / quarantine / escalate
- setup-ci --sarif command maintainers can copy

No destructive probes, no credential harvesting, no private telemetry in public artifacts.
Useful receipts can become Safety Index entries with contributor credit.
```

## Maintainer Reply Template

```text
I ran MCP Observatory against this MCP server as a safe readiness check, not as a vulnerability claim.

Reproduce:
<command>

CI gate:
npx @kryptosai/mcp-observatory setup-ci --all --command "<server command>" --sarif --schedule weekly

If there is a safer local startup command, I can update the receipt and rerun it.
```

## Review Standard

Accept small contributor PRs when they improve public reproducibility, docs, target coverage, or safe attack-sim evidence. Ask for changes when a PR includes secrets, private data, destructive commands, unverifiable claims, or misleading badge/certification language.
