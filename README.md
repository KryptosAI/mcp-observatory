# MCP Observatory

Regression intelligence for MCP targets: detect, diff, and explain interoperability drift over time.

## Why Not Conformance?

Official MCP conformance tooling already exists.

MCP Observatory focuses on historical regression intelligence and compatibility drift. The project does not try to replace conformance or redefine the protocol. It complements conformance by preserving evidence over time so you can answer a different class of question:

"What broke, what recovered, when did it change, and what is the smallest artifact that proves it?"

## Golden Path

```bash
npm install
npm run cli -- run --target tests/fixtures/sample-target-config.json
npm run cli -- diff --base tests/fixtures/sample-run-a.json --head tests/fixtures/sample-run-b.json
# Observe obvious regression/recovery output in the terminal summary
```

This is the shortest path to seeing the product work end-to-end with no external MCP dependency.

## Render The Flagship Markdown Report

```bash
npm run cli -- report --run .mcp-observatory/runs/<run-artifact>.json --format markdown --output examples/results/sample-report.md
```

The Markdown report is the primary v1 product surface. It is designed to be evidence-rich, copyable into PRs and issues, and easy to scan in CI artifacts.

## What Ships In v1

- `run`: execute checks against a target config and persist a versioned run artifact.
- `diff`: compare two run artifacts and classify regressions and recoveries.
- `report`: render a saved run artifact as terminal, JSON, or polished Markdown.
- Four checks only: `tools`, `prompts`, `resources`, and a narrow `semantics` pass.
- Stable artifact schema from day one, with a top-level `gate` field that makes CI integration trivial.

## Semantics v1

The `semantics` check is intentionally narrow in v1. It only verifies:

- the capability is advertised
- the corresponding callable endpoint responds
- the response contains the minimal expected shape

It does not validate tool correctness, prompt quality, resource content, or protocol behavior beyond those three assertions.

## Target Config

Targets are JSON files with this shape:

```json
{
  "targetId": "fixture-server",
  "adapter": "local-process",
  "command": "node",
  "args": ["tests/fixtures/fixture-server.mjs"],
  "cwd": ".",
  "timeoutMs": 10000,
  "metadata": {
    "purpose": "golden-path"
  }
}
```

## Artifact Contract

Every artifact is versioned and machine-friendly:

- `artifactType`: `run` or `diff`
- `schemaVersion`: currently `1.0.0`
- `gate`: `pass` or `fail`

Schema compatibility rules:

- additive changes stay within `1.x`
- any breaking artifact change requires a major schema bump

## Architecture

- `src/runner`: session orchestration and result normalization
- `src/adapters`: target-specific connection logic, starting with local process/stdio
- `src/checks`: isolated capability checks with minimal-shape evidence
- `src/diff`: run-to-run status comparison with regression/recovery classification
- `src/reporters`: terminal, JSON, and Markdown renderers
- `src/storage`: filesystem artifact persistence

## Example Commands

```bash
npm run cli -- run --target tests/fixtures/sample-target-config.json
npm run cli -- diff --base tests/fixtures/sample-run-a.json --head tests/fixtures/sample-run-b.json --format markdown
npm run cli -- report --run .mcp-observatory/runs/<run-artifact>.json --format terminal
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for small, medium, and advanced contribution paths.

If you want the quickest useful contribution:

1. add a fixture
2. add or refine evidence capture
3. improve the Markdown report without widening product scope

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for phased execution and contributor-oriented issue ideas.

## Security

See [SECURITY.md](./SECURITY.md) for disclosure guidance.
