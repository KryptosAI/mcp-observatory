# MCP Observatory Run Report

Generated at 2026-07-06T01:46:58.742Z

## Target and Environment Metadata

- Target: `cyanheads-git-mcp-server`
- Adapter: `local-process`
- Command: `npx -y @cyanheads/git-mcp-server`
- Server: `@cyanheads/git-mcp-server 2.15.1`
- Platform: `darwin 24.0.0`
- Node: `v25.8.1`

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
| pass | 7 | 4 | 0 | 3 | 0 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: schema-quality: Found 17 quality finding(s) across 30 item(s): 0 warnings, 17 info.; security: Found 19 security finding(s): 0 high, 19 medium, 0 low.; security-lite: Found 19 security finding(s): 0 high, 19 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: security-lite, schema-quality, security
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Review the caveated checks next: security-lite, schema-quality, security.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 43.66 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.77 | Advertised capability responded with the minimal expected shape (1 item). |
| healthy | resources | pass | 0.70 | Advertised capability responded with the minimal expected shape (2 items). |
| healthy | tools | pass | 33.99 | Advertised capability responded with the minimal expected shape (28 items). |
| review | schema-quality | partial | 21.67 | Found 17 quality finding(s) across 30 item(s): 0 warnings, 17 info. |
| review | security | partial | 27.04 | Found 19 security finding(s): 0 high, 19 medium, 0 low. |
| review | security-lite | partial | 0.10 | Found 19 security finding(s): 0 high, 19 medium, 0 low. |

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
  - Diagnostics: {"level":30,"time":1783302419905,"env":"development","version":"2.15.1","pid":87344,"transport":"stdio","requestId":"0MOWN-K5EH1","timestamp":"2026-07-06T01:46:59.900Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Attempting to connect stdio transport..."}, {"level":20,"time":1783302419905,"env":"development","version":"2.15.1","pid":87344,"transport":"stdio","requestId":"0MOWN-K5EH1","timestamp":"2026-07-06T01:46:59.900Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Creating StdioServerTransport instance..."}, {"level":20,"time":1783302419905,"env":"development","version":"2.15.1","pid":87344,"transport":"stdio","requestId":"0MOWN-K5EH1","timestamp":"2026-07-06T01:46:59.900Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Connecting McpServer instance to StdioServerTransport..."} (+2 more)

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (2 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: git://working-directory
  - Diagnostics: {"level":30,"time":1783302419905,"env":"development","version":"2.15.1","pid":87344,"transport":"stdio","requestId":"0MOWN-K5EH1","timestamp":"2026-07-06T01:46:59.900Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Attempting to connect stdio transport..."}, {"level":20,"time":1783302419905,"env":"development","version":"2.15.1","pid":87344,"transport":"stdio","requestId":"0MOWN-K5EH1","timestamp":"2026-07-06T01:46:59.900Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Creating StdioServerTransport instance..."}, {"level":20,"time":1783302419905,"env":"development","version":"2.15.1","pid":87344,"transport":"stdio","requestId":"0MOWN-K5EH1","timestamp":"2026-07-06T01:46:59.900Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Connecting McpServer instance to StdioServerTransport..."} (+2 more)
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: git://working-directory
  - Diagnostics: {"level":30,"time":1783302419905,"env":"development","version":"2.15.1","pid":87344,"transport":"stdio","requestId":"0MOWN-K5EH1","timestamp":"2026-07-06T01:46:59.900Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Attempting to connect stdio transport..."}, {"level":20,"time":1783302419905,"env":"development","version":"2.15.1","pid":87344,"transport":"stdio","requestId":"0MOWN-K5EH1","timestamp":"2026-07-06T01:46:59.900Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Creating StdioServerTransport instance..."}, {"level":20,"time":1783302419905,"env":"development","version":"2.15.1","pid":87344,"transport":"stdio","requestId":"0MOWN-K5EH1","timestamp":"2026-07-06T01:46:59.900Z","operation":"connectStdioTransport","transportType":"Stdio","msg":"Connecting McpServer instance to StdioServerTransport..."} (+2 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (28 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `28`
  - Identifiers: git_add, git_blame, git_branch, git_changelog_analyze, git_checkout (+23 more)
  - Diagnostics: none

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
- Run ID: `run_2026-07-06T014658742Z_9d713d02`
- Gate: `pass`
