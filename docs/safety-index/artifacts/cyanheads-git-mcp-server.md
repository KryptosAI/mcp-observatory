# MCP Observatory Run Report

Generated at 2026-07-12T23:44:02.967Z

## Target and Environment Metadata

- Target: `cyanheads-git-mcp-server`
- Adapter: `local-process`
- Command: `npx -y @cyanheads/git-mcp-server`
- Server: `@cyanheads/git-mcp-server 2.15.1`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 84/100 (B)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 60/100 | 20% |
| Reliability | 100/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 9 | 4 | 0 | 5 | 0 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: attack-sim: Safe attack simulation found 19 finding(s): 0 high, 19 medium, 0 low.; runtime-profile: Detected 7 potential egress target(s) and 118 potential state mutation(s) with high confidence.; schema-quality: Found 17 quality finding(s) across 30 item(s): 0 warnings, 17 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: security-lite, runtime-profile, schema-quality, security, attack-sim
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Review the caveated checks next: security-lite, runtime-profile, schema-quality, security, attack-sim.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| url | unknown | tool_schema | high |
| Source to clone from: HTTP(S) URL, SSH URL (ssh://… or git@host:path), git:// URL, file:// URL, or a bare filesystem path (e.g. /tmp/repo.git). | unknown | description_analysis | medium |
| git_clone | unknown | description_analysis | low |
| url | unknown | tool_schema | high |
| Remote name for add/remove/rename/get-url/set-url operations. | unknown | description_analysis | medium |
| Remote URL for add/set-url operations. Accepts HTTP(S), SSH (ssh://… or git@host:path), git://, or file:// URLs. | unknown | description_analysis | medium |
| Set push URL separately (for set-url operation). | unknown | description_analysis | medium |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | specific_path | tool_schema |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-12T23:44:04.014Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 38.89 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.68 | Advertised capability responded with the minimal expected shape (1 item). |
| healthy | resources | pass | 0.64 | Advertised capability responded with the minimal expected shape (2 items). |
| healthy | tools | pass | 37.46 | Advertised capability responded with the minimal expected shape (28 items). |
| review | attack-sim | partial | 19.04 | Safe attack simulation found 19 finding(s): 0 high, 19 medium, 0 low. |
| review | runtime-profile | partial | 0.52 | Detected 7 potential egress target(s) and 118 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 23.32 | Found 17 quality finding(s) across 30 item(s): 0 warnings, 17 info. |
| review | security | partial | 17.88 | Found 19 security finding(s): 0 high, 19 medium, 0 low. |
| review | security-lite | partial | 0.18 | Found 19 security finding(s): 0 high, 19 medium, 0 low. |

## Evidence Snippets

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 28 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (1 item).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: git_wrapup
  - Diagnostics: {"level":30,"time":1783899843951,"env":"development","version":"2.15.1","pid":24859,"transport":"stdio","requestId":"Z3S39-K4LVB","timestamp":"2026-07-12T23:44:03.946Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Attempting to connect stdio transport..."}, {"level":20,"time":1783899843951,"env":"development","version":"2.15.1","pid":24859,"transport":"stdio","requestId":"Z3S39-K4LVB","timestamp":"2026-07-12T23:44:03.946Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Creating StdioServerTransport instance..."}, {"level":20,"time":1783899843951,"env":"development","version":"2.15.1","pid":24859,"transport":"stdio","requestId":"Z3S39-K4LVB","timestamp":"2026-07-12T23:44:03.946Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Connecting McpServer instance to StdioServerTransport..."} (+2 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (2 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: git://working-directory
  - Diagnostics: {"level":30,"time":1783899843951,"env":"development","version":"2.15.1","pid":24859,"transport":"stdio","requestId":"Z3S39-K4LVB","timestamp":"2026-07-12T23:44:03.946Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Attempting to connect stdio transport..."}, {"level":20,"time":1783899843951,"env":"development","version":"2.15.1","pid":24859,"transport":"stdio","requestId":"Z3S39-K4LVB","timestamp":"2026-07-12T23:44:03.946Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Creating StdioServerTransport instance..."}, {"level":20,"time":1783899843951,"env":"development","version":"2.15.1","pid":24859,"transport":"stdio","requestId":"Z3S39-K4LVB","timestamp":"2026-07-12T23:44:03.946Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Connecting McpServer instance to StdioServerTransport..."} (+2 more)
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: git://working-directory
  - Diagnostics: {"level":30,"time":1783899843951,"env":"development","version":"2.15.1","pid":24859,"transport":"stdio","requestId":"Z3S39-K4LVB","timestamp":"2026-07-12T23:44:03.946Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Attempting to connect stdio transport..."}, {"level":20,"time":1783899843951,"env":"development","version":"2.15.1","pid":24859,"transport":"stdio","requestId":"Z3S39-K4LVB","timestamp":"2026-07-12T23:44:03.946Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Creating StdioServerTransport instance..."}, {"level":20,"time":1783899843951,"env":"development","version":"2.15.1","pid":24859,"transport":"stdio","requestId":"Z3S39-K4LVB","timestamp":"2026-07-12T23:44:03.946Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Connecting McpServer instance to StdioServerTransport..."} (+2 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (28 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `28`
  - Identifiers: git_add, git_blame, git_branch, git_changelog_analyze, git_checkout (+23 more)
  - Diagnostics: none

### attack-sim — partial

Summary: Safe attack simulation found 19 finding(s): 0 high, 19 medium, 0 low.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `19`
  - Identifiers: git_add, git_branch, git_checkout, git_cherry_pick, git_clean (+14 more)
  - Diagnostics: [medium] Tool "git_add" combines broad parameters (path) with destructive or non-read-only behavior., [medium] Tool "git_branch" combines broad parameters (path) with destructive or non-read-only behavior., [medium] Tool "git_checkout" combines broad parameters (path) with destructive or non-read-only behavior. (+16 more)

### runtime-profile — partial

Summary: Detected 7 potential egress target(s) and 118 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `125`
  - Identifiers: none
  - Diagnostics: Egress entries: 7, State mutations: 118, Confidence: high

### schema-quality — partial

Summary: Found 17 quality finding(s) across 30 item(s): 0 warnings, 17 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `17`
  - Identifiers: git_add, git_branch, git_clean, git_diff, git_fetch (+12 more)
  - Diagnostics: [info] tool "git_add": Has properties but no 'required' array declared, [info] tool "git_branch": Has properties but no 'required' array declared, [info] tool "git_clean": Has properties but no 'required' array declared (+14 more)

### security — partial

Summary: Found 19 security finding(s): 0 high, 19 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `19`
  - Identifiers: git_add, git_branch, git_checkout, git_cherry_pick, git_clean (+14 more)
  - Diagnostics: [medium] Tool "git_add" accepts filesystem paths and has destructive capabilities., [medium] Tool "git_branch" accepts filesystem paths and has destructive capabilities., [medium] Tool "git_checkout" accepts filesystem paths and has destructive capabilities. (+16 more)

### security-lite — partial

Summary: Found 19 security finding(s): 0 high, 19 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `19`
  - Identifiers: git_add, git_branch, git_checkout, git_cherry_pick, git_clean (+14 more)
  - Diagnostics: [medium] Tool "git_add" accepts filesystem paths and has destructive capabilities., [medium] Tool "git_branch" accepts filesystem paths and has destructive capabilities., [medium] Tool "git_checkout" accepts filesystem paths and has destructive capabilities. (+16 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-12T234402967Z_93acfad1`
- Gate: `pass`
