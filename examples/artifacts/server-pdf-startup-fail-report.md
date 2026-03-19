# MCP Observatory Run Report

Generated at 2026-03-19T03:49:19.813Z

## Target and Environment Metadata

- Target: `server-pdf-startup-fail`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-pdf`
- Server: `unknown `
- Platform: `darwin 25.3.0`
- Node: `v22.22.1`

## Executive Summary

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 4 | 0 | 0 | 0 | 0 | 0 | 4 |

## At a Glance

- Failing checks: none
- Partial or flaky checks: none
- Skipped checks: tools, prompts, resources, semantics
- Unsupported checks: none
- Suggested next step: Run the target command manually, compare stderr with the diagnosis below, and only raise timeoutMs if startup is genuinely slow.

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Failure Diagnosis

```text
Could not establish a plain stdio MCP session for target `server-pdf-startup-fail`.
Command: npx -y @modelcontextprotocol/server-pdf
Diagnosis: The server did not complete MCP initialization before the configured timeout.
Raw error: MCP error -32001: Request timed out
Likely causes:
- The package may start a browser, app shell, or background service instead of staying attached to stdio.
- The target may need extra startup flags, credentials, or environment variables before it becomes usable.
- The timeout may simply be too low for this package on first boot.
Next steps:
- Run the command manually and confirm it stays attached to stdio instead of launching and idling elsewhere.
- Check the package docs for required flags, auth, or setup steps before MCP initialization.
- If the command is otherwise correct, raise `timeoutMs` and try again.
Recent stderr:
- [pdf-server] Ready (1 URL(s) configured)
- Warning: Server is binding to 0.0.0.0 without DNS rebinding protection. Consider using the allowedHosts option to restrict allowed hosts, or use authentication to protect your server.
```

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| inspect startup | prompts | skipped | 0.00 | Skipped because startup failed before the MCP session initialized. See the failure diagnosis. |
| inspect startup | resources | skipped | 0.00 | Skipped because startup failed before the MCP session initialized. See the failure diagnosis. |
| inspect startup | semantics | skipped | 0.00 | Skipped because startup failed before the MCP session initialized. See the failure diagnosis. |
| inspect startup | tools | skipped | 0.00 | Skipped because startup failed before the MCP session initialized. See the failure diagnosis. |

## Evidence Snippets

### prompts — skipped

Summary: Skipped because startup failed before the MCP session initialized. See the failure diagnosis.

_No evidence was captured._

### resources — skipped

Summary: Skipped because startup failed before the MCP session initialized. See the failure diagnosis.

_No evidence was captured._

### semantics — skipped

Summary: Skipped because startup failed before the MCP session initialized. See the failure diagnosis.

_No evidence was captured._

### tools — skipped

Summary: Skipped because startup failed before the MCP session initialized. See the failure diagnosis.

_No evidence was captured._

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-03-19T034919813Z_0df24336`
- Gate: `fail`
