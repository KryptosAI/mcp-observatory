# Testing Feishu/Lark MCP Servers

Feishu and Lark workflows often put documents, approvals, project data, and internal knowledge behind MCP servers. MCP Observatory helps teams test those servers before agents depend on them.

## Local Server Check

```bash
npx @kryptosai/mcp-observatory test --security npx -y feishu-doc-mcp
```

Use `--security` when the server exposes document search, write actions, internal URLs, or credential-backed tools.

## Internal HTTP MCP Check

For an internal HTTP MCP endpoint, create a target file:

```json
{
  "targetId": "feishu-doc-mcp",
  "adapter": "http",
  "url": "https://internal.example.com/mcp",
  "authToken": "${FEISHU_MCP_TOKEN}",
  "timeoutMs": 30000
}
```

Then run:

```bash
export FEISHU_MCP_TOKEN="..."
npx @kryptosai/mcp-observatory test --target feishu-target.json --security
```

## CI Report

```yaml
name: Feishu MCP Check
on: [pull_request]

jobs:
  observatory:
    runs-on: ubuntu-latest
    env:
      MCP_OBSERVATORY_ORG: your-company.com
      MCP_OBSERVATORY_CONTACT: your-team-contact
    steps:
      - uses: actions/checkout@v4
      - uses: KryptosAI/mcp-observatory/action@v1
        with:
          target: feishu-target.json
          security: true
```

## Enterprise Report

```bash
npx @kryptosai/mcp-observatory enterprise-report \
  --account "Feishu MCP production fleet" \
  --format html \
  --output feishu-mcp-report.html
```

Production teams can use the report for MCP owner reviews, private-repo CI history, security review, and release decisions.

Open a request for the fixed $15,000 Release Gate Pilot when 1–3 critical Feishu/Lark MCP servers need an owner-ready release decision within ten business days.
