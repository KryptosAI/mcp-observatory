# MCP Observatory Run Report

Generated at 2026-03-19T04:26:55.684Z

## Target and Environment Metadata

- Target: `opentofu-server`
- Adapter: `local-process`
- Command: `npx -y @opentofu/opentofu-mcp-server`
- Server: `opentofu 0.1.0`
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
- Unsupported checks: prompts
- Suggested next step: Confirm that unsupported capabilities are intentional for this target: prompts.

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| healthy | resources | pass | 1.03 | Advertised capability responded with the minimal expected shape (1 items). |
| healthy | semantics | pass | 0.00 | Advertised capabilities responded and returned the minimal expected shape: tools, resources. |
| healthy | tools | pass | 2.94 | Advertised capability responded with the minimal expected shape (5 items). |

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

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (1 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: opentofu:registry-info
  - Diagnostics: none
- Endpoint: `resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### semantics — pass

Summary: Advertised capabilities responded and returned the minimal expected shape: tools, resources.

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: search-opentofu-registry, get-provider-details, get-module-details, get-resource-docs, get-datasource-docs
  - Diagnostics: none
- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none
- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `1`
  - Identifiers: opentofu:registry-info
  - Diagnostics: none

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (5 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `5`
  - Identifiers: search-opentofu-registry, get-provider-details, get-module-details, get-resource-docs, get-datasource-docs
  - Diagnostics: none

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-03-19T042655684Z_47b34ad4`
- Gate: `pass`
