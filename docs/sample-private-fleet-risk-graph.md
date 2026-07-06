# Sample Private Fleet Risk Graph

This is a sanitized example deliverable for a private MCP fleet risk graph pilot. It shows the shape of the buyer artifact without exposing customer telemetry, hostnames, emails, internal repo names, raw command output, secrets, or proprietary scoring weights.

## Executive Verdict

The reviewed fleet is usable with controls, but not yet ready for unrestricted production agent access.

Recommended decision: `gate`

Why:

- browser and command-execution MCP servers create high-impact permission boundaries
- CI/SARIF coverage is incomplete
- several dependencies lack portable receipts or maintainer-owned safe startup commands
- no destructive probes were run; evidence is safe-mode only

## Fleet Graph Summary

| Boundary | Dependencies | Highest risk | Recommended action |
| --- | ---: | --- | --- |
| Browser | 4 | high | `gate` |
| Command execution | 3 | high | `gate` |
| Infrastructure/cloud | 2 | high | `gate` |
| Memory | 2 | medium | `gate` |
| Data/API | 7 | medium | `gate` |
| Filesystem | 3 | medium | `gate` |
| Identity/auth | 1 | medium | `gate` |

## Top Risky MCP Dependencies

| Dependency | Boundary | Evidence | Risk | Owner action |
| --- | --- | --- | --- | --- |
| Browser automation server | Browser | Receipt + attack-sim + SARIF | high | Add CI/SARIF and restrict production profile. |
| Shell helper server | Command execution | Receipt + schema drift finding | high | Require explicit allowlist and owner review. |
| Cloud deployment server | Infrastructure/cloud | Receipt only | high | Add attack-sim evidence and fixture startup mode. |
| Memory server | Memory | Receipt + drift comparison | medium | Add weekly lock verification. |
| Internal docs server | Data/API | Partial receipt | medium | Provide safe startup command and rerun receipt. |

## CI Adoption Status

| State | Count | Meaning |
| --- | ---: | --- |
| CI/SARIF active | 5 | Findings upload to GitHub Code Scanning or equivalent. |
| CI present, no SARIF | 4 | Compatibility checks run, but security findings are not visible in code scanning. |
| Receipt only | 6 | Evidence exists but is not yet enforced. |
| No receipt | 7 | Dependency needs safe startup discovery before approval. |

Recommended default:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "<safe startup command>" --sarif --schedule weekly
```

## Owner-Ready Remediation List

1. Add CI/SARIF for high-capability browser, command, and infrastructure MCP servers.
2. Require safe startup commands for every production MCP dependency.
3. Generate receipts for all servers in the private fleet graph.
4. Run safe `attack-sim` for high and medium dependencies.
5. Add weekly drift checks for schemas, tool descriptions, and required fields.
6. Route `gate`, `quarantine`, and `escalate` receipts to owner review before agent rollout.

## Procurement/Security Appendix

Safe-mode guarantee:

- no destructive tool calls
- no credential probing
- no external callback infrastructure
- no production data exfiltration
- no mutation of customer repos without explicit approval

Evidence package:

- JSON risk graph
- Markdown and HTML executive graph
- run artifacts
- receipt artifacts
- SARIF outputs where applicable
- reproduction commands
- CI/SARIF setup commands
- limitations and owner notes

Commercial boundary:

- raw telemetry, customer identifiers, internal repo names, hostnames, and private command outputs stay private
- public artifacts are sanitized and published only with approval
- commercial scoring weights and lead/account intelligence are not included in the OSS repo

