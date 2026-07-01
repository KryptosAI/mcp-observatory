# Agent Runtime Quickstart

This is for maintainers of autonomous agents, OpenClaw-style productivity systems, coding agents, MCP gateways, and bot runtimes.

MCP Observatory gives your agent a read-only preflight for MCP tools before it depends on them.

## Why Agents Need This

Autonomous agents fail badly when their tools silently drift. A tool can still install while its schema changes, startup breaks, auth assumptions change, or a dangerous parameter becomes easy for an agent to call.

Observatory checks the tool surface before the agent trusts it.

## Fast Local Check

```bash
npx @kryptosai/mcp-observatory test npx -y your-mcp-server
```

For deeper checks:

```bash
npx @kryptosai/mcp-observatory test npx -y your-mcp-server --deep --security
```

## OpenClaw Agent Template

If you maintain an OpenClaw-style productivity system, copy the ready-to-use MCP reliability preflight agent:

```text
docs/openclaw-agent-template/SOUL.md
```

Use it as a recurring release, dependency-update, or tool-adoption check before your agent trusts an MCP server.

## Add Read-Only CI

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y your-mcp-server"
```

This creates a small adoption kit:

- `.github/workflows/mcp-observatory.yml`
- `mcp-observatory.target.json`
- report and badge snippets
- a maintainer PR body
- a setup doctor path

Run:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```

## What To Contribute Back

The highest-value contribution is a safe, real target that teaches agents what healthy MCP behavior looks like.

Open an issue with:

```text
Project:
Safe startup command:
Needs secrets? yes/no
Agent tools/skills that depend on MCP:
Expected healthy behavior:
What should an autonomous agent know before trusting this tool?
```

Good targets:

- start in CI without private credentials
- avoid destructive default actions
- expose tools/prompts/resources that agents actually call
- produce useful report evidence

Avoid targets that require private OAuth, paid services, or live destructive side effects.

## Agent-Readable Signals To Ask For

If you are integrating Observatory into an agent runtime, these are the most useful signals:

- did the MCP server start?
- which tools/prompts/resources are available?
- did any schemas change since the last known-good run?
- are there risky parameter shapes?
- did a safe tool invocation pass?
- should the agent block, warn, or continue?

## Maintainer-Friendly Positioning

Use this wording when proposing the check to another project:

```md
This adds a read-only MCP Observatory check for MCP compatibility, schema drift, and common schema/security footguns.

It does not require an account, hosted service, or secrets. The check can stay advisory while the signal is tuned.
```
