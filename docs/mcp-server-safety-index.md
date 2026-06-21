# MCP Server Safety Index

The MCP Server Safety Index is a public, reproducible way to show how MCP servers behave under compatibility, schema quality, drift, and security checks.

The goal is constructive proof, not callouts. Each entry shows what should be tested, how to reproduce it, what risk class matters, and what a maintainer can do next.

## Index v0

| # | Server | Category | Reproducible Command | What To Check | Risk Class | Status |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | [`modelcontextprotocol/servers`](https://github.com/modelcontextprotocol/servers) sequential thinking | Reference | `npx -y @modelcontextprotocol/server-sequential-thinking@latest` | Startup, tools/list, schema quality, security-lite | Reference compatibility | PR open: [#4392](https://github.com/modelcontextprotocol/servers/pull/4392) |
| 2 | [`modelcontextprotocol/servers`](https://github.com/modelcontextprotocol/servers) filesystem | Filesystem | `npx -y @modelcontextprotocol/server-filesystem .` | Startup in harmless temp dir, path tools, schema quality | Filesystem boundary | Researched |
| 3 | [`upstash/context7`](https://github.com/upstash/context7) | Documentation/search | `npx -y @upstash/context7-mcp@latest` | Startup, retrieval tools, schemas, prompt-injection-sensitive text flow | Untrusted content retrieval | PR open: [#2800](https://github.com/upstash/context7/pull/2800) |
| 4 | [`executeautomation/mcp-playwright`](https://github.com/executeautomation/mcp-playwright) | Browser automation | `npx -y @executeautomation/playwright-mcp-server@latest` | Browser tools, schema quality, intentional code-eval suppressions | Browser/code execution | PR open: [#225](https://github.com/executeautomation/mcp-playwright/pull/225) |
| 5 | [`microsoft/playwright-mcp`](https://github.com/microsoft/playwright-mcp) | Browser automation | `npx -y @playwright/mcp@latest` | Browser tools, skip-invoke policy, schema quality, suppressions | Browser/code execution | PR open: [#1657](https://github.com/microsoft/playwright-mcp/pull/1657) |
| 6 | [`kazuph/mcp-taskmanager`](https://github.com/kazuph/mcp-taskmanager) | Developer tools | `npx -y @kazuph/mcp-taskmanager@latest` | Task tools, schema quality, mutation clarity | Project/task mutation | PR open: [#11](https://github.com/kazuph/mcp-taskmanager/pull/11) |
| 7 | [`cyanheads/filesystem-mcp-server`](https://github.com/cyanheads/filesystem-mcp-server) | Filesystem | `node dist/index.js` | Capability declarations, resources/list, sandboxed filesystem target | Filesystem boundary | PR open: [#19](https://github.com/cyanheads/filesystem-mcp-server/pull/19) |
| 8 | [`browserbase/mcp-server-browserbase`](https://github.com/browserbase/mcp-server-browserbase) | Browser automation | `npx -y @browserbasehq/mcp-server-browserbase` | Auth-free startup, browser tools, network/browser boundaries | Hosted browser control | Researched; likely needs API key |
| 9 | [`redis/mcp-redis`](https://github.com/redis/mcp-redis) | Database | `uvx mcp-redis` | Startup without live database, command surface, destructive operations | Data mutation | Researched; may need service |
| 10 | [`mongodb-js/mongodb-mcp-server`](https://github.com/mongodb-js/mongodb-mcp-server) | Database | `npx -y mongodb-mcp-server` | Connection handling, read/write tools, auth posture | Data mutation/auth | Researched; likely needs connection string |
| 11 | [`supabase-community/supabase-mcp`](https://github.com/supabase-community/supabase-mcp) | Database/SaaS | `npx -y supabase-mcp` | Startup, token handling, project mutation tools | Cloud data access | Researched; likely needs token |
| 12 | [`cloudflare/mcp-server-cloudflare`](https://github.com/cloudflare/mcp-server-cloudflare) | Cloud | `npx -y @cloudflare/mcp-server-cloudflare` | Auth posture, deploy/config tools, schema clarity | Cloud control plane | Researched; likely needs auth |
| 13 | [`stripe/agent-toolkit`](https://github.com/stripe/agent-toolkit) | Payments | `npx -y @stripe/agent-toolkit` | MCP mode, payment/customer mutation tools, auth posture | Payments/destructive action | Researched; likely needs API key |
| 14 | [`github/github-mcp-server`](https://github.com/github/github-mcp-server) | Developer tools | `docker run ghcr.io/github/github-mcp-server` | Auth handling, repo mutation tools, schema clarity | Source-code control | Researched; likely needs token |
| 15 | [`jetbrains/mcpProxy`](https://github.com/JetBrains/mcpProxy) | IDE/developer tools | `npx -y @jetbrains/mcp-proxy` | IDE dependency, startup behavior, tool surface | Local IDE control | Researched; may need IDE process |
| 16 | [`pydantic/pydantic-ai`](https://github.com/pydantic/pydantic-ai) | AI framework | `uvx pydantic-ai-mcp` | Whether standalone MCP server exists, example server compatibility | Framework adapter | Researched; may be example-based |
| 17 | [`langchain-ai/langchain-mcp-adapters`](https://github.com/langchain-ai/langchain-mcp-adapters) | AI framework | `npx -y <example-server>` | Example-server selection, adapter behavior, schema quality | Framework adapter | Researched; choose safe example |
| 18 | [`apify/actors-mcp-server`](https://github.com/apify/actors-mcp-server) | SaaS/API | `npx -y @apify/actors-mcp-server` | Token handling, actor execution tools, network boundaries | Remote automation | Researched; likely needs token |
| 19 | [`notionhq/notion-mcp-server`](https://github.com/notionhq/notion-mcp-server) | SaaS/API | `npx -y @notionhq/notion-mcp-server` | Auth handling, read/write tool separation, schema quality | Workspace data access | Researched; likely needs token |
| 20 | [`sentry/sentry-mcp`](https://github.com/getsentry/sentry-mcp) | Developer SaaS | `npx -y @sentry/mcp-server` | Auth handling, issue/project tools, schema quality | Production incident data | Researched; likely needs token |

## Evaluation Command

For simple npm-backed servers:

```bash
npx @kryptosai/mcp-observatory test --security npx -y <server-package>
```

For safer campaign PRs:

```bash
npx @kryptosai/mcp-observatory init-ci --all --command "npx -y <server-package>"
```

For production-style review:

```bash
npx @kryptosai/mcp-observatory lock
npx @kryptosai/mcp-observatory lock verify
```

## What Each Column Means

- What To Check: the minimum compatibility/security surface a maintainer or platform team should inspect.
- Risk Class: the operational reason the server matters before agents depend on it.
- Status: public proof such as PR open, PR accepted, badge added, researched, or needs maintainer review.

## Publication Rules

- Use only public repositories, public package commands, public PRs, or sample artifacts.
- Include a reproduction command for every row.
- Link to the maintainer PR or public artifact when available.
- Phrase findings constructively: “needs review” rather than “unsafe” unless there is clear public proof.
- Keep customer/domain telemetry internal unless the customer gives permission or there is independent public evidence.

## Five Patterns To Publish From v0

1. Browser automation MCP servers need explicit policy around code execution, screenshots, navigation, and mutation.
2. Filesystem MCP servers need harmless CI sandboxes and clear read/write boundaries.
3. SaaS and cloud MCP servers often cannot be meaningfully checked without token-safe target configs.
4. Database MCP servers need read/write classification and connection-string hygiene before CI rollout.
5. Lock files turn MCP surface drift into a reviewable PR event instead of an invisible agent dependency change.

## Next Wave Criteria

Prioritize 20-50 servers that have:

- active maintenance in the last 90 days
- visible stars, downloads, or directory listings
- simple `npx`, `uvx`, or Docker startup commands
- enterprise-relevant categories such as browser automation, filesystem, documentation/search, databases, cloud, productivity, and developer tools
- no existing MCP compatibility/security CI

One accepted PR in a respected repo is worth more than a large list of shallow checks.
