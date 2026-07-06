# MCP Risk Graph

MCP Observatory maps the risk graph of agent toolchains before agents depend on them.

This graph is evidence-based and safe-mode only. It links MCP servers to receipts, attack-sim output, capability boundaries, recommended actions, and CI/SARIF next steps.

## Summary

- Servers: 15
- Capability boundaries: 5
- Highest risk: high
- Generated at: 2026-07-06T22:47:17.078Z

## Servers

| Server | Boundary | Risk | Action | Receipt | CI command | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| @cyanheads/git-mcp-server | filesystem | medium | gate | not_generated | mcp-observatory setup-ci --all --command "npx -y @cyanheads/git-mcp-server" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/cyanheads-git-mcp-server.json<br>attack-sim:docs/safety-index/artifacts/cyanheads-git-mcp-server.json |
| Browser MCP | browser | low | allow | not_generated | mcp-observatory setup-ci --all --command "npx -y @browsermcp/mcp" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/browsermcp-server.json<br>attack-sim:docs/safety-index/artifacts/browsermcp-server.json |
| Context7 | unknown | medium | gate | not_generated | mcp-observatory setup-ci --all --command "npx -y @upstash/context7-mcp" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/context7-server.json<br>attack-sim:docs/safety-index/artifacts/context7-server.json |
| example-servers/puppeteer | browser | high | quarantine | not_generated | mcp-observatory setup-ci --all --command "npx -y puppeteer-mcp-server" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/puppeteer-server.json<br>attack-sim:docs/safety-index/artifacts/puppeteer-server.json |
| kubernetes | infra-cloud | high | quarantine | not_generated | mcp-observatory setup-ci --all --command "npx -y mcp-server-kubernetes" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/kubernetes-server.attack.json<br>attack-sim:docs/safety-index/artifacts/kubernetes-server.attack.json<br>run-artifact:docs/safety-index/artifacts/kubernetes-server.json<br>attack-sim:docs/safety-index/artifacts/kubernetes-server.json |
| mcp-server-chart | unknown | low | allow | not_generated | mcp-observatory setup-ci --all --command "npx -y @antv/mcp-server-chart" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/antv-chart-server.json<br>attack-sim:docs/safety-index/artifacts/antv-chart-server.json |
| mcp-servers/everything | filesystem | low | allow | not_generated | mcp-observatory setup-ci --all --command "npx -y @modelcontextprotocol/server-everything" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/everything-server.json<br>attack-sim:docs/safety-index/artifacts/everything-server.json |
| memory-server | memory | low | allow | not_generated | mcp-observatory setup-ci --all --command "npx -y @modelcontextprotocol/server-memory" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/memory-server.json<br>attack-sim:docs/safety-index/artifacts/memory-server.json |
| opentofu | infra-cloud | medium | gate | not_generated | mcp-observatory setup-ci --all --command "npx -y @opentofu/opentofu-mcp-server" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/opentofu-server.json<br>attack-sim:docs/safety-index/artifacts/opentofu-server.json |
| Playwright | browser | high | quarantine | not_generated | mcp-observatory setup-ci --all --command "npx -y @playwright/mcp" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/playwright-mcp-server.json<br>attack-sim:docs/safety-index/artifacts/playwright-mcp-server.json |
| playwright-mcp | browser | high | quarantine | not_generated | mcp-observatory setup-ci --all --command "npx -y @executeautomation/playwright-mcp-server" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/executeautomation-playwright-server.json<br>attack-sim:docs/safety-index/artifacts/executeautomation-playwright-server.json |
| promptopia-mcp | filesystem | low | allow | not_generated | mcp-observatory setup-ci --all --command "npx -y promptopia-mcp" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/promptopia-server.json<br>attack-sim:docs/safety-index/artifacts/promptopia-server.json |
| Ref | unknown | low | allow | not_generated | mcp-observatory setup-ci --all --command "npx -y ref-tools-mcp" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/ref-tools-server.json<br>attack-sim:docs/safety-index/artifacts/ref-tools-server.json |
| secure-filesystem-server | filesystem | medium | gate | not_generated | mcp-observatory setup-ci --all --command "npx -y @modelcontextprotocol/server-filesystem examples/filesystem-fixture" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/filesystem-server.json<br>attack-sim:docs/safety-index/artifacts/filesystem-server.json |
| sequential-thinking-server | unknown | low | allow | not_generated | mcp-observatory setup-ci --all --command "npx -y @modelcontextprotocol/server-sequential-thinking" --sarif --schedule weekly | run-artifact:docs/safety-index/artifacts/sequential-thinking-server.json<br>attack-sim:docs/safety-index/artifacts/sequential-thinking-server.json |

## Recommended Actions

- @cyanheads/git-mcp-server: Gate adoption until maintainers review the finding.
- Context7: Gate adoption until maintainers review the finding.
- opentofu: Gate adoption until maintainers review the finding.
- secure-filesystem-server: Gate adoption until maintainers review the finding.
- example-servers/puppeteer: Quarantine from production agents until the boundary is reduced or accepted.
- kubernetes: Quarantine from production agents until the boundary is reduced or accepted.
- Playwright: Quarantine from production agents until the boundary is reduced or accepted.
- playwright-mcp: Quarantine from production agents until the boundary is reduced or accepted.

## Maintainer Note Template

We generated a safe MCP Observatory receipt for your MCP server. It includes the exact evidence artifact, recommended action, and CI/SARIF command. If this startup command is not the safest public mode, reply with the preferred no-secret command and we will update the receipt.
