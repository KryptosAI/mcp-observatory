# MCP Risk Graph

Agent trust should be a risk graph, not a follower graph.

A follower graph says who is popular. An MCP risk graph says which agent toolchains were evaluated, what capability boundary each server exposes, what receipts support the verdict, which evidence can be rerun, where CI/SARIF should be added, and what changed since the last trusted state.

MCP Observatory maps the risk graph of agent toolchains before agents depend on them.

## Generate A Graph

Use `risk-graph` to merge run artifacts, receipt artifacts, or a Safety Index artifact directory into JSON, Markdown, and HTML outputs:

```bash
npx @kryptosai/mcp-observatory risk-graph --input docs/safety-index/artifacts --json mcp-risk-graph.json --output mcp-risk-graph.md --html mcp-risk-graph.html
```

Supported inputs:

- one JSON run artifact
- one JSON receipt
- an audit report JSON with an embedded `artifact`
- a directory containing any mix of supported artifacts
- repeated `--input` paths

The JSON output is intended for agents and tooling. The Markdown output is intended for GitHub and docs. The HTML output is intended for demos, buyer review, and internal security conversations.

## Graph Fields

| Field | Meaning |
| --- | --- |
| Server | Public MCP server, package, repo, or private fleet dependency. |
| Capability boundary | Filesystem, browser, command execution, infrastructure/cloud, memory, data/API, identity/auth, or unknown. |
| Receipt state | Whether the current evidence is ready for CI, needs review, blocked, or could not be evaluated. |
| Recommended action | `allow`, `gate`, `rerun`, `quarantine`, or `escalate`. |
| Risk level | Graph-level severity derived from receipts, attack-sim evidence, findings, and action receipts. |
| Evidence refs | Source artifact paths and SHA-256 hashes. |
| CI command | The exact `setup-ci --all --sarif` command maintainers can run. |

## Seed Public Map

The seed graph is intentionally evidence-based, not a dunk list. A public entry means MCP Observatory has a safe, reproducible command and an artifact path. It is not an official certification and should not be treated as a production approval.

### Browser Boundary

