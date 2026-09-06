import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface CorpusInput {
  base: Record<string, unknown>;
  head: Record<string, unknown>;
}

interface CorpusPair {
  id: string;
  description: string;
  class: string;
  input: CorpusInput;
}

interface CorpusFile {
  pairs: CorpusPair[];
}

interface RealReleaseCase {
  id: string;
  description: string;
  normalizedInput: CorpusInput;
}

interface McpDiffChange {
  detail: string;
  kind: string;
  param: string | null;
  severity: "breaking" | "info" | "warning";
  tool: string;
}

interface BaselineEntry {
  pairId: string;
  description: string;
  class: string;
  mcpDiffVerdict: "breaking" | "compatible" | "warning";
  mcpDiffChanges: McpDiffChange[];
  permissionDeltaAction: string;
  consentEscalationMiss: boolean;
  compatibilityOnlyBreak: boolean;
}

const PYTHON_DRIVER = [
  "import json, sys",
  "from dataclasses import asdict",
  "from mcp_diff.diff import classify_changes",
  "old_tools = json.load(open(sys.argv[1], encoding='utf-8'))",
  "new_tools = json.load(open(sys.argv[2], encoding='utf-8'))",
  "print(json.dumps([asdict(change) for change in classify_changes(old_tools, new_tools)]))",
].join("; ");

function asTools(schemas: Record<string, unknown>): Array<{ name: string; description: string; inputSchema: unknown }> {
  return Object.entries(schemas).map(([name, inputSchema]) => ({ name, description: "", inputSchema }));
}

export function writeBaselineInputs(base:Record<string,unknown>,head:Record<string,unknown>,workDir:string):{baseFile:string;headFile:string} {
  const pairDir=mkdtempSync(path.join(workDir,"pair-"));
  const baseFile=path.join(pairDir,"base.json"),headFile=path.join(pairDir,"head.json");
  writeFileSync(baseFile,JSON.stringify(asTools(base)),{encoding:"utf8",flag:"wx",mode:0o600});
  writeFileSync(headFile,JSON.stringify(asTools(head)),{encoding:"utf8",flag:"wx",mode:0o600});
  return {baseFile,headFile};
}

function mcpDiffSchemas(
  base: Record<string, unknown>,
  head: Record<string, unknown>,
  workDir: string,
): { verdict: BaselineEntry["mcpDiffVerdict"]; changes: McpDiffChange[] } {
  const {baseFile,headFile}=writeBaselineInputs(base,head,workDir);

  const output = execFileSync("python3", ["-c", PYTHON_DRIVER, baseFile, headFile], { encoding: "utf8" });
  const changes = JSON.parse(output) as McpDiffChange[];
  const verdict: BaselineEntry["mcpDiffVerdict"] = changes.some((change) => change.severity === "breaking")
    ? "breaking"
    : changes.some((change) => change.severity === "warning")
      ? "warning"
      : "compatible";
  return { verdict, changes };
}

function comparePair(
  pairId: string,
  description: string,
  className: string,
  input: CorpusInput,
  action: string,
  workDir: string,
): BaselineEntry {
  const { verdict, changes } = mcpDiffSchemas(input.base, input.head, workDir);
  const permissionEscalates = action === "WOULD BLOCK" || action === "WOULD QUEUE";
  const mcpDiffPasses = verdict === "compatible";
  return {
    pairId,
    description,
    class: className,
    mcpDiffVerdict: verdict,
    mcpDiffChanges: changes,
    permissionDeltaAction: action,
    consentEscalationMiss: mcpDiffPasses && permissionEscalates,
    compatibilityOnlyBreak: !mcpDiffPasses && !permissionEscalates,
  };
}

async function main(): Promise<void> {
  const corpusDir = path.join(process.cwd(), "docs", "permission-delta-corpus");
  const corpus = JSON.parse(readFileSync(path.join(corpusDir, "corpus.json"), "utf8")) as CorpusFile;
  const resultsData = JSON.parse(readFileSync(path.join(corpusDir, "results.json"), "utf8")) as { results: Array<{ id: string; observed: { action: string } }> };
  const realCaseData = JSON.parse(readFileSync(path.join(corpusDir, "real-release-case.json"), "utf8")) as { cases: RealReleaseCase[] };
  const realResultsData = JSON.parse(readFileSync(path.join(corpusDir, "real-release-results.json"), "utf8")) as { results: Array<{ id: string; observed: { action: string } }> };
  const resultMap = new Map<string, string>();
  for (const result of [...resultsData.results, ...realResultsData.results]) resultMap.set(result.id, result.observed.action);

  const workDir = mkdtempSync(path.join(tmpdir(), "mcp-diff-baseline-"));

  try {
    const entries: BaselineEntry[] = [];
    for (const pair of corpus.pairs) {
      entries.push(comparePair(
        pair.id,
        pair.description,
        pair.class,
        pair.input,
        resultMap.get(pair.id) ?? "unknown",
        workDir,
      ));
    }
    for (const pair of realCaseData.cases) {
      entries.push(comparePair(
        pair.id,
        pair.description,
        "real-release-case",
        pair.normalizedInput,
        resultMap.get(pair.id) ?? "unknown",
        workDir,
      ));
    }

    const synthetic = entries.filter((entry) => entry.class !== "real-release-case");
    const real = entries.filter((entry) => entry.class === "real-release-case");
    const consentMisses = entries.filter((entry) => entry.consentEscalationMiss);
    const compatibilityOnly = entries.filter((entry) => entry.compatibilityOnlyBreak);
    const mcpDiffVersion = execFileSync("mcp-diff", ["--version"], { encoding: "utf8" }).trim();

    console.log("\n=== mcp-diff baseline comparison ===\n");
    console.log(`Synthetic consent escalations missed: ${synthetic.filter((entry) => entry.consentEscalationMiss).length}/${synthetic.length}`);
    console.log(`Real consent escalations missed:      ${real.filter((entry) => entry.consentEscalationMiss).length}/${real.length}`);
    console.log(`Compatibility-only breaks:            ${compatibilityOnly.length}`);
    for (const entry of consentMisses) {
      console.log(`  MISS ${entry.pairId}: mcp-diff=${entry.mcpDiffVerdict}, permission-delta=${entry.permissionDeltaAction}`);
    }
    for (const entry of compatibilityOnly) {
      console.log(`  AXIS ${entry.pairId}: mcp-diff=${entry.mcpDiffVerdict}, permission-delta=${entry.permissionDeltaAction}`);
    }

    const artifact = {
      schemaVersion: "permission-delta-mcp-diff-baseline/v1",
      baseline: { tool: "mcp-diff", version: mcpDiffVersion },
      summary: {
        total: entries.length,
        syntheticTotal: synthetic.length,
        realTotal: real.length,
        consentEscalationMisses: consentMisses.length,
        compatibilityOnlyBreaks: compatibilityOnly.length,
      },
      entries,
    };
    const outputPath = path.join(corpusDir, "mcp-diff-baseline.json");
    const artifactJson = `${JSON.stringify(artifact, null, 2)}\n`;
    writeFileSync(outputPath, artifactJson, "utf8");
    writeFileSync(path.join(corpusDir, "compat-baseline.json"), artifactJson, "utf8");
    console.log(`\nFull results: ${outputPath}`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error); process.exitCode=1; });
}
