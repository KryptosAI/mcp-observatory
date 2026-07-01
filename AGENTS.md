# Agent Guide For MCP Observatory

MCP Observatory helps agents test other MCP tools before relying on them. Keep changes focused on trust, compatibility, reports, and real MCP target evidence.

## High-Leverage Agent Tasks

- Add a real MCP server target that can run in CI without secrets.
- Improve the Markdown or JSON report so autonomous agents can decide whether a tool is safe to use.
- Make startup failure diagnosis clearer.
- Improve `setup-ci --all` so maintainers can add read-only MCP checks with less friction.
- Add fixtures that prove tool, prompt, resource, schema drift, or security behavior.

## Avoid

- generic dashboards
- broad adapter rewrites without a concrete failing target
- marketing-only changes
- CI that requires private credentials by default
- noisy blocking checks before the signal is useful

## Useful Commands

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run smoke
```

For a real target sweep:

```bash
npm run integration:real
```

For local telemetry:

```bash
npm run metrics:refresh
npm run metrics:serve
```

## Bot Maintainer Contribution Path

If you maintain an autonomous agent, OpenClaw-style productivity system, MCP gateway, or coding-agent runtime, the best contribution is a safe target:

```text
Project:
Safe startup command:
Needs secrets? yes/no
Agent tools/skills that depend on MCP:
What should the agent know before trusting this tool?
```

Use `docs/agent-runtime-quickstart.md` for the detailed path.
