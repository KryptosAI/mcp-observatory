# MCP Observatory Run Report

Generated at 2026-07-15T22:34:58.292Z

## Target and Environment Metadata

- Target: `trello-mcp-server`
- Adapter: `local-process`
- Command: `npx -y trello-mcp-server`
- Server: `Trello MCP Server 1.0.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 77/100 (C)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 0/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 83/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 7 | 1 | 0 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: schema-quality: Found 24 quality finding(s) across 16 item(s): 16 warnings, 8 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: schema-quality
- Partial or flaky checks: none
- Skipped checks: none
- Unsupported checks: prompts
- Suggested next step: Start with the failing checks: schema-quality.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-15T22:34:59.057Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 1.61 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | conformance | pass | 214.95 | All 7 conformance checks passed. |
| healthy | resources | pass | 0.66 | Advertised capability responded with the minimal expected shape (3 items). |
| healthy | runtime-profile | pass | 0.07 | Detected 0 potential egress target(s) and 5 potential state mutation(s) with low confidence. |
| healthy | security | pass | 0.92 | No security issues detected. |
| healthy | security-lite | pass | 0.03 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 3.02 | Advertised capability responded with the minimal expected shape (15 items). |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| act now | schema-quality | fail | 1.90 | Found 24 quality finding(s) across 16 item(s): 16 warnings, 8 info. |

## Evidence Snippets

### attack-sim — pass

Summary: Safe attack simulation found no high-risk MCP attack-readiness findings.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 15 tool(s). (+4 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (3 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: trello://boards
  - Diagnostics: none
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: trello://boards/{boardId}/lists, trello://lists/{listId}/cards
  - Diagnostics: none

### runtime-profile — pass

Summary: Detected 0 potential egress target(s) and 5 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: none
  - Diagnostics: Egress entries: 0, State mutations: 5, Confidence: medium

### security — pass

Summary: No security issues detected.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### security-lite — pass

Summary: No security issues detected (lightweight scan).

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (15 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `15`
  - Identifiers: create-card, get-boards, get-lists, create-cards, move-card (+10 more)
  - Diagnostics: none

### prompts — unsupported

Summary: Prompts are not advertised by the target.

- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### schema-quality — fail

Summary: Found 24 quality finding(s) across 16 item(s): 16 warnings, 8 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `24`
  - Identifiers: create-card, get-boards, get-lists, create-cards, move-card (+11 more)
  - Diagnostics: [warning] tool "create-card": Missing description, [info] tool "create-card": Property 'name' missing description, [info] tool "create-card": Property 'description' missing description (+21 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T223458292Z_6e410b41`
- Gate: `fail`
