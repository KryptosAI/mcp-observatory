# Sample MCP Attack Simulation Evidence Pack

This is a sanitized example of the private deliverable produced during an MCP Attack Simulation Evidence Pack. Real customer reports should use customer-approved targets, fixtures, and disclosure language.

## Executive Verdict

**Verdict:** Needs review before production agent dependency.

The reviewed MCP server exposes useful automation capabilities, but several tools combine broad parameters with write-capable or command-capable behavior. The server can be used in controlled development environments, but production agent workflows should require CI evidence, schema review, and explicit owner approval before enabling these tools broadly.

## Scope

| Item | Value |
| --- | --- |
| Review type | Safe-mode MCP attack simulation |
| Targets | 5 representative MCP servers |
| Evidence | Startup checks, tool/capability inventory, schema drift checks, safe attack simulation, SARIF |
| Excluded | Production credentials, destructive tool calls, external attacker infrastructure, real data exfiltration |
| Output | JSON artifacts, Markdown reports, SARIF, executive summary, CI gate recommendation |

## Attack Classes Tested

| Attack Class | What Was Checked | Outcome |
| --- | --- | --- |
| Tool poisoning | Hidden/instructional text in tool names, descriptions, schema descriptions, prompts, and resources | No critical hidden instruction strings found |
| Exfiltration canary exposure | Credential-like leakage and inert canary exposure in metadata or captured safe responses | No live secrets observed in reviewed evidence |
| Permission-boundary risk | Broad file, command, URL, network, or write parameters combined with non-read-only behavior | High-priority review needed for command-capable tools |
| Rug-pull/drift readiness | Added destructive tools, broadened schemas, removed required fields, and newly risky descriptions compared with baseline | CI baseline recommended before rollout |

## Top Findings

| Severity | Class | Item | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| High | Permission boundary | command-capable tool | Tool accepts broad command-like input and is not clearly marked read-only | Require allowlisted commands, typed arguments, explicit destructive annotations, and human approval for production |
| Medium | Drift readiness | schema broadening | Optional fields allow broader runtime behavior than prior baseline | Add lock-file verification and fail CI on unreviewed schema broadening |
| Medium | Tool poisoning | long schema descriptions | Several descriptions include agent-directed instructions mixed with user-facing semantics | Separate operational guidance from tool descriptions and keep schema descriptions factual |

## CI Gate Recommendation

Add a weekly scheduled MCP Observatory workflow and block pull requests only on high-severity findings after an initial tuning pass:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --sarif --schedule weekly --command "npx -y <server-package>"
```

For servers with write-capable or credential-dependent tools, use a fixture, sandbox, or metadata-only target until a safe invocation harness exists.

## Owner-Ready Fix List

1. Split read-only and write-capable tools into separate permission groups.
2. Replace free-form command/path parameters with typed enums, allowlists, or constrained schemas where possible.
3. Add explicit read-only/destructive annotations in tool descriptions.
4. Add SARIF upload so security findings appear in GitHub Code Scanning.
5. Add lock-file verification to detect schema/tool drift before agent runtime rollout.
6. Re-run safe attack simulation after each MCP server release.

## Reproduction Commands

```bash
npx @kryptosai/mcp-observatory test npx -y <server-package> --sarif observatory.sarif
npx @kryptosai/mcp-observatory attack-sim npx -y <server-package> --json attack-artifact.json --output attack-report.md --sarif attack-results.sarif
npx @kryptosai/mcp-observatory enterprise-report --sample --format html --output reports/sample-enterprise-report.html
```

## Safe Simulation Disclaimer

This evidence pack uses inert metadata, schema, drift, and safe captured-evidence checks. It does not execute destructive payloads, contact attacker infrastructure, write or delete customer files, mutate production services, or exfiltrate real data.

## Commercial Fit

This sample maps to the [MCP Attack Simulation Evidence Pack](./attack-simulation-pilot.md):

- Quickstart: 1-3 servers, private report, SARIF, CI gate
- Evidence Pack: up to 10 servers, executive packet, remediation notes, CI rollout
- Platform Pilot: up to 25 servers, fleet inventory, recurring review plan, stakeholder readout
