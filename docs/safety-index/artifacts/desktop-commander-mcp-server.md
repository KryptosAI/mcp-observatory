# MCP Observatory Run Report

Generated at 2026-07-15T17:57:04.320Z

## Target and Environment Metadata

- Target: `desktop-commander-mcp-server`
- Adapter: `local-process`
- Command: `npx -y @wonderwhy-er/desktop-commander`
- Server: `desktop-commander 0.2.46`
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
- Top risks: runtime-profile: Detected 10 potential egress target(s) and 39 potential state mutation(s) with high confidence.; schema-quality: Found 76 quality finding(s) across 28 item(s): 0 warnings, 76 info.; attack-sim: Safe attack simulation found 7 finding(s): 1 high, 6 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security, attack-sim
- Partial or flaky checks: runtime-profile, schema-quality
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Start with the failing checks: security-lite, security, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| start_search | unknown | description_analysis | low |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| give_feedback_to_desktop_commander | unknown | description_analysis | low |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| network | execute | specific_path | tool_schema |
| network | execute | specific_path | tool_schema |
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

_Analyzed at 2026-07-15T17:57:05.813Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 15.18 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.25 | Advertised capability responded with the minimal expected shape (0 items). |
| healthy | resources | pass | 0.48 | Advertised capability responded with the minimal expected shape (2 items). |
| healthy | tools | pass | 15.52 | Advertised capability responded with the minimal expected shape (26 items). |
| review | runtime-profile | partial | 0.39 | Detected 10 potential egress target(s) and 39 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 12.14 | Found 76 quality finding(s) across 28 item(s): 0 warnings, 76 info. |
| act now | attack-sim | fail | 1.53 | Safe attack simulation found 7 finding(s): 1 high, 6 medium, 0 low. |
| act now | security | fail | 1.08 | Found 6 security finding(s): 2 high, 3 medium, 1 low. |
| act now | security-lite | fail | 0.21 | Found 6 security finding(s): 2 high, 3 medium, 1 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 26 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (0 items).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: (node:31922) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead., (Use `node --trace-deprecation ...` to show where the warning was created)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (2 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: ui://desktop-commander/file-preview, ui://desktop-commander/config-editor
  - Diagnostics: (node:31922) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead., (Use `node --trace-deprecation ...` to show where the warning was created)
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: (node:31922) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead., (Use `node --trace-deprecation ...` to show where the warning was created)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (26 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `26`
  - Identifiers: get_config, set_config_value, read_file, read_multiple_files, write_file (+21 more)
  - Diagnostics: (node:31922) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead., (Use `node --trace-deprecation ...` to show where the warning was created)

### runtime-profile — partial

Summary: Detected 10 potential egress target(s) and 39 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `49`
  - Identifiers: none
  - Diagnostics: Egress entries: 10, State mutations: 39, Confidence: high

### schema-quality — partial

Summary: Found 76 quality finding(s) across 28 item(s): 0 warnings, 76 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `76`
  - Identifiers: get_config, set_config_value, read_file, read_multiple_files, write_file (+16 more)
  - Diagnostics: [info] tool "get_config": Has properties but no 'required' array declared, [info] tool "get_config": Property 'origin' missing description, [info] tool "set_config_value": Property 'key' missing description (+73 more)

### attack-sim — fail

Summary: Safe attack simulation found 7 finding(s): 1 high, 6 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: write_file, write_pdf, create_directory, start_search, start_process (+1 more)
  - Diagnostics: [medium] Tool "write_file" combines broad parameters (path) with destructive or non-read-only behavior., [medium] Tool "write_pdf" combines broad parameters (path) with destructive or non-read-only behavior., [medium] Tool "create_directory" combines broad parameters (path) with destructive or non-read-only behavior. (+4 more)

### security — fail

Summary: Found 6 security finding(s): 2 high, 3 medium, 1 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `6`
  - Identifiers: get_config, write_file, write_pdf, create_directory, start_process (+1 more)
  - Diagnostics: [high] Tool "get_config" description suggests command execution: "
                        Get the complete server configuration as JSON. Config includes fields for:
"., [medium] Tool "write_file" accepts filesystem paths and has destructive capabilities., [medium] Tool "write_pdf" accepts filesystem paths and has destructive capabilities. (+3 more)

### security-lite — fail

Summary: Found 6 security finding(s): 2 high, 3 medium, 1 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `6`
  - Identifiers: get_config, write_file, write_pdf, create_directory, start_process (+1 more)
  - Diagnostics: [high] Tool "get_config" description suggests command execution: "
                        Get the complete server configuration as JSON. Config includes fields for:
"., [medium] Tool "write_file" accepts filesystem paths and has destructive capabilities., [medium] Tool "write_pdf" accepts filesystem paths and has destructive capabilities. (+3 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T175704320Z_20e24cd6`
- Gate: `fail`
