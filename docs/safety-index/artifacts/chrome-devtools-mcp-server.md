# MCP Observatory Run Report

Generated at 2026-07-15T17:55:41.535Z

## Target and Environment Metadata

- Target: `chrome-devtools-mcp-server`
- Adapter: `local-process`
- Command: `npx -y chrome-devtools-mcp`
- Server: `chrome_devtools 1.6.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 69/100 (D)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 20/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 2 | 2 | 3 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: attack-sim: Safe attack simulation found 9 finding(s): 0 high, 9 medium, 0 low.; runtime-profile: Detected 9 potential egress target(s) and 36 potential state mutation(s) with high confidence.; schema-quality: Found 10 quality finding(s) across 29 item(s): 0 warnings, 10 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security
- Partial or flaky checks: runtime-profile, schema-quality, attack-sim
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Start with the failing checks: security-lite, security.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| Extra HTTP headers as a JSON string object, e.g. {"X-Custom": "value", "Authorization": "Bearer token"}. Headers are included into every HTTP request originating from the page and persist across navigations until cleared. Pass an empty string to clear all extra headers. | unknown | description_analysis | medium |
| url | unknown | tool_schema | high |
| Navigate the page by URL, back or forward in history, or reload. | unknown | description_analysis | medium |
| Target URL (only type=url) | unknown | description_analysis | medium |
| navigate_page | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| URL to load in a new page. | unknown | description_analysis | medium |
| new_page | unknown | description_analysis | low |
| Determines if, once tracing has started, the current selected page should be automatically reloaded. Navigate the page to the right URL using the navigate_page tool BEFORE starting the trace if reload or autoStop is set to true. | unknown | description_analysis | medium |

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
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-15T17:55:42.492Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 659.00 | All 7 conformance checks passed. |
| healthy | tools | pass | 4.28 | Advertised capability responded with the minimal expected shape (29 items). |
| review | attack-sim | partial | 1.09 | Safe attack simulation found 9 finding(s): 0 high, 9 medium, 0 low. |
| review | runtime-profile | partial | 0.39 | Detected 9 potential egress target(s) and 36 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 1.08 | Found 10 quality finding(s) across 29 item(s): 0 warnings, 10 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |
| act now | security | fail | 0.69 | Found 30 security finding(s): 1 high, 7 medium, 22 low. |
| act now | security-lite | fail | 0.09 | Found 30 security finding(s): 1 high, 7 medium, 22 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 29 tool(s). (+4 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (29 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `29`
  - Identifiers: click, close_page, drag, emulate, evaluate_script (+24 more)
  - Diagnostics: Avoid sharing sensitive or personal information that you do not want to share with MCP clients., Performance tools may send trace URLs to the Google CrUX API to fetch real-user experience data. To disable, run with --no-performance-crux., Google collects usage statistics to improve Chrome DevTools MCP. To opt-out, run with --no-usage-statistics. (+2 more)

### attack-sim — partial

Summary: Safe attack simulation found 9 finding(s): 0 high, 9 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `9`
  - Identifiers: evaluate_script, navigate_page, new_page, performance_start_trace, performance_stop_trace (+4 more)
  - Diagnostics: [medium] Tool "evaluate_script" combines broad parameters (filePath) with destructive or non-read-only behavior., [medium] Tool "navigate_page" combines broad parameters (url) with destructive or non-read-only behavior., [medium] Tool "new_page" combines broad parameters (url) with destructive or non-read-only behavior. (+6 more)

### runtime-profile — partial

Summary: Detected 9 potential egress target(s) and 36 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `45`
  - Identifiers: none
  - Diagnostics: Egress entries: 9, State mutations: 36, Confidence: high

### schema-quality — partial

Summary: Found 10 quality finding(s) across 29 item(s): 0 warnings, 10 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `10`
  - Identifiers: emulate, get_network_request, lighthouse_audit, list_console_messages, list_network_requests (+5 more)
  - Diagnostics: [info] tool "emulate": Has properties but no 'required' array declared, [info] tool "get_network_request": Has properties but no 'required' array declared, [info] tool "lighthouse_audit": Has properties but no 'required' array declared (+7 more)

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

Summary: Found 30 security finding(s): 1 high, 7 medium, 22 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `30`
  - Identifiers: click, close_page, drag, emulate, evaluate_script (+17 more)
  - Diagnostics: [low] Tool "click" accepts additional properties and is marked as destructive., [low] Tool "close_page" accepts additional properties and is marked as destructive., [low] Tool "drag" accepts additional properties and is marked as destructive. (+27 more)

### security-lite — fail

Summary: Found 30 security finding(s): 1 high, 7 medium, 22 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `30`
  - Identifiers: click, close_page, drag, emulate, evaluate_script (+17 more)
  - Diagnostics: [low] Tool "click" accepts additional properties and is marked as destructive., [low] Tool "close_page" accepts additional properties and is marked as destructive., [low] Tool "drag" accepts additional properties and is marked as destructive. (+27 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T175541535Z_668bb0c4`
- Gate: `fail`
