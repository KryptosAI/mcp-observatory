# MCP Observatory Run Report

Generated at 2026-07-12T23:44:14.092Z

## Target and Environment Metadata

- Target: `kubernetes-server`
- Adapter: `local-process`
- Command: `npx -y mcp-server-kubernetes`
- Server: `kubernetes 4.0.1`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 72/100 (C)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 0/100 | 20% |
| Reliability | 100/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 4 | 3 | 2 | 0 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: runtime-profile: Detected 8 potential egress target(s) and 75 potential state mutation(s) with high confidence.; schema-quality: Found 7 quality finding(s) across 29 item(s): 0 warnings, 7 info.; attack-sim: Safe attack simulation found 5 finding(s): 3 high, 2 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security, attack-sim
- Partial or flaky checks: runtime-profile, schema-quality
- Skipped checks: none
- Unsupported checks: none
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
| If true, immediately remove resources from API and bypass graceful deletion | unknown | description_analysis | medium |
| If true, immediately remove resources from API and bypass graceful deletion | unknown | description_analysis | medium |
| kubectl_reconnect | unknown | description_analysis | low |
| API version to use (e.g. 'apps/v1') | unknown | description_analysis | medium |
| Helm repository URL (optional if using local chart path) | unknown | description_analysis | medium |
| Helm repository URL (optional if using local chart path) | unknown | description_analysis | medium |
| API group to filter by | unknown | description_analysis | medium |
| list_api_resources | unknown | description_analysis | low |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
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
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| network | write | specific_path | tool_schema |
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
| network | execute | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| network | execute | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-12T23:44:15.479Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 1.68 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.31 | Advertised capability responded with the minimal expected shape (1 item). |
| healthy | resources | pass | 0.44 | Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported. |
| healthy | tools | pass | 1.19 | Advertised capability responded with the minimal expected shape (23 items). |
| review | runtime-profile | partial | 0.31 | Detected 8 potential egress target(s) and 75 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 1.03 | Found 7 quality finding(s) across 29 item(s): 0 warnings, 7 info. |
| act now | attack-sim | fail | 1.01 | Safe attack simulation found 5 finding(s): 3 high, 2 medium, 0 low. |
| act now | security | fail | 0.36 | Found 8 security finding(s): 3 high, 3 medium, 2 low. |
| act now | security-lite | fail | 0.07 | Found 8 security finding(s): 3 high, 3 medium, 2 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 23 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (1 item).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: k8s-diagnose
  - Diagnostics: Starting Kubernetes MCP server v4.0.1, handling commands..., Telemetry: Disabled, (node:25430) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead. (+1 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported.

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: k8s://default/pods, k8s://default/deployments, k8s://default/services, k8s://namespaces, k8s://nodes
  - Diagnostics: Starting Kubernetes MCP server v4.0.1, handling commands..., Telemetry: Disabled, (node:25430) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead. (+1 more)
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: MCP error -32601: Method not found, Starting Kubernetes MCP server v4.0.1, handling commands..., Telemetry: Disabled (+2 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (23 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `23`
  - Identifiers: cleanup, kubectl_get, kubectl_describe, kubectl_apply, kubectl_delete (+18 more)
  - Diagnostics: Starting Kubernetes MCP server v4.0.1, handling commands..., Telemetry: Disabled, (node:25430) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead. (+1 more)

### runtime-profile — partial

Summary: Detected 8 potential egress target(s) and 75 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `83`
  - Identifiers: none
  - Diagnostics: Egress entries: 8, State mutations: 75, Confidence: high

### schema-quality — partial

Summary: Found 7 quality finding(s) across 29 item(s): 0 warnings, 7 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: port_forward, stop_port_forward, list_api_resources
  - Diagnostics: [info] tool "port_forward": Property 'resourceType' missing description, [info] tool "port_forward": Property 'resourceName' missing description, [info] tool "port_forward": Property 'localPort' missing description (+4 more)

### attack-sim — fail

Summary: Safe attack simulation found 5 finding(s): 3 high, 2 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: kubectl_apply, kubectl_delete, kubectl_create, exec_in_pod, kubectl_generic
  - Diagnostics: [medium] Tool "kubectl_apply" combines broad parameters (filename) with destructive or non-read-only behavior., [medium] Tool "kubectl_delete" combines broad parameters (filename) with destructive or non-read-only behavior., [high] Tool "kubectl_create" combines broad parameters (filename, command) with destructive or non-read-only behavior. (+2 more)

### security — fail

Summary: Found 8 security finding(s): 3 high, 3 medium, 2 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `8`
  - Identifiers: cleanup, kubectl_apply, kubectl_delete, kubectl_create, kubectl_reconnect (+2 more)
  - Diagnostics: [low] Tool "cleanup" has an empty schema but is marked as destructive., [medium] Tool "kubectl_apply" accepts filesystem paths and has destructive capabilities., [medium] Tool "kubectl_delete" accepts filesystem paths and has destructive capabilities. (+5 more)

### security-lite — fail

Summary: Found 8 security finding(s): 3 high, 3 medium, 2 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `8`
  - Identifiers: cleanup, kubectl_apply, kubectl_delete, kubectl_create, kubectl_reconnect (+2 more)
  - Diagnostics: [low] Tool "cleanup" has an empty schema but is marked as destructive., [medium] Tool "kubectl_apply" accepts filesystem paths and has destructive capabilities., [medium] Tool "kubectl_delete" accepts filesystem paths and has destructive capabilities. (+5 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-12T234414092Z_d12ccaeb`
- Gate: `fail`
