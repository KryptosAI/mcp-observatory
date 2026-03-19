# MCP Observatory Run Report

Generated at 2026-03-19T03:51:27.790Z

## Target and Environment Metadata

- Target: `filesystem-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-filesystem examples/filesystem-fixture`
- Server: `secure-filesystem-server 0.2.0`
- Platform: `darwin 25.3.0`
- Node: `v22.22.1`

## Executive Summary

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 4 | 2 | 0 | 0 | 2 | 0 | 0 |

## At a Glance

- Failing checks: none
- Partial or flaky checks: none
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Confirm that unsupported capabilities are intentional for this target: prompts, resources.

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |
| healthy | semantics | pass | 0.00 | Advertised capabilities responded and returned the minimal expected shape: tools. |
| healthy | tools | pass | 7.87 | Advertised capability responded with the minimal expected shape (14 items). |

## Evidence Snippets

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

### semantics — pass

Summary: Advertised capabilities responded and returned the minimal expected shape: tools.

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `14`
  - Identifiers: read_file, read_text_file, read_media_file, read_multiple_files, write_file (+9 more)
  - Diagnostics: Secure MCP Filesystem Server running on stdio, Client does not support MCP Roots, using allowed directories set from server args: [, '/Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/filesystem-fixture' (+1 more)
- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Secure MCP Filesystem Server running on stdio, Client does not support MCP Roots, using allowed directories set from server args: [, '/Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/filesystem-fixture' (+1 more)
- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Secure MCP Filesystem Server running on stdio, Client does not support MCP Roots, using allowed directories set from server args: [, '/Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/filesystem-fixture' (+1 more)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (14 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `14`
  - Identifiers: read_file, read_text_file, read_media_file, read_multiple_files, write_file (+9 more)
  - Diagnostics: Secure MCP Filesystem Server running on stdio, Client does not support MCP Roots, using allowed directories set from server args: [, '/Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/filesystem-fixture' (+1 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-03-19T035127790Z_efda1443`
- Gate: `pass`
