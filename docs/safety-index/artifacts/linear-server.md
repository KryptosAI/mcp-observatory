# MCP Observatory Run Report

Generated at 2026-07-12T23:44:23.094Z

## Target and Environment Metadata

- Target: `linear-server`
- Adapter: `local-process`
- Command: `npx -y mcp-server-linear`
- Server: `linear-server 0.1.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 60/100 (D)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 60/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 33/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 3 | 2 | 2 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: conformance: 6/7 conformance checks passed, 1 failed.; schema-quality: Found 5 quality finding(s) across 24 item(s): 0 warnings, 5 info.; security: Found 1 security finding(s): 1 high, 0 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security
- Partial or flaky checks: conformance, schema-quality
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Start with the failing checks: security-lite, security.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **medium**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| URL of the avatar to display | unknown | description_analysis | medium |

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
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-12T23:44:24.026Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 0.51 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | runtime-profile | pass | 0.17 | Detected 1 potential egress target(s) and 30 potential state mutation(s) with low confidence. |
| healthy | tools | pass | 1.08 | Advertised capability responded with the minimal expected shape (24 items). |
| review | conformance | partial | 1.42 | 6/7 conformance checks passed, 1 failed. |
| review | schema-quality | partial | 0.51 | Found 5 quality finding(s) across 24 item(s): 0 warnings, 5 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |
| act now | security | fail | 0.44 | Found 1 security finding(s): 1 high, 0 medium, 0 low. |
| act now | security-lite | fail | 0.05 | Found 1 security finding(s): 1 high, 0 medium, 0 low. |

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

Summary: Detected 1 potential egress target(s) and 30 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `31`
  - Identifiers: none
  - Diagnostics: Egress entries: 1, State mutations: 30, Confidence: medium

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (24 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `24`
  - Identifiers: linear_auth_callback, linear_create_issue, linear_create_project_with_issues, linear_bulk_update_issues, linear_edit_issue (+19 more)
  - Diagnostics: Linear MCP server running on stdio

### conformance — partial

Summary: 6/7 conformance checks passed, 1 failed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `false`
  - Item count: `7`
  - Identifiers: tool-response-content
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 24 tool(s). (+4 more)

### schema-quality — partial

Summary: Found 5 quality finding(s) across 24 item(s): 0 warnings, 5 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: linear_create_project_with_issues, linear_bulk_update_issues, linear_search_issues, linear_list_projects, linear_update_comment
  - Diagnostics: [info] tool "linear_create_project_with_issues": Property 'project' missing description, [info] tool "linear_bulk_update_issues": Property 'update' missing description, [info] tool "linear_search_issues": Has properties but no 'required' array declared (+2 more)

### prompts — unsupported

Summary: Prompts are not advertised by the target.

- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### resources — unsupported

Summary: Resources are not advertised by the target.

- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### security — fail

Summary: Found 1 security finding(s): 1 high, 0 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: linear_auth_callback
  - Diagnostics: [high] Tool "linear_auth_callback" has parameter "code" which may allow arbitrary command execution.

### security-lite — fail

Summary: Found 1 security finding(s): 1 high, 0 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: linear_auth_callback
  - Diagnostics: [high] Tool "linear_auth_callback" has parameter "code" which may allow arbitrary command execution.

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-12T234423094Z_34be3205`
- Gate: `fail`
