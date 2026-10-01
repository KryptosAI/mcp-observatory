# MCP Observatory Run Report

Generated at 2026-09-02T04:14:37.404Z

## Target and Environment Metadata

- Target: `ref-tools-server`
- Adapter: `local-process`
- Command: `npx -y ref-tools-mcp`
- Server: `Ref 3.0.3`
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
| pass | 7 | 5 | 0 | 1 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: runtime-profile: Detected 4 potential egress target(s) and 0 potential state mutation(s) with high confidence.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: runtime-profile
- Skipped checks: none
- Unsupported checks: resources
- Suggested next step: Fix: Review the check output and update the MCP server or target configuration before release.
- CI next step: `Add CI: npx -y @kryptosai/mcp-observatory@latest setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| ref_search_documentation | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| The URL of the webpage to read. | unknown | description_analysis | medium |
| ref_read_url | unknown | description_analysis | low |

_Analyzed at 2026-09-02T04:14:44.440Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 0.62 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.20 | Advertised capability responded with the minimal expected shape (2 items). |
| healthy | schema-quality | pass | 0.46 | All 4 item(s) have good schema quality. |
| healthy | security-lite | pass | 0.02 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 1.10 | Advertised capability responded with the minimal expected shape (2 items). |
| review | runtime-profile | partial | 0.06 | Detected 4 potential egress target(s) and 0 potential state mutation(s) with high confidence. |
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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 2 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (2 items).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: search_docs, my_docs
  - Diagnostics: npm warn deprecated @modelcontextprotocol/inspector-server@0.16.8: v1 is deprecated. Upgrade to v2: npm i @modelcontextprotocol/inspector@latest. v1 gets security fixes only, published under the v1-latest tag., npm warn deprecated @modelcontextprotocol/inspector-cli@0.16.8: v1 is deprecated. Upgrade to v2: npm i @modelcontextprotocol/inspector@latest. v1 gets security fixes only, published under the v1-latest tag., npm warn deprecated @modelcontextprotocol/inspector-client@0.16.8: v1 is deprecated. Upgrade to v2: npm i @modelcontextprotocol/inspector@latest. v1 gets security fixes only, published under the v1-latest tag. (+2 more)

### schema-quality — pass

Summary: All 4 item(s) have good schema quality.

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
  - Identifiers: ref_search_documentation, ref_read_url
  - Diagnostics: npm warn deprecated @modelcontextprotocol/inspector-server@0.16.8: v1 is deprecated. Upgrade to v2: npm i @modelcontextprotocol/inspector@latest. v1 gets security fixes only, published under the v1-latest tag., npm warn deprecated @modelcontextprotocol/inspector-cli@0.16.8: v1 is deprecated. Upgrade to v2: npm i @modelcontextprotocol/inspector@latest. v1 gets security fixes only, published under the v1-latest tag., npm warn deprecated @modelcontextprotocol/inspector-client@0.16.8: v1 is deprecated. Upgrade to v2: npm i @modelcontextprotocol/inspector@latest. v1 gets security fixes only, published under the v1-latest tag. (+2 more)

### runtime-profile — partial

Summary: Detected 4 potential egress target(s) and 0 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `4`
  - Identifiers: none
  - Diagnostics: Egress entries: 4, State mutations: 0, Confidence: high

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
- Run ID: `run_2026-09-02T041437404Z_efab4fed`
- Gate: `pass`
