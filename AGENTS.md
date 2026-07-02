# Agent Guide For MCP Observatory

MCP Observatory helps agents test other MCP tools before relying on them. Keep changes focused on trust, compatibility, reports, and real MCP target evidence.

## High-Leverage Agent Tasks

- Add a real MCP server target that can run in CI without secrets.
- Follow `docs/target-contribution-guide.md` to add one Safety Index target and generated evidence.
- Use `docs/agent-tasks.md` for copy-pasteable bot and maintainer contribution tasks.
- Use `docs/launch.md` and `docs/code-scanning-demo.md` when explaining the project to maintainers.
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

For target-registry contributions:

```bash
npm run safety-index
npm test -- tests/safety-index.test.ts
```

For campaign-attributed launch work:

```bash
npx @kryptosai/mcp-observatory test <safe startup command> --campaign agent-ci
npx @kryptosai/mcp-observatory setup-ci --all --command "<safe startup command>" --sarif --campaign agent-ci
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

## Target Registry Contribution Path

The best bot-friendly contribution is one target:

```text
Public MCP server:
Safe startup command:
Requires secrets? yes/no
Risk class:
Failure class:
Why agents care:
```

Use `docs/target-registry.md` and `docs/target-contribution-guide.md`.
