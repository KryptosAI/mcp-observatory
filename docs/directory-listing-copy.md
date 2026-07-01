# Directory And Marketplace Listing Copy

## Standard Positioning

MCP Observatory is the GitHub-native CI and security gate for MCP servers before agents depend on them.

## Short Description

CI, security checks, SARIF, GitHub Code Scanning, schema drift detection, lock files, reports, and badges for MCP servers.

## Medium Description

MCP Observatory is a CLI, GitHub Action, and MCP server for testing MCP servers before agents depend on them. It checks tools, prompts, resources, schema quality, security footguns, regressions, and drift, then generates SARIF, GitHub Code Scanning findings, lock files, reports, and badges maintainers can share.

## Long Description

MCP Observatory gives MCP servers production safety rails: one-command CI setup, compatibility checks, security analysis, SARIF output, GitHub Code Scanning upload, schema drift detection, lock-file verification, record/replay/verify workflows, PR comments, health score badges, and static enterprise reports. It can run as a CLI, inside GitHub Actions, or as an MCP server that lets agents inspect other MCP servers.

Free for local OSS use. Paid pilots are available for hosted reporting, private repo CI history, recurring security reports, certification, support, and fleet visibility.

For security and platform teams, see the MCP Server Security Field Guide and MCP Server Safety Index for agent security, AI supply chain security, and production MCP server review guidance.

## Primary CTA

Add MCP CI in one command:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server"
```

Security-native GitHub Action:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif
```

## Tags

### GitHub Topics

- `mcp`
- `model-context-protocol`
- `mcp-server`
- `mcp-testing`
- `mcp-security`
- `mcp-ci`
- `sarif`
- `code-scanning`
- `github-code-scanning`
- `schema-drift`
- `developer-tools`
- `security`
- `github-action`

### Directory Tags

- MCP
- Model Context Protocol
- Security
- Developer Tools
- Testing
- CI/CD
- Schema Drift
- Regression Testing
- AI Agents

### npm Keywords

- `mcp`
- `mcp-server`
- `model-context-protocol`
- `mcp-testing`
- `mcp-security`
- `mcp-ci`
- `schema-drift`
- `github-action`
- `developer-tools`
- `security`
- `agent-security`
- `ai-supply-chain`
- `production-monitoring`
- `enterprise-report`

## Links

- README: `https://github.com/KryptosAI/mcp-observatory#readme`
- GitHub Action: `https://github.com/KryptosAI/mcp-observatory/tree/main/action`
- GitHub Code Scanning for MCP servers: `https://github.com/KryptosAI/mcp-observatory/blob/main/docs/github-code-scanning-for-mcp.md`
- Security field guide: `https://github.com/KryptosAI/mcp-observatory/blob/main/docs/mcp-security-field-guide.md`
- Reference evaluations: `https://github.com/KryptosAI/mcp-observatory/blob/main/docs/reference-evaluations.md`
- Safety index: `https://github.com/KryptosAI/mcp-observatory/blob/main/docs/mcp-server-safety-index.md`
- Lock files: `https://github.com/KryptosAI/mcp-observatory/blob/main/docs/mcp-lock-files.md`
- Certification guide: `https://github.com/KryptosAI/mcp-observatory/blob/main/docs/certification-distribution.md`
- Proof: `https://github.com/KryptosAI/mcp-observatory/blob/main/docs/proof.md`
- Commercial pilots: `https://github.com/KryptosAI/mcp-observatory/blob/main/COMMERCIAL.md`
