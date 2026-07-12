# MCP Observatory Run Report

Generated at 2026-07-12T23:35:46.037Z

## Target and Environment Metadata

- Target: `github-mcp-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-github`
- Server: `github-mcp-server 0.6.2`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 77/100 (C)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 60/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 9 | 2 | 0 | 5 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: attack-sim: Safe attack simulation found 5 finding(s): 0 high, 5 medium, 0 low.; runtime-profile: Detected 0 potential egress target(s) and 27 potential state mutation(s) with high confidence.; schema-quality: Found 51 quality finding(s) across 26 item(s): 0 warnings, 51 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: security-lite, runtime-profile, schema-quality, security, attack-sim
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Review the caveated checks next: security-lite, runtime-profile, schema-quality, security, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | tool_schema |
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

_Analyzed at 2026-07-12T23:35:46.932Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 1.15 | All 7 conformance checks passed. |
| healthy | tools | pass | 3.08 | Advertised capability responded with the minimal expected shape (26 items). |
| review | attack-sim | partial | 0.89 | Safe attack simulation found 5 finding(s): 0 high, 5 medium, 0 low. |
| review | runtime-profile | partial | 0.23 | Detected 0 potential egress target(s) and 27 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 0.54 | Found 51 quality finding(s) across 26 item(s): 0 warnings, 51 info. |
| review | security | partial | 0.69 | Found 1 security finding(s): 0 high, 1 medium, 0 low. |
| review | security-lite | partial | 0.06 | Found 1 security finding(s): 0 high, 1 medium, 0 low. |
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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 26 tool(s). (+4 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (26 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `26`
  - Identifiers: create_or_update_file, search_repositories, create_repository, get_file_contents, push_files (+21 more)
  - Diagnostics: GitHub MCP Server running on stdio

### attack-sim — partial

Summary: Safe attack simulation found 5 finding(s): 0 high, 5 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: create_or_update_file, create_issue, create_pull_request, update_issue, create_pull_request_review
  - Diagnostics: [medium] Tool "create_or_update_file" combines broad parameters (path) with destructive or non-read-only behavior., [medium] Tool "create_issue" combines broad parameters (body) with destructive or non-read-only behavior., [medium] Tool "create_pull_request" combines broad parameters (body) with destructive or non-read-only behavior. (+2 more)

### runtime-profile — partial

Summary: Detected 0 potential egress target(s) and 27 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `27`
  - Identifiers: none
  - Diagnostics: Egress entries: 0, State mutations: 27, Confidence: high

### schema-quality — partial

Summary: Found 51 quality finding(s) across 26 item(s): 0 warnings, 51 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `51`
  - Identifiers: create_issue, list_commits, list_issues, update_issue, add_issue_comment (+4 more)
  - Diagnostics: [info] tool "create_issue": Property 'owner' missing description, [info] tool "create_issue": Property 'repo' missing description, [info] tool "create_issue": Property 'title' missing description (+48 more)

### security — partial

Summary: Found 1 security finding(s): 0 high, 1 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: create_or_update_file
  - Diagnostics: [medium] Tool "create_or_update_file" accepts filesystem paths and has destructive capabilities.

### security-lite — partial

Summary: Found 1 security finding(s): 0 high, 1 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: create_or_update_file
  - Diagnostics: [medium] Tool "create_or_update_file" accepts filesystem paths and has destructive capabilities.

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
- Run ID: `run_2026-07-12T233546037Z_a6a444a4`
- Gate: `pass`
