# MCP Observatory Run Report

Generated at 2026-07-12T23:36:02.107Z

## Target and Environment Metadata

- Target: `notion-server`
- Adapter: `local-process`
- Command: `npx -y @notionhq/notion-mcp-server`
- Server: `Notion API 1.0.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 83/100 (B)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 87/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 9 | 5 | 0 | 2 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: attack-sim: Safe attack simulation found 1 finding(s): 0 high, 1 medium, 0 low.; schema-quality: Found 31 quality finding(s) across 24 item(s): 0 warnings, 31 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: schema-quality, attack-sim
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Review the caveated checks next: schema-quality, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **medium**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| If supplied, this endpoint will return a page of results starting after the cursor provided. If not supplied, this endpoint will return the first page of results. | unknown | description_analysis | medium |
| The text that the API compares page and database titles against. | unknown | description_analysis | medium |
| A `cursor` value returned in a previous response that If supplied, limits the response to results starting after the `cursor`. If not supplied, then the first page of results is returned. Refer to [pagination](https://developers.notion.com/reference/intro#pagination) for more details. | unknown | description_analysis | medium |
| If supplied, this endpoint will return a page of results starting after the cursor provided. If not supplied, this endpoint will return the first page of results. | unknown | description_analysis | medium |
| The content to be rendered on the new page, represented as an array of [block objects](https://developers.notion.com/reference/block). | unknown | description_analysis | medium |
| The icon of the new page. Either an [emoji object](https://developers.notion.com/reference/emoji-object) or an [external file object](https://developers.notion.com/reference/file-object).. | unknown | description_analysis | medium |
| The cover image of the new page, represented as a [file object](https://developers.notion.com/reference/file-object). | unknown | description_analysis | medium |
| Identifier for a page [property](https://developers.notion.com/reference/page#all-property-values) | unknown | description_analysis | medium |
| If supplied, this endpoint will return a page of results starting after the cursor provided. If not supplied, this endpoint will return the first page of results. | unknown | description_analysis | medium |
| Whether to include meeting note transcripts. When false (default), a placeholder with the meeting note URL is shown instead of the full transcript. | unknown | description_analysis | medium |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
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

_Analyzed at 2026-07-12T23:36:02.866Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 128.87 | All 7 conformance checks passed. |
| healthy | runtime-profile | pass | 0.16 | Detected 10 potential egress target(s) and 21 potential state mutation(s) with low confidence. |
| healthy | security | pass | 1.31 | No security issues detected. |
| healthy | security-lite | pass | 0.05 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 1.65 | Advertised capability responded with the minimal expected shape (24 items). |
| review | attack-sim | partial | 2.84 | Safe attack simulation found 1 finding(s): 0 high, 1 medium, 0 low. |
| review | schema-quality | partial | 2.29 | Found 31 quality finding(s) across 24 item(s): 0 warnings, 31 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |

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

### runtime-profile — pass

Summary: Detected 10 potential egress target(s) and 21 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `31`
  - Identifiers: none
  - Diagnostics: Egress entries: 10, State mutations: 21, Confidence: medium

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

Summary: Advertised capability responded with the minimal expected shape (24 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `24`
  - Identifiers: API-get-user, API-get-users, API-get-self, API-post-search, API-get-block-children (+19 more)
  - Diagnostics: none

### attack-sim — partial

Summary: Safe attack simulation found 1 finding(s): 0 high, 1 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: API-post-search
  - Diagnostics: [medium] Tool "API-post-search" combines broad parameters (query) with destructive or non-read-only behavior.

### schema-quality — partial

Summary: Found 31 quality finding(s) across 24 item(s): 0 warnings, 31 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `31`
  - Identifiers: API-get-user, API-post-search, API-update-a-block, API-patch-page, API-post-page (+7 more)
  - Diagnostics: [info] tool "API-get-user": Property 'user_id' missing description, [info] tool "API-post-search": Property 'sort' missing description, [info] tool "API-post-search": Property 'filter' missing description (+28 more)

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
- Run ID: `run_2026-07-12T233602107Z_8e6a1ca9`
- Gate: `pass`
