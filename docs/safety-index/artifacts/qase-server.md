# MCP Observatory Run Report

Generated at 2026-07-15T22:34:14.973Z

## Target and Environment Metadata

- Target: `qase-server`
- Adapter: `local-process`
- Command: `npx -y @qase/mcp-server`
- Server: `qase-mcp-server 1.1.8`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 65/100 (D)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 0/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 2 | 3 | 2 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: runtime-profile: Detected 8 potential egress target(s) and 116 potential state mutation(s) with high confidence.; schema-quality: Found 6 quality finding(s) across 80 item(s): 0 warnings, 6 info.; attack-sim: Safe attack simulation found 44 finding(s): 44 high, 0 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security, attack-sim
- Partial or flaky checks: runtime-profile, schema-quality
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Start with the failing checks: security-lite, security, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| Filter by API results | unknown | description_analysis | medium |
| host | unknown | tool_schema | high |
| URL-friendly identifier | unknown | description_analysis | medium |
| Environment host/URL | unknown | description_analysis | medium |
| host | unknown | tool_schema | high |
| URL-friendly identifier | unknown | description_analysis | medium |
| Environment host/URL | unknown | description_analysis | medium |
| get_attachment | unknown | description_analysis | low |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| environment | execute | global | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
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
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | execute | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
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
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
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
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | delete | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-15T22:34:15.836Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 2.60 | All 7 conformance checks passed. |
| healthy | tools | pass | 1.63 | Advertised capability responded with the minimal expected shape (80 items). |
| review | runtime-profile | partial | 0.54 | Detected 8 potential egress target(s) and 116 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 1.02 | Found 6 quality finding(s) across 80 item(s): 0 warnings, 6 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |
| act now | attack-sim | fail | 1.75 | Safe attack simulation found 44 finding(s): 44 high, 0 medium, 0 low. |
| act now | security | fail | 0.90 | Found 63 security finding(s): 62 high, 1 medium, 0 low. |
| act now | security-lite | fail | 0.11 | Found 63 security finding(s): 62 high, 1 medium, 0 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 80 tool(s). (+4 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (80 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `80`
  - Identifiers: list_projects, get_project, create_project, delete_project, grant_project_access (+75 more)
  - Diagnostics: ✓ Transport: stdio, ✓ Ready to receive requests, Note: This server uses stdio transport for communication. (+2 more)

### runtime-profile — partial

Summary: Detected 8 potential egress target(s) and 116 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `124`
  - Identifiers: none
  - Diagnostics: Egress entries: 8, State mutations: 116, Confidence: high

### schema-quality — partial

Summary: Found 6 quality finding(s) across 80 item(s): 0 warnings, 6 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `6`
  - Identifiers: list_projects, list_shared_parameters, list_attachments, list_authors, list_custom_fields (+1 more)
  - Diagnostics: [info] tool "list_projects": Has properties but no 'required' array declared, [info] tool "list_shared_parameters": Has properties but no 'required' array declared, [info] tool "list_attachments": Has properties but no 'required' array declared (+3 more)

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

### attack-sim — fail

Summary: Safe attack simulation found 44 finding(s): 44 high, 0 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `44`
  - Identifiers: create_project, delete_project, grant_project_access, revoke_project_access, create_case (+39 more)
  - Diagnostics: [high] Tool "create_project" combines broad parameters (code) with destructive or non-read-only behavior., [high] Tool "delete_project" combines broad parameters (code) with destructive or non-read-only behavior., [high] Tool "grant_project_access" combines broad parameters (code) with destructive or non-read-only behavior. (+41 more)

### security — fail

Summary: Found 63 security finding(s): 62 high, 1 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `63`
  - Identifiers: get_project, create_project, delete_project, grant_project_access, revoke_project_access (+57 more)
  - Diagnostics: [high] Tool "get_project" has parameter "code" which may allow arbitrary command execution., [high] Tool "create_project" has parameter "code" which may allow arbitrary command execution., [high] Tool "delete_project" has parameter "code" which may allow arbitrary command execution. (+60 more)

### security-lite — fail

Summary: Found 63 security finding(s): 62 high, 1 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `63`
  - Identifiers: get_project, create_project, delete_project, grant_project_access, revoke_project_access (+57 more)
  - Diagnostics: [high] Tool "get_project" has parameter "code" which may allow arbitrary command execution., [high] Tool "create_project" has parameter "code" which may allow arbitrary command execution., [high] Tool "delete_project" has parameter "code" which may allow arbitrary command execution. (+60 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T223414973Z_af05b44c`
- Gate: `fail`
