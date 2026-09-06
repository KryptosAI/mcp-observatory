import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { detectPermissionDeltas } from "../src/permission-delta.js";
import type { PermissionDeltaEntry, PermissionDeltaRisk } from "../src/types.js";

//
// ── types ──
//

interface CorpusPair {
  id: string;
  description: string;
  class: "seeded-escalation-scenario" | "synthetic-rule-coverage" | "limit-case" | "real-release-case";
  base: Record<string, object>;
  head: Record<string, object>;
  expectedWidening: boolean;
  expectedReview: boolean;
  expectedNarrowing: boolean;
  expectedNeutral: boolean;
  expectedRule?: string;
  provenance?: ReleaseProvenance;
}

interface ReleaseProvenance {
  server: string;
  repository: string;
  baseRevision: string;
  baseCommit: string;
  headRevision: string;
  headCommit: string;
  changeCommit?: string;
  comparison: string;
  schemaSource: string;
  extraction: string;
}

interface EvaluationResult {
  pair: CorpusPair;
  deltas: PermissionDeltaEntry[];
  counts: Record<PermissionDeltaRisk, number>;
  wideningCorrect: boolean;
  reviewCorrect: boolean;
  narrowingCorrect: boolean;
  neutralCorrect: boolean;
  action: "WOULD BLOCK" | "WOULD QUEUE" | "PASS" | "NO DELTAS";
  pass: boolean;
}

type GateAction = EvaluationResult["action"];

interface EvaluationSummary {
  totalPairs: number;
  passCount: number;
  failCount: number;
  passRatePct: number;
  byClass: Record<string, { total: number; pass: number; ratePct: number }>;
  gateDecisions: Record<GateAction, number>;
  deltasByRisk: Record<PermissionDeltaRisk, number>;
  totalDeltas: number;
  alertReduction: {
    baseline: "binary-change-detection";
    baselineAlerts: number;
    reviewThreshold: { alerts: number; reductionPct: number };
    wideningThreshold: { alerts: number; reductionPct: number };
  };
}

const ARTIFACT_SCHEMA_VERSION = "permission-delta-evaluation/v1";
const RISK_ORDER: PermissionDeltaRisk[] = ["narrowing", "neutral", "review", "widening"];

//
// ── helpers ──
//

function s(type: string, props?: Record<string, unknown>, required: string[] = [], ap?: boolean): object {
  const obj: Record<string, unknown> = { type };
  if (props && Object.keys(props).length > 0) obj["properties"] = props;
  if (required.length > 0) obj["required"] = required;
  if (ap !== undefined) obj["additionalProperties"] = ap;
  return obj;
}

function prop(type: string, enums?: string[]): object {
  const p: Record<string, unknown> = {};
  if (typeof type === "string") p["type"] = type;
  else if (Array.isArray(type)) p["type"] = type;
  if (enums && enums.length > 0) p["enum"] = enums;
  return p;
}

function tool(name: string, schema: object): [string, object] {
  return [name, schema];
}

function schemas(...entries: [string, object][]): Record<string, object> {
  return Object.fromEntries(entries);
}

function countDeltas(deltas: PermissionDeltaEntry[]): Record<PermissionDeltaRisk, number> {
  const c: Record<PermissionDeltaRisk, number> = { narrowing: 0, neutral: 0, review: 0, widening: 0 };
  for (const d of deltas) c[d.risk] = (c[d.risk] || 0) + 1;
  return c;
}

