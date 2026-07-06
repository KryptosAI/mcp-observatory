# Agent And MCP Ecosystem Promotion Plan

Use this plan to turn MCP Observatory visibility into agent installs, CI integrations, maintainer conversations, and MCP company relationships.

The campaign position:

> Agents should not depend on tools nobody tests.

The conversion goal is not raw stars. The goal is more `setup-ci`, SARIF/code-scanning, external CI, and agent-accessible `serve` sessions.

## Immediate Moves

1. Leave third-party badge PRs open unless the provider has clear public scan evidence and acceptable badge wording.
2. Claim or refresh directory listings with neutral listing copy, not unreviewed audit claims.
3. Publish one short agent-first post or thread per week.
4. Open five small Observatory CI PRs per week against public MCP server repos.
5. Track whether each surface converts into `test`, `scan`, `setup-ci`, `serve`, or external CI sessions.

## MseeP Listing

Claim the listing, but do not merge the current badge PR unless the listing exposes reviewed scan evidence and the badge wording is acceptable.

Listing URL:

`https://mseep.ai/app/kryptosai-mcp-observatory`

Claim flow:

1. Open the listing.
2. Click `Claim Ownership`.
3. Sign in with the GitHub account or organization that controls `KryptosAI/mcp-observatory`.
4. Confirm the repo URL is `https://github.com/KryptosAI/mcp-observatory`.
5. Update the listing copy using the text below.
6. If MseeP shows security/audit metadata, verify the evidence before linking it from project-owned materials.

Preferred listing copy:

```text
MCP Observatory is the GitHub-native CI and security gate for MCP servers before agents depend on them.
```

Short description:

```text
CI, SARIF, GitHub Code Scanning, schema drift detection, lock files, reports, and agent-accessible diagnostics for MCP servers.
```

Primary command:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>" --sarif
```

Agent install command:

```bash
claude mcp add mcp-observatory -- npx -y @kryptosai/mcp-observatory serve
```

Badge policy:

- Directory listing: yes.
- Plain text link: acceptable if the listing is accurate.
- Badge saying `Audited`, `Certified`, `Verified`, or similar: only after public evidence is reviewed.
- README placement: keep below first-party CI/npm/license/action signals unless the provider becomes a meaningful trust surface.

## Directory Targets

Refresh these surfaces first because they are already relevant to MCP users:

| Surface | Desired State | CTA |
| --- | --- | --- |
| PulseMCP | Claimed/current listing with `server.json` visible | `setup-ci --all` |
| Smithery | Current install snippet and MCP server mode | `serve` |
| Glama | Current scorecard and README links | `test` and `serve` |
| MseeP | Claimed listing with neutral copy | `setup-ci --sarif` |
| mcpservers.org | Listing present or submitted | `setup-ci --all` |
| awesome-mcp-servers | Developer tools/security category mention | `setup-ci --all` |
| agent framework docs/community lists | Agent workflow examples | `serve` |
| GitHub Action Marketplace | Action example and security framing | `action@v0.28.0` |

Submission snippet:

```text
MCP Observatory adds CI, compatibility, schema drift, SARIF/GitHub Code Scanning, and lightweight security checks for MCP servers before agents depend on them.
```

## Agent-First Prompts

Use these in docs, posts, issues, and agent community replies.

Add CI:

```text
Add MCP Observatory CI to this MCP server. Use a read-only or harmless startup command, enable deep and security checks when safe, and avoid secrets in the workflow.
```

Audit local config:

```text
Run MCP Observatory against my MCP config, summarize startup failures, risky tools, schema issues, and which servers should get CI coverage first.
```

Prepare a safe target:

```text
Create a CI-safe MCP Observatory target config for this MCP server. Prefer harmless fixtures, no tokens, and no write-capable operations.
```

Check drift:

```text
Add an MCP lock file for this server and verify in CI that the tool, prompt, and resource surface does not drift unexpectedly.
```

## MCP Company Targets

Start with companies and projects whose users already care about agent reliability:

| Target Type | Examples | Ask |
| --- | --- | --- |
| MCP directories | PulseMCP, Smithery, Glama, MseeP | Keep listing current; add CI/security category placement |
| Agent browsers/scrapers | Browserbase, Firecrawl, Exa, BrowserStack | Publish a safe Observatory target or sample workflow |
| Agent runtimes | Cline, Continue, Goose, Cursor/Windsurf ecosystem | Add Observatory to recommended MCP preflight docs |
| Dev platform MCPs | Sentry, Notion, Stripe, Cloudflare, GitHub ecosystem | Add optional read-only CI checks or issue-first safe target guidance |
| Gateways/proxies | MCP gateway and registry projects | Support Observatory reports as compatibility evidence |

First outreach message:

```md
Hi, I maintain MCP Observatory, an open source CI/security gate for MCP servers before agents depend on them.

