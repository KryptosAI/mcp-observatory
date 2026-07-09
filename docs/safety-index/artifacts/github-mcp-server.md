# MCP Observatory Run Report

Generated at 2026-07-08T21:35:18.919Z

## Target and Environment Metadata

- Target: `github-mcp-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-github`
- Server: `github-mcp-server 0.6.2`
- Platform: `win32 10.0.26200`
- Node: `v24.15.0`

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
| pass | 8 | 2 | 0 | 4 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: attack-sim: Safe attack simulation found 5 finding(s): 0 high, 5 medium, 0 low.; schema-quality: Found 51 quality finding(s) across 26 item(s): 0 warnings, 51 info.; security: Found 1 security finding(s): 0 high, 1 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: security-lite, schema-quality, security, attack-sim
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Review the caveated checks next: security-lite, schema-quality, security, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 3.17 | All 7 conformance checks passed. |
| healthy | tools | pass | 4.37 | Advertised capability responded with the minimal expected shape (26 items). |
| review | attack-sim | partial | 2.75 | Safe attack simulation found 5 finding(s): 0 high, 5 medium, 0 low. |
| review | schema-quality | partial | 1.84 | Found 51 quality finding(s) across 26 item(s): 0 warnings, 51 info. |
| review | security | partial | 2.66 | Found 1 security finding(s): 0 high, 1 medium, 0 low. |
| review | security-lite | partial | 0.13 | Found 1 security finding(s): 0 high, 1 medium, 0 low. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.01 | Resources are not advertised by the target. |

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
- Run ID: `run_2026-07-08T213518919Z_6d8ffd44`
- Gate: `pass`
