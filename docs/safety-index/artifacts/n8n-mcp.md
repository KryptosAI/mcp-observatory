# MCP Observatory Run Report

Generated at 2026-08-21T00:14:17.871Z

## Target and Environment Metadata

- Target: `n8n-mcp`
- Adapter: `local-process`
- Command: `npx -y n8n-mcp`
- Server: `n8n-documentation-mcp 2.73.0`
- Platform: `darwin 25.5.0`
- Node: `v22.23.1`

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
| pass | 9 | 7 | 0 | 1 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: schema-quality: Found 2 quality finding(s) across 9 item(s): 0 warnings, 2 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: schema-quality
- Skipped checks: none
- Unsupported checks: prompts
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
| search_nodes | unknown | description_analysis | low |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-08-21T00:14:24.443Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 7.84 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | conformance | pass | 9.33 | All 7 conformance checks passed. |
| healthy | resources | pass | 1.78 | Advertised capability responded with the minimal expected shape (2 items). |
| healthy | runtime-profile | pass | 1.13 | Detected 1 potential egress target(s) and 2 potential state mutation(s) with low confidence. |
| healthy | security | pass | 2.13 | No security issues detected. |
| healthy | security-lite | pass | 0.53 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 8.87 | Advertised capability responded with the minimal expected shape (7 items). |
| review | schema-quality | partial | 3.60 | Found 2 quality finding(s) across 9 item(s): 0 warnings, 2 info. |
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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 7 tool(s). (+4 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (2 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: ui://n8n-mcp/operation-result, ui://n8n-mcp/validation-summary
  - Diagnostics: ║                                                             ║, ║  Learn more:                                               ║, ║  https://github.com/czlonkowski/n8n-mcp/blob/main/PRIVACY.md ║ (+2 more)
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: ║                                                             ║, ║  Learn more:                                               ║, ║  https://github.com/czlonkowski/n8n-mcp/blob/main/PRIVACY.md ║ (+2 more)

### runtime-profile — pass

Summary: Detected 1 potential egress target(s) and 2 potential state mutation(s) with low confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `3`
  - Identifiers: none
  - Diagnostics: Egress entries: 1, State mutations: 2, Confidence: medium

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
  - Identifiers: tools_documentation, search_nodes, get_node, validate_node, get_template (+2 more)
  - Diagnostics: ║                                                             ║, ║  Learn more:                                               ║, ║  https://github.com/czlonkowski/n8n-mcp/blob/main/PRIVACY.md ║ (+2 more)

### schema-quality — partial

Summary: Found 2 quality finding(s) across 9 item(s): 0 warnings, 2 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: tools_documentation, search_templates
  - Diagnostics: [info] tool "tools_documentation": Has properties but no 'required' array declared, [info] tool "search_templates": Has properties but no 'required' array declared

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
- Run ID: `run_2026-08-21T001417870Z_0659ddb9`
- Gate: `pass`
