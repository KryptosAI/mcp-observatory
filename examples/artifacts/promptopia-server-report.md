# MCP Observatory Run Report

Generated at 2026-03-19T04:26:56.579Z

## Target and Environment Metadata

- Target: `promptopia-server`
- Adapter: `local-process`
- Command: `npx -y promptopia-mcp`
- Server: `promptopia-mcp 1.1.0`
- Platform: `darwin 25.3.0`
- Node: `v22.22.1`

## Executive Summary

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 4 | 3 | 0 | 0 | 1 | 0 | 0 |

## At a Glance

- Failing checks: none
- Partial or flaky checks: none
- Skipped checks: none
- Unsupported checks: resources
- Suggested next step: Confirm that unsupported capabilities are intentional for this target: resources.

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |
| healthy | prompts | pass | 0.83 | Advertised capability responded with the minimal expected shape (1 item). |
| healthy | semantics | pass | 0.00 | Advertised capabilities responded and returned the minimal expected shape: tools, prompts. |
| healthy | tools | pass | 2.18 | Advertised capability responded with the minimal expected shape (7 items). |

## Evidence Snippets

### resources — unsupported

Summary: Resources are not advertised by the target.

- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (1 item).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: demo_welcome
  - Diagnostics: Watching for changes in prompts directory: /Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/promptopia-prompts, promptopia-mcp MCP server running (v1.1.0)

### semantics — pass

Summary: Advertised capabilities responded and returned the minimal expected shape: tools, prompts.

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: add_prompt, update_prompt, get_prompt, list_prompts, delete_prompt (+2 more)
  - Diagnostics: Watching for changes in prompts directory: /Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/promptopia-prompts, promptopia-mcp MCP server running (v1.1.0)
- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: demo_welcome
  - Diagnostics: Watching for changes in prompts directory: /Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/promptopia-prompts, promptopia-mcp MCP server running (v1.1.0)
- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Watching for changes in prompts directory: /Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/promptopia-prompts, promptopia-mcp MCP server running (v1.1.0)

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (7 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: add_prompt, update_prompt, get_prompt, list_prompts, delete_prompt (+2 more)
  - Diagnostics: Watching for changes in prompts directory: /Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/promptopia-prompts, promptopia-mcp MCP server running (v1.1.0)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-03-19T042656579Z_02cc0224`
- Gate: `pass`
