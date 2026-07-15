# MCP Observatory Run Report

Generated at 2026-07-15T17:55:37.988Z

## Target and Environment Metadata

- Target: `executeautomation-playwright-server`
- Adapter: `local-process`
- Command: `npx -y @executeautomation/playwright-mcp-server`
- Server: `playwright-mcp 1.0.11`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 69/100 (D)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 0/100 | 20% |
| Reliability | 83/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 3 | 3 | 2 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: runtime-profile: Detected 24 potential egress target(s) and 24 potential state mutation(s) with high confidence.; schema-quality: Found 1 quality finding(s) across 34 item(s): 1 warnings, 0 info.; attack-sim: Safe attack simulation found 6 finding(s): 1 high, 5 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security, attack-sim
- Partial or flaky checks: runtime-profile, schema-quality
- Skipped checks: none
- Unsupported checks: prompts
- Suggested next step: Start with the failing checks: security-lite, security, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| url | unknown | tool_schema | high |
| URL to navigate to the website specified | unknown | description_analysis | medium |
| playwright_navigate | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| URL to perform GET operation | unknown | description_analysis | medium |
| playwright_get | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| URL to perform POST operation | unknown | description_analysis | medium |
| playwright_post | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| URL to perform PUT operation | unknown | description_analysis | medium |
| playwright_put | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| URL to perform PATCH operation | unknown | description_analysis | medium |
| playwright_patch | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| URL to perform DELETE operation | unknown | description_analysis | medium |
| playwright_delete | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| URL pattern to match in the response. | unknown | description_analysis | medium |
| playwright_expect_response | unknown | description_analysis | low |
| Identifier of the HTTP response initially expected using `Playwright_expect_response`. | unknown | description_analysis | medium |
| Data to expect in the body of the HTTP response. If provided, the assertion will fail if this value is not found in the response body. | unknown | description_analysis | medium |
| playwright_assert_response | unknown | description_analysis | low |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
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
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-15T17:55:39.024Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 2.10 | All 7 conformance checks passed. |
| healthy | resources | pass | 0.59 | Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported. |
| healthy | tools | pass | 1.27 | Advertised capability responded with the minimal expected shape (33 items). |
| review | runtime-profile | partial | 0.22 | Detected 24 potential egress target(s) and 24 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 1.87 | Found 1 quality finding(s) across 34 item(s): 1 warnings, 0 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| act now | attack-sim | fail | 0.98 | Safe attack simulation found 6 finding(s): 1 high, 5 medium, 0 low. |
| act now | security | fail | 0.38 | Found 1 security finding(s): 1 high, 0 medium, 0 low. |
| act now | security-lite | fail | 0.06 | Found 1 security finding(s): 1 high, 0 medium, 0 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 33 tool(s). (+4 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported.

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: console://logs
  - Diagnostics: none
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: MCP error -32601: Method not found

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (33 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `33`
  - Identifiers: start_codegen_session, end_codegen_session, get_codegen_session, clear_codegen_session, playwright_navigate (+28 more)
  - Diagnostics: none

### runtime-profile — partial

Summary: Detected 24 potential egress target(s) and 24 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `48`
  - Identifiers: none
  - Diagnostics: Egress entries: 24, State mutations: 24, Confidence: high

### schema-quality — partial

Summary: Found 1 quality finding(s) across 34 item(s): 1 warnings, 0 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: Browser console logs
  - Diagnostics: [warning] resource "Browser console logs": Missing description

### prompts — unsupported

Summary: Prompts are not advertised by the target.

- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### attack-sim — fail

Summary: Safe attack simulation found 6 finding(s): 1 high, 5 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `6`
  - Identifiers: playwright_upload_file, playwright_evaluate, playwright_post, playwright_put, playwright_patch (+1 more)
  - Diagnostics: [medium] Tool "playwright_upload_file" combines broad parameters (filePath) with destructive or non-read-only behavior., [high] Tool "playwright_evaluate" combines broad parameters (script) with destructive or non-read-only behavior., [medium] Tool "playwright_post" combines broad parameters (url, headers) with destructive or non-read-only behavior. (+3 more)

### security — fail

Summary: Found 1 security finding(s): 1 high, 0 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: playwright_evaluate
  - Diagnostics: [high] Tool "playwright_evaluate" has parameter "script" which may allow arbitrary command execution.

### security-lite — fail

Summary: Found 1 security finding(s): 1 high, 0 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: playwright_evaluate
  - Diagnostics: [high] Tool "playwright_evaluate" has parameter "script" which may allow arbitrary command execution.

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T175537988Z_9b989754`
- Gate: `fail`
