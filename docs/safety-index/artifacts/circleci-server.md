# MCP Observatory Run Report

Generated at 2026-07-15T22:34:08.316Z

## Target and Environment Metadata

- Target: `circleci-server`
- Adapter: `local-process`
- Command: `npx -y @circleci/mcp-server-circleci`
- Server: `mcp-server-circleci 1.0.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 63/100 (D)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 60/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 67/100 | 20% |
| Reliability | 50/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 4 | 2 | 2 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: conformance: 6/7 conformance checks passed, 1 failed.; schema-quality: Found 34 quality finding(s) across 17 item(s): 0 warnings, 34 info.; attack-sim: Safe attack simulation found 2 finding(s): 1 high, 1 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: resources, attack-sim
- Partial or flaky checks: conformance, schema-quality
- Skipped checks: none
- Unsupported checks: prompts
- Suggested next step: Start with the failing checks: resources, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **medium**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| get_build_failure_logs | unknown | description_analysis | low |
| find_flaky_tests | unknown | description_analysis | low |
| get_latest_pipeline_status | unknown | description_analysis | low |
| get_job_test_results | unknown | description_analysis | low |
| run_pipeline | unknown | description_analysis | low |
| run_evaluation_tests | unknown | description_analysis | low |
| rerun_workflow | unknown | description_analysis | low |
| download_usage_api_data | unknown | description_analysis | low |
| find_underused_resource_classes | unknown | description_analysis | low |
| run_rollback_pipeline | unknown | description_analysis | low |
| list_artifacts | unknown | description_analysis | low |

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
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-15T22:34:09.642Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | runtime-profile | pass | 0.26 | Detected 11 potential egress target(s) and 20 potential state mutation(s) with low confidence. |
| healthy | security | pass | 1.38 | No security issues detected. |
| healthy | security-lite | pass | 0.14 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 3.40 | Advertised capability responded with the minimal expected shape (17 items). |
| review | conformance | partial | 4.86 | 6/7 conformance checks passed, 1 failed. |
| review | schema-quality | partial | 2.09 | Found 34 quality finding(s) across 17 item(s): 0 warnings, 34 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| act now | attack-sim | fail | 3.78 | Safe attack simulation found 2 finding(s): 1 high, 1 medium, 0 low. |
| act now | resources | fail | 0.40 | Advertised capability did not respond successfully. |

## Evidence Snippets

### runtime-profile — pass

Summary: Detected 11 potential egress target(s) and 20 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `31`
  - Identifiers: none
  - Diagnostics: Egress entries: 11, State mutations: 20, Confidence: medium

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

Summary: Advertised capability responded with the minimal expected shape (17 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `17`
  - Identifiers: get_build_failure_logs, find_flaky_tests, get_latest_pipeline_status, get_job_test_results, config_helper (+12 more)
  - Diagnostics: Starting CircleCI MCP server in stdio mode...

### conformance — partial

Summary: 6/7 conformance checks passed, 1 failed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `false`
  - Item count: `7`
  - Identifiers: resources-capability-match
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 17 tool(s). (+4 more)

### schema-quality — partial

Summary: Found 34 quality finding(s) across 17 item(s): 0 warnings, 34 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `34`
  - Identifiers: get_build_failure_logs, find_flaky_tests, get_latest_pipeline_status, get_job_test_results, config_helper (+12 more)
  - Diagnostics: [info] tool "get_build_failure_logs": Has properties but no 'required' array declared, [info] tool "get_build_failure_logs": Property 'params' missing description, [info] tool "find_flaky_tests": Has properties but no 'required' array declared (+31 more)

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

Summary: Safe attack simulation found 2 finding(s): 1 high, 1 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: download_usage_api_data, list_component_versions
  - Diagnostics: [high] tool "download_usage_api_data" contains secret exfiltration instruction text that could steer an agent., [medium] tool "list_component_versions" contains agent behavior control text that could steer an agent.

### resources — fail

Summary: Advertised capability did not respond successfully.

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: MCP error -32601: Method not found, Starting CircleCI MCP server in stdio mode...
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: MCP error -32601: Method not found, Starting CircleCI MCP server in stdio mode...

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T223408316Z_07dbaba0`
- Gate: `fail`
