import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { detectPermissionDeltas } from "../src/permission-delta.js";

const inputSchema = z.object({
  base: z.record(z.string(), z.record(z.string(), z.unknown())),
  head: z.record(z.string(), z.record(z.string(), z.unknown())),
});
type CorpusInput = z.infer<typeof inputSchema>;
const changeSchema = z.object({
  detail: z.string(), kind: z.string(), param: z.string().nullable(),
  severity: z.enum(["breaking", "info", "warning"]), tool: z.string(),
});
export const PINNED_BASELINE = {
  tool: "mcp-diff", version: "0.1.0",
  moduleSha256: "d6ea58374444a6c2403614f1d59e250167ea34e6574b9676f5e38ae7fef1b853",
  wheelSha256: "8ef37636b98ecae6da336c212dba222a14fc5c14a586f0c9ba15ca8391ec542e",
  source: "https://pypi.org/project/mcp-diff/0.1.0/",
} as const;
const hash = (value: string): string => createHash("sha256").update(value).digest("hex");
const serialize = (value: unknown): string => JSON.stringify(value, null, 2) + "\n";

// Isolated Python ignores user site/PYTHONPATH and the working directory.
// Each invocation checks the same engine; no separate CLI supplies its version.
const PYTHON_DRIVER = [
  "import hashlib, importlib.metadata, inspect, json, platform, sys",
  "from dataclasses import asdict",
  "import mcp_diff.diff as engine",
  "version = importlib.metadata.version('mcp-diff')",
  "with open(inspect.getfile(engine), 'rb') as source: digest = hashlib.sha256(source.read()).hexdigest()",
  "if version != " + JSON.stringify(PINNED_BASELINE.version) + " or digest != " + JSON.stringify(PINNED_BASELINE.moduleSha256) + ": raise RuntimeError('The study requires the unmodified pinned mcp-diff engine')",
  "if len(sys.argv) == 1:",
  "    print(json.dumps({'version': version, 'moduleSha256': digest, 'pythonVersion': platform.python_version()}))",
  "else:",
  "    with open(sys.argv[1], encoding='utf-8') as stream: old_tools = json.load(stream)",
  "    with open(sys.argv[2], encoding='utf-8') as stream: new_tools = json.load(stream)",
  "    print(json.dumps([asdict(change) for change in engine.classify_changes(old_tools, new_tools)]))",
].join("\n");
function runPython(files: string[] = []): unknown {
  return JSON.parse(execFileSync(process.env["MCP_DIFF_PYTHON"] ?? "python3", ["-I", "-c", PYTHON_DRIVER, ...files], {
    encoding: "utf8", timeout: 15_000, maxBuffer: 1_048_576, stdio: ["ignore", "pipe", "pipe"],
  })) as unknown;
}
function asTools(schemas: Record<string, unknown>) {
  return Object.entries(schemas).map(([name, inputSchema]) => ({ name, description: "", inputSchema }));
}
export function writeBaselineInputs(base: Record<string, unknown>, head: Record<string, unknown>, workDir: string): { baseFile: string; headFile: string } {
  const pairDir = mkdtempSync(path.join(workDir, "pair-"));
  const baseFile = path.join(pairDir, "base.json"), headFile = path.join(pairDir, "head.json");
  writeFileSync(baseFile, JSON.stringify(asTools(base)), { encoding: "utf8", flag: "wx", mode: 0o600 });
  writeFileSync(headFile, JSON.stringify(asTools(head)), { encoding: "utf8", flag: "wx", mode: 0o600 });
  return { baseFile, headFile };
}
export function classifyBaselineOutput(output: unknown) {
  // Malformed output or an unknown severity must never become compatible.
  const changes = z.array(changeSchema).max(10_000).parse(output);
  const verdict = changes.some((c) => c.severity === "breaking") ? "breaking"
    : changes.some((c) => c.severity === "warning") ? "warning" : "compatible";
  return { verdict, changes };
}
export function permissionAction(input: CorpusInput): "WOULD BLOCK" | "WOULD QUEUE" | "PASS" | "NO DELTAS" {
  const deltas = detectPermissionDeltas("tools", input.base, input.head);
  if (deltas.some((delta) => delta.risk === "widening")) return "WOULD BLOCK";
  if (deltas.some((delta) => delta.risk === "review")) return "WOULD QUEUE";
  return deltas.length > 0 ? "PASS" : "NO DELTAS";
}
function readCorpus(file: string): { contents: string; data: unknown } {
  const contents = readFileSync(file, "utf8");
  if (Buffer.byteLength(contents) > 8_388_608) throw new Error("Study input exceeds 8 MiB");
  return { contents, data: JSON.parse(contents) as unknown };
}
export async function main(): Promise<void> {
  const corpusDir = path.join(process.cwd(), "docs", "permission-delta-corpus");
  const syntheticFile = readCorpus(path.join(corpusDir, "corpus.json"));
  const releaseFile = readCorpus(path.join(corpusDir, "real-release-case.json"));
  const synthetic = z.object({ pairs: z.array(z.object({
    id: z.string(), description: z.string(), class: z.string(), input: inputSchema,
  })).min(1).max(100) }).parse(syntheticFile.data).pairs;
  const real = z.object({ cases: z.array(z.object({
    id: z.string(), description: z.string(), normalizedInput: inputSchema,
  })).min(1).max(100) }).parse(releaseFile.data).cases.map((pair) => ({
    ...pair, class: "real-release-case", input: pair.normalizedInput,
  }));
  const pairs = [...synthetic, ...real];
  if (new Set(pairs.map((pair) => pair.id)).size !== pairs.length) throw new Error("Duplicate study pair IDs");
  const runtime = z.object({
    version: z.literal(PINNED_BASELINE.version), moduleSha256: z.literal(PINNED_BASELINE.moduleSha256),
    pythonVersion: z.string(),
  }).parse(runPython());
  const workDir = mkdtempSync(path.join(tmpdir(), "mcp-diff-baseline-"));
  try {
    const entries = pairs.map((pair) => {
      const { baseFile, headFile } = writeBaselineInputs(pair.input.base, pair.input.head, workDir);
      const { verdict, changes } = classifyBaselineOutput(runPython([baseFile, headFile]));
      const action = permissionAction(pair.input);
      const escalated = action === "WOULD BLOCK" || action === "WOULD QUEUE";
      return {
        pairId: pair.id, description: pair.description, class: pair.class,
        inputSha256: hash(serialize(pair.input)),
        mcpDiffVerdict: verdict, mcpDiffChanges: changes, permissionDeltaAction: action,
        compatibleButEscalated: verdict === "compatible" && escalated,
        noncompatibleButAdmitted: verdict !== "compatible" && !escalated,
      };
    });
    const artifact = {
      schemaVersion: "permission-delta-mcp-diff-baseline/v2",
      claimScope: "A comparison of different decision policies on authored inputs and selected releases; disagreement is not a measured security miss or accuracy estimate.",
      baseline: { ...PINNED_BASELINE, ...runtime },
      evaluator: {
        classifierSha256: hash(readFileSync("src/permission-delta.ts", "utf8")),
        runnerSha256: hash(readFileSync("scripts/run-mcp-diff-baseline.ts", "utf8")),
        corpusSha256: hash(syntheticFile.contents), realCorpusSha256: hash(releaseFile.contents),
        permissionActions: "recomputed directly from current classifier and frozen inputs",
        normalization: "only input schemas and names; tool descriptions are empty in both engines",
      },
      summary: {
        total: entries.length, syntheticTotal: synthetic.length, realTotal: real.length,
        syntheticCompatibleButEscalated: entries.filter((e) => e.class !== "real-release-case" && e.compatibleButEscalated).length,
        realCompatibleButEscalated: entries.filter((e) => e.class === "real-release-case" && e.compatibleButEscalated).length,
        noncompatibleButAdmitted: entries.filter((e) => e.noncompatibleButAdmitted).length,
      },
      entries,
    };
    // Finish every comparison before replacing either output.
    const json = serialize(artifact);
    writeFileSync(path.join(corpusDir, "mcp-diff-baseline.json"), json);
    writeFileSync(path.join(corpusDir, "compat-baseline.json"), json);
    console.log(JSON.stringify(artifact.summary));
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
