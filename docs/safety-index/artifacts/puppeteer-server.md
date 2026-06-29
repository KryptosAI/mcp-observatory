# MCP Observatory Run Report

Generated at 2026-06-24T02:07:30.285Z

## Target and Environment Metadata

- Target: `puppeteer-server`
- Adapter: `local-process`
- Command: `npx -y puppeteer-mcp-server`
- Server: `example-servers/puppeteer 0.1.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 77/100 (C)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 60/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 83/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 7 | 4 | 0 | 2 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: conformance: 6/7 conformance checks passed, 1 failed.; schema-quality: Found 2 quality finding(s) across 9 item(s): 1 warnings, 1 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: conformance, schema-quality
- Skipped checks: none
- Unsupported checks: prompts
- Suggested next step: Review the caveated checks next: conformance, schema-quality.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | resources | pass | 0.86 | Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported. |
| healthy | security | pass | 0.18 | No security issues detected. |
| healthy | security-lite | pass | 0.04 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 0.41 | Advertised capability responded with the minimal expected shape (8 items). |
| review | conformance | partial | 2.42 | 6/7 conformance checks passed, 1 failed. |
| review | schema-quality | partial | 0.33 | Found 2 quality finding(s) across 9 item(s): 1 warnings, 1 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |

## Evidence Snippets

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

Summary: Advertised capability responded with the minimal expected shape (8 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `8`
  - Identifiers: puppeteer_connect_active_tab, puppeteer_navigate, puppeteer_screenshot, puppeteer_click, puppeteer_fill (+3 more)
  - Diagnostics: none

### conformance — partial

Summary: 6/7 conformance checks passed, 1 failed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `false`
  - Item count: `7`
  - Identifiers: tool-response-content
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 8 tool(s). (+4 more)

### schema-quality — partial

Summary: Found 2 quality finding(s) across 9 item(s): 1 warnings, 1 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: puppeteer_navigate, Browser console logs
  - Diagnostics: [info] tool "puppeteer_navigate": Property 'url' missing description, [warning] resource "Browser console logs": Missing description

### prompts — unsupported

Summary: Prompts are not advertised by the target.

- Endpoint: `prompts/list`
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
- Run ID: `run_2026-06-24T020730285Z_85ad0698`
- Gate: `pass`