| Server | Receipt | Attack evidence | CI/SARIF path | Maintainer note |
| --- | --- | --- | --- | --- |
| [BrowserMCP](https://github.com/BrowserMCP/mcp) | [JSON](./safety-index/artifacts/browsermcp-server.json) / [report](./safety-index/artifacts/browsermcp-server.md) | `attack-sim npx -y @browsermcp/mcp` | `setup-ci --all --command "npx -y @browsermcp/mcp" --sarif` | Browser automation should have clear CI evidence before agents depend on it. |
| [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp) | [JSON](./safety-index/artifacts/playwright-mcp-server.json) / [report](./safety-index/artifacts/playwright-mcp-server.md) | `attack-sim npx -y @playwright/mcp` | `setup-ci --all --command "npx -y @playwright/mcp" --sarif` | High-capability browser boundary; safe evidence is useful for downstream adopters. |
| [Puppeteer MCP server](https://www.npmjs.com/package/puppeteer-mcp-server) | [JSON](./safety-index/artifacts/puppeteer-server.json) / [report](./safety-index/artifacts/puppeteer-server.md) | `attack-sim npx -y puppeteer-mcp-server` | `setup-ci --all --command "npx -y puppeteer-mcp-server" --sarif` | Public package, no production credentials, no destructive tool invocation. |

### Command Execution And Infrastructure Boundary

| Server | Receipt | Attack evidence | CI/SARIF path | Maintainer note |
| --- | --- | --- | --- | --- |
| [OpenTofu MCP server](https://github.com/opentofu/opentofu-mcp-server) | [JSON](./safety-index/artifacts/opentofu-server.json) / [report](./safety-index/artifacts/opentofu-server.md) | `attack-sim npx -y @opentofu/opentofu-mcp-server` | `setup-ci --all --command "npx -y @opentofu/opentofu-mcp-server" --sarif` | Infrastructure tools deserve explicit permission-boundary evidence before production use. |
| [Flux159 Kubernetes MCP server](https://github.com/Flux159/mcp-server-kubernetes) | [JSON](./safety-index/artifacts/kubernetes-server.json) / [report](./safety-index/artifacts/kubernetes-server.md) | [attack-sim](./safety-index/artifacts/kubernetes-server.attack.md) / [SARIF](./safety-index/artifacts/kubernetes-server.attack.sarif) | `setup-ci --all --command "npx -y mcp-server-kubernetes" --sarif` | Kubernetes and cluster mutation boundaries should be reviewed with no kubeconfig or cluster calls in public evidence. |

### Memory Boundary

| Server | Receipt | Attack evidence | CI/SARIF path | Maintainer note |
| --- | --- | --- | --- | --- |
| [Official memory server](https://github.com/modelcontextprotocol/servers) | [JSON](./safety-index/artifacts/memory-server.json) / [report](./safety-index/artifacts/memory-server.md) | `attack-sim npx -y @modelcontextprotocol/server-memory` | `setup-ci --all --command "npx -y @modelcontextprotocol/server-memory" --sarif` | Memory tools need clear evidence around persistence, recall, and schema drift. |

### Data/API And General Tooling Boundary

| Server | Receipt | Attack evidence | CI/SARIF path | Maintainer note |
| --- | --- | --- | --- | --- |
| [Context7](https://github.com/upstash/context7) | [JSON](./safety-index/artifacts/context7-server.json) / [report](./safety-index/artifacts/context7-server.md) | `attack-sim npx -y @upstash/context7-mcp` | `setup-ci --all --command "npx -y @upstash/context7-mcp" --sarif` | Documentation/data access servers are good candidates for portable receipts and maintainer CI. |
| [Official everything server](https://github.com/modelcontextprotocol/servers) | [JSON](./safety-index/artifacts/everything-server.json) / [report](./safety-index/artifacts/everything-server.md) | `attack-sim npx -y @modelcontextprotocol/server-everything` | Public reference baseline; CI-ready. | Baseline server for validating Observatory behavior and receipt output. |
| [Official sequential thinking server](https://github.com/modelcontextprotocol/servers) | [JSON](./safety-index/artifacts/sequential-thinking-server.json) / [report](./safety-index/artifacts/sequential-thinking-server.md) | `attack-sim npx -y @modelcontextprotocol/server-sequential-thinking` | Public reference baseline; CI-ready. | Low-destructive baseline useful for receipt and graph examples. |

## Maintainer Conversation Templates

Use these when opening or replying to maintainer conversations. Keep them short, specific, and easy to rerun.

### Safe Receipt Generated

```text
We generated a safe MCP Observatory receipt for this server using a public startup command. It does not use secrets, production data, external callbacks, or destructive tool calls.

Receipt/report: <artifact link>
Reproduce: npx @kryptosai/mcp-observatory receipt <safe startup command> --profile nsa-mcp --format markdown --output receipt.md
CI/SARIF: npx @kryptosai/mcp-observatory setup-ci --all --command "<safe startup command>" --sarif --schedule weekly

If there is a safer startup mode or fixture command you prefer, tell us and we can rerun the receipt.
```

### CI/SARIF Follow-Up

```text
This server now has reproducible MCP receipt evidence. The next useful maintainer step is a weekly CI/SARIF gate:

npx @kryptosai/mcp-observatory setup-ci --all --command "<safe startup command>" --sarif --schedule weekly

That gives downstream users a GitHub-native signal when tool schemas, descriptions, or attack-readiness findings drift.
```

### Claim Or Update Receipt

```text
Maintainers can claim/update this receipt by providing the preferred safe startup command, expected capability boundary, and any fixture mode that avoids credentials or production systems.

We will keep the public entry evidence-based and mark limitations directly in the receipt instead of treating this as a ranking dunk.
```

## How To Add A Node

1. Open a [Drop an MCP server, get a receipt request](https://github.com/KryptosAI/mcp-observatory/issues/new?template=tool-call-receipt-request.yml).
2. Provide a public MCP server and safe startup command.
3. Run:

```bash
npx @kryptosai/mcp-observatory test <safe startup command> --json run-artifact.json --markdown run-report.md
npx @kryptosai/mcp-observatory attack-sim <safe startup command> --json attack-artifact.json --output attack-report.md --sarif attack-results.sarif
npx @kryptosai/mcp-observatory receipt <safe startup command> --profile nsa-mcp --format json --output receipt.json
npx @kryptosai/mcp-observatory risk-graph --input . --json mcp-risk-graph.json --output mcp-risk-graph.md --html mcp-risk-graph.html
npx @kryptosai/mcp-observatory setup-ci --all --command "<safe startup command>" --sarif --schedule weekly
```

4. Attach sanitized artifacts or open a focused PR.

## Commercial Boundary

The public graph should maximize trust and adoption. The private graph should maximize buyer value.

Public:

- target name and safe startup command
- receipt, run artifact, SARIF, Markdown/HTML reports
- capability boundary and recommended action
- maintainer note and rerun command

Private:

- raw telemetry, emails, hostnames, and account identifiers
- exact commercial scoring weights
- private fleet inventory
- buyer-specific remediation notes
- hosted retention, alerts, SIEM export, and incident timeline workflows

See [Open Core And Commercial Boundary](./commercial-boundary.md) and [Private MCP Fleet Risk Graph](./private-mcp-fleet-risk-graph.md).
