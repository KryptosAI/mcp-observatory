# MCP Observatory Run Report

Generated at 2026-07-06T01:46:54.306Z

## Target and Environment Metadata

- Target: `context7-server`
- Adapter: `local-process`
- Command: `npx -y @upstash/context7-mcp`
- Server: `Context7 3.2.2`
- Platform: `darwin 24.0.0`
- Node: `v25.8.1`

## Executive Summary

**Health Score: 100/100 (A)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 100/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 100/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 7 | 7 | 0 | 0 | 0 | 0 | 0 |

## At a Glance

- Safety verdict: **Ready** — No blocking MCP compatibility or security issues were detected.
- Top risks: No high-priority risks detected.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: none
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Save this run artifact and diff it against the next meaningful server or package change.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 0.77 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.30 | Advertised capability responded with the minimal expected shape (0 items). |
| healthy | resources | pass | 0.44 | Advertised capability responded with the minimal expected shape (0 items). |
| healthy | schema-quality | pass | 0.67 | All 2 item(s) have good schema quality. |
| healthy | security | pass | 0.30 | No security issues detected. |
| healthy | security-lite | pass | 0.02 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 1.72 | Advertised capability responded with the minimal expected shape (2 items). |

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

Summary: Advertised capability responded with the minimal expected shape (0 items).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Context7 Documentation MCP Server v3.2.2 running on stdio

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (0 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Context7 Documentation MCP Server v3.2.2 running on stdio
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Context7 Documentation MCP Server v3.2.2 running on stdio

### schema-quality — pass

Summary: All 2 item(s) have good schema quality.

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
  - Identifiers: resolve-library-id, query-docs
  - Diagnostics: Context7 Documentation MCP Server v3.2.2 running on stdio

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-06T014654306Z_160413b5`
- Gate: `pass`
