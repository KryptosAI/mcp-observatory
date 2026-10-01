# Learn from real MCP usage

Observatory's usage-learning SDK wraps a production server's tool handlers. It connects execution evidence to voluntarily supplied intent/outcome reports, with a local CLI for analysis and regression export. This is separate from Observatory's own product telemetry, health scans, and test-session recording. Nothing in this workflow uploads customer data.

## What the server can see

| Evidence | Available through this workflow | Limit |
| --- | --- | --- |
| Tool name, invocation, arguments | Handler wrapper; arguments use an explicit allowlist | SDK validation failures before the handler require separate transport/gateway instrumentation |
| Returned result or `isError` | Status always; payload only when explicitly enabled | A successful tool result does not prove the final answer was useful |
| Exceptions and handler latency | Observed status, monotonic latency, optional sanitized error message | Handler latency excludes model generation and network round-trip time |
| Call identity | Unique call ID and correlation ID passed to the handler | These are server-generated, not Claude conversation IDs; include them in support responses if useful |
| User's original request, final answer, corrections | Only selected, opted-in feedback/excerpts | Tool arguments are the model's chosen inputs, not the original user request |
| Why the model selected a tool, reasoning, other tools, abandonment | Not automatically available | A correction is a review signal, not proof of a root cause |

Anthropic also offers a connector observability dashboard with adoption, tool calls, errors, latency and product-surface breakdowns. Eligibility and access differ from installing this SDK; the dashboard does not make unshared conversations available. See [Anthropic's announcement](https://claude.com/blog/observability-for-developers-building-connectors). MCP tool request/result semantics are documented in the [official MCP SDK](https://ts.sdk.modelcontextprotocol.io/v2/clients/calling).

## Instrument an existing server

```ts
import { UsageStore, observeTool } from '@kryptosai/mcp-observatory';

const store = new UsageStore('./private-usage', { retentionDays: 7 });
server.registerTool('find_invoices', {
  inputSchema: { overdue: z.boolean() },
}, observeTool({
  store, server: 'billing', tool: 'find_invoices',
  argumentKeys: ['overdue'], // default: no argument values
  // captureResult: true,   // default: result payload omitted
  // transport: 'http',    // set only if known; enables cassette-fragment export with a captured result
  // captureErrorMessage: true, // default: exception message omitted
  redactions: ['your-domain-specific-private-string'],
  onCaptureError: () => metrics.increment('usage_capture_failed'),
}, async (args, invocation, sdkExtra) => {
  // sdkExtra remains available; never recorded automatically.
  const result = await findInvoices(args, sdkExtra);
  // Include invocation.callId in your support UI or response if desired.
  return result;
}));
```

The wrapper preserves the original return value and thrown exception. Store/callback errors fail open and can be counted through `onCaptureError`. Logging adds local write overhead after handler execution; recorded latency measures the handler itself. IDs distinguish concurrent identical calls. Register the wrapper once per tool; no proxy, credentials, or browser extension is required. Long-running or terminated processes may have no completed record; this is not a distributed tracing or cancellation system.

## Lightweight feedback and excerpts

Start with a form containing **asked / expected / got**, optional call IDs, and success/failure/unclear. Offer it through a support link. Reports without call IDs cover problems where the tool was never called. Do not label those as observed invocation failures.

```bash
mcp-observatory usage feedback-template > report.json
# User fills in and reviews the exact selected text, reads your notice,
# then opts in and sets userReviewed/optedIn to true.
mcp-observatory usage report report.json --dir private-usage --redact 'Private project name'
```

For a feedback tool, expose a **draft-only** tool that prepares this same JSON for the user to inspect. Save it with `store.report(reviewedReport, redactions)` only after explicit confirmation through your application or support flow. A model can summarize the complaint, but use `provenance: 'model_summary'` and keep that label after user review. Do not let a model's declaration alone stand in for user confirmation. This SDK validates attestations; the integrating application must establish the human review and consent.

A useful prompt template:

> Draft a feedback report: what I asked, what I expected, and what happened. Include any available support call IDs. Label your paraphrases as model summaries. Include only the relevant conversation turns I select. Show the report for my review before anything is sent.

`excerpt` is an optional array of selected `{ role, text, provenance }` turns. Allowed provenance values are `user_text`, `assistant_text`, `tool_output`, and `model_summary`; role/source mismatches are rejected. Reports require `consent: { optedIn: true, userReviewed: true, reviewedAt: ISO_DATE, policyVersion: NOTICE_VERSION }`. Unknown/expired call links are rejected. No transcript URL is fetched and no host conversation is scraped.

A pasted excerpt is usually lighter and narrower than a public conversation-sharing link. If you accept full transcripts elsewhere, let users select and redact turns before importing. Original input JSON files remain the user's responsibility; redact them before placing them in shared folders.

## Intent clustering and breakdown review

```bash
mcp-observatory usage analyze --dir private-usage --out analysis.json
```

Default analysis is deterministic **lexical cosine clustering**, useful for recurring wording. It is explicitly labeled and does not claim semantic equivalence. Labels are inferred frequent keywords. Reports include counts, representative asked/expected/got examples, linked call errors, user-reported mismatches, possible user corrections with turn indexes, per-tool call/error counts and p95 handler latency. Model summaries remain labeled; corrections are inferred signals requiring review. Report samples are opt-in and biased: counts are not population intent rates or an abandonment funnel.

For semantic clustering, provide your own local embedding function:

```ts
const analysis = await analyzeUsage(await store.read(), {
  embed: texts => yourEmbeddingModel.embed(texts), threshold: 0.8,
});
```

Or supply a local JSON map `{ "REPORT_UUID": [0.1, 0.2, ...] }`:

```bash
mcp-observatory usage analyze --dir private-usage --embeddings vectors.json --threshold 0.8
```

Vectors must match report IDs and have equal dimensions, finite values and nonzero norms. SDK text order corresponds to report IDs in sorted order. The supplied function receives sanitized `asked` text, not full excerpts. Remote embedding use, if you configure it, is your application's data-sharing decision. There is no bundled API key or implicit external request. Similarity is conservative: each new member must match every member in its cluster; unrelated asks do not merge merely through a chain of weak similarities. Tune thresholds against reviewed examples. Clustering does not identify causality; inspect linked evidence before changing schemas, descriptions or handlers.

[Langfuse's intent-classification cookbook](https://langfuse.com/guides/cookbook/example_intent_classification_pipeline) is a useful reference for broader trace analytics; [Phoenix embedding analysis](https://arize.com/docs/phoenix/inferences/use-cases-inferences/embeddings-analysis) provides exploratory visual clustering. Neither can recover conversations the MCP server never received.

## Turn a report into a regression

```bash
mcp-observatory usage export REPORT_UUID --dir private-usage --out regression.json
```

The export includes reported intent, provenance, selected excerpts and linked sanitized invocations. Review fixture arguments: allowlisted capture can omit required keys, and sensitive values may have been removed. Missing or expired calls are listed. A `cassetteFragment` in the Observatory cassette format is included only if a result and a known HTTP/stdio transport were captured. It preserves the observed behavior, including failures. It lacks initialization/discovery traffic and cannot be used as a standalone CLI replay session. It is not the desired-behavior oracle.

Turn the expected outcome into a domain assertion, then test a safe fixture handler:

```ts
await verifyUsageRegression({
  args: { overdue: true }, // reviewed synthetic fixture; never blindly reuse customer args
  invoke: fixtureFindInvoices,
  assertOutcome: result => assert.deepEqual(result.ids, ['overdue-fixture-id']),
});
```

The helper propagates handler and assertion failures. It does not execute an exported tool automatically. Use the existing `record`/`replay`/`verify` workflow when you need complete test-session cassettes; use the exported case and a domain assertion for desired behavior. Prose feedback cannot automatically specify a correct machine assertion.

## Privacy, retention and operation

Capture starts only when you install the wrapper. Argument values, results and exception messages are off by default. Built-in redaction covers sensitive keys, common token formats, Bearer credentials and email addresses, with depth/size bounds. It is defense in depth, not a guarantee that arbitrary prose is anonymous. Configure domain-specific redactions and capture only safe fields. Instrumentation never records authentication headers, SDK context, prompts or conversation history automatically.

Events are schema-validated, written atomically to local files with owner-only file permissions, and never overwrite existing IDs. A newly created store directory has owner-only permissions; secure existing parent directories and avoid shared/synced locations. Reports store the notice version and review timestamp. Keep exported files private too; files created by this workflow use owner-only permissions.

Default retention is seven days. Reads and analysis exclude expired records; schedule `store.prune()` or `usage prune` to physically remove them. If you configure a different SDK window, pass the same `--retention-days DAYS` to CLI report/analyze/export/prune. Retention does not delete original report inputs, embedding files, exports, backups or external copies; manage those separately. For immediate withdrawal, remove the affected UUID event file and dependent exports from the private store. Keep your application's consent notice and withdrawal process aligned with this behavior.

## Verified synthetic example

```bash
npm run build
node examples/usage-learning.mjs ./synthetic-usage
```

This uses a real MCP SDK client/server over an in-memory transport, records a tool call, adds reviewed synthetic feedback and a selected excerpt, clusters related requests, and proves a regression assertion fails for the broken result and passes for the corrected fixture. It writes `analysis.json` and `regression.json` without touching production services.
