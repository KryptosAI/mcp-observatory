# MCP Observatory Run Report

Generated at 2026-07-06T19:49:57.956Z

## Target and Environment Metadata

- Target: `executeautomation-playwright-server`
- Adapter: `local-process`
- Command: `npx -y @executeautomation/playwright-mcp-server`
- Server: `playwright-mcp 1.0.11`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 69/100 (D)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 0/100 | 20% |
| Reliability | 83/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 8 | 3 | 3 | 1 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: schema-quality: Found 1 quality finding(s) across 34 item(s): 1 warnings, 0 info.; attack-sim: Safe attack simulation found 6 finding(s): 1 high, 5 medium, 0 low.; security: Found 1 security finding(s): 1 high, 0 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security, attack-sim
- Partial or flaky checks: schema-quality
- Skipped checks: none
- Unsupported checks: prompts
- Suggested next step: Start with the failing checks: security-lite, security, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 2.29 | All 7 conformance checks passed. |
| healthy | resources | pass | 0.61 | Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported. |
| healthy | tools | pass | 1.18 | Advertised capability responded with the minimal expected shape (33 items). |
| review | schema-quality | partial | 0.62 | Found 1 quality finding(s) across 34 item(s): 1 warnings, 0 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| act now | attack-sim | fail | 1.44 | Safe attack simulation found 6 finding(s): 1 high, 5 medium, 0 low. |
| act now | security | fail | 0.29 | Found 1 security finding(s): 1 high, 0 medium, 0 low. |
| act now | security-lite | fail | 0.06 | Found 1 security finding(s): 1 high, 0 medium, 0 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 33 tool(s). (+4 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported.

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: console://logs
  - Diagnostics: none
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: MCP error -32601: Method not found

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (33 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `33`
  - Identifiers: start_codegen_session, end_codegen_session, get_codegen_session, clear_codegen_session, playwright_navigate (+28 more)
  - Diagnostics: none

### schema-quality — partial

Summary: Found 1 quality finding(s) across 34 item(s): 1 warnings, 0 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: Browser console logs
  - Diagnostics: [warning] resource "Browser console logs": Missing description

### prompts — unsupported

Summary: Prompts are not advertised by the target.

- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### attack-sim — fail

Summary: Safe attack simulation found 6 finding(s): 1 high, 5 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `6`
  - Identifiers: playwright_upload_file, playwright_evaluate, playwright_post, playwright_put, playwright_patch (+1 more)
  - Diagnostics: [medium] Tool "playwright_upload_file" combines broad parameters (filePath) with destructive or non-read-only behavior., [high] Tool "playwright_evaluate" combines broad parameters (script) with destructive or non-read-only behavior., [medium] Tool "playwright_post" combines broad parameters (url, headers) with destructive or non-read-only behavior. (+3 more)

### security — fail

Summary: Found 1 security finding(s): 1 high, 0 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: playwright_evaluate
  - Diagnostics: [high] Tool "playwright_evaluate" has parameter "script" which may allow arbitrary command execution.

### security-lite — fail

Summary: Found 1 security finding(s): 1 high, 0 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: playwright_evaluate
  - Diagnostics: [high] Tool "playwright_evaluate" has parameter "script" which may allow arbitrary command execution.

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-06T194957955Z_4eaf8a90`
- Gate: `fail`
