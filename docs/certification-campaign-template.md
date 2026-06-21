# MCP Observatory Certification Campaign

Use this tracker for outbound PR waves against MCP server repositories.

## Campaign Goal

Open helpful PRs that add MCP Observatory CI checks and a public compatibility/security badge to popular MCP server projects.

One-shot campaign target:

- 50 researched repos
- 25 PRs opened
- 10 accepted checks or badges
- 5 public proof points added to launch materials
- 3 production/security pilot conversations started

## Qualification Rules

Prioritize:

- active MCP server repos
- clear install/run command
- recent commit or release in the last 90 days
- 100+ stars, meaningful npm downloads, directory popularity, or enterprise category
- developer tools, security, CI/CD, database, browser automation, SaaS, cloud, or finance servers

Skip:

- servers that require private credentials to start
- repos with destructive default tools
- abandoned repos unless they have major download volume
- projects that already have equivalent MCP compatibility/security CI

## Tracker

| Priority | Repo | Package/Command | Category | Stars/Downloads/Listing Signal | Activity Signal | Risk Notes | Status | PR URL | Accepted/Badge/Proof |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `modelcontextprotocol/servers` | `npx -y @modelcontextprotocol/server-sequential-thinking@latest` | Reference | Official/reference signal | GitHub check passing on PR; local validation passed: 1 tool | Fork PR token is read-only, so workflow disables PR comment/status writes | pr-opened | https://github.com/modelcontextprotocol/servers/pull/4392 | Waiting for maintainer review |
| 2 | `modelcontextprotocol/servers` | `npx -y @modelcontextprotocol/server-filesystem .` | Filesystem | Official/reference signal | verify package location | Needs harmless temp directory target | researched | | |
| 3 | `upstash/context7` | `npx -y @upstash/context7-mcp@latest` | Developer Tools | 57k+ stars / major MCP docs server | Local validation passed: 2 tools | `@latest` required for npx bin resolution | pr-opened | https://github.com/upstash/context7/pull/2800 | Waiting for maintainer review |
| 4 | `executeautomation/mcp-playwright` | `npx -y @executeautomation/playwright-mcp-server@latest` | Browser Automation | 5k+ stars / high-interest browser MCP category | Local validation passed: 33 tools, 1 resource | Requires Chromium install; suppressed intentional `playwright_evaluate:shell-injection` finding | pr-opened | https://github.com/executeautomation/mcp-playwright/pull/225 | Waiting for maintainer review |
| 5 | `browserbase/mcp-server-browserbase` | `npx -y @browserbasehq/mcp-server-browserbase` | Browser Automation | Hosted browser MCP category | verify auth-free startup | May require API key; issue-only if startup requires credentials | researched | | |
| 6 | `smithery-ai/server-sequential-thinking` | `npx -y @smithery-ai/server-sequential-thinking` | Developer Tools | MCP directory ecosystem | verify package/repo naming | Good low-risk simple server if public package starts cleanly | researched | | |
| 7 | `kazuph/mcp-taskmanager` | `npx -y @kazuph/mcp-taskmanager@latest` | Developer Tools | 200+ stars / task/project MCP category | Local validation passed: 10 tools | Scoped package name corrected from tracker | pr-opened | https://github.com/kazuph/mcp-taskmanager/pull/11 | Waiting for maintainer review |
| 8 | `cyanheads/filesystem-mcp-server` | `node dist/index.js` | Filesystem | Filesystem MCP category | Local validation passed after fix: 10 tools | Fixed real conformance bug: advertised resources without `resources/list`; workflow uses temp sandbox | closed-unmerged | https://github.com/cyanheads/filesystem-mcp-server/pull/19 | Closed by maintainer without merge |
| 9 | `redis/mcp-redis` | `uvx mcp-redis` | Database | Enterprise database category | verify auth-free startup | Database target may require service; issue-only if credentials needed | researched | | |
| 10 | `mongodb-js/mongodb-mcp-server` | `npx -y mongodb-mcp-server` | Database | Enterprise database category | verify auth-free startup | Likely needs connection string; issue-only first | researched | | |
| 11 | `supabase-community/supabase-mcp` | `npx -y supabase-mcp` | Database | Enterprise/SaaS category | verify current package | Likely requires token; issue-only first | researched | | |
| 12 | `cloudflare/mcp-server-cloudflare` | `npx -y @cloudflare/mcp-server-cloudflare` | Cloud | Enterprise cloud category | verify package | Likely requires auth; issue-only first | researched | | |
| 13 | `stripe/agent-toolkit` | `npx -y @stripe/agent-toolkit` | Payments | Enterprise payments category | verify MCP mode | Likely requires API key; issue-only first | researched | | |
| 14 | `github/github-mcp-server` | `docker run ghcr.io/github/github-mcp-server` | Developer Tools | Major platform category | verify image/startup | Auth required for useful checks; issue-only first | researched | | |
| 15 | `microsoft/playwright-mcp` | `npx -y @playwright/mcp@latest` | Browser Automation | 34k+ stars / major platform category | Local validation passed: 23 tools | Uses `skipInvoke` and explicit suppressions for intentional browser-code tools | pr-opened | https://github.com/microsoft/playwright-mcp/pull/1657 | Waiting for maintainer review |
| 16 | `jetbrains/mcpProxy` | `npx -y @jetbrains/mcp-proxy` | Developer Tools | IDE platform category | verify package | May depend on IDE process; issue-only first | researched | | |
| 17 | `BrowserMCP/mcp` | `npx -y @browsermcp/mcp` | Browser Automation | 6k+ stars / browser-control MCP category | Local validation passed: 12 tools | Browser automation trust boundary; workflow is inventory/security only | pr-opened | https://github.com/BrowserMCP/mcp/pull/189 | Waiting for maintainer review |
| 18 | `UI5/mcp-server` | `npx -y @ui5/mcp-server` | Developer Tools | SAP/UI5 ecosystem MCP package | Local validation passed: 10 tools | Developer tooling surface; no credentials required for inventory | pr-opened | https://github.com/UI5/mcp-server/pull/348 | Waiting for maintainer review |
| 19 | `apify/actors-mcp-server` | `npx -y @apify/actors-mcp-server` | SaaS/API | Automation platform category | verify auth-free startup | Likely requires token; issue-only first | researched | | |
| 20 | `makenotion/notion-mcp-server` | `npx -y @notionhq/notion-mcp-server` | SaaS/API | Major SaaS category | Local validation passed: 24 tools | Workspace-data MCP; PR is compatibility/schema/security inventory only | pr-opened | https://github.com/makenotion/notion-mcp-server/pull/324 | Waiting for maintainer review; external Semgrep check failing |
| 21 | `linear/linear-mcp` | `npx -y @linear/mcp-server` | SaaS/API | Developer SaaS category | verify package | Likely requires token; issue-only first | researched | | |
| 22 | `sentry/sentry-mcp` | `npx -y @sentry/mcp-server` | Observability | Developer SaaS category | verify package | Likely requires token; issue-only first | researched | | |
| 23 | `elastic/mcp-server-elasticsearch` | `npx -y @elastic/mcp-server-elasticsearch` | Search | Enterprise search category | verify package | Likely requires service; issue-only first | researched | | |
| 24 | `qdrant/mcp-server-qdrant` | `uvx mcp-server-qdrant` | Vector Database | AI infra category | verify package | May require service URL; issue-only first | researched | | |
| 25 | `weaviate/mcp-server-weaviate` | `uvx mcp-server-weaviate` | Vector Database | AI infra category | verify package | May require service URL; issue-only first | researched | | |
| 26 | `antvis/mcp-server-chart` | `npx -y @antv/mcp-server-chart` | Visualization/Data | 4k+ stars / chart-generation MCP category | Local validation passed: 27 tools | Generated chart artifacts; no credentials required for inventory | pr-opened | https://github.com/antvis/mcp-server-chart/pull/312 | Waiting for maintainer review |
| 27 | `owner/repo` | `uvx package` | API | | | | researched | | |
| 28 | `owner/repo` | `npx -y package` | Database | | | | researched | | |
| 29 | `owner/repo` | `npx -y package` | Search | | | | researched | | |
| 30 | `owner/repo` | `docker run image` | Cloud | | | | researched | | |
| 31 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 32 | `owner/repo` | `uvx package` | Security | | | | researched | | |
| 33 | `owner/repo` | `npx -y package` | SaaS | | | | researched | | |
| 34 | `owner/repo` | `npx -y package` | Data | | | | researched | | |
| 35 | `owner/repo` | `docker run image` | Infrastructure | | | | researched | | |
| 36 | `owner/repo` | `npx -y package` | Finance | | | | researched | | |
| 37 | `owner/repo` | `uvx package` | Browser Automation | | | | researched | | |
| 38 | `owner/repo` | `npx -y package` | API | | | | researched | | |
| 39 | `owner/repo` | `npx -y package` | Database | | | | researched | | |
| 40 | `owner/repo` | `docker run image` | Security | | | | researched | | |
| 41 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 42 | `owner/repo` | `uvx package` | Data | | | | researched | | |
| 43 | `owner/repo` | `npx -y package` | Search | | | | researched | | |
| 44 | `owner/repo` | `npx -y package` | SaaS | | | | researched | | |
| 45 | `owner/repo` | `docker run image` | Cloud | | | | researched | | |
| 46 | `owner/repo` | `npx -y package` | Filesystem | | | | researched | | |
| 47 | `owner/repo` | `uvx package` | Security | | | | researched | | |
| 48 | `owner/repo` | `npx -y package` | Developer Tools | | | | researched | | |
| 49 | `owner/repo` | `npx -y package` | Infrastructure | | | | researched | | |
| 50 | `owner/repo` | `docker run image` | Browser Automation | | | | researched | | |

