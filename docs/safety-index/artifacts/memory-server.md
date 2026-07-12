# MCP Observatory Run Report

Generated at 2026-07-12T23:35:38.028Z

## Target and Environment Metadata

- Target: `memory-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-memory`
- Server: `memory-server 0.6.3`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 89/100 (B)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 83/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 9 | 7 | 0 | 1 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: schema-quality: Found 4 quality finding(s) across 10 item(s): 0 warnings, 4 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: schema-quality
- Skipped checks: none
- Unsupported checks: prompts
- Suggested next step: Review the caveated checks next: schema-quality.
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
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |

_Analyzed at 2026-07-12T23:35:38.749Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 3.63 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | conformance | pass | 8.35 | All 7 conformance checks passed. |
| healthy | resources | pass | 1.22 | Advertised capability responded with the minimal expected shape (1 items). |
| healthy | runtime-profile | pass | 0.06 | Detected 0 potential egress target(s) and 12 potential state mutation(s) with low confidence. |
| healthy | security | pass | 3.94 | No security issues detected. |
| healthy | security-lite | pass | 0.03 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 7.62 | Advertised capability responded with the minimal expected shape (9 items). |
| review | schema-quality | partial | 7.68 | Found 4 quality finding(s) across 10 item(s): 0 warnings, 4 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |

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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 9 tool(s). (+4 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (1 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: memory://knowledge-graph
  - Diagnostics: Knowledge Graph MCP Server running on stdio
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Knowledge Graph MCP Server running on stdio

### runtime-profile — pass

Summary: Detected 0 potential egress target(s) and 12 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `12`
  - Identifiers: none
  - Diagnostics: Egress entries: 0, State mutations: 12, Confidence: medium

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

Summary: Advertised capability responded with the minimal expected shape (9 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `9`
  - Identifiers: create_entities, create_relations, add_observations, delete_entities, delete_observations (+4 more)
  - Diagnostics: Knowledge Graph MCP Server running on stdio

### schema-quality — partial

Summary: Found 4 quality finding(s) across 10 item(s): 0 warnings, 4 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `4`
  - Identifiers: create_entities, create_relations, add_observations, delete_observations
  - Diagnostics: [info] tool "create_entities": Property 'entities' missing description, [info] tool "create_relations": Property 'relations' missing description, [info] tool "add_observations": Property 'observations' missing description (+1 more)

### prompts — unsupported

Summary: Prompts are not advertised by the target.

- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-12T233538028Z_74c23d92`
- Gate: `pass`
