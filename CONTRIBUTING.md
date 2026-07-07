# Contributing

Thanks for helping make MCP Observatory sharper and more trustworthy.

This project adheres to a [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🌏 International Contributors Welcome

We actively welcome contributors from China, Korea, Japan, and across Asia. This is an early-stage project — contributors can help shape the direction before it becomes established infrastructure.

- [中文 README](README.zh-CN.md) — Simplified Chinese documentation
- Bilingual issues welcome: 欢迎提交中文 issues 和 PRs
- We use `新手友好` (Chinese) and `초보자 환영` (Korean) labels alongside `good first issue`
- Gitee 镜像: https://gitee.com/williamweishuhn/mcp-observatory

Join us early. Your contributions will define how MCP security tooling evolves.

## ⚡ 5-Minute Quickstart

```bash
git clone https://github.com/KryptosAI/mcp-observatory.git
cd mcp-observatory
npm install
npm test          # ~30s, all 471 tests should pass
npm run typecheck # ~5s, no errors
npm run lint      # ~5s, clean
```
You're ready. Pick an issue labeled [good first issue](https://github.com/KryptosAI/mcp-observatory/issues?q=is%3Aopen+label%3A%22good+first+issue%22).

This repo is intentionally small. Good contributions make the evidence clearer. Weak contributions usually add surface area faster than they add trust.

## What Good Contributions Look Like

- clarity over breadth
- evidence over feature count
- smaller, opinionated PRs over speculative scaffolding
- checked-in artifacts or reports that teach something concrete
- docs that remove a real confusion, not just add more prose

## Current Priorities

- Add one safe MCP target to the [MCP Target Registry](./docs/target-registry.md)
- Follow the [Target Contribution Guide](./docs/target-contribution-guide.md) for a small first PR with evidence
- [#3 Improve artifact output readability in the Markdown report](https://github.com/KryptosAI/mcp-observatory/issues/3)
- [#6 Improve CLI startup error messaging for connection and setup failures](https://github.com/KryptosAI/mcp-observatory/issues/6)
- [#1](https://github.com/KryptosAI/mcp-observatory/issues/1) and [#2](https://github.com/KryptosAI/mcp-observatory/issues/2) once a concrete passing server is identified

## What Will Probably Be Declined

- generic dashboard or control-plane ideas
- speculative adapter abstraction work without a concrete failing target
- feature additions that do not come with evidence or artifacts
- broad packaging or workflow churn that does not improve trust, clarity, or report quality

## Ground Rules

- Keep v1 CLI-first.
- Do not turn the project into a generic dashboard.
- Treat the artifact schema and Markdown report as core product surfaces.
- Preserve the project’s positioning as complementary to official conformance.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run smoke
```

Optional but recommended before opening a larger PR:

```bash
npm run integration:real
```

## First Contribution Walkthrough

If this is your first contribution to the project, pick one of these paths:

> 💡 Browse all [good first issues →](https://github.com/KryptosAI/mcp-observatory/issues?q=is%3Aopen+label%3A%22good+first+issue%22)

1. Target path: add one public no-secret MCP server to `docs/safety-index/targets.json` and include generated evidence.
2. Docs path: improve one README or CONTRIBUTING section and keep the change tightly scoped.
3. Reporting path: improve one Markdown report section and update the checked-in report examples.
4. Fixture path: add or refine one deterministic target or artifact in `examples/` or `tests/fixtures/`.

For each path:

- open the matching GitHub issue
- mention the specific files you plan to touch
- keep the diff small and obvious
- include the exact validation commands you ran

## Evidence Bar For Examples And Integrations

If you add or modify anything under `examples/` or a real-server workflow, include:

- a concrete server or workflow, not a hypothetical integration
- a checked-in artifact or Markdown report when the change affects observable output
- one sentence explaining what the example teaches us

## Fixture Contributions

When you add a fixture:

- make it deterministic
- keep the smallest possible surface that proves the capability shape
- prefer explicit evidence over clever test machinery
- document what the fixture is proving and why it matters

The `fixture contribution` issue template is the best starting point for proposing a new case.

## Target Registry Contributions

The fastest useful contribution is one safe MCP target. Start with the [MCP Target Registry](./docs/target-registry.md), then use the [Target Contribution Guide](./docs/target-contribution-guide.md).

Minimal PR shape:

- one new object in `docs/safety-index/targets.json`
- generated JSON and Markdown evidence under `docs/safety-index/artifacts/`
- updated `docs/mcp-server-safety-index.md`
- validation commands in the PR body
