# MCP Observatory Run Report

Generated at 2026-07-15T22:35:43.443Z

## Target and Environment Metadata

- Target: `indian-food-nutrition-mcp`
- Adapter: `local-process`
- Command: `npx -y indian-food-nutrition-mcp`
- Server: `indian-food-nutrition-mcp 1.0.2`
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
- Top risks: runtime-profile: Detected 3 potential egress target(s) and 3 potential state mutation(s) with high confidence.; schema-quality: Found 12 quality finding(s) across 7 item(s): 0 warnings, 12 info.
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
| url | unknown | tool_schema | high |
| Direct http(s) URL of the food image. | unknown | description_analysis | medium |
| fetch_image | unknown | description_analysis | low |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |

_Analyzed at 2026-07-15T22:35:46.524Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 0.43 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | conformance | pass | 2.14 | All 7 conformance checks passed. |
| healthy | security | pass | 0.44 | No security issues detected. |
| healthy | security-lite | pass | 0.03 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 2.27 | Advertised capability responded with the minimal expected shape (7 items). |
| review | runtime-profile | partial | 0.10 | Detected 3 potential egress target(s) and 3 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 0.45 | Found 12 quality finding(s) across 7 item(s): 0 warnings, 12 info. |
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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 7 tool(s). (+4 more)

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

Summary: Advertised capability responded with the minimal expected shape (7 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: search_food, log_meal, get_day, get_history, edit_entry (+2 more)
  - Diagnostics: npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available., nutrition-mcp: optional dataset indb-recipes.csv not present, skipping (see DATA_SOURCES.md)., indian-food-nutrition-mcp running (8335 foods). CSV mirror: /Users/williamweishuhn/.nutrition-mcp/meals.csv. Tools: search_food, log_meal, get_day, get_history, edit_entry, delete_entry, fetch_image.

### runtime-profile — partial

Summary: Detected 3 potential egress target(s) and 3 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `6`
  - Identifiers: none
  - Diagnostics: Egress entries: 3, State mutations: 3, Confidence: high

### schema-quality — partial

Summary: Found 12 quality finding(s) across 7 item(s): 0 warnings, 12 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `12`
  - Identifiers: get_day, get_history, edit_entry
  - Diagnostics: [info] tool "get_day": Has properties but no 'required' array declared, [info] tool "get_history": Has properties but no 'required' array declared, [info] tool "edit_entry": Property 'description' missing description (+9 more)

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
- Run ID: `run_2026-07-15T223543443Z_d044d407`
- Gate: `pass`