Statuses:

- `researched`
- `branch-ready`
- `pr-opened`
- `accepted`
- `declined`
- `needs-maintainer-input`
- `proof-captured`
- `pilot-lead`

## PR Checklist

- Generate the local kit first:
  `npx @kryptosai/mcp-observatory init-ci --all --command "<safe startup command>"`
- Add `.github/workflows/mcp-observatory.yml`
- Add `mcp-observatory.target.json` when the startup command needs args, cwd, or env placeholders
- Use `deep: true` and `security: true`
- Keep `fail-on-regression: true` unless the repo is noisy
- Add README badge only when it fits the repo style
- Include the generated maintainer PR body from `docs/mcp-observatory-pr-body.md`
- Do not include raw telemetry, private evidence, or sales pricing
- Prefer issue-only fallback when the server requires credentials, paid services, destructive tools, or unclear startup

## PR Templates

### Workflow-Only PR

```md
This adds a lightweight MCP Observatory check for this MCP server.

Why it helps:

- verifies MCP tools/prompts/resources still respond correctly
- catches schema drift and common security footguns before release
- posts a readable PR report for maintainers
- gives users a compatibility signal when evaluating MCP servers

It runs in GitHub Actions and does not require an account. If the check is too strict for this repo, `fail-on-regression: false` can be used while keeping the report visible.
```

