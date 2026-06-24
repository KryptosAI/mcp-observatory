# MCP Observatory Run Report

Generated at 2026-06-24T02:07:25.699Z

## Target and Environment Metadata

- Target: `promptopia-server`
- Adapter: `local-process`
- Command: `npx -y promptopia-mcp`
- Server: `promptopia-mcp 1.1.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

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
| pass | 7 | 5 | 0 | 1 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: schema-quality: Found 1 quality finding(s) across 8 item(s): 0 warnings, 1 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: schema-quality
- Skipped checks: none
- Unsupported checks: resources
- Suggested next step: Review the caveated checks next: schema-quality.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory init-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 1.66 | All 7 conformance checks passed. |
| healthy | prompts | pass | 1.13 | Advertised capability responded with the minimal expected shape (1 item). |
| healthy | security | pass | 0.19 | No security issues detected. |
| healthy | security-lite | pass | 0.03 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 1.03 | Advertised capability responded with the minimal expected shape (7 items). |
| review | schema-quality | partial | 0.66 | Found 1 quality finding(s) across 8 item(s): 0 warnings, 1 info. |
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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 7 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (1 item).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: demo_welcome
  - Diagnostics: Watching for changes in prompts directory: /Users/williamweishuhn/Documents/New project/mcp-observatory/examples/promptopia-prompts, promptopia-mcp MCP server running (v1.1.0)

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

Summary: Advertised capability responded with the minimal expected shape (7 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: add_prompt, update_prompt, get_prompt, list_prompts, delete_prompt (+2 more)
  - Diagnostics: Watching for changes in prompts directory: /Users/williamweishuhn/Documents/New project/mcp-observatory/examples/promptopia-prompts, promptopia-mcp MCP server running (v1.1.0)

### schema-quality — partial

Summary: Found 1 quality finding(s) across 8 item(s): 0 warnings, 1 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: demo_welcome
  - Diagnostics: [info] prompt "demo_welcome": Argument 'name' missing description

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
- Run ID: `run_2026-06-24T020725699Z_7cde9d35`
- Gate: `pass`
