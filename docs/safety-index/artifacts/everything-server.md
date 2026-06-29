# MCP Observatory Run Report

Generated at 2026-06-24T02:07:21.282Z

## Target and Environment Metadata

- Target: `everything-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-everything`
- Server: `mcp-servers/everything 2.0.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 92/100 (A)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 100/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 7 | 6 | 0 | 1 | 0 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: schema-quality: Found 5 quality finding(s) across 24 item(s): 0 warnings, 5 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: schema-quality
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Review the caveated checks next: schema-quality.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 3.85 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.74 | Advertised capability responded with the minimal expected shape (4 items). |
| healthy | resources | pass | 1.01 | Advertised capability responded with the minimal expected shape (9 items). |
| healthy | security | pass | 0.88 | No security issues detected. |
| healthy | security-lite | pass | 0.48 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 7.35 | Advertised capability responded with the minimal expected shape (13 items). |
| review | schema-quality | partial | 1.89 | Found 5 quality finding(s) across 24 item(s): 0 warnings, 5 info. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 13 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (4 items).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `4`
  - Identifiers: simple-prompt, args-prompt, completable-prompt, resource-prompt
  - Diagnostics: Starting default (STDIO) server...

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (9 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: demo://resource/static/document/architecture.md, demo://resource/static/document/extension.md, demo://resource/static/document/features.md, demo://resource/static/document/how-it-works.md, demo://resource/static/document/instructions.md (+2 more)
  - Diagnostics: Starting default (STDIO) server...
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: demo://resource/dynamic/text/{resourceId}, demo://resource/dynamic/blob/{resourceId}
  - Diagnostics: Starting default (STDIO) server...

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

Summary: Advertised capability responded with the minimal expected shape (13 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `13`
  - Identifiers: echo, get-annotated-message, get-env, get-resource-links, get-resource-reference (+8 more)
  - Diagnostics: Starting default (STDIO) server...

### schema-quality — partial

Summary: Found 5 quality finding(s) across 24 item(s): 0 warnings, 5 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: get-resource-links, get-resource-reference, gzip-file-as-resource, trigger-long-running-operation
  - Diagnostics: [info] tool "get-resource-links": Has properties but no 'required' array declared, [info] tool "get-resource-reference": Has properties but no 'required' array declared, [info] tool "get-resource-reference": Property 'resourceType' missing description (+2 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-06-24T020721281Z_c337e720`
- Gate: `pass`
