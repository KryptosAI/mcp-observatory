# Code Scanning Launch Outreach

Use this when following up with maintainers or posting publicly about the SARIF release.

## Public Post

MCP servers are becoming production dependencies for AI agents. They should show up in the same security review surfaces as the rest of the software supply chain.

MCP Observatory now turns MCP server checks into GitHub Code Scanning findings.

One command:

```bash
npx @kryptosai/mcp-observatory test npx -y my-mcp-server --sarif mcp-observatory.sarif
```

CI setup:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif
```

It normalizes compatibility, startup, schema-quality, and security evidence into SARIF so maintainers can review MCP risk in GitHub's Security tab.

No hosted account required. SARIF upload is opt-in.

## Maintainer Follow-Up

~~~md
Quick follow-up: MCP Observatory now supports GitHub Code Scanning friendly SARIF for MCP compatibility, schema-quality, startup, and security findings.

If you want this as a security-native advisory check, the generated workflow is:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>" --sarif
```

It stays opt-in because it requests `security-events: write`; the default CI setup remains read-only.
~~~

## Warm Bot/Runtime Follow-Up

~~~md
For agent runtimes, the useful path is a safe preflight target plus SARIF evidence:

```bash
npx @kryptosai/mcp-observatory test npx -y <mcp-server> --sarif mcp-observatory.sarif
```

That lets a bot/runtime review MCP tool risk as structured findings instead of terminal-only output.
~~~

## Directory Submission Copy

MCP Observatory is a GitHub-native CI and security gate for MCP servers before agents depend on them. It emits SARIF and can upload MCP compatibility, startup, schema-quality, and security findings to GitHub Code Scanning.
