# Architecture

MCP Observatory is intentionally small. The core data flow is:

1. **Target config**
   A JSON description of how to start a target via the local-process adapter.
2. **Adapter**
   The adapter starts an MCP server over stdio and establishes a client session.
3. **Checks**
   The runner executes `tools`, `prompts`, `resources`, and `semantics`.
4. **Run artifact**
   Results are normalized into a stable, versioned JSON artifact with a top-level `gate`.
5. **Diff**
   Two run artifacts can be compared to classify regressions and recoveries.
6. **Report**
   Run or diff artifacts render as terminal output, JSON, or Markdown.

## Design Intent

- keep the adapter boundary obvious so more target types can be added later
- keep checks isolated and typed
- treat artifacts as product surfaces, not incidental output
- keep the Markdown report strong enough to stand on its own in issues, PRs, and CI

## Stability Surfaces

These are the most important surfaces to preserve carefully:

- artifact schema
- diff semantics
- `unsupported` vs `failed` interpretation
- Markdown report structure and usefulness
