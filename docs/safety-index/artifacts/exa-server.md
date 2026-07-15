# MCP Observatory Run Report

Generated at 2026-07-15T22:33:43.871Z

## Target and Environment Metadata

- Target: `exa-server`
- Adapter: `local-process`
- Command: `npx -y exa-mcp-server`
- Server: `exa-search-server 3.2.1`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 97/100 (A)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 100/100 | 20% |
| Security | 87/100 | 20% |
| Reliability | 100/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 9 | 8 | 0 | 1 | 0 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: attack-sim: Safe attack simulation found 1 finding(s): 0 high, 1 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: attack-sim
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Review the caveated checks next: attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **medium**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| web_fetch_exa | unknown | description_analysis | low |

_Analyzed at 2026-07-15T22:33:44.639Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 0.88 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.25 | Advertised capability responded with the minimal expected shape (1 item). |
| healthy | resources | pass | 0.66 | Advertised capability responded with the minimal expected shape (1 items). |
| healthy | runtime-profile | pass | 0.05 | Detected 1 potential egress target(s) and 0 potential state mutation(s) with low confidence. |
| healthy | schema-quality | pass | 0.67 | All 4 item(s) have good schema quality. |
| healthy | security | pass | 0.27 | No security issues detected. |
| healthy | security-lite | pass | 0.02 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 1.61 | Advertised capability responded with the minimal expected shape (2 items). |
| review | attack-sim | partial | 0.49 | Safe attack simulation found 1 finding(s): 0 high, 1 medium, 0 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 2 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (1 item).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: web_search_help
  - Diagnostics: [EXA-MCP-DEBUG] Server initialized with modern MCP SDK and Smithery CLI support, (node:78910) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead., (Use `node --trace-deprecation ...` to show where the warning was created) (+2 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (1 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: exa://tools/list
  - Diagnostics: [EXA-MCP-DEBUG] Server initialized with modern MCP SDK and Smithery CLI support, (node:78910) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead., (Use `node --trace-deprecation ...` to show where the warning was created) (+2 more)
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: [EXA-MCP-DEBUG] Server initialized with modern MCP SDK and Smithery CLI support, (node:78910) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead., (Use `node --trace-deprecation ...` to show where the warning was created) (+2 more)

### runtime-profile — pass

Summary: Detected 1 potential egress target(s) and 0 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: none
  - Diagnostics: Egress entries: 1, State mutations: 0, Confidence: medium

### schema-quality — pass

Summary: All 4 item(s) have good schema quality.

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

Summary: Advertised capability responded with the minimal expected shape (2 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: web_search_exa, web_fetch_exa
  - Diagnostics: [EXA-MCP-DEBUG] Server initialized with modern MCP SDK and Smithery CLI support, (node:78910) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead., (Use `node --trace-deprecation ...` to show where the warning was created) (+2 more)

### attack-sim — partial

Summary: Safe attack simulation found 1 finding(s): 0 high, 1 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: web_search_exa
  - Diagnostics: [medium] Tool "web_search_exa" combines broad parameters (query) with destructive or non-read-only behavior.

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T223343871Z_76d97aab`
- Gate: `pass`
