# MCP Observatory Run Report

Generated at 2026-07-15T22:35:51.200Z

## Target and Environment Metadata

- Target: `jazz-mcp`
- Adapter: `local-process`
- Command: `npx -y jazz-mcp`
- Server: `unknown `
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 3 | 0 | 0 | 0 | 0 | 0 | 3 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: startup: server failed to start
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: none
- Skipped checks: tools, prompts, resources
- Unsupported checks: none
- Suggested next step: Run the target command manually, compare stderr with the diagnosis below, and only raise timeoutMs if startup is genuinely slow.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- 🔒 credential_access: Credential scanning was not performed
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Failure Diagnosis

```text
Could not establish a plain stdio MCP session for target `jazz-mcp`.
Command: npx -y jazz-mcp
Diagnosis: The process exited or detached before MCP initialization completed.
Raw error: MCP error -32000: Connection closed
Likely causes:
- The package may expect extra startup arguments or environment variables.
- The package may not behave like a plain local-process stdio target under this invocation.
- The server may be crashing immediately and only leaving clues on stderr.
Next steps:
- Run the command manually and look for usage output, auth prompts, or crash text.
- Check whether the package expects a different transport or an app-oriented startup flow.
- Use the recent stderr lines below before assuming this is a harness bug.
Recent stderr:
- npm error 404  'jazz-mcp@*' is not in this registry.
- npm error 404
- npm error 404 Note that you can also install from a
- npm error 404 tarball, folder, http url, or git url.
- npm error A complete log of this run can be found in: /Users/williamweishuhn/.npm/_logs/2026-07-15T22_35_51_284Z-debug-0.log
```

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| inspect startup | prompts | skipped | 0.00 | Skipped because startup failed before the MCP session initialized. See the failure diagnosis. |
| inspect startup | resources | skipped | 0.00 | Skipped because startup failed before the MCP session initialized. See the failure diagnosis. |
| inspect startup | tools | skipped | 0.00 | Skipped because startup failed before the MCP session initialized. See the failure diagnosis. |

## Evidence Snippets

### prompts — skipped

Summary: Skipped because startup failed before the MCP session initialized. See the failure diagnosis.

_No evidence was captured._

### resources — skipped

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
- Run ID: `run_2026-07-15T223551200Z_4d9e2cd6`
- Gate: `fail`
