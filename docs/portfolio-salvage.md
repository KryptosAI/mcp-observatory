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

## Remaining prototypes

The old dashboards, metrics/telemetry changes, sales scripts and research-paper
drafts remain in their original copies. Toxic-flow, typosquatting and alternate
introspection machinery are still being evaluated independently. Their original
source and tests are retained.
No old generated dashboard or historical corpus result was transplanted as new
evidence. Corpus outputs here are regenerated from the recovered evaluator.
The optional `mcp-diff` comparison requires that independent Python tool.
