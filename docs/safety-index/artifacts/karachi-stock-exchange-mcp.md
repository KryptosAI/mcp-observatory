# MCP Observatory Run Report

Generated at 2026-07-15T22:45:00.000Z

## Target and Environment Metadata

- Target: `karachi-stock-exchange-mcp`
- Adapter: `local-process`
- Command: `npx -y karachi-stock-exchange-mcp`
- Server: `unknown`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`
- Region: `pakistan`

## Executive Summary

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 3 | 0 | 0 | 0 | 0 | 0 | 3 |

## At a Glance

- Safety verdict: **Blocked** — Pakistani-region community server; exact npm package name pending verification.
- Region: Pakistan — Western scanners typically miss this category of MCP servers.
- Category: Finance / Pakistan Markets
- Risk Class: Stock exchange API access (Pakistan markets)
- Failure Class: Market data/trading boundary
- Top risks: startup: package not yet verified on npm
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: none
- Skipped checks: tools, prompts, resources
- Unsupported checks: none
- Suggested next step: Verify the exact npm package name; submit a PR to `docs/safety-index/targets.json` with the correct package name and run `npm run safety-index`.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## Why This Matters

The Pakistan Stock Exchange (PSX, formerly KSE) is Pakistan's premier stock exchange with 500+ listed companies representing a $340B+ economy. MCP servers feeding PSX market data to agents provide financial data invisible to Western scanners.

## NPM Verification Status

Unverified: exact npm package name pending community verification.

## Reproduction Notes

Schema-only evaluation; requires PSX API credentials. Community package — exact npm name pending verification.

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- 🔒 credential_access: Credential scanning was not performed
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Failure Diagnosis

```text
Pakistani-region community MCP server `karachi-stock-exchange-mcp` — exact npm package name pending community verification.
Western scanners typically miss Pakistani-region packages.
If this package exists under a different name, submit a PR to update the safety index target.

Region: Pakistan
Category: Finance / Pakistan Markets
Risk Class: Stock exchange API access (Pakistan markets)
Failure Class: Market data/trading boundary
```

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| inspect startup | prompts | skipped | 0.00 | Skipped — Pakistani-region community MCP server; package not yet verified on npm registry. |
| inspect startup | resources | skipped | 0.00 | Skipped — Pakistani-region community MCP server; package not yet verified on npm registry. |
| inspect startup | tools | skipped | 0.00 | Skipped — Pakistani-region community MCP server; package not yet verified on npm registry. |

## Evidence Snippets

### prompts — skipped

Summary: Skipped — Pakistani-region community MCP server; package not yet verified on npm registry.

_No evidence was captured._

### resources — skipped

Summary: Skipped — Pakistani-region community MCP server; package not yet verified on npm registry.

_No evidence was captured._

### tools — skipped

Summary: Skipped — Pakistani-region community MCP server; package not yet verified on npm registry.

_No evidence was captured._

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_20260715T224500Z_kse01`
- Gate: `fail`
- Region: `pakistan`
