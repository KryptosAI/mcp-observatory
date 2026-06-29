# MCP Observatory Run Report

Generated at 2026-06-24T02:07:32.035Z

## Target and Environment Metadata

- Target: `playwright-mcp-server`
- Adapter: `local-process`
- Command: `npx -y @playwright/mcp`
- Server: `Playwright 1.61.0-alpha-1781023400000`
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
| fail | 7 | 2 | 2 | 1 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: schema-quality: Found 4 quality finding(s) across 23 item(s): 0 warnings, 4 info.; security: Found 6 security finding(s): 2 high, 2 medium, 2 low.; security-lite: Found 6 security finding(s): 2 high, 2 medium, 2 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security
- Partial or flaky checks: schema-quality
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Start with the failing checks: security-lite, security.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 3062.42 | All 7 conformance checks passed. |
| healthy | tools | pass | 59.04 | Advertised capability responded with the minimal expected shape (23 items). |
| review | schema-quality | partial | 7.27 | Found 4 quality finding(s) across 23 item(s): 0 warnings, 4 info. |
| confirm intent | prompts | unsupported | 0.01 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.01 | Resources are not advertised by the target. |
| act now | security | fail | 25.69 | Found 6 security finding(s): 2 high, 2 medium, 2 low. |
| act now | security-lite | fail | 0.25 | Found 6 security finding(s): 2 high, 2 medium, 2 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 23 tool(s). (+4 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (23 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `23`
  - Identifiers: browser_close, browser_resize, browser_console_messages, browser_handle_dialog, browser_evaluate (+18 more)
  - Diagnostics: none

### schema-quality — partial

Summary: Found 4 quality finding(s) across 23 item(s): 0 warnings, 4 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `4`
  - Identifiers: browser_file_upload, browser_run_code_unsafe, browser_snapshot, browser_wait_for
  - Diagnostics: [info] tool "browser_file_upload": Has properties but no 'required' array declared, [info] tool "browser_run_code_unsafe": Has properties but no 'required' array declared, [info] tool "browser_snapshot": Has properties but no 'required' array declared (+1 more)

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
- Run ID: `run_2026-06-24T020732035Z_b86ac3a9`
- Gate: `fail`
