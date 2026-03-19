# MCP Observatory Run Report

Generated at 2026-03-18T13:00:00.000Z

## Target and Environment Metadata

- Target: `fixture-server`
- Adapter: `local-process`
- Command: `node tests/fixtures/fixture-server.mjs`
- Server: `fixture-server 1.0.0`
- Platform: `darwin 25.0.0`
- Node: `v22.0.0`

## Executive Summary

| Gate | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- |
| fail | 2 | 2 | 0 | 0 | 0 | 0 |

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- |
| tools | fail | 6.70 | Advertised capability failed during tools/list: server error |
| prompts | pass | 1.20 | Advertised capability responded with the minimal expected shape (1 item). |
| resources | pass | 4.00 | Advertised capability responded with the minimal expected shape (2 items). |
| semantics | fail | 0.10 | At least one advertised capability did not respond successfully. |

## Evidence Snippets

### tools

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: server error

### prompts

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: daily-brief
  - Diagnostics: none

### resources

- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `2`
  - Identifiers: file://fixture/roadmap.txt, memory://cases/{id}
  - Diagnostics: none

### semantics

_No evidence was captured._

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_20260318T130000000Z_e5f6g7h8`
- Gate: `fail`
