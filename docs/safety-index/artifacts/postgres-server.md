# MCP Observatory Run Report

Generated at 2026-07-12T23:36:09.010Z

## Target and Environment Metadata

- Target: `postgres-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-postgres postgres://localhost:5432/db`
- Server: `example-servers/postgres 0.1.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 70/100 (C)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 60/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 50/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 5 | 1 | 2 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: conformance: 5/7 conformance checks passed, 2 failed.; schema-quality: Found 2 quality finding(s) across 1 item(s): 0 warnings, 2 info.; resources: Advertised capability did not respond successfully.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: resources
- Partial or flaky checks: conformance, schema-quality
- Skipped checks: none
- Unsupported checks: prompts
- Suggested next step: Start with the failing checks: resources.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-12T23:36:09.823Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 0.86 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | runtime-profile | pass | 0.03 | Detected 0 potential egress target(s) and 1 potential state mutation(s) with low confidence. |
| healthy | security | pass | 0.11 | No security issues detected. |
| healthy | security-lite | pass | 0.01 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 0.44 | Advertised capability responded with the minimal expected shape (1 item). |
| review | conformance | partial | 1.50 | 5/7 conformance checks passed, 2 failed. |
| review | schema-quality | partial | 0.82 | Found 2 quality finding(s) across 1 item(s): 0 warnings, 2 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| act now | resources | fail | 7.72 | Advertised capability did not respond successfully. |

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

### runtime-profile — pass

Summary: Detected 0 potential egress target(s) and 1 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: none
  - Diagnostics: Egress entries: 0, State mutations: 1, Confidence: medium

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

Summary: Advertised capability responded with the minimal expected shape (1 item).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: query
  - Diagnostics: none

### conformance — partial

Summary: 5/7 conformance checks passed, 2 failed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `false`
  - Item count: `7`
  - Identifiers: resources-capability-match, tool-response-content
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 1 tool(s). (+4 more)

### schema-quality — partial

Summary: Found 2 quality finding(s) across 1 item(s): 0 warnings, 2 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: query
  - Diagnostics: [info] tool "query": Has properties but no 'required' array declared, [info] tool "query": Property 'sql' missing description

### prompts — unsupported

Summary: Prompts are not advertised by the target.

- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### resources — fail

Summary: Advertised capability did not respond successfully.

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: MCP error -32603: 
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: MCP error -32601: Method not found

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-12T233609010Z_0961a303`
- Gate: `fail`