### Workflow + Badge PR

```md
This adds MCP Observatory CI plus a small README badge so users can see this server is checked for MCP compatibility, schema drift, and common security issues.

The workflow runs on PRs and pushes to `main`. The badge links back to MCP Observatory for context and can be removed if it does not fit the repo style.
```

### Issue-Only Fallback

~~~md
I tried preparing a small MCP Observatory CI check for this server, but did not want to open a PR without confirming the safest startup command.

Would you accept a workflow that runs:

```bash
npx @kryptosai/mcp-observatory test <server command> --security --deep
```

The goal is to give users a visible compatibility/security signal and catch schema drift before releases.
~~~

## Generated PR Body Printer

After running `init-ci --all`, print the generated maintainer copy with:

```bash
npm run certification:pr-body -- docs/mcp-observatory-pr-body.md
```

For a repo-specific body, run the command from the target branch after generating the local adoption kit.

## Proof Capture

For accepted PRs, record:

- repo
- PR URL
- category
- accepted date
- badge added: yes/no
- CI status
- quote or maintainer reaction if public
- whether the repo appears in Glama, PulseMCP, Smithery, or awesome-MCP lists

Use accepted PRs as proof for:

- README traction section
- launch posts
- enterprise outreach
- directory listing copy
- weekly MCP safety report
