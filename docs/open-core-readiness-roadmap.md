# Open-Core Readiness Roadmap

This roadmap turns MCP Observatory's open-core strategy into implementation work. The open-source readiness bar is that a maintainer can run a target locally or in CI, understand each tool-level decision, reproduce the evidence, and make an approve/review/block decision without a hosted account.

## Priority order

### P0 — Make the evidence decision-ready

Owner surfaces: `src/runner.ts`, `src/findings.ts`, `src/decisions.ts`, `src/action-receipt.ts`, `src/validate.ts`, and `schemas/`.

- Preserve a stable versioned run artifact and add per-tool decisions backed by finding IDs.
- Keep the decision path deterministic: high-severity tool findings block, medium findings require review, and tools without findings are allowed.
- Keep receipts, baselines, diffs, and local policy evaluation reproducible without hosted services.
- Finish the public receipt command loop tracked in issue [#288](https://github.com/KryptosAI/mcp-observatory/issues/288).
- Continue the permission-delta work in issue [#150](https://github.com/KryptosAI/mcp-observatory/issues/150) as report-only evidence until the signal is precise enough to gate.

Done when: a JSON artifact, terminal report, MCP response, and Markdown report identify the same tool, evidence, and recommended decision.

### P1 — Build a trustworthy public benchmark corpus

Owner surfaces: `benchmarks/`, `src/checks/security-rules.ts`, `tests/`, and `docs/rules.md`.

- Seed safe, vulnerable, and ambiguous fixtures for shell execution, filesystem scope, permissive schemas, hidden Unicode, credential exposure, startup failures, and benign changes.
- Record the exact evidence and expected rule IDs for every fixture.
- Publish rule limitations and reproduction guidance so benchmark results are not mistaken for formal vulnerability claims.

Done when: seeded high-risk fixtures are detected consistently, benign fixtures remain quiet, and every rule has a documented evidence path and known limitation.

### P1 — Add a deterministic behavioral-evaluation seam

Owner surfaces: `src/behavioral-eval.ts`, `docs/behavioral-evals.md`, and `tests/behavioral-eval.test.ts`.

- Keep the scenario format independent of any model provider.
- Evaluate recorded tool-call traces with explicit allowed-tool, forbidden-tool, result-pattern, and side-effect assertions.
- Use fixtures in CI first; add live or model-backed adapters only behind a separately reviewed interface.

This is the narrow open-source foundation for the broader agent-behavior work in issue [#224](https://github.com/KryptosAI/mcp-observatory/issues/224). Managed model matrices, hosted replay, and private evaluation libraries remain outside this slice.

### P2 — Connect decisions to local CI and drift workflows

Owner surfaces: `src/diff.ts`, `src/commands/ci-report.ts`, `src/reporters/sarif.ts`, and `src/lockfile.ts`.

- Make approve/review/block outcomes stable in structured output and SARIF.
- Add regression tests for tool additions, removals, schema changes, permission widening, and benign metadata changes.
- Keep GitHub Actions and local runner setup simple and customer-controlled; related onboarding work is tracked under issue [#221](https://github.com/KryptosAI/mcp-observatory/issues/221).

## Boundary for future hosted work

The following are deliberately not part of the open-source readiness implementation: hosted fleet coordination, organization/team administration, central policy administration, historical retention, scheduled rescans, hosted approvals, cross-repository blast-radius analysis, enterprise IAM, managed runner orchestration, private indexes, compliance workflows, and hosted admission-decision APIs. Those belong in the proprietary control plane built around these public artifacts.