I noticed your team is in the MCP ecosystem. Would a small, read-only Observatory target or GitHub Action example be useful for your server/docs?

The goal is simple: give agent users a reproducible startup/schema/security check they can run before installing or upgrading an MCP dependency.

Command shape:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>" --sarif
```

Happy to open a tiny docs PR or start with an issue asking for the safest CI command.
```

## Certification PR Shape

Prefer a small, reversible PR:

- Adds one workflow or docs snippet.
- Uses a harmless command or fixture.
- Does not require secrets.
- Does not add a third-party badge by default.
- Sets write permissions only when the maintainer explicitly wants PR comments/statuses.
- Links to the generated run artifact or safety-index report when available.

PR title:

```text
Add optional MCP Observatory CI check
```

PR body:

```md
This adds an optional MCP Observatory workflow so maintainers can verify MCP startup, tool discovery, schema quality, and basic security findings in CI before agents depend on the server.

It is intentionally read-only and does not require secrets. If this is useful, maintainers can later opt into PR comments, commit statuses, SARIF upload, or a README badge.
```

## Weekly Operating Loop

Run this once per week:

1. Refresh metrics:

```bash
npm run metrics:refresh
```

2. Record:

- GitHub views/clones
- npm downloads
- `serve` sessions
- `setup-ci` sessions
- external CI sessions
- directory referrals when visible
- accepted/closed certification PRs

3. Ship:

- 3 refreshed listings
- 5 certification PRs or maintainer issues
- 1 short public post
- 3 company/community replies

4. Review conversion after 48 hours.

Prioritize the channels that create `setup-ci`, SARIF, or external CI events. Deprioritize channels that only create stars or low-intent clones.

## Public Posts

Short post:

```text
MCP servers are becoming agent dependencies.

Before an agent depends on one, ask:

- does it start in CI?
- did tools or schemas drift?
- are write/destructive tools obvious?
- can findings land in GitHub Code Scanning?

That is what MCP Observatory is for:

npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>" --sarif
```

Agent post:

```text
If your coding agent can install MCP servers, it should also be able to test them.

MCP Observatory runs as an MCP server, so agents can scan, test, record, replay, diff, and verify other MCP servers before relying on them.

claude mcp add mcp-observatory -- npx -y @kryptosai/mcp-observatory serve
```

Company-facing post:

```text
For teams adding MCP to production agent workflows: treat MCP servers like AI supply-chain dependencies.

MCP Observatory gives you CI checks, SARIF/GitHub Code Scanning, schema drift, lock files, reports, and agent-accessible diagnostics before tools reach production workflows.
```

## Tracking Hygiene

- Use one campaign link or one command per outreach surface.
- Do not publish private telemetry, emails, hostnames, target commands, private repo names, or customer claims.
- Treat anonymous stars, forks, and clone spikes as interest, not adoption.
- Treat external CI, `setup-ci`, SARIF, and maintainer replies as adoption.
