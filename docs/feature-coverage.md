# Feature coverage and limits

Reviewed 2026-10-21 against the primary project READMEs:

- Cisco MCP Scanner: https://github.com/cisco-ai-defense/mcp-scanner
- Snyk Agent Scan: https://github.com/snyk/agent-scan

These are feature categories, not a claim of equal detection quality or benchmark superiority.

| Need | Observatory implementation | Limit |
| --- | --- | --- |
| Inspect tools, prompts, resources | `scan`, `test` | A successful handshake is not a safety guarantee |
| Review JS/TS source without launching it | `source-audit` | Static heuristic review; unsupported or unreadable input is incomplete |
| Skills and prompt-injection candidates | `skill-scan`, security checks | Deterministic rules do not replace semantic or runtime analysis |
| Suspicious package names | `package-check` | Similarity candidates, not proof of typosquatting |
| Cross-server capability combinations | `toxic-flow` | Potential paths, not observed exploitation |
| Tool/schema changes | `lock`, `diff`, permission delta | Compare only captured evidence |
| CI findings | SARIF, JUnit, GitHub Action, `setup-ci` | Review generated workflow before enabling writes |
| Local history and report downloads | `dashboard` | Up to 2,000 recent receipt files per refresh; disk-owned retention |
| Agent-assisted repair | `clearframe` | Explicit user launch; no automatic inference or evidence upload |

The local dashboard and task handoff close the gap between discovering a finding and acting on it without an Observatory hosted account. The other review categories already existed and remain free.
