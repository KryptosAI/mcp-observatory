# Permission-delta study reproduction

This revision supersedes the preserved July prototype paper. It is a research
draft, not a claim of publication, venue acceptance, ecosystem accuracy, or
actual authorization soundness.

## Frozen sources and extraction

The six immutable URLs and SHA-256 hashes are in release-inputs.json under
sources. Fetch each URL into a private local directory using its recorded file
name. No credentials are needed. Then, from the repository root, run:

    node --import tsx scripts/extract-permission-release-cases.mjs SOURCE_DIRECTORY

The script verifies all six hashes before executing the reviewed Notion
converter. It does not start a server or call Notion/GitHub APIs. Inputs are:

- Notion base: 7e254df95e805861db8c052f5c325a1bb77a7560, its OpenAPI document.
- Notion head: d282ce9c167d34705bc24074c856c84cba0f3344, its OpenAPI document,
  converter and proxy.
- GitHub base: 42e5ce9b88ee289bb8d7a297c1d8a580e06c9e86, the released
  get_file_contents snapshot.
- GitHub head: b5e33481793a6dbca5cf688ddf391ad410042d63, the same snapshot.

For Notion, the base document lacks the selected page-Markdown path. The
head converter is applied to the complete released OpenAPI document, then
only the two selected methods are retained. The released proxy adds API- to
each advertised name. The extraction retains the converter's UUID format,
include_transcript default, anyOf string fallbacks, nested schemas and
additional-properties flags. Notion-Version is omitted by the converter as a
server-managed header. The converter does not retain every OpenAPI assertion
(for example maxItems); the artifact describes its output, not OpenAPI
validation or live-server enforcement.

For GitHub, inputSchema comes directly from each released snapshot. The
path requirement disappears and the slash default appears. The change is
corroborated by commit d15026b0eb2a2e5d3265a2601798ab28017dc719.

Normalization removes description, title, example(s), and deprecated at schema
locations. Property names and literal enum/default values are preserved.
Unused Notion definitions are removed only after confirming that the selected
input schemas have no references. No validator constraint is removed from the
converter/snapshot input. These are selected changed contracts, not full
release inventories or live tools/list captures. The former hand extraction's
missing API- prefixes and string fallbacks are corrected.

## Conformance and independent models

Use Node 22.23.1 and the committed npm lockfile (npm ci). Run:

    npm run evaluate:permission-delta
    npm test -- tests/permission-delta.test.ts tests/permission-delta-model.test.ts tests/permission-delta-interactions.test.ts --maxWorkers=2

The evaluator regenerates corpus.json, results.json, real-release-case.json
and real-release-results.json. It records input and classifier hashes.
The authored 16 pairs are conformance fixtures; their expectations are not
independent labels and do not cover all possible rules. The two selected
releases are descriptive cases.

The old finite model checks 2,048 one-field pairs. The independent AJV model
checks 114,244 pairs of two-field schemas (338 endpoints), including absent
fields, unsatisfiable domains and simultaneous edits. The manuscript lists
the exact finite grid. This bounded search is not a mechanized proof of
the entire fragment.

Mutation atoms now require realizability in a complete accepted request.
This corrects the old paper definition: an optional write enum could formerly
contribute an atom even while an unrelated required empty enum made the schema
unsatisfiable. Widening witnesses for insensitive enums now select a newly
mutating value, rather than an earlier pure enum addition.

## Actual compatibility baseline

Install the study baseline into an isolated Python environment. The exact
wheel is available at the URL in the linked PyPI 0.1.0 release metadata:

    python3 -m venv /tmp/permission-study-python
    /tmp/permission-study-python/bin/python -m pip install 'mcp-diff==0.1.0'
    MCP_DIFF_PYTHON=/tmp/permission-study-python/bin/python npm run evaluate:permission-delta:mcp-diff

The observed run used Python 3.14.3. The engine is not claimed to be the latest
mcp-diff version. The runner requires version 0.1.0 and this module SHA-256:

    d6ea58374444a6c2403614f1d59e250167ea34e6574b9676f5e38ae7fef1b853

That module matches the published wheel, whose SHA-256 is:

    8ef37636b98ecae6da336c212dba222a14fc5c14a586f0c9ba15ca8391ec542e

Both checks use the same isolated Python interpreter as classification.
Every invocation has a timeout and output bound. Unexpected output fails
instead of becoming compatible. All comparisons must finish before replacing
the result artifacts. Temporary input files use private unique directories
and owner-only file permissions.

The v2 baseline artifacts record current classifier/runner hashes, corpus and
per-pair hashes, interpreter version and descriptive disagreements. Permission
actions are recomputed from input; old results.json actions are not trusted.
Both mcp-diff-baseline.json and the compatibility alias compat-baseline.json
contain the same result. The old run-compat-baseline.ts command also runs the
comparison instead of silently importing a guarded main function.

Seven synthetic pairs and both release cases are compatible by this version's
verdict and escalated by this policy. One synthetic pair is breaking and
admitted. A compatible verdict is not schema-containment proof: this version
does not inspect enum, additional-properties, or existing-field requiredness
edits. Tool descriptions are empty on both sides, so description-change
warnings are deliberately outside this experiment. These are not security
miss rates.

    npm test -- tests/permission-study-artifacts.test.ts tests/baseline-temporary-files.test.ts --maxWorkers=2

The artifact tests check input/source hashes, current classifier decisions,
both alias files, malformed baseline output, and source-specific release
details. Updating classifier source requires regenerating the saved evidence.

## Manuscript builds

Markdown is the canonical text. The TeX body is generated from it; named and
anonymous-author wrappers share that body and bibliography.

    node scripts/build-permission-paper.mjs OUTPUT_DIRECTORY

This requires Pandoc and Tectonic. The recorded build uses the installed
versions listed in the build log. The output directory receives both PDFs
and Tectonic logs. Render every page with Poppler for visual review. Generated
PDFs are deliverables outside the public source tree; the generated TeX body
is checked in for readers who only have LaTeX.

The anonymous-author copy removes the author block and PDF author metadata.
It retains project names and reproducibility information; venue-specific
blind-review compliance and submission formatting remain an author decision.
The generic research-draft format deliberately removes the prototype's
unverified conference/date/publication metadata.

## Claims revised or withdrawn

- "Permission grant" now explicitly means the defined request abstraction.
  No actual server authority or exploitability theorem is claimed.
- Whole-request realizability and approval epochs repair the mathematical
  statements; re-consent resets the baseline.
- Total linear-time complexity is withdrawn: complete per-entry witnesses can
  require quadratic output in the number of changed/required fields.
- The finite models are bounded implementation checks, not proof-assistant
  verification.
- Baseline disagreements are not labeled consent/security misses.
- Unsupported general novelty, ecosystem, ablation, and literature-comparison
  assertions were not carried forward without evidence. References now support
  the specific protocol, schema and source observations used in the draft.
