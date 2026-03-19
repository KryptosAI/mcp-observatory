# MCP Observatory Run Report

Generated at 2026-03-19T03:08:08.111Z

## Target and Environment Metadata

- Target: `filesystem-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-filesystem examples/filesystem-fixture`
- Server: `secure-filesystem-server 0.2.0`
- Platform: `darwin 25.3.0`
- Node: `v22.22.1`

## Executive Summary

| Gate | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- |
| pass | 2 | 0 | 0 | 2 | 0 | 0 |

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- |
| tools | pass | 8.91 | Advertised capability responded with the minimal expected shape (14 items). |
| prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| resources | unsupported | 0.00 | Resources are not advertised by the target. |
| semantics | pass | 0.00 | Advertised capabilities responded and returned the minimal expected shape. |

## Evidence Snippets

### tools

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `14`
  - Identifiers: read_file, read_text_file, read_media_file, read_multiple_files, write_file, edit_file, create_directory, list_directory, list_directory_with_sizes, directory_tree, move_file, search_files, get_file_info, list_allowed_directories
  - Diagnostics: Secure MCP Filesystem Server running on stdio; Client does not support MCP Roots, using allowed directories set from server args: [; '/Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/filesystem-fixture'; ]

### prompts

- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

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
  - Item count: `14`
  - Identifiers: read_file, read_text_file, read_media_file, read_multiple_files, write_file, edit_file, create_directory, list_directory, list_directory_with_sizes, directory_tree, move_file, search_files, get_file_info, list_allowed_directories
  - Diagnostics: Secure MCP Filesystem Server running on stdio; Client does not support MCP Roots, using allowed directories set from server args: [; '/Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/filesystem-fixture'; ]
- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Secure MCP Filesystem Server running on stdio; Client does not support MCP Roots, using allowed directories set from server args: [; '/Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/filesystem-fixture'; ]
- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: Secure MCP Filesystem Server running on stdio; Client does not support MCP Roots, using allowed directories set from server args: [; '/Users/williamweishuhn/Documents/GitHub/mcp-observatory/examples/filesystem-fixture'; ]

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-03-19T030808111Z_d9ae6a33`
- Gate: `pass`