function expectedSigns(pair: CorpusPair): Record<PermissionDeltaRisk, boolean> {
  return {
    narrowing: pair.expectedNarrowing,
    neutral: pair.expectedNeutral,
    review: pair.expectedReview,
    widening: pair.expectedWidening,
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

//
// ── corpus ──
//

const CORPUS: CorpusPair[] = [
  // ── SEEDED RUG-PULLS (known attack patterns) ──

  {
    id: "rugpull-01", description: "Mode enum escalation (read → read+write)",
    class: "seeded-escalation-scenario",
    base: schemas(tool("file_tool", s("object", { path: prop("string"), mode: prop("string", ["read"]) }, ["path", "mode"]))),
    head: schemas(tool("file_tool", s("object", { path: prop("string"), mode: prop("string", ["read","write"]) }, ["path", "mode"]))),
    expectedWidening: true, expectedReview: false, expectedNarrowing: false, expectedNeutral: false,
    expectedRule: "W3 (enum expansion on sensitive field)",
  },

  {
    id: "rugpull-02", description: "additionalProperties wall removed",
    class: "seeded-escalation-scenario",
    base: schemas(tool("api", s("object", { endpoint: prop("string") }, ["endpoint"], false))),
    head: schemas(tool("api", s("object", { endpoint: prop("string") }, ["endpoint"]))),
    expectedWidening: true, expectedReview: false, expectedNarrowing: false, expectedNeutral: false,
    expectedRule: "W1 (additionalProperties widened)",
  },

  {
    id: "rugpull-03", description: "Required sensitive field becomes optional (server-side default)",
    class: "seeded-escalation-scenario",
    base: schemas(tool("run_cmd", s("object", { command: prop("string"), scope: prop("string") }, ["command", "scope"]))),
    head: schemas(tool("run_cmd", s("object", { command: prop("string"), scope: prop("string") }, ["command"]))),
    expectedWidening: true, expectedReview: false, expectedNarrowing: false, expectedNeutral: false,
    expectedRule: "W2 (required permission field became optional)",
  },

  {
    id: "rugpull-04", description: "New sensitive field added (secret backdoor param)",
    class: "seeded-escalation-scenario",
    base: schemas(tool("search", s("object", { query: prop("string") }, ["query"]))),
    head: schemas(tool("search", s("object", { query: prop("string"), token: prop("string") }, ["query"]))),
    expectedWidening: false, expectedReview: true, expectedNarrowing: false, expectedNeutral: false,
    expectedRule: "R1 (new permission-sensitive field added)",
  },

  {
    id: "rugpull-05", description: "Sensitive field removed (authority shifts server-side)",
    class: "seeded-escalation-scenario",
    base: schemas(tool("get", s("object", { path: prop("string"), role: prop("string") }, ["path"]))),
    head: schemas(tool("get", s("object", { path: prop("string") }, ["path"]))),
    expectedWidening: false, expectedReview: true, expectedNarrowing: false, expectedNeutral: false,
    expectedRule: "R2 (permission-sensitive field removed)",
  },

  {
    id: "rugpull-06", description: "Type broadened on sensitive field (string → string|number)",
    class: "seeded-escalation-scenario",
    base: schemas(tool("connect", s("object", { host: prop("string") }, ["host"]))),
    head: schemas(tool("connect", s("object", { host: { type: ["string", "number"] } }, ["host"]))),
    expectedWidening: false, expectedReview: true, expectedNarrowing: false, expectedNeutral: false,
    expectedRule: "R3 (type broadened on permission field)",
  },

  // ── NEUTRAL CHANGES (should not alert) ──

  {
    id: "neutral-01", description: "Optional insensitive field added",
    class: "synthetic-rule-coverage",
    base: schemas(tool("search", s("object", { query: prop("string") }, ["query"]))),
    head: schemas(tool("search", s("object", { query: prop("string"), format: prop("string") }, ["query"]))),
    expectedWidening: false, expectedReview: false, expectedNarrowing: false, expectedNeutral: true,
    expectedRule: "N1 (optional parser field added)",
  },

  {
    id: "neutral-02", description: "Enum expansion on insensitive, non-mutating field",
    class: "synthetic-rule-coverage",
    base: schemas(tool("render", s("object", { format: prop("string", ["png"]) }))),
    head: schemas(tool("render", s("object", { format: prop("string", ["png","svg"]) }))),
    expectedWidening: false, expectedReview: false, expectedNarrowing: false, expectedNeutral: true,
    expectedRule: "N2 (enum expanded on insensitive, non-mutating)",
  },

  // ── NARROWING (auditable but consent-safe) ──

  {
    id: "narrow-01", description: "additionalProperties tightened (open → closed)",
    class: "synthetic-rule-coverage",
    base: schemas(tool("api", s("object", { endpoint: prop("string") }, ["endpoint"]))),
    head: schemas(tool("api", s("object", { endpoint: prop("string") }, ["endpoint"], false))),
    expectedWidening: false, expectedReview: false, expectedNarrowing: true, expectedNeutral: false,
    expectedRule: "D1 (additionalProperties narrowed)",
  },

  {
    id: "narrow-02", description: "Required insensitive field added",
    class: "synthetic-rule-coverage",
    base: schemas(tool("log", s("object", { level: prop("string") }))),
    head: schemas(tool("log", s("object", { level: prop("string"), source: prop("string") }, ["source"]))),
    expectedWidening: false, expectedReview: false, expectedNarrowing: true, expectedNeutral: false,
    expectedRule: "D2 (required parser field added)",
  },

  {
    id: "narrow-03", description: "Mutating enum value removed",
    class: "synthetic-rule-coverage",
    base: schemas(tool("manage", s("object", { mode: prop("string", ["read","write","delete"]) }, ["mode"]))),
    head: schemas(tool("manage", s("object", { mode: prop("string", ["read","write"]) }, ["mode"]))),
    expectedWidening: false, expectedReview: false, expectedNarrowing: true, expectedNeutral: false,
    expectedRule: "D3 (enum narrowed on sensitive/mutating)",
  },

  // ── MULTI-TOOL (tool set changes) ──

  {
    id: "multi-01", description: "Tool added to server",
    class: "synthetic-rule-coverage",
    base: schemas(tool("read", s("object", { path: prop("string") }, ["path"]))),
    head: schemas(tool("read", s("object", { path: prop("string") }, ["path"])), tool("write", s("object", { path: prop("string"), content: prop("string") }, ["path", "content"]))),
    expectedWidening: false, expectedReview: true, expectedNarrowing: false, expectedNeutral: false,
    expectedRule: "tool-set change (new tool)",
  },

  {
    id: "multi-02", description: "Harmless optional field added",
    class: "synthetic-rule-coverage",
    base: schemas(tool("read", s("object", { path: prop("string") }, ["path"]))),
    head: schemas(tool("read", s("object", { path: prop("string"), verbose: prop("boolean") }, ["path"]))),
    expectedWidening: false, expectedReview: false, expectedNarrowing: false, expectedNeutral: true,
    expectedRule: "N1 only",
  },

  // ── LIMIT TESTS ──

  {
    id: "limit-01", description: "Enum rotation (remove 'list', add 'delete') — widening + narrowing pair",
    class: "limit-case",
    base: schemas(tool("manage", s("object", { mode: prop("string", ["read","list"]) }, ["mode"]))),
    head: schemas(tool("manage", s("object", { mode: prop("string", ["read","delete"]) }, ["mode"]))),
    expectedWidening: true, expectedReview: false, expectedNarrowing: true, expectedNeutral: false,
    expectedRule: "W3 + D3 (rotation)",
  },

  // ── COMBINATORIAL RELEASE ──

  {
    id: "combo-01", description: "Realistic multi-tool release: benign refactoring only",
    class: "synthetic-rule-coverage",
    base: schemas(
      tool("read_file", s("object", { path: prop("string") }, ["path"], false)),
      tool("search", s("object", { query: prop("string") }, ["query"])),
      tool("status", s("object", { verbose: prop("boolean") })),
    ),
    head: schemas(
      tool("read_file", s("object", { path: prop("string"), encoding: prop("string") }, ["path"], false)),
      tool("search", s("object", { query: prop("string"), limit: prop("number") }, ["query"])),
      tool("status", s("object", { verbose: prop("boolean") })),
    ),
    expectedWidening: false, expectedReview: false, expectedNarrowing: false, expectedNeutral: true,
    expectedRule: "2× N1 (all benign refactoring)",
  },

  {
    id: "combo-02", description: "Multi-tool: privilege escalation hidden in benign release",
    class: "seeded-escalation-scenario",
    base: schemas(
      tool("read", s("object", { path: prop("string") }, ["path"], false)),
      tool("config", s("object", { key: prop("string") }, ["key"])),
    ),
    head: schemas(
      tool("read", s("object", { path: prop("string"), encoding: prop("string") }, ["path"], false)),
      tool("config", s("object", { key: prop("string"), value: prop("string") }, ["key"])),
      tool("exec", s("object", { command: prop("string") }, ["command"])),
    ),
    expectedWidening: false, expectedReview: true, expectedNarrowing: false, expectedNeutral: true,
    expectedRule: "R1 (tool-set: new exec tool) + 2× N1 (benign fields)",
  },
];

// These cases use hash-verified extraction of the released converter/snapshots,
// omitting schema annotations, unused definitions and unselected tool contracts. The
// provenance record identifies the immutable source for each normalization.
const releaseInput = z.object({
  base: z.record(z.string(), z.record(z.string(), z.unknown())),
  head: z.record(z.string(), z.record(z.string(), z.unknown())),
});
const RELEASE_INPUTS = z.object({ notion: releaseInput, github: releaseInput }).parse(
  JSON.parse(readFileSync(new URL("../docs/permission-delta-corpus/release-inputs.json", import.meta.url), "utf8")),
);
const REAL_RELEASE_CASES: CorpusPair[] = [
  {
    id: "notion-v2.1.0-v2.3.1",
    description: "Notion MCP Server: two page-Markdown tool contracts added",
    class: "real-release-case",
    provenance: {
      server: "Notion MCP Server",
      repository: "https://github.com/makenotion/notion-mcp-server",
      baseRevision: "v2.1.0",
      baseCommit: "7e254df95e805861db8c052f5c325a1bb77a7560",
      headRevision: "v2.3.1",
      headCommit: "d282ce9c167d34705bc24074c856c84cba0f3344",
      comparison: "https://github.com/makenotion/notion-mcp-server/compare/v2.1.0...v2.3.1",
      schemaSource: "scripts/notion-openapi.json, /v1/pages/{page_id}/markdown",
      extraction: "The pinned released converter produces both operation schemas. The released proxy prefixes their advertised names with API-. Only annotations and unused definitions are removed; format, defaults, anyOf string fallbacks and nested input constraints are preserved. See release-inputs.json and EXTRACTION.md.",
    },
    ...RELEASE_INPUTS.notion,
    expectedWidening: false,
    expectedReview: true,
    expectedNarrowing: false,
    expectedNeutral: false,
    expectedRule: "2× R1 (new tool contracts require review)",
  },
  {
    id: "github-v0.7.0-v0.8.0",
    description: "GitHub MCP Server: get_file_contents path became optional",
    class: "real-release-case",
    provenance: {
      server: "GitHub MCP Server",
      repository: "https://github.com/github/github-mcp-server",
      baseRevision: "v0.7.0",
      baseCommit: "42e5ce9b88ee289bb8d7a297c1d8a580e06c9e86",
      headRevision: "v0.8.0",
      headCommit: "b5e33481793a6dbca5cf688ddf391ad410042d63",
      changeCommit: "d15026b0eb2a2e5d3265a2601798ab28017dc719",
      comparison: "https://github.com/github/github-mcp-server/compare/v0.7.0...v0.8.0",
      schemaSource: "pkg/github/__toolsnaps__/get_file_contents.snap and pkg/github/repositories.go",
      extraction: "The change commit replaces mcp.Required() with mcp.DefaultString('/') for path, and the checked-in released tool snapshot removes path from the required array and records the default. The normalized schemas omit descriptions and tool annotations but preserve every input keyword inspected by the classifier.",
    },
    ...RELEASE_INPUTS.github,
    expectedWidening: true,
    expectedReview: false,
    expectedNarrowing: false,
    expectedNeutral: false,
    expectedRule: "W2 (required permission field 'path' became optional)",
  },
];

//
// ── evaluation ──
//

function evaluateCorpus(corpus: readonly CorpusPair[] = CORPUS): EvaluationResult[] {
  const results: EvaluationResult[] = [];

  for (const pair of corpus) {
    const deltas = detectPermissionDeltas("tools", pair.base, pair.head);
    const counts = countDeltas(deltas);
    const wideningCorrect = counts.widening > 0 === pair.expectedWidening;
    const reviewCorrect = counts.review > 0 === pair.expectedReview;
    const narrowingCorrect = counts.narrowing > 0 === pair.expectedNarrowing;
    const neutralCorrect = counts.neutral > 0 === pair.expectedNeutral;

    let action: "WOULD BLOCK" | "WOULD QUEUE" | "PASS" | "NO DELTAS";
    if (counts.widening > 0) action = "WOULD BLOCK";
    else if (counts.review > 0) action = "WOULD QUEUE";
    else if (counts.narrowing > 0 || counts.neutral > 0) action = "PASS";
    else action = "NO DELTAS";

    const pass = wideningCorrect && reviewCorrect && narrowingCorrect && neutralCorrect;

    results.push({
      pair, deltas, counts,
      wideningCorrect, reviewCorrect, narrowingCorrect, neutralCorrect,
      action, pass,
    });
  }

  return results;
}

function corpusPairRecords(corpus: readonly CorpusPair[]) {
  return corpus.map((pair) => ({
    id: pair.id,
    description: pair.description,
    class: pair.class,
    expectedRule: pair.expectedRule,
    expectedSigns: expectedSigns(pair),
    ...(pair.provenance === undefined ? {} : { provenance: pair.provenance }),
    input: {
      base: pair.base,
      head: pair.head,
    },
  }));
}

function resultRecords(results: readonly EvaluationResult[]) {
  return results.map((result) => ({
    id: result.pair.id,
    description: result.pair.description,
    class: result.pair.class,
    inputSha256: sha256(serialize({ base: result.pair.base, head: result.pair.head })),
    expected: {
      rule: result.pair.expectedRule,
      signs: expectedSigns(result.pair),
    },
    observed: {
      signs: Object.fromEntries(RISK_ORDER.map((risk) => [risk, result.counts[risk] > 0])),
      counts: result.counts,
      action: result.action,
      deltas: result.deltas,
    },
    checks: {
      widening: result.wideningCorrect,
      review: result.reviewCorrect,
      narrowing: result.narrowingCorrect,
      neutral: result.neutralCorrect,
    },
    pass: result.pass,
  }));
}

function realReleaseCaseRecords(cases: readonly CorpusPair[]) {
  return cases.map((pair) => ({
    id: pair.id,
    description: pair.description,
    provenance: pair.provenance,
    normalizedInput: {
      base: pair.base,
      head: pair.head,
    },
    regressionExpectation: expectedSigns(pair),
  }));
}

function realReleaseResultRecords(results: readonly EvaluationResult[]) {
  return results.map((result) => ({
    id: result.pair.id,
    description: result.pair.description,
    inputSha256: sha256(serialize({ base: result.pair.base, head: result.pair.head })),
    observed: {
      signs: Object.fromEntries(RISK_ORDER.map((risk) => [risk, result.counts[risk] > 0])),
      counts: result.counts,
      action: result.action,
      deltas: result.deltas,
    },
    regressionExpectation: {
      signs: expectedSigns(result.pair),
      matches: result.pass,
    },
  }));
}

function summarizeResults(results: EvaluationResult[]): EvaluationSummary {
  const byClass: EvaluationSummary["byClass"] = {};
  const gateDecisions: Record<GateAction, number> = {
    "WOULD BLOCK": 0,
    "WOULD QUEUE": 0,
    PASS: 0,
    "NO DELTAS": 0,
  };
  const deltasByRisk: Record<PermissionDeltaRisk, number> = {
    narrowing: 0,
    neutral: 0,
    review: 0,
    widening: 0,
  };

  for (const result of results) {
    const classStats = byClass[result.pair.class] ?? { total: 0, pass: 0, ratePct: 0 };
    classStats.total += 1;
    if (result.pass) classStats.pass += 1;
    byClass[result.pair.class] = classStats;

    gateDecisions[result.action] += 1;
    for (const risk of RISK_ORDER) deltasByRisk[risk] += result.counts[risk];
  }

  for (const stats of Object.values(byClass)) {
    stats.ratePct = (stats.pass / stats.total) * 100;
  }

  const passCount = results.filter((result) => result.pass).length;
  const reviewThresholdAlerts = gateDecisions["WOULD BLOCK"] + gateDecisions["WOULD QUEUE"];
  const wideningThresholdAlerts = gateDecisions["WOULD BLOCK"];
  const reductionPct = (alerts: number): number => ((results.length - alerts) / results.length) * 100;

  return {
    totalPairs: results.length,
    passCount,
    failCount: results.length - passCount,
    passRatePct: (passCount / results.length) * 100,
    byClass,
    gateDecisions,
    deltasByRisk,
    totalDeltas: Object.values(deltasByRisk).reduce((sum, count) => sum + count, 0),
    alertReduction: {
      baseline: "binary-change-detection",
      baselineAlerts: results.length,
      reviewThreshold: {
        alerts: reviewThresholdAlerts,
        reductionPct: reductionPct(reviewThresholdAlerts),
      },
      wideningThreshold: {
        alerts: wideningThresholdAlerts,
        reductionPct: reductionPct(wideningThresholdAlerts),
      },
    },
  };
}

//
// ── report ──
//

function printResults(results: EvaluationResult[], summary: EvaluationSummary): void {
  const passed = results.filter((r) => r.pass);
  const failed = results.filter((r) => !r.pass);

  console.log(`\n=== Permission Delta Synthetic Conformance Evaluation ===\n`);

  for (const r of results) {
    const status = r.pass ? "PASS" : "FAIL";
    const marker = r.pass ? "✓" : "✗";
    console.log(`${marker} ${status}  ${r.pair.id.padEnd(14)} ${r.action.padEnd(14)} ${r.pair.description}`);
    if (!r.pass) {
      if (!r.wideningCorrect) console.log(`        widening: expected=${r.pair.expectedWidening} got=${r.counts.widening > 0}`);
      if (!r.reviewCorrect) console.log(`        review:   expected=${r.pair.expectedReview} got=${r.counts.review > 0}`);
      if (!r.narrowingCorrect) console.log(`        narrowing: expected=${r.pair.expectedNarrowing} got=${r.counts.narrowing > 0}`);
      if (!r.neutralCorrect) console.log(`        neutral:  expected=${r.pair.expectedNeutral} got=${r.counts.neutral > 0}`);
      console.log(`        deltas: ${JSON.stringify(r.deltas.map((d) => ({ risk: d.risk, change: d.change })))}`);
    }
  }

  console.log(`\n---`);
  console.log(`Total:  ${results.length} pairs`);
  console.log(`Pass:   ${passed.length}`);
  console.log(`Fail:   ${failed.length}`);
  console.log(`Rate:   ${summary.passRatePct}%`);

  console.log(`\nBreakdown by class:`);
  for (const [cls, stats] of Object.entries(summary.byClass)) {
    console.log(`  ${cls.padEnd(25)} ${stats.pass}/${stats.total} ${stats.ratePct}%`);
  }

  console.log(`\nGate decisions:`);
  console.log(`  WOULD BLOCK:   ${summary.gateDecisions["WOULD BLOCK"]}`);
  console.log(`  WOULD QUEUE:   ${summary.gateDecisions["WOULD QUEUE"]}`);
  console.log(`  PASS:          ${summary.gateDecisions.PASS}`);
  console.log(`  NO DELTAS:     ${summary.gateDecisions["NO DELTAS"]}`);
  console.log(`  Alert reduction at review threshold: ${summary.alertReduction.reviewThreshold.reductionPct}%`);
  console.log(`  Alert reduction at widening threshold: ${summary.alertReduction.wideningThreshold.reductionPct}%`);
  console.log(`\nTotal deltas by risk: ${JSON.stringify(summary.deltasByRisk)}`);

  if (failed.length > 0) {
    console.log(`\n=== FAILURES (${failed.length}) ===`);
    console.log(`These indicate classifier behavior diverging from expected signs.`);
  }
}

async function main(): Promise<void> {
  const results = evaluateCorpus();
  const summary = summarizeResults(results);
  printResults(results, summary);

  const outputDir = path.join(process.cwd(), "docs", "permission-delta-corpus");
  await mkdir(outputDir, { recursive: true });

  const corpusArtifact = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    kind: "author-constructed-synthetic-conformance-fixtures",
    claimScope: "These fixtures test sign-presence conformance against author-specified expectations. They do not estimate empirical accuracy, recall, or ecosystem prevalence.",
    pairs: corpusPairRecords(CORPUS),
  };
  const corpusJson = serialize(corpusArtifact);

  writeFileSync(
    path.join(outputDir, "corpus.json"),
    corpusJson,
    "utf8",
  );

  const resultsArtifact = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    evaluation: {
      kind: "author-constructed-synthetic-conformance",
      claimScope: "A pass means the classifier emitted exactly the expected presence or absence of each of the four signs for that fixture. It is not an accuracy, recall, or external-validity measurement.",
      generator: "scripts/evaluate-permission-delta-conformance.ts",
      evaluator: "src/permission-delta.ts",
      evaluatorSha256: sha256(readFileSync(new URL("../src/permission-delta.ts", import.meta.url), "utf8")),
      corpus: "docs/permission-delta-corpus/corpus.json",
      corpusSha256: sha256(corpusJson),
      gatePrecedence: ["widening", "review", "narrowing-or-neutral", "no-deltas"],
    },
    summary,
    results: resultRecords(results),
  };

  writeFileSync(
    path.join(outputDir, "results.json"),
    serialize(resultsArtifact),
    "utf8",
  );

  const realResults = evaluateCorpus(REAL_RELEASE_CASES);
  const rawRealSummary = summarizeResults(realResults);
  const realSummary = {
    totalPairs: rawRealSummary.totalPairs,
    gateDecisions: rawRealSummary.gateDecisions,
    deltasByRisk: rawRealSummary.deltasByRisk,
    totalDeltas: rawRealSummary.totalDeltas,
  };
  const realCorpusArtifact = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    kind: "hand-extracted-real-release-cases",
    claimScope: "These two release-time case studies preserve their source revisions, normalized changed tool inputs, and observed classifier outputs.",
    cases: realReleaseCaseRecords(REAL_RELEASE_CASES),
  };
  const realCorpusJson = serialize(realCorpusArtifact);

  writeFileSync(
    path.join(outputDir, "real-release-case.json"),
    realCorpusJson,
    "utf8",
  );

  const realResultsArtifact = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    evaluation: {
      kind: "hand-extracted-real-release-cases",
      claimScope: "The cases record direct classifier results for two source-backed MCP release pairs.",
      generator: "scripts/evaluate-permission-delta-conformance.ts",
      evaluator: "src/permission-delta.ts",
      evaluatorSha256: sha256(readFileSync(new URL("../src/permission-delta.ts", import.meta.url), "utf8")),
      corpus: "docs/permission-delta-corpus/real-release-case.json",
      corpusSha256: sha256(realCorpusJson),
      gatePrecedence: ["widening", "review", "narrowing-or-neutral", "no-deltas"],
      sources: REAL_RELEASE_CASES.map((releaseCase) => releaseCase.provenance),
    },
    summary: realSummary,
    results: realReleaseResultRecords(realResults),
  };

  writeFileSync(
    path.join(outputDir, "real-release-results.json"),
    serialize(realResultsArtifact),
    "utf8",
  );

  console.log(`\nFrozen inputs written to ${outputDir}/corpus.json`);
  console.log(`Authoritative observed results written to ${outputDir}/results.json`);
  console.log(`Real-release cases written to ${outputDir}/real-release-case.json`);
  console.log(`Real-release results written to ${outputDir}/real-release-results.json`);

  if (summary.failCount > 0 || realResults.some((result) => !result.pass)) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
