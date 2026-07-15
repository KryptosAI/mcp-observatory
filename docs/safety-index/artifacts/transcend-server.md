# MCP Observatory Run Report

Generated at 2026-07-15T22:34:17.959Z

## Target and Environment Metadata

- Target: `transcend-server`
- Adapter: `local-process`
- Command: `npx -y @transcend-io/mcp`
- Server: `transcend-mcp 0.6.9`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 85/100 (B)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 9 | 5 | 0 | 2 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: runtime-profile: Detected 27 potential egress target(s) and 45 potential state mutation(s) with high confidence.; schema-quality: Found 22 quality finding(s) across 73 item(s): 0 warnings, 22 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: runtime-profile, schema-quality
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Review the caveated checks next: runtime-profile, schema-quality.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| docs_list | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| Absolute https URL of a docs.transcend.io article (.md) from docs_list. | unknown | description_analysis | medium |
| docs_fetch | unknown | description_analysis | low |
| Type of data subject (e.g., customer, employee, prospect). Required by the Transcend API. | unknown | description_analysis | medium |
| dsr_submit | unknown | description_analysis | low |
| Type of data subject (e.g., customer, employee). Required by the Transcend API. | unknown | description_analysis | medium |
| consent_list_data_flows | unknown | description_analysis | low |
| consent_get_aggregate_analytics | unknown | description_analysis | low |
| consent_get_timeseries_analytics | unknown | description_analysis | low |
| consent_get_analytics_data | unknown | description_analysis | low |
| assessments_list | unknown | description_analysis | low |
| Optional human-readable name (e.g. title) for the tool call in chat; not sent to the API. | unknown | description_analysis | medium |
| assessments_get | unknown | description_analysis | low |
| assessments_create | unknown | description_analysis | low |
| assessments_update | unknown | description_analysis | low |
| assessments_list_templates | unknown | description_analysis | low |
| Array of section IDs to submit for review. Required by the API. | unknown | description_analysis | medium |
| assessments_submit_response | unknown | description_analysis | low |
| workflows_list | unknown | description_analysis | low |
| workflows_list_email_templates | unknown | description_analysis | low |
| admin_get_current_user | unknown | description_analysis | low |
| admin_list_users | unknown | description_analysis | low |
| admin_list_teams | unknown | description_analysis | low |
| admin_list_api_keys | unknown | description_analysis | low |
| Name/title for the API key | unknown | description_analysis | medium |
| admin_create_api_key | unknown | description_analysis | low |

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

_Analyzed at 2026-07-15T22:34:19.154Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 3.40 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | conformance | pass | 567.05 | All 7 conformance checks passed. |
| healthy | security | pass | 2.45 | No security issues detected. |
| healthy | security-lite | pass | 0.23 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 2.94 | Advertised capability responded with the minimal expected shape (73 items). |
| review | runtime-profile | partial | 0.57 | Detected 27 potential egress target(s) and 45 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 2.63 | Found 22 quality finding(s) across 73 item(s): 0 warnings, 22 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |

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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 73 tool(s). (+4 more)

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

Summary: Advertised capability responded with the minimal expected shape (73 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `73`
  - Identifiers: docs_list, docs_fetch, dsr_submit, dsr_poll_status, dsr_list (+68 more)
  - Diagnostics: {"level":"info","message":"Starting Transcend MCP Server v0.6.9...","data":{"toolCount":73,"categories":["Documentation","DSR Automation","Consent Management","Preference Management","Data Inventory","Data Discovery","Assessments","Workflows","Admin"]},"timestamp":"2026-07-15T22:34:19.145Z"}, {"level":"info","message":"Transcend MCP Server started successfully","data":{"sombraUrl":"https://multi-tenant.sombra.transcend.io","graphqlUrl":"https://api.transcend.io","dashboardUrl":"https://app.transcend.io","tools":73},"timestamp":"2026-07-15T22:34:19.145Z"}, (node:81004) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead. (+2 more)

### runtime-profile — partial

Summary: Detected 27 potential egress target(s) and 45 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `72`
  - Identifiers: none
  - Diagnostics: Egress entries: 27, State mutations: 45, Confidence: high

### schema-quality — partial

Summary: Found 22 quality finding(s) across 73 item(s): 0 warnings, 22 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `22`
  - Identifiers: docs_list, dsr_list, dsr_analyze, consent_list_purposes, consent_list_regimes (+17 more)
  - Diagnostics: [info] tool "docs_list": Has properties but no 'required' array declared, [info] tool "dsr_list": Has properties but no 'required' array declared, [info] tool "dsr_analyze": Has properties but no 'required' array declared (+19 more)

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

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T223417959Z_850681b6`
- Gate: `pass`
