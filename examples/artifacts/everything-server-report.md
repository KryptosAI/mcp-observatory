# MCP Observatory Run Report

Generated at 2026-09-02T04:14:20.577Z

## Target and Environment Metadata

- Target: `everything-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-everything`
- Server: `mcp-servers/everything 2.0.0`
- Platform: `darwin 25.5.0`
- Node: `v22.23.1`

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
- Top risks: schema-quality: Found 6 quality finding(s) across 24 item(s): 0 warnings, 6 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: schema-quality
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Fix: Review the check output and update the MCP server or target configuration before release.
- CI next step: `Add CI: npx -y @kryptosai/mcp-observatory@latest setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **medium**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| URL or data URI of the file content to compress | unknown | description_analysis | medium |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |

_Analyzed at 2026-09-02T04:14:22.682Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 4.22 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.98 | Advertised capability responded with the minimal expected shape (4 items). |
| healthy | resources | pass | 1.04 | Advertised capability responded with the minimal expected shape (9 items). |
| healthy | runtime-profile | pass | 0.37 | Detected 1 potential egress target(s) and 7 potential state mutation(s) with low confidence. |
| healthy | security-lite | pass | 0.20 | Found 2 security finding(s): 0 high, 0 medium, 2 low. |
| healthy | tools | pass | 7.81 | Advertised capability responded with the minimal expected shape (13 items). |
| review | schema-quality | partial | 1.33 | Found 6 quality finding(s) across 24 item(s): 0 warnings, 6 info. |

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

### runtime-profile — pass

Summary: Detected 1 potential egress target(s) and 7 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `8`
  - Identifiers: none
  - Diagnostics: Egress entries: 1, State mutations: 7, Confidence: medium

### security-lite — pass

Summary: Found 2 security finding(s): 0 high, 0 medium, 2 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: toggle-simulated-logging, toggle-subscriber-updates
  - Diagnostics: [low] Tool "toggle-simulated-logging" has an empty schema but is marked as destructive., [low] Tool "toggle-subscriber-updates" has an empty schema but is marked as destructive.

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

Summary: Found 6 quality finding(s) across 24 item(s): 0 warnings, 6 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `6`
  - Identifiers: get-resource-links, get-resource-reference, gzip-file-as-resource, trigger-long-running-operation, args-prompt
  - Diagnostics: [info] tool "get-resource-links": Has properties but no 'required' array declared, [info] tool "get-resource-reference": Has properties but no 'required' array declared, [info] tool "get-resource-reference": Property 'resourceType' missing description (+3 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-09-02T041420577Z_7c66687a`
- Gate: `pass`
