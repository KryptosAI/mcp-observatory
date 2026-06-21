# MCP Observatory Reference Evaluations

Reference evaluations show how MCP Observatory applies to common MCP server categories. These are public, safe examples intended to help maintainers and security reviewers understand what the tool checks and what kind of risk each category can expose.

The examples below are not customer claims. They are public evaluation targets, public pull requests, or category examples that can be reproduced with the CLI.

## Official MCP Reference Servers

Representative repo: [`modelcontextprotocol/servers`](https://github.com/modelcontextprotocol/servers)

Public proof:

- PR: [`modelcontextprotocol/servers#4392`](https://github.com/modelcontextprotocol/servers/pull/4392)
- Status: open, mergeable, with a passing MCP Observatory check as of June 19, 2026

What this represents:

- reference MCP implementations
- simple tools that should behave predictably in CI
- a good baseline for model context protocol testing

What Observatory checks:

- server startup in GitHub Actions
- tools list/respond correctly
- schema quality and security scan output
- report generation for maintainers

Adoption command:

```bash
npx @kryptosai/mcp-observatory init-ci --all --command "npx -y @modelcontextprotocol/server-sequential-thinking"
```

## Browser Automation MCP Servers

Representative public examples:

- [`microsoft/playwright-mcp`](https://github.com/microsoft/playwright-mcp)
- [`executeautomation/mcp-playwright`](https://github.com/executeautomation/mcp-playwright)

Public proof:

- PR: [`microsoft/playwright-mcp#1657`](https://github.com/microsoft/playwright-mcp/pull/1657)
- PR: [`executeautomation/mcp-playwright#225`](https://github.com/executeautomation/mcp-playwright/pull/225)

What this represents:

- high-capability browser tools
- agent access to pages, scripts, navigation, screenshots, and user-like actions
- a category where secure tool invocation and explicit trust boundaries matter

What Observatory checks:

- tool inventory
- schema quality
- risky browser/code-execution surfaces
- intentional suppressions for known acceptable findings
- whether deep invocation should be skipped for tools that can mutate browser state

Adoption command:

```bash
npx @kryptosai/mcp-observatory test --security npx -y @playwright/mcp
```

## Filesystem MCP Servers

Representative public category: filesystem-backed MCP servers.

Public proof:

- PR: [`cyanheads/filesystem-mcp-server#19`](https://github.com/cyanheads/filesystem-mcp-server/pull/19)

What this represents:

- local file access exposed to agents
- read/write boundaries that should be explicit
- capability declarations that need to match observed MCP behavior

What Observatory checks:

- tools/resources capability consistency
- broad filesystem access findings
- schema quality for path-oriented tools
- safe sandbox target configuration for CI

Adoption command:

```bash
npx @kryptosai/mcp-observatory test --security npx -y filesystem-mcp-server .
```

Use a harmless temporary directory for CI checks when evaluating filesystem servers.

## Documentation And Search MCP Servers

Representative public example: [`upstash/context7`](https://github.com/upstash/context7)

Public proof:

- PR: [`upstash/context7#2800`](https://github.com/upstash/context7/pull/2800)

What this represents:

- documentation retrieval and search tools
- untrusted or fast-changing text entering an agent context
- a category where prompt-injection-aware review matters

What Observatory checks:

- tool inventory
- schema quality
- startup reliability
- security findings around broad retrieval or response behavior
- report artifacts that maintainers can review in pull requests

Adoption command:

```bash
npx @kryptosai/mcp-observatory init-ci --all --command "npx -y @upstash/context7-mcp"
```

## How To Read These Evaluations

Passing an Observatory check means the server passed the configured compatibility and security checks for that run. It does not mean the server is universally safe for every environment.

Use the results as an engineering control:

- add CI for repeatability
- compare artifacts between releases
- review security findings and suppressions
- document accepted risk for broad tools
- escalate production/private usage to hosted reporting, certification, or fleet visibility when the server becomes operationally important
