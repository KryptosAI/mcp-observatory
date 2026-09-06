# Observatory prototype salvage

This branch starts from current upstream `011ed59` and preserves the first-scan,
hosted activation and informational-diagnostic fixes shipped in September.
It incorporates the dormant permission classifier/diff-gate work from
`Documents/GitHub/mcp-observatory` and Codex discovery from
`Documents/New project/mcp-observatory`. Both original working trees remain
untouched; this branch contains the integrated, tested subset.

## Permission-change behavior

`diff base.json head.json --fail-on-permission-delta review --format json`
exits 1 for known widening or review-required changes. The `widening` threshold
blocks only witnessed widening and intentionally allows review-required cases.
Without a threshold, reporting remains advisory. Reports include narrowing,
neutral, review and widening counts. Widening entries include a candidate input
accepted by the new supported schema and excluded by the prior schema.
Whole newly added capability sets are checked, not only tools added to a
capability that existed in both runs. Witnesses survive JSON serialization.

The supported fragment consists of flat object schemas, type carriers, enums,
required fields and boolean additionalProperties. Unsupported keywords,
malformed schemas and prototype-sensitive property names require review.
The classifier's projection uses permission-like field names and recognized
mutation strings. It does **not** prove actual server authority or runtime
safety; a benign-looking field can still control sensitive behavior. Nested
schemas and arbitrary JSON Schema implications are outside its decision scope.
The 2,048-pair finite model and generated conformance corpus are bounded checks,
not a proof of arbitrary-schema soundness or a measurement of ecosystem accuracy.

## Codex discovery

Discovery reads both `.codex/config.toml` and legacy `config.json`. TOML uses the
`smol-toml` parser so comments, quoted names, multiline arrays and inline tables
are parsed consistently. Invalid TOML is rejected as a whole. Disabled servers
are skipped; explicitly named bearer-token environment variables are resolved.
Tests use fixture configs and isolate both home and working directories.

## Source audit

The five-rule source-audit prototype is now integrated as a bounded local JS/TS
review command and optional scan flag. It reports incomplete coverage explicitly,
resolves local bindings instead of trusting variable names, omits source and secret
contents, and treats suspicious flows as review signals. The old generic guard
heuristic and zero-file success behavior were removed. See [source-audit.md](source-audit.md)
for the supported analysis, exclusions, resource limits and exit-code contract.
The integrated suite passes 772 tests, including 52 new source/CLI cases; lint,
typecheck and build pass. Original source and tests remain in the preserved copies.

## Cross-server review

Cross-server analysis is integrated as advisory capability combinations and exact
name-collision review, with actual tool/run identities, directional findings,
explicit incomplete inventories and bounded work. It replaces critical exploit
claims based on category names alone. See [cross-server-review.md](cross-server-review.md).
The full integrated suite passes 798 tests, including 25 cross-server/API/CLI cases
and an additional discovery-context regression. Lint, build, smoke and the public
repository boundary check pass.

## Package-name review

The typosquatting prototype is integrated as advisory package-name comparison,
with ecosystem-aware structured argument parsing and nine dated, pinned upstream
manifest references. Unsupported wrapper syntax and non-registry sources retain
explicit coverage diagnostics. The standalone CLI does not start the reviewed
command; ordinary scans include the advice before their normal server execution.
The unsupported “official” catalogue and automatic replacement shell commands are
removed. See [package-name-review.md](package-name-review.md) for grammar, limits,
provenance, false-positive/coverage limits and exit codes.

## Manuscript and research evidence

The paper is recovered as a revised research draft with a canonical Markdown
source, generated LaTeX body, bibliography and named/anonymous-author wrappers.
It defines mutations through complete accepted requests, distinguishes abstract
request grants from actual server authority, and gives explicit fragment-scoped
arguments. A new AJV model checks 114,244 two-field endpoint pairs alongside
the original 2,048-pair model. Its stronger witness check exposed an insensitive
enum case that selected a pure addition; the witness now selects the mutation.

Six hash-verified upstream files support executable release extraction, including
the actual Notion API- tool names and converter string fallbacks. The pinned
mcp-diff 0.1.0 engine is run directly with source/version checks and current
classifier decisions. Results describe policy disagreements, not security misses.
Unsupported linear-time, ecosystem, novelty and ablation claims were withdrawn.
See [the manuscript](permission-delta-paper.md) and
[reproduction protocol](permission-delta-corpus/EXTRACTION.md).

## Other preserved prototypes

Private owner metrics were recovered in the separate private telemetry repository,
outside this public boundary. The old public checkout markup was evaluated as
obsolete relative to the current hosted activation flow. Alternate introspection
and unrelated sales prototypes remain in the preserved original working trees;
they are not included in this salvage. Old generated outputs are not evidence
for this branch: the research corpus and baseline results are freshly regenerated.
