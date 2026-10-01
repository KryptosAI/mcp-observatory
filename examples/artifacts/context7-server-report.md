# MCP Observatory Run Report

Generated at 2026-09-02T04:14:16.838Z

## Target and Environment Metadata

- Target: `context7-server`
- Adapter: `local-process`
- Command: `npx -y @upstash/context7-mcp`
- Server: `Context7 4.0.4`
- Platform: `darwin 25.5.0`
- Node: `v22.23.1`

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
- Suggested next step: Fix: Review the check output and update the MCP server or target configuration before release.
- CI next step: `Add CI: npx -y @kryptosai/mcp-observatory@latest setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **medium**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| What to look up in the library's documentation. This is used to rank library results by relevance to what the user is trying to accomplish. The query is sent to the Context7 API for processing. Do not include any sensitive or confidential information such as API keys, passwords, credentials, personal data, or proprietary code in your query. | unknown | description_analysis | medium |
| What to look up in the library's documentation, scoped to a single concept. Be specific and include relevant details, but keep each query to one topic — if the user's question spans multiple distinct concepts, make a separate call per concept instead of combining them, unless the question is about how the concepts interact. Good: 'How to set up authentication with JWT in Express.js' or 'React useEffect cleanup function examples'. Bad (too vague): 'auth' or 'hooks'. Bad (too broad): 'routing and auth and caching in Next.js'. The query is sent to the Context7 API for processing. Do not include any sensitive or confidential information such as API keys, passwords, credentials, personal data, or proprietary code in your query. | unknown | description_analysis | medium |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-09-02T04:14:20.552Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 2.10 | All 7 conformance checks passed. |
| healthy | prompts | pass | 1.04 | Advertised capability responded with the minimal expected shape (0 items). |
| healthy | resources | pass | 0.94 | Advertised capability responded with the minimal expected shape (0 items). |
| healthy | runtime-profile | pass | 1.11 | Detected 2 potential egress target(s) and 1 potential state mutation(s) with low confidence. |
| healthy | schema-quality | pass | 1.02 | All 2 item(s) have good schema quality. |
| healthy | security-lite | pass | 0.71 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 2.83 | Advertised capability responded with the minimal expected shape (2 items). |

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
  - Diagnostics: Context7 Documentation MCP Server v4.0.4 running on stdio

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (0 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Context7 Documentation MCP Server v4.0.4 running on stdio
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Context7 Documentation MCP Server v4.0.4 running on stdio

### runtime-profile — pass

Summary: Detected 2 potential egress target(s) and 1 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `3`
  - Identifiers: none
  - Diagnostics: Egress entries: 2, State mutations: 1, Confidence: medium

### schema-quality — pass

Summary: All 2 item(s) have good schema quality.

- Endpoint: `schema-quality/scan`
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
  - Diagnostics: Context7 Documentation MCP Server v4.0.4 running on stdio

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-09-02T041416837Z_598e509e`
- Gate: `pass`
