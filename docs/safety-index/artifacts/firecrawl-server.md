# MCP Observatory Run Report

Generated at 2026-07-15T17:55:50.600Z

## Target and Environment Metadata

- Target: `firecrawl-server`
- Adapter: `local-process`
- Command: `npx -y firecrawl-mcp`
- Server: `firecrawl-fastmcp 3.22.3`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 53/100 (F)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 60/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 0/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 1 | 3 | 3 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: conformance: 6/7 conformance checks passed, 1 failed.; runtime-profile: Detected 21 potential egress target(s) and 16 potential state mutation(s) with high confidence.; schema-quality: Found 147 quality finding(s) across 26 item(s): 0 warnings, 147 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security, attack-sim
- Partial or flaky checks: runtime-profile, conformance, schema-quality
- Skipped checks: none
- Unsupported checks: prompts, resources
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
| url | unknown | tool_schema | high |
| firecrawl_scrape | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| firecrawl_map | unknown | description_analysis | low |
| firecrawl_search | unknown | description_analysis | low |
| firecrawl_search_feedback | unknown | description_analysis | low |
| endpoint | unknown | tool_schema | high |
| url | unknown | tool_schema | high |
| firecrawl_feedback | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| webhook | unknown | tool_schema | high |
| firecrawl_crawl | unknown | description_analysis | low |
| firecrawl_extract | unknown | description_analysis | low |
| firecrawl_agent | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| firecrawl_interact | unknown | description_analysis | low |
| firecrawl_parse | unknown | description_analysis | low |
| firecrawl_monitor_create | unknown | description_analysis | low |
| firecrawl_monitor_update | unknown | description_analysis | low |
| firecrawl_monitor_check | unknown | description_analysis | low |
| firecrawl_research_search_github | unknown | description_analysis | low |

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

_Analyzed at 2026-07-15T17:55:51.554Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | tools | pass | 7.80 | Advertised capability responded with the minimal expected shape (26 items). |
| review | conformance | partial | 2.98 | 6/7 conformance checks passed, 1 failed. |
| review | runtime-profile | partial | 0.37 | Detected 21 potential egress target(s) and 16 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 1.06 | Found 147 quality finding(s) across 26 item(s): 0 warnings, 147 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |
| act now | attack-sim | fail | 1.90 | Safe attack simulation found 9 finding(s): 1 high, 8 medium, 0 low. |
| act now | security | fail | 1.08 | Found 1 security finding(s): 1 high, 0 medium, 0 low. |
| act now | security-lite | fail | 0.41 | Found 1 security finding(s): 1 high, 0 medium, 0 low. |

## Evidence Snippets

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (26 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `26`
  - Identifiers: firecrawl_scrape, firecrawl_map, firecrawl_search, firecrawl_search_feedback, firecrawl_feedback (+21 more)
  - Diagnostics: No FIRECRAWL_API_KEY or FIRECRAWL_API_URL set — running in keyless mode. firecrawl_scrape and firecrawl_search are free (rate-limited per IP) against the Firecrawl cloud; other tools require an API key (get one free at https://firecrawl.dev).

### conformance — partial

Summary: 6/7 conformance checks passed, 1 failed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `false`
  - Item count: `7`
  - Identifiers: tool-response-content
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 26 tool(s). (+4 more)

### runtime-profile — partial

Summary: Detected 21 potential egress target(s) and 16 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `37`
  - Identifiers: none
  - Diagnostics: Egress entries: 21, State mutations: 16, Confidence: high

### schema-quality — partial

Summary: Found 147 quality finding(s) across 26 item(s): 0 warnings, 147 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `147`
  - Identifiers: firecrawl_scrape, firecrawl_map, firecrawl_search, firecrawl_search_feedback, firecrawl_feedback (+19 more)
  - Diagnostics: [info] tool "firecrawl_scrape": Property 'url' missing description, [info] tool "firecrawl_scrape": Property 'formats' missing description, [info] tool "firecrawl_scrape": Property 'jsonOptions' missing description (+144 more)

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

Summary: Safe attack simulation found 9 finding(s): 1 high, 8 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `9`
  - Identifiers: firecrawl_scrape, firecrawl_search, firecrawl_feedback, firecrawl_crawl, firecrawl_interact (+4 more)
  - Diagnostics: [medium] Tool "firecrawl_scrape" combines broad parameters (url) with destructive or non-read-only behavior., [medium] Tool "firecrawl_search" combines broad parameters (query) with destructive or non-read-only behavior., [medium] Tool "firecrawl_feedback" combines broad parameters (endpoint, url) with destructive or non-read-only behavior. (+6 more)

### security — fail

Summary: Found 1 security finding(s): 1 high, 0 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: firecrawl_interact
  - Diagnostics: [high] Tool "firecrawl_interact" has parameter "code" which may allow arbitrary command execution.

### security-lite — fail

Summary: Found 1 security finding(s): 1 high, 0 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: firecrawl_interact
  - Diagnostics: [high] Tool "firecrawl_interact" has parameter "code" which may allow arbitrary command execution.

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T175550600Z_50ebfa50`
- Gate: `fail`
