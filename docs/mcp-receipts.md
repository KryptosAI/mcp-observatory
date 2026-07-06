# MCP Receipts

A scan finds facts.

A report explains facts.

A receipt makes facts portable, reproducible, citable, and actionable.

MCP Observatory receipts are the canonical public trust artifact for MCP servers. A receipt records what was checked, when it was checked, which MCP Observatory version and profile were used, what evidence supports the verdict, what action a downstream system should take, and how another maintainer, agent, CI gate, registry, or buyer can rerun the same evaluation.

## What A Receipt Contains

Each receipt has eight stable sections:

- `subject`: server identity, startup command, package/repo/source, version, resolved identity, URL/path, commit, and package manager when available
- `run_context`: timestamp, MCP Observatory version, profile, safe-mode statement, environment class, invoked command, config file, OS, and safe working-directory context
- `evidence`: report paths and SHA-256 hashes, plus schema, tool surface, attack-simulation, and baseline/drift summaries
- `verdict`: score, trust status, receipt state, receipt action, and reason
- `findings`: the top findings only, with severity, control area, evidence summary, recommended fix, CI blocking status, and fingerprint
- `reproduction`: exact rerun command, CI command, SARIF upload hint, and expected artifacts
- `maintainer_cta`: claim/update receipt, add CI, fix findings, request rerun, and provide safe startup mode
- `buyer_cta`: request private fleet receipt pack, attack simulation evidence pack, CI/SARIF rollout, or government/enterprise pilot

The full audit report remains the place for every finding. The receipt is the compact trust record people and agents can cite.

## Verdict And Action Mapping

Receipts include both a human-readable state and an action receipt.

States:

- `ready_for_ci`
- `needs_review`
- `blocked`
- `could_not_evaluate`

Actions:

- `allow`
- `gate`
- `rerun`
- `quarantine`
- `escalate`

Mapping:

| Condition | State | Action |
|---|---|---|
| Critical findings | `blocked` | `escalate` |
| High findings | `blocked` | `gate` |
| Medium findings | `needs_review` | `gate` |
| Low/info findings only | `ready_for_ci` | `allow` |
| Evaluation error | `could_not_evaluate` | `rerun` |

Trust statuses remain compatible with audit output:

- `enterprise_ready`
- `scanned`
- `needs_review`
- `high_risk`
- `critical_risk`

## Emit A Receipt From Audit

```bash
mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format json --output report.json --receipt receipt.json
```

Markdown receipt:

```bash
mcp-observatory audit npx -y my-mcp-server --profile nsa-mcp --format markdown --output report.md --receipt receipt.md
```

## Standalone Receipt Command

```bash
mcp-observatory receipt npx -y my-mcp-server --profile nsa-mcp --format json --output receipt.json
```

Public Safety Index receipt:

```bash
mcp-observatory receipt npx -y my-mcp-server --profile nsa-mcp --environment-class public_safety_index --format markdown --output receipt.md
```

Supported `environment_class` values:

- `local`
- `ci`
- `public_safety_index`
- `private_fleet`

## Safe-Mode Guarantee

Receipts inherit the same safe-mode posture as the audit and attack-simulation flow. MCP Observatory inspects metadata, schemas, startup behavior, and inert attack-readiness evidence. It does not execute destructive payloads, exfiltrate secrets, or contact attacker-controlled callbacks.

Receipts also avoid leaking secrets or sensitive local paths. Working directories under the current user home directory are omitted, and private telemetry is not included.

## Why Receipts Matter

Receipts are meant to become the object that directories, agents, CI gates, maintainers, and buyers can pass around:

- a directory can link to the current receipt for a public MCP server
- a maintainer can claim the receipt and add CI
- an agent can decide whether to `allow`, `gate`, `rerun`, `quarantine`, or `escalate`
- a buyer can ask for a private fleet receipt pack before approving internal MCP dependencies

The public receipt proves the method. The private receipt pack turns it into a buyer-ready decision record.
