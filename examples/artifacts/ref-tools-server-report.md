# MCP Observatory Run Report

Generated at 2026-03-19T01:06:10.677Z

## Target and Environment Metadata

- Target: `ref-tools-server`
- Adapter: `local-process`
- Command: `npx -y ref-tools-mcp`
- Server: `Ref 3.0.3`
- Platform: `darwin 25.3.0`
- Node: `v22.22.1`

## Executive Summary

| Gate | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- |
| pass | 3 | 0 | 0 | 1 | 0 | 0 |

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- |
| tools | pass | 1.26 | Advertised capability responded with the minimal expected shape (2 items). |
| prompts | pass | 0.25 | Advertised capability responded with the minimal expected shape (2 items). |
| resources | unsupported | 0.00 | Resources are not advertised by the target. |
| semantics | pass | 0.00 | Advertised capabilities responded and returned the minimal expected shape. |

## Evidence Snippets

### tools

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: ref_search_documentation, ref_read_url
  - Diagnostics: Ref MCP Server running on stdio

### prompts

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: search_docs, my_docs
  - Diagnostics: Ref MCP Server running on stdio

### resources

- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### semantics

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: ref_search_documentation, ref_read_url
  - Diagnostics: Ref MCP Server running on stdio
- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: search_docs, my_docs
  - Diagnostics: Ref MCP Server running on stdio
- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Ref MCP Server running on stdio

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-03-19T010610677Z_88cc16e4`
- Gate: `pass`
