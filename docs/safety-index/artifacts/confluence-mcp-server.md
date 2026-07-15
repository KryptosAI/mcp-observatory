# MCP Observatory Run Report

Generated at 2026-07-15T17:30:20.307Z

## Target and Environment Metadata

- Target: `confluence-mcp-server`
- Adapter: `local-process`
- Command: `npx -y confluence-mcp-server`
- Server: `confluence-mcp-server 1.3.3`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 71/100 (C)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 30/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 8 | 2 | 1 | 3 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: attack-sim: Safe attack simulation found 1 finding(s): 0 high, 1 medium, 0 low.; runtime-profile: Detected 6 potential egress target(s) and 44 potential state mutation(s) with high confidence.; schema-quality: Found 3 quality finding(s) across 25 item(s): 0 warnings, 3 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite
- Partial or flaky checks: runtime-profile, schema-quality, attack-sim
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Start with the failing checks: security-lite.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 20.89 | All 7 conformance checks passed. |
| healthy | tools | pass | 43.93 | Advertised capability responded with the minimal expected shape (25 items). |
| review | attack-sim | partial | 4.33 | Safe attack simulation found 1 finding(s): 0 high, 1 medium, 0 low. |
| review | runtime-profile | partial | 3.63 | Detected 6 potential egress target(s) and 44 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 1.45 | Found 3 quality finding(s) across 25 item(s): 0 warnings, 3 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |
| act now | security-lite | fail | 0.76 | Found 1 security finding(s): 1 high, 0 medium, 0 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 25 tool(s). (+4 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (25 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `25`
  - Identifiers: confluence_configure_connection, confluence_get_connection_status, confluence_get_current_user, confluence_search_pages, confluence_execute_cql_search (+20 more)
  - Diagnostics: [confluence-mcp] No CONF_* connection env vars found; starting unconfigured., [confluence-mcp] Server running on stdio

### attack-sim — partial

Summary: Safe attack simulation found 1 finding(s): 0 high, 1 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: confluence_upload_attachment
  - Diagnostics: [medium] Tool "confluence_upload_attachment" combines broad parameters (filePath, fileName) with destructive or non-read-only behavior.

### runtime-profile — partial

Summary: Detected 6 potential egress target(s) and 44 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `50`
  - Identifiers: none
  - Diagnostics: Egress entries: 6, State mutations: 44, Confidence: high

### schema-quality — partial

Summary: Found 3 quality finding(s) across 25 item(s): 0 warnings, 3 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `3`
  - Identifiers: confluence_configure_connection, confluence_search_pages, confluence_list_pending_page_updates
  - Diagnostics: [info] tool "confluence_configure_connection": Has properties but no 'required' array declared, [info] tool "confluence_search_pages": Has properties but no 'required' array declared, [info] tool "confluence_list_pending_page_updates": Has properties but no 'required' array declared

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

### security-lite — fail

Summary: Found 1 security finding(s): 1 high, 0 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: confluence_execute_cql_search
  - Diagnostics: [high] Tool "confluence_execute_cql_search" name suggests command execution capability.

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T173020307Z_5defa575`
- Gate: `fail`
