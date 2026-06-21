# MCP Lock Files

MCP lock files are the package-lock for AI tools.

They capture the MCP contract a server exposes to agents: tools, prompts, resources, and tool input schemas. Once committed, CI can verify that future changes are intentional before agents depend on a changed surface.

## Core Flow

Create the lock:

```bash
npx @kryptosai/mcp-observatory lock
```

Verify the live server still matches:

```bash
npx @kryptosai/mcp-observatory lock verify
```

Add CI:

```bash
npx @kryptosai/mcp-observatory init-ci --all --command "npx -y my-mcp-server"
```

## Why It Matters

Agents call tools based on schemas and descriptions. If a tool is added, removed, renamed, or made more permissive, the agent-facing contract changed.

Lock verification turns that into a reviewable event:

- what changed
- whether a tool, prompt, or resource was added or removed
- whether a tool schema changed
- whether the changed MCP surface should be accepted before release

## Production Positioning

For maintainers, lock files catch accidental breakage.

For security and platform teams, lock files create an approval point for AI supply chain changes. A production MCP server can treat new tools, broader schemas, and high-risk capabilities like dependency changes that deserve review.

## Recommended CI Policy

- Commit `.mcp-observatory/lock.json` for production MCP servers.
- Run `mcp-observatory lock verify` on pull requests.
- Treat drift as blocking unless the PR intentionally updates the MCP surface.
- Pair lock verification with `--security` checks before major releases.
- Record suppressions with an owner, reason, and expiration when accepted risk is intentional.

## Commercial Pilot Use

Paid pilots can turn lock verification into a recurring MCP readiness report:

- current MCP surface
- drift since last approved lock
- new or removed tools
- schema changes
- security findings
- recommended review actions

This is the simplest enterprise story: commit your MCP contract, then make drift visible before agents depend on it.
