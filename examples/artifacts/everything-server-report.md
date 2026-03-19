# MCP Observatory Run Report

Generated at 2026-03-19T01:06:08.368Z

## Target and Environment Metadata

- Target: `everything-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-everything`
- Server: `mcp-servers/everything 2.0.0`
- Platform: `darwin 25.3.0`
- Node: `v22.22.1`

## Executive Summary

| Gate | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- |
| pass | 4 | 0 | 0 | 0 | 0 | 0 |

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- |
| tools | pass | 11.04 | Advertised capability responded with the minimal expected shape (13 items). |
| prompts | pass | 1.19 | Advertised capability responded with the minimal expected shape (4 items). |
| resources | pass | 1.81 | Advertised capability responded with the minimal expected shape (9 items). |
| semantics | pass | 0.01 | Advertised capabilities responded and returned the minimal expected shape. |

## Evidence Snippets

### tools

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `13`
  - Identifiers: echo, get-annotated-message, get-env, get-resource-links, get-resource-reference, get-structured-content, get-sum, get-tiny-image, gzip-file-as-resource, toggle-simulated-logging, toggle-subscriber-updates, trigger-long-running-operation, simulate-research-query
  - Diagnostics: Starting default (STDIO) server...

### prompts

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `4`
  - Identifiers: simple-prompt, args-prompt, completable-prompt, resource-prompt
  - Diagnostics: Starting default (STDIO) server...

### resources

- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `9`
  - Identifiers: demo://resource/static/document/architecture.md, demo://resource/static/document/extension.md, demo://resource/static/document/features.md, demo://resource/static/document/how-it-works.md, demo://resource/static/document/instructions.md, demo://resource/static/document/startup.md, demo://resource/static/document/structure.md, demo://resource/dynamic/text/{resourceId}, demo://resource/dynamic/blob/{resourceId}
  - Diagnostics: Starting default (STDIO) server...

### semantics

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `13`
  - Identifiers: echo, get-annotated-message, get-env, get-resource-links, get-resource-reference, get-structured-content, get-sum, get-tiny-image, gzip-file-as-resource, toggle-simulated-logging, toggle-subscriber-updates, trigger-long-running-operation, simulate-research-query
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
  - Identifiers: demo://resource/static/document/architecture.md, demo://resource/static/document/extension.md, demo://resource/static/document/features.md, demo://resource/static/document/how-it-works.md, demo://resource/static/document/instructions.md, demo://resource/static/document/startup.md, demo://resource/static/document/structure.md, demo://resource/dynamic/text/{resourceId}, demo://resource/dynamic/blob/{resourceId}
  - Diagnostics: Starting default (STDIO) server...

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-03-19T010608367Z_bccf39df`
- Gate: `pass`
