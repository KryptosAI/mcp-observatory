# MCP Observatory Run Report

Generated at 2026-07-22T21:36:37.089Z

## Target and Environment Metadata

- Target: `browsermcp-server`
- Adapter: `local-process`
- Command: `npx -y @browsermcp/mcp`
- Server: `Browser MCP 0.1.3`
- Platform: `darwin 25.5.0`
- Node: `v22.23.1`

## Executive Summary

**Health Score: 97/100 (A)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 100/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 83/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 9 | 7 | 0 | 1 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: runtime-profile: Detected 3 potential egress target(s) and 0 potential state mutation(s) with high confidence.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: runtime-profile
- Skipped checks: none
- Unsupported checks: prompts
- Suggested next step: Review the caveated checks next: runtime-profile.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| url | unknown | tool_schema | high |
| The URL to navigate to | unknown | description_analysis | medium |
| browser_navigate | unknown | description_analysis | low |

_Analyzed at 2026-07-22T21:36:38.818Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 0.52 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | conformance | pass | 1.75 | All 7 conformance checks passed. |
| healthy | resources | pass | 0.57 | Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported. |
| healthy | schema-quality | pass | 0.42 | All 12 item(s) have good schema quality. |
| healthy | security | pass | 0.15 | No security issues detected. |
| healthy | security-lite | pass | 0.03 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 1.07 | Advertised capability responded with the minimal expected shape (12 items). |
| review | runtime-profile | partial | 0.09 | Detected 3 potential egress target(s) and 0 potential state mutation(s) with high confidence. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |

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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 12 tool(s). (+4 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported.

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: MCP error -32601: Method not found

### schema-quality — pass

Summary: All 12 item(s) have good schema quality.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

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

Summary: Advertised capability responded with the minimal expected shape (12 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `12`
  - Identifiers: browser_navigate, browser_go_back, browser_go_forward, browser_snapshot, browser_click (+7 more)
  - Diagnostics: none

### runtime-profile — partial

Summary: Detected 3 potential egress target(s) and 0 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `3`
  - Identifiers: none
  - Diagnostics: Egress entries: 3, State mutations: 0, Confidence: high

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
- Run ID: `run_2026-07-22T213637089Z_47d74000`
- Gate: `pass`
