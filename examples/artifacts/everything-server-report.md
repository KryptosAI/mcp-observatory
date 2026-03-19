# MCP Observatory Run Report

Generated at 2026-03-19T03:51:26.734Z

## Target and Environment Metadata

- Target: `everything-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-everything`
- Server: `mcp-servers/everything 2.0.0`
- Platform: `darwin 25.3.0`
- Node: `v22.22.1`

## Executive Summary

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 4 | 4 | 0 | 0 | 0 | 0 | 0 |

## At a Glance

- Failing checks: none
- Partial or flaky checks: none
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Save this run artifact and diff it against the next meaningful server or package change.

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | prompts | pass | 0.66 | Advertised capability responded with the minimal expected shape (4 items). |
| healthy | resources | pass | 1.00 | Advertised capability responded with the minimal expected shape (9 items). |
| healthy | semantics | pass | 0.00 | Advertised capabilities responded and returned the minimal expected shape: tools, prompts, resources. |
| healthy | tools | pass | 6.64 | Advertised capability responded with the minimal expected shape (13 items). |

## Evidence Snippets

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

### semantics — pass

Summary: Advertised capabilities responded and returned the minimal expected shape: tools, prompts, resources.

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `13`
  - Identifiers: echo, get-annotated-message, get-env, get-resource-links, get-resource-reference (+8 more)
  - Diagnostics: Starting default (STDIO) server...
- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `4`
  - Identifiers: simple-prompt, args-prompt, completable-prompt, resource-prompt
  - Diagnostics: Starting default (STDIO) server...
- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `9`
  - Identifiers: demo://resource/static/document/architecture.md, demo://resource/static/document/extension.md, demo://resource/static/document/features.md, demo://resource/static/document/how-it-works.md, demo://resource/static/document/instructions.md (+4 more)
  - Diagnostics: Starting default (STDIO) server...

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (13 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `13`
  - Identifiers: echo, get-annotated-message, get-env, get-resource-links, get-resource-reference (+8 more)
  - Diagnostics: Starting default (STDIO) server...

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-03-19T035126734Z_26bc9124`
- Gate: `pass`
