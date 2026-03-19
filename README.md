# MCP Observatory

MCP Observatory is a developer confidence harness for MCP authors and integrators.

It detects, stores, compares, and explains interoperability drift over time so you can answer the question most conformance tooling does not try to answer:

"What changed, what regressed, what recovered, and what artifact proves it?"

## Why This Exists

MCP adoption is accelerating, which means MCP breakage is getting more expensive.

Official conformance tooling is necessary, but it is not the same as regression intelligence. MCP Observatory exists to preserve historical evidence over time so teams can:

- spot capability drift before users do
- compare runs across versions and server changes
- publish a clear artifact that explains what broke or recovered
- build confidence in real-world MCP server behavior without inventing a dashboard first

## Who It Is For

- MCP server authors who want confidence before release
- integrators who need a repeatable way to compare servers or versions
- OSS contributors who want a concrete, evidence-driven surface to improve
- CI owners who need a machine-friendly gate plus a human-readable report

## Why Not Conformance?

Official MCP conformance tooling already exists.

MCP Observatory is not trying to replace conformance or redefine the protocol. It complements conformance by focusing on historical compatibility drift and evidence over time. The framing for this repo is consistent on purpose:

**This is a developer confidence tool for MCP authors and integrators.**

It is not a generic dashboard, not a trust platform, and not a spec fork.

## What You Get

- `run`: execute checks against a target config and persist a versioned run artifact
- `diff`: compare two run artifacts and classify regressions and recoveries
- `report`: render a saved run artifact as terminal, JSON, or polished Markdown
- stable artifact fields from day one: `artifactType`, `schemaVersion`, and `gate`
- focused checks only: `tools`, `prompts`, `resources`, and a narrow `semantics` pass

## 60-Second Start

```bash
npm install
npm run cli -- run --target tests/fixtures/sample-target-config.json
npm run cli -- diff --base tests/fixtures/sample-run-a.json --head tests/fixtures/sample-run-b.json
# Observe obvious regression/recovery output in the terminal summary
```

This is the shortest path to seeing the product work end-to-end with no external MCP dependency.

## Sample Output

```text
MCP Observatory Diff
Base: run_20260318T120000000Z_a1b2c3d4
Head: run_20260318T130000000Z_e5f6g7h8
Gate: fail
Counts: regressions=2, recoveries=1, unchanged=1, added=0, removed=0
Regressions:
- tools: pass -> fail (Advertised capability failed during tools/list: server error)
- semantics: pass -> fail (At least one advertised capability did not respond successfully.)
Recoveries:
- prompts: unsupported -> pass (Advertised capability responded with the minimal expected shape (1 item).)
```

The flagship artifact is the Markdown report:

```bash
npm run cli -- report --run tests/fixtures/sample-run-b.json --format markdown --output examples/results/sample-report.md
```

See [examples/results/sample-report.md](./examples/results/sample-report.md) for a checked-in example.

## Real Server Coverage

The repo now includes a small real-world smoke matrix across distinct MCP implementations:

- [examples/targets/filesystem-server.json](./examples/targets/filesystem-server.json): official filesystem server, tool-heavy local-process target
- [examples/targets/everything-server.json](./examples/targets/everything-server.json): official everything server, resources-heavy and prompts-capable target
- [examples/targets/ref-tools-server.json](./examples/targets/ref-tools-server.json): third-party ref tools server, prompts-capable target from a different implementation

Manual recipe:

```bash
npm run cli -- run --target examples/targets/filesystem-server.json
npm run cli -- run --target examples/targets/everything-server.json
npm run cli -- run --target examples/targets/ref-tools-server.json
```

Repeatable script:

```bash
npm run integration:real
```

That script regenerates checked-in example artifacts and Markdown reports under [examples/artifacts](./examples/artifacts).

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

## Roadmap / Good First Issues

The public work queue lives in GitHub Issues, but the current contribution themes are:

- expand real-server coverage across more MCP implementations
- improve artifact readability and evidence density
- document unsupported vs failed semantics more clearly
- add artifact validation and integration examples
- improve release posture before npm publishing

See [ROADMAP.md](./ROADMAP.md), [CONTRIBUTING.md](./CONTRIBUTING.md), and the repo’s `good first issue` label for the easiest starting points.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for small, medium, and advanced contribution paths.

If you want the quickest useful contribution:

1. add or refine a real-server smoke case
2. improve one evidence message or report section
3. add one integration example or artifact validation improvement

See [examples/integrations](./examples/integrations) for lightweight CI and PR-comment wiring examples.

## Release Posture

The repo is ready for tagged GitHub releases before npm publishing.

- changelog: [CHANGELOG.md](./CHANGELOG.md)
- release process: [RELEASE.md](./RELEASE.md)
- helper script: `node scripts/release.mjs`
- npm publishing decision tracking: keep scoped for now, revisit later

## Known Issues

See [docs/known-issues.md](./docs/known-issues.md) for current integration caveats and why they matter to the ecosystem story.

## Security

See [SECURITY.md](./SECURITY.md) for disclosure guidance.
