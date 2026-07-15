# MCP Observatory Run Report

Generated at 2026-07-15T22:34:09.665Z

## Target and Environment Metadata

- Target: `heroku-server`
- Adapter: `local-process`
- Command: `npx -y @heroku/mcp-server`
- Server: `Heroku MCP Server 1.2.5`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 69/100 (D)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 0/100 | 20% |
| Reliability | 83/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 9 | 3 | 3 | 2 | 1 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: runtime-profile: Detected 2 potential egress target(s) and 22 potential state mutation(s) with high confidence.; schema-quality: Found 7 quality finding(s) across 34 item(s): 0 warnings, 7 info.; attack-sim: Safe attack simulation found 2 finding(s): 2 high, 0 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: security-lite, security, attack-sim
- Partial or flaky checks: runtime-profile, schema-quality
- Skipped checks: none
- Unsupported checks: prompts
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
| URL of deployment tarball. Creates from rootUri if not provided. | unknown | description_analysis | medium |
| App.json config for deployment. Must follow schema: {"default":{"$schema":"http://json-schema.org/draft-07/schema#","title":"Heroku app.json Schema","description":"app.json is a manifest format for describing web apps. It declares environment variables, add-ons, and other information required to run an app on Heroku. Used for dynamic configurations or converted projects","type":"object","properties":{"name":{"type":"string","pattern":"^[a-zA-Z-_\\.]+","maxLength":300},"description":{"type":"string"},"keywords":{"type":"array","items":{"type":"string"}},"website":{"$ref":"#/definitions/uriString"},"repository":{"$ref":"#/definitions/uriString"},"logo":{"$ref":"#/definitions/uriString"},"success_url":{"type":"string"},"scripts":{"$ref":"#/definitions/scripts"},"env":{"$ref":"#/definitions/env"},"formation":{"$ref":"#/definitions/formation"},"addons":{"$ref":"#/definitions/addons"},"buildpacks":{"$ref":"#/definitions/buildpacks"},"environments":{"$ref":"#/definitions/environments"},"stack":{"$ref":"#/definitions/stack"},"image":{"type":"string"}},"additionalProperties":false,"definitions":{"uriString":{"type":"string","format":"uri"},"scripts":{"type":"object","properties":{"postdeploy":{"type":"string"},"pr-predestroy":{"type":"string"}},"additionalProperties":false},"env":{"type":"object","patternProperties":{"^[A-Z][A-Z0-9_]*$":{"type":"object","properties":{"description":{"type":"string"},"value":{"type":"string"},"required":{"type":"boolean"},"generator":{"type":"string","enum":["secret"]}},"additionalProperties":false}}},"dynoSize":{"type":"string","enum":["free","eco","hobby","basic","standard-1x","standard-2x","performance-m","performance-l","private-s","private-m","private-l","shield-s","shield-m","shield-l"]},"formation":{"type":"object","patternProperties":{"^[a-zA-Z0-9_-]+$":{"type":"object","properties":{"quantity":{"type":"integer","minimum":0},"size":{"$ref":"#/definitions/dynoSize"}},"required":["quantity"],"additionalProperties":false}}},"addons":{"type":"array","items":{"oneOf":[{"type":"string"},{"type":"object","properties":{"plan":{"type":"string"},"as":{"type":"string"},"options":{"type":"object"}},"required":["plan"],"additionalProperties":false}]}},"buildpacks":{"type":"array","items":{"type":"object","properties":{"url":{"type":"string"}},"required":["url"],"additionalProperties":false}},"environmentConfig":{"type":"object","properties":{"env":{"type":"object"},"formation":{"type":"object"},"addons":{"type":"array"},"buildpacks":{"type":"array"}}},"environments":{"type":"object","properties":{"test":{"allOf":[{"$ref":"#/definitions/environmentConfig"},{"type":"object","properties":{"scripts":{"type":"object","properties":{"test":{"type":"string"}},"additionalProperties":false}}}]},"review":{"$ref":"#/definitions/environmentConfig"},"production":{"$ref":"#/definitions/environmentConfig"}},"additionalProperties":false},"stack":{"type":"string","enum":["heroku-18","heroku-20","heroku-22","heroku-24"]}}}} | unknown | description_analysis | medium |

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
| network | execute | specific_path | tool_schema |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| environment | write | global | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| network | execute | specific_path | tool_schema |
| environment | write | global | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-15T22:34:10.600Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 1509.54 | All 7 conformance checks passed. |
| healthy | resources | pass | 0.71 | Advertised capability responded with the minimal expected shape (1 items). |
| healthy | tools | pass | 4.13 | Advertised capability responded with the minimal expected shape (33 items). |
| review | runtime-profile | partial | 0.25 | Detected 2 potential egress target(s) and 22 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 4.80 | Found 7 quality finding(s) across 34 item(s): 0 warnings, 7 info. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| act now | attack-sim | fail | 6.47 | Safe attack simulation found 2 finding(s): 2 high, 0 medium, 0 low. |
| act now | security | fail | 1.54 | Found 3 security finding(s): 2 high, 1 medium, 0 low. |
| act now | security-lite | fail | 0.08 | Found 3 security finding(s): 2 high, 1 medium, 0 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 33 tool(s). (+4 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (1 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: https://devcenter.heroku.com/llms.txt
  - Diagnostics: [Plugin Check] @heroku/plugin-ai: NOT INSTALLED - Skipping AI tools, Heroku MCP Server running on stdio
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: [Plugin Check] @heroku/plugin-ai: NOT INSTALLED - Skipping AI tools, Heroku MCP Server running on stdio

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (33 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `33`
  - Identifiers: list_apps, get_app_info, create_app, rename_app, maintenance_on (+28 more)
  - Diagnostics: [Plugin Check] @heroku/plugin-ai: NOT INSTALLED - Skipping AI tools, Heroku MCP Server running on stdio

### runtime-profile — partial

Summary: Detected 2 potential egress target(s) and 22 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `24`
  - Identifiers: none
  - Diagnostics: Egress entries: 2, State mutations: 22, Confidence: high

### schema-quality — partial

Summary: Found 7 quality finding(s) across 34 item(s): 0 warnings, 7 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: list_apps, create_app, list_private_spaces, list_teams, list_addons (+2 more)
  - Diagnostics: [info] tool "list_apps": Has properties but no 'required' array declared, [info] tool "create_app": Has properties but no 'required' array declared, [info] tool "list_private_spaces": Has properties but no 'required' array declared (+4 more)

### prompts — unsupported

Summary: Prompts are not advertised by the target.

- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### attack-sim — fail

Summary: Safe attack simulation found 2 finding(s): 2 high, 0 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: pg_psql, deploy_one_off_dyno
  - Diagnostics: [high] Tool "pg_psql" combines broad parameters (command, file) with destructive or non-read-only behavior., [high] Tool "deploy_one_off_dyno" combines broad parameters (command) with destructive or non-read-only behavior.

### security — fail

Summary: Found 3 security finding(s): 2 high, 1 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `3`
  - Identifiers: pg_psql, deploy_one_off_dyno
  - Diagnostics: [high] Tool "pg_psql" has parameter "command" which may allow arbitrary command execution., [medium] Tool "pg_psql" accepts filesystem paths and has destructive capabilities., [high] Tool "deploy_one_off_dyno" has parameter "command" which may allow arbitrary command execution.

### security-lite — fail

Summary: Found 3 security finding(s): 2 high, 1 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `3`
  - Identifiers: pg_psql, deploy_one_off_dyno
  - Diagnostics: [high] Tool "pg_psql" has parameter "command" which may allow arbitrary command execution., [medium] Tool "pg_psql" accepts filesystem paths and has destructive capabilities., [high] Tool "deploy_one_off_dyno" has parameter "command" which may allow arbitrary command execution.

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T223409665Z_2122dd28`
- Gate: `fail`
