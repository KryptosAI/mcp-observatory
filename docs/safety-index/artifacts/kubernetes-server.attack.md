# MCP Attack Simulation Report

Generated at 2026-07-06T05:31:50.735Z

## Executive Verdict

**High-risk simulated attack findings need review before agent dependency.**

| Target | Attack Check | High | Medium | Low | Total |
| --- | --- | --- | --- | --- | --- |
| mcp-server-kubernetes | fail | 3 | 2 | 0 | 5 |

## Attack Classes Tested

- Tool poisoning in tool, prompt, resource, and schema metadata.
- Exfiltration canary and credential-like exposure in captured evidence.
- Permission-boundary risk from broad parameters plus destructive behavior.
- Contract-drift readiness when a baseline artifact is supplied.

## Findings

| Severity | Rule | Subject | Message | Recommendation |
| --- | --- | --- | --- | --- |
| medium | `mcp-observatory/attack-sim/permission-boundary/broad-destructive-tool` | tool:kubectl_apply | Tool "kubectl_apply" combines broad parameters (filename) with destructive or non-read-only behavior. | Constrain this tool with typed inputs, allowlists, explicit read-only/destructive annotations, and a harmless CI fixture. |
| medium | `mcp-observatory/attack-sim/permission-boundary/broad-destructive-tool` | tool:kubectl_delete | Tool "kubectl_delete" combines broad parameters (filename) with destructive or non-read-only behavior. | Constrain this tool with typed inputs, allowlists, explicit read-only/destructive annotations, and a harmless CI fixture. |
| high | `mcp-observatory/attack-sim/permission-boundary/broad-destructive-tool` | tool:kubectl_create | Tool "kubectl_create" combines broad parameters (filename, command) with destructive or non-read-only behavior. | Constrain this tool with typed inputs, allowlists, explicit read-only/destructive annotations, and a harmless CI fixture. |
| high | `mcp-observatory/attack-sim/permission-boundary/broad-destructive-tool` | tool:exec_in_pod | Tool "exec_in_pod" combines broad parameters (command) with destructive or non-read-only behavior. | Constrain this tool with typed inputs, allowlists, explicit read-only/destructive annotations, and a harmless CI fixture. |
| high | `mcp-observatory/attack-sim/permission-boundary/broad-destructive-tool` | tool:kubectl_generic | Tool "kubectl_generic" combines broad parameters (command) with destructive or non-read-only behavior. | Constrain this tool with typed inputs, allowlists, explicit read-only/destructive annotations, and a harmless CI fixture. |

## Reproduction Command

    npx @kryptosai/mcp-observatory attack-sim npx -y mcp-server-kubernetes

## Maintainer Fixes

- Keep MCP metadata factual, user-visible, and free of hidden instructions.
- Add strict schemas and avoid broad command/path/network parameters for destructive tools.
- Redact secret-like values from tool responses and captured logs.
- Review new or broadened tool surfaces before agents consume upgraded servers.

## Safe Simulation Only

This report uses inert metadata, schema, drift, and captured-evidence checks. It does not execute destructive payloads, contact attacker infrastructure, write/delete files, or exfiltrate real data.
