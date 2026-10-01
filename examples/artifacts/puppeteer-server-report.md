# MCP Observatory Run Report

Generated at 2026-09-02T04:14:29.362Z

## Target and Environment Metadata

- Target: `puppeteer-server`
- Adapter: `local-process`
- Command: `npx -y puppeteer-mcp-server`
- Server: `example-servers/puppeteer 0.1.0`
- Platform: `darwin 25.5.0`
- Node: `v22.23.1`

## Executive Summary

**Health Score: 89/100 (B)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 83/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 7 | 4 | 0 | 2 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: runtime-profile: Detected 3 potential egress target(s) and 2 potential state mutation(s) with high confidence.; schema-quality: Found 2 quality finding(s) across 9 item(s): 1 warnings, 1 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: runtime-profile, schema-quality
- Skipped checks: none
- Unsupported checks: prompts
- Suggested next step: Fix: Review the check output and update the MCP server or target configuration before release.
- CI next step: `Add CI: npx -y @kryptosai/mcp-observatory@latest setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| Optional URL of the target tab to connect to. If not provided, connects to the first available tab. | unknown | description_analysis | medium |
| url | unknown | tool_schema | high |
| puppeteer_navigate | unknown | description_analysis | low |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-09-02T04:14:34.919Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 2353.33 | All 7 conformance checks passed. |
| healthy | resources | pass | 0.73 | Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported. |
| healthy | security-lite | pass | 0.04 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 0.54 | Advertised capability responded with the minimal expected shape (8 items). |
| review | runtime-profile | partial | 0.14 | Detected 3 potential egress target(s) and 2 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 0.76 | Found 2 quality finding(s) across 9 item(s): 1 warnings, 1 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 8 tool(s). (+4 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported.

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: console://logs
  - Diagnostics: npm warn deprecated puppeteer@23.11.1: < 24.15.0 is no longer supported
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: MCP error -32601: Method not found, npm warn deprecated puppeteer@23.11.1: < 24.15.0 is no longer supported

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
  - Diagnostics: npm warn deprecated puppeteer@23.11.1: < 24.15.0 is no longer supported

### runtime-profile — partial

Summary: Detected 3 potential egress target(s) and 2 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: none
  - Diagnostics: Egress entries: 3, State mutations: 2, Confidence: high

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
- Run ID: `run_2026-09-02T041429362Z_fb90d5ca`
- Gate: `pass`
