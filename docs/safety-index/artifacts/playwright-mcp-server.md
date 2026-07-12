# MCP Observatory Run Report

Generated at 2026-07-12T23:44:10.399Z

## Target and Environment Metadata

- Target: `playwright-mcp-server`
- Adapter: `local-process`
- Command: `npx -y @playwright/mcp`
- Server: `Playwright 1.62.0-alpha-1783623505000`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 65/100 (D)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 0/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 2 | 3 | 2 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: runtime-profile: Detected 7 potential egress target(s) and 21 potential state mutation(s) with high confidence.; schema-quality: Found 5 quality finding(s) across 24 item(s): 0 warnings, 5 info.; attack-sim: Safe attack simulation found 4 finding(s): 1 high, 3 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security, attack-sim
- Partial or flaky checks: runtime-profile, schema-quality
- Skipped checks: none
- Unsupported checks: prompts, resources
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
| Data to drop, as a map of MIME type to string value (e.g. {"text/plain": "hello", "text/uri-list": "https://example.com"}). | unknown | description_analysis | medium |
| url | unknown | tool_schema | high |
| The URL to navigate to | unknown | description_analysis | medium |
| browser_navigate | unknown | description_analysis | low |
| Only return requests whose URL matches this regexp (e.g. "/api/.*user"). | unknown | description_analysis | medium |
| url | unknown | tool_schema | high |
| URL to navigate to in the new tab, used for new. | unknown | description_analysis | medium |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-12T23:44:11.239Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 717.02 | All 7 conformance checks passed. |
| healthy | tools | pass | 2.85 | Advertised capability responded with the minimal expected shape (24 items). |
| review | runtime-profile | partial | 0.21 | Detected 7 potential egress target(s) and 21 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 1.38 | Found 5 quality finding(s) across 24 item(s): 0 warnings, 5 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |
| act now | attack-sim | fail | 1.05 | Safe attack simulation found 4 finding(s): 1 high, 3 medium, 0 low. |
| act now | security | fail | 0.89 | Found 6 security finding(s): 2 high, 2 medium, 2 low. |
| act now | security-lite | fail | 0.06 | Found 6 security finding(s): 2 high, 2 medium, 2 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 24 tool(s). (+4 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (24 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `24`
  - Identifiers: browser_close, browser_resize, browser_console_messages, browser_handle_dialog, browser_evaluate (+19 more)
  - Diagnostics: none

### runtime-profile — partial

Summary: Detected 7 potential egress target(s) and 21 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `28`
  - Identifiers: none
  - Diagnostics: Egress entries: 7, State mutations: 21, Confidence: high

### schema-quality — partial

Summary: Found 5 quality finding(s) across 24 item(s): 0 warnings, 5 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: browser_file_upload, browser_find, browser_run_code_unsafe, browser_snapshot, browser_wait_for
  - Diagnostics: [info] tool "browser_file_upload": Has properties but no 'required' array declared, [info] tool "browser_find": Has properties but no 'required' array declared, [info] tool "browser_run_code_unsafe": Has properties but no 'required' array declared (+2 more)

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

### attack-sim — fail

Summary: Safe attack simulation found 4 finding(s): 1 high, 3 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `4`
  - Identifiers: browser_evaluate, browser_navigate, browser_run_code_unsafe, browser_tabs
  - Diagnostics: [medium] Tool "browser_evaluate" combines broad parameters (filename) with destructive or non-read-only behavior., [medium] Tool "browser_navigate" combines broad parameters (url) with destructive or non-read-only behavior., [high] Tool "browser_run_code_unsafe" combines broad parameters (code, filename) with destructive or non-read-only behavior. (+1 more)

### security — fail

Summary: Found 6 security finding(s): 2 high, 2 medium, 2 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `6`
  - Identifiers: browser_close, browser_evaluate, browser_navigate_back, browser_run_code_unsafe
  - Diagnostics: [low] Tool "browser_close" has an empty schema but is marked as destructive., [high] Tool "browser_evaluate" name suggests command execution capability., [medium] Tool "browser_evaluate" accepts filesystem paths and has destructive capabilities. (+3 more)

### security-lite — fail

Summary: Found 6 security finding(s): 2 high, 2 medium, 2 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `6`
  - Identifiers: browser_close, browser_evaluate, browser_navigate_back, browser_run_code_unsafe
  - Diagnostics: [low] Tool "browser_close" has an empty schema but is marked as destructive., [high] Tool "browser_evaluate" name suggests command execution capability., [medium] Tool "browser_evaluate" accepts filesystem paths and has destructive capabilities. (+3 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-12T234410399Z_1a4faea8`
- Gate: `fail`
