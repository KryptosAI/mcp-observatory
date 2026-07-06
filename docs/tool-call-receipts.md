# Tool-Call Receipts

MCP servers need receipts, not badges.

A badge says a project wants trust. A receipt shows what was checked, what could have happened, what could not have happened, and which artifact a maintainer or security team can rerun.

Use this page when turning MCP Observatory results into Safety Index entries, maintainer PRs, SARIF uploads, proof cards, or private dependency reviews.

## Receipt Fields

A useful receipt should identify:

| Field | Purpose |
| --- | --- |
| `maintainer` | Public project, package, or account responsible for the server. |
| `source` | Public repo, package, version, and safe startup command. |
| `observatory` | MCP Observatory version, command, mode, and report timestamp. |
| `capabilityEnvelope` | What the simulation could and could not access. |
| `call` | Tool-listing, schema, prompt, resource, or safe invocation surface inspected. |
| `reason` | Why the check matters for agents depending on the server. |
| `result` | Verdict, severity, normalized findings, and maintainer-facing recommendation. |
| `changedArtifact` | JSON, Markdown, SARIF, hash, or PR evidence generated from the run. |
| `baseline` | Previous run, lock file, or Safety Index entry used for drift comparison. |
| `safeModeConstraints` | Explicit limits proving the receipt did not run destructive probes. |

Example shape:

```json
{
  "maintainer": "Example MCP Server",
  "source": {
    "repo": "https://github.com/example/mcp-server",
    "command": "npx -y example-mcp-server"
  },
  "observatory": {
    "version": "0.28.0",
    "mode": "safe",
    "command": "mcp-observatory attack-sim npx -y example-mcp-server"
  },
  "capabilityEnvelope": {
    "filesystem": "fixture-only",
    "network": "not invoked",
    "shell": "not available to probes",
    "credentials": "none"
  },
  "call": {
    "type": "tools/list"
  },
  "reason": "permission-boundary risk",
  "result": {
    "severity": "medium",
    "evidence": "Tool schema accepts broad path input and advertises write behavior."
  },
  "changedArtifact": {
    "json": "docs/safety-index/artifacts/example.attack.json",
    "sarif": "docs/safety-index/artifacts/example.attack.sarif"
  },
  "baseline": {
    "id": "previous-safety-index-run"
  },
  "safeModeConstraints": [
    "No destructive tool calls",
    "No external exfiltration",
    "No credential probing",
    "No writes outside checked-in fixtures"
  ]
}
```

## Capability Envelope

Every public receipt should explain the boundary of the run. For agent safety, the absence of a dangerous capability is as important as the finding itself.

At minimum, state whether the run had access to:

- Filesystem writes or deletes
- Network calls
- Shell or process execution
- Credentials, tokens, cookies, or production services
- Real user data
- Fixture data only

For public Safety Index evidence, prefer `attack-sim --mode safe`, public packages, checked-in fixtures, and no-secret startup commands. If a server requires private credentials, keep that evidence out of the public index and treat it as a private readiness review.

## How Observatory Produces Receipts

Use these commands as the receipt ladder:

```bash
npx @kryptosai/mcp-observatory test npx -y my-mcp-server --json run-artifact.json --markdown run-report.md
npx @kryptosai/mcp-observatory attack-sim npx -y my-mcp-server --json attack-artifact.json --output attack-report.md --sarif attack-results.sarif
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif
```

The normal run artifact shows protocol readiness. The attack-sim artifact shows safe attack-readiness evidence for tool poisoning, exfiltration canaries, permission-boundary risk, and drift readiness. The CI setup turns the receipt into something a maintainer can keep rerunning.

## Safety Index Rules

Public Safety Index entries must use:

- Public repos, public packages, or public startup commands
- Sanitized JSON, Markdown, and SARIF artifacts
- Safe-mode attack simulation only
- Maintainer-friendly recommendations
- No private telemetry, secrets, hostnames, customer data, emails, or unpublished claims

Rough PRs are welcome at intake. Published entries should be normalized into receipts a maintainer can reproduce.

## Contributor Prompt

Use this when inviting agents, bot authors, and MCP maintainers to contribute:

```text
Name one MCP server your agent depends on. I will help turn it into a reproducible tool-call receipt: safe startup command, run artifact, attack-sim evidence, SARIF, and a CI gate maintainers can review.
```

