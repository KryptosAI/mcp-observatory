# MCP Attack Simulator

MCP Attack Simulator runs safe, inert simulation checks over MCP server metadata, schemas, captured evidence, and optional baselines. It produces reproducible Safety Index evidence without executing destructive payloads.

## Quick Start

```bash
npx @kryptosai/mcp-observatory attack-sim --target ./target.json --output attack-report.md --json attack-artifact.json
```

Or run directly against a server command:

```bash
npx @kryptosai/mcp-observatory attack-sim npx -y my-mcp-server
```

For GitHub Code Scanning:

```bash
npx @kryptosai/mcp-observatory attack-sim \
  --target ./target.json \
  --json attack-artifact.json \
  --sarif attack-results.sarif \
  --fail-on-high
```

## What It Tests

- **Tool poisoning:** suspicious hidden or behavioral instructions in tool, prompt, resource, and schema metadata.
- **Exfiltration canaries:** fake Observatory canaries and credential-like values in captured evidence.
- **Permission boundaries:** broad path, command, network, or payload parameters combined with destructive or non-read-only behavior.
- **Contract drift:** when `--baseline <run-artifact>` is supplied, new destructive tools, broadened schemas, and removed required fields.

## Safe Simulation Only

The simulator does not run exploit payloads, contact attacker infrastructure, write or delete files, or exfiltrate data. It uses metadata, schema, drift, and already-captured response evidence.

If safe tool invocation is needed, run normal Observatory checks with existing deep invocation behavior and review the captured artifact. The simulator inspects captured evidence; it does not invent new dangerous calls.

## Outputs

- JSON: a normal MCP Observatory run artifact with an `attack-sim` check.
- Markdown: an attack simulation report with verdict, findings, reproduction command, and maintainer fixes.
- SARIF: Code Scanning findings for high and medium risk results.

## Baseline Drift

Use a prior run artifact as the baseline:

```bash
npx @kryptosai/mcp-observatory attack-sim \
  --target ./target.json \
  --baseline .mcp-observatory/runs/previous.json \
  --output attack-report.md
```

This flags agent-contract changes that can turn a previously acceptable MCP dependency into a review item.
