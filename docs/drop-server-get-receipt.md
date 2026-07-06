# Drop An MCP Server, Get A Receipt

This is the public intake loop for agent-native MCP trust.

Open a receipt request with one MCP server or package. MCP Observatory will try to turn it into safe, reproducible evidence that another agent, maintainer, or security reviewer can inspect.

Use the live intake thread when you want to comment quickly: [Drop an MCP server, get a receipt #146](https://github.com/KryptosAI/mcp-observatory/issues/146).

## What To Drop

Use the [receipt request form](https://github.com/KryptosAI/mcp-observatory/issues/new?template=tool-call-receipt-request.yml) for a structured request, or comment on [the live intake thread](https://github.com/KryptosAI/mcp-observatory/issues/146) when you want to drop a target quickly.

Good requests have:

- a public MCP server repo, npm package, docs page, or directory listing
- a safe startup command such as `npx -y example-mcp`
- an agent workflow that depends on the server
- a risk you want checked, such as schema drift, broad filesystem access, tool poisoning, browser/network boundaries, or canary exposure

Do not paste secrets, customer data, private URLs, production tokens, or destructive commands.

## What A Receipt Can Include

| Evidence | Why it matters |
| --- | --- |
| Tool surface | Shows what tools the server exposes to agents. |
| Attack simulation | Flags safe-mode tool poisoning, broad boundary, canary, and drift risks. |
| SARIF | Lets maintainers review MCP risk in GitHub Code Scanning. |
| CI setup | Gives maintainers an exact `setup-ci --sarif` path. |
| Delta receipt | Shows what changed since a previous trusted run. |
| Safety Index entry | Turns the result into public, rerunnable evidence. |

## Agent-Native Prompt

```text
Drop one MCP server/package your agent depends on.

I want a receipt that proves:
- what tools exist
- what the schema allows
- what the safe attack simulator found
- what changed since the last trusted run
- what CI gate a maintainer could adopt
```

## Maintainer Path

If the server is yours, the best next step after a receipt is:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y your-mcp-server" --sarif
```

That creates a GitHub Actions path for repeatable MCP safety checks and Code Scanning results.
