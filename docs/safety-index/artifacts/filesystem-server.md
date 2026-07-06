# MCP Observatory Run Report

Generated at 2026-07-06T01:46:53.596Z

## Target and Environment Metadata

- Target: `filesystem-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-filesystem examples/filesystem-fixture`
- Server: `secure-filesystem-server 0.2.0`
- Platform: `darwin 24.0.0`
- Node: `v25.8.1`

## Executive Summary

**Health Score: 77/100 (C)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 60/100 | 20% |
| Reliability | 67/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 7 | 2 | 0 | 3 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: schema-quality: Found 18 quality finding(s) across 14 item(s): 0 warnings, 18 info.; security: Found 3 security finding(s): 0 high, 3 medium, 0 low.; security-lite: Found 3 security finding(s): 0 high, 3 medium, 0 low.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: security-lite, schema-quality, security
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Review the caveated checks next: security-lite, schema-quality, security.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | conformance | pass | 6.37 | All 7 conformance checks passed. |
| healthy | tools | pass | 6.06 | Advertised capability responded with the minimal expected shape (14 items). |
| review | schema-quality | partial | 2.60 | Found 18 quality finding(s) across 14 item(s): 0 warnings, 18 info. |
| review | security | partial | 2.71 | Found 3 security finding(s): 0 high, 3 medium, 0 low. |
| review | security-lite | partial | 0.20 | Found 3 security finding(s): 0 high, 3 medium, 0 low. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
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
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 14 tool(s). (+4 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (14 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `14`
  - Identifiers: read_file, read_text_file, read_media_file, read_multiple_files, write_file (+9 more)
  - Diagnostics: Secure MCP Filesystem Server running on stdio, Client does not support MCP Roots, using allowed directories set from server args: [ '/Users/sanghoon/mcp-observatory/examples/filesystem-fixture' ]

### schema-quality — partial

Summary: Found 18 quality finding(s) across 14 item(s): 0 warnings, 18 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `18`
  - Identifiers: read_file, read_text_file, read_media_file, write_file, edit_file (+7 more)
  - Diagnostics: [info] tool "read_file": Property 'path' missing description, [info] tool "read_text_file": Property 'path' missing description, [info] tool "read_media_file": Property 'path' missing description (+15 more)

### security — partial

Summary: Found 3 security finding(s): 0 high, 3 medium, 0 low.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `3`
  - Identifiers: write_file, edit_file, create_directory
  - Diagnostics: [medium] Tool "write_file" accepts filesystem paths and has destructive capabilities., [medium] Tool "edit_file" accepts filesystem paths and has destructive capabilities., [medium] Tool "create_directory" accepts filesystem paths and has destructive capabilities.

### security-lite — partial

Summary: Found 3 security finding(s): 0 high, 3 medium, 0 low.

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `3`
  - Identifiers: write_file, edit_file, create_directory
  - Diagnostics: [medium] Tool "write_file" accepts filesystem paths and has destructive capabilities., [medium] Tool "edit_file" accepts filesystem paths and has destructive capabilities., [medium] Tool "create_directory" accepts filesystem paths and has destructive capabilities.

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

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-06T014653596Z_2f383767`
- Gate: `pass`
