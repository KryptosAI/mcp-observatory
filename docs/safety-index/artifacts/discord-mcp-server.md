# MCP Observatory Run Report

Generated at 2026-07-15T17:29:45.563Z

## Target and Environment Metadata

- Target: `mcp-server-discord`
- Adapter: `local-process`
- Command: `npx -y mcp-server-discord`
- Server: `MCP-Discord 1.0.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 85/100 (B)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 8 | 5 | 0 | 1 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: schema-quality: Found 63 quality finding(s) across 22 item(s): 0 warnings, 63 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: schema-quality
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Review the caveated checks next: schema-quality.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 1.96 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | conformance | pass | 2.31 | All 7 conformance checks passed. |
| healthy | runtime-profile | pass | 1.23 | Detected 4 potential egress target(s) and 10 potential state mutation(s) with low confidence. |
| healthy | security-lite | pass | 0.58 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 1.89 | Advertised capability responded with the minimal expected shape (22 items). |
| review | schema-quality | partial | 0.62 | Found 63 quality finding(s) across 22 item(s): 0 warnings, 63 info. |
| confirm intent | prompts | unsupported | 0.01 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |

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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 22 tool(s). (+4 more)

### runtime-profile — pass

Summary: Detected 4 potential egress target(s) and 10 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `14`
  - Identifiers: none
  - Diagnostics: Egress entries: 4, State mutations: 10, Confidence: medium

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

Summary: Advertised capability responded with the minimal expected shape (22 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `22`
  - Identifiers: discord_create_category, discord_edit_category, discord_delete_category, discord_login, discord_send (+17 more)
  - Diagnostics: none

### schema-quality — partial

Summary: Found 63 quality finding(s) across 22 item(s): 0 warnings, 63 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `63`
  - Identifiers: discord_create_category, discord_edit_category, discord_delete_category, discord_login, discord_send (+17 more)
  - Diagnostics: [info] tool "discord_create_category": Property 'guildId' missing description, [info] tool "discord_create_category": Property 'name' missing description, [info] tool "discord_create_category": Property 'position' missing description (+60 more)

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
- Run ID: `run_2026-07-15T172945563Z_da7ae263`
- Gate: `pass`
