# Contributing

Thanks for helping make MCP Observatory sharper and more trustworthy.

This repo is intentionally small. Good contributions make the evidence clearer. Weak contributions usually add surface area faster than they add trust.

## What Good Contributions Look Like

- clarity over breadth
- evidence over feature count
- smaller, opinionated PRs over speculative scaffolding
- checked-in artifacts or reports that teach something concrete
- docs that remove a real confusion, not just add more prose

## Current Priorities

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

1. Docs path: improve one README or CONTRIBUTING section and keep the change tightly scoped.
2. Reporting path: improve one Markdown report section and update the checked-in report examples.
3. Fixture path: add or refine one deterministic target or artifact in `examples/` or `tests/fixtures/`.

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
