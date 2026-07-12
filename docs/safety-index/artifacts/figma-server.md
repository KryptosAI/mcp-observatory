# MCP Observatory Run Report

Generated at 2026-07-12T23:36:03.823Z

## Target and Environment Metadata

- Target: `figma-server`
- Adapter: `local-process`
- Command: `npx -y figma-mcp-express`
- Server: `figma-mcp-express 2.8.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 94/100 (A)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 100/100 | 20% |
| Security | 87/100 | 20% |
| Reliability | 83/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 9 | 6 | 0 | 2 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: attack-sim: Safe attack simulation found 2 finding(s): 0 high, 2 medium, 0 low.; runtime-profile: Detected 18 potential egress target(s) and 32 potential state mutation(s) with high confidence.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: runtime-profile, attack-sim
- Skipped checks: none
- Unsupported checks: resources
- Suggested next step: Review the caveated checks next: runtime-profile, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |
| origin | unknown | tool_schema | high |

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
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-12T23:36:04.476Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 2.17 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.32 | Advertised capability responded with the minimal expected shape (4 items). |
| healthy | schema-quality | pass | 1.02 | All 26 item(s) have good schema quality. |
| healthy | security | pass | 1.05 | Found 1 security finding(s): 0 high, 0 medium, 1 low. |
| healthy | security-lite | pass | 0.05 | Found 1 security finding(s): 0 high, 0 medium, 1 low. |
| healthy | tools | pass | 1.89 | Advertised capability responded with the minimal expected shape (22 items). |
| review | attack-sim | partial | 1.55 | Safe attack simulation found 2 finding(s): 0 high, 2 medium, 0 low. |
| review | runtime-profile | partial | 0.20 | Detected 18 potential egress target(s) and 32 potential state mutation(s) with high confidence. |
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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 22 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (4 items).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `4`
  - Identifiers: design_token_generation_strategy, generate_color_palette, generate_component_variants, generate_type_scale
  - Diagnostics: [leader] listening on 127.0.0.1:1994, [node] became LEADER, Starting figma-mcp-express 2.8.0 (role: LEADER)

### schema-quality — pass

Summary: All 26 item(s) have good schema quality.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### security — pass

Summary: Found 1 security finding(s): 0 high, 0 medium, 1 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: list_channels
  - Diagnostics: [low] Tool "list_channels" has an empty schema but is marked as destructive.

### security-lite — pass

Summary: Found 1 security finding(s): 0 high, 0 medium, 1 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: list_channels
  - Diagnostics: [low] Tool "list_channels" has an empty schema but is marked as destructive.

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (22 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `22`
  - Identifiers: batch, export_frames_to_pdf, export_tokens, fetch_library_catalog, get_batch_op_spec (+17 more)
  - Diagnostics: [leader] listening on 127.0.0.1:1994, [node] became LEADER, Starting figma-mcp-express 2.8.0 (role: LEADER)

### attack-sim — partial

Summary: Safe attack simulation found 2 finding(s): 0 high, 2 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: search_batch_ops, search_nodes
  - Diagnostics: [medium] Tool "search_batch_ops" combines broad parameters (query) with destructive or non-read-only behavior., [medium] Tool "search_nodes" combines broad parameters (query) with destructive or non-read-only behavior.

### runtime-profile — partial

Summary: Detected 18 potential egress target(s) and 32 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `50`
  - Identifiers: none
  - Diagnostics: Egress entries: 18, State mutations: 32, Confidence: high

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
- Run ID: `run_2026-07-12T233603823Z_7ecaa33e`
- Gate: `pass`
