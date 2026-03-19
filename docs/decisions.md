# Decisions

These decisions exist so the repo does not drift into vague feature accumulation.

## 2026-03-19: Semantics v1 stays intentionally narrow

`semantics` only checks advertised capability, callable endpoint response, and minimal expected shape. The first job of MCP Observatory is to explain drift, not to claim semantic correctness it does not yet earn.

## 2026-03-19: The project stays CLI-first

The durable product surface is the artifact plus the report. A dashboard can wait. Until the evidence surface is boringly trustworthy, adding hosted UX would mostly be theater.

## 2026-03-19: `unsupported` and `failed` remain separate

`unsupported` means the target did not advertise the capability. `failed` means the capability path or startup path should have worked and did not. Collapsing those states would hide useful ecosystem truth.

## 2026-03-19: npm publishing is deferred

GitHub releases are enough for now. The package stays scoped as `@kryptosai/mcp-observatory` until there is real demand for broader distribution.

## 2026-03-19: Every release needs a reason to exist

Packaging-only churn is not a release story. Every release should include at least one real-server learning, one report-quality improvement, or one schema trust improvement.
