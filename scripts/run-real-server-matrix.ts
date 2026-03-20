import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  renderMarkdown,
  runTarget,
  type CheckStatus,
  type TargetConfig
} from "../src/index.js";

const root = process.cwd();
const targetsDir = path.join(root, "examples", "targets");
const artifactsDir = path.join(root, "examples", "artifacts");
const matrixSummaryPath = path.join(root, "examples", "matrix-summary.json");
const matrixHistoryPath = path.join(root, "examples", "matrix-history.json");
const proofIndexPath = path.join(root, "examples", "INDEX.md");

interface MatrixSummaryEntry {
  targetId: string;
  packageName: string;
  packageVersion?: string;
  runDate: string;
  gate: "pass" | "fail";
  tools: CheckStatus;
  prompts: CheckStatus;
  resources: CheckStatus;
  artifactPath: string;
  reportPath: string;
  command: string;
  whyItMatters: string;
}

function relativeToRoot(filePath: string): string {
  return `./${path.relative(root, filePath).replaceAll(path.sep, "/")}`;
}

function checkStatus(
  artifact: Awaited<ReturnType<typeof runTarget>>,
  checkId: "tools" | "prompts" | "resources",
): CheckStatus {
  const check = artifact.checks.find((entry) => entry.id === checkId);
  if (check === undefined) {
    throw new Error(`Missing ${checkId} check for ${artifact.target.targetId}`);
  }
  return check.status;
}

async function writeSummaryAndIndex(entries: MatrixSummaryEntry[]): Promise<void> {
  await writeFile(matrixSummaryPath, JSON.stringify(entries, null, 2) + "\n", "utf8");

  const index = [
    "# Proof Index",
    "",
    "These checked-in files are evidence, not decorative samples.",
    "",
    "## Passing Matrix",
    "",
    "| Target | Package | Version | Run Date | Why it matters | Artifact | Report |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...entries.map((entry) => [
      `| \`${entry.targetId}\``,
      `\`${entry.packageName}\``,
      `\`${entry.packageVersion ?? "unknown"}\``,
      `\`${entry.runDate}\``,
      entry.whyItMatters,
      `[JSON](${entry.artifactPath})`,
      `[Markdown](${entry.reportPath}) |`
    ].join(" | ")),
    "",
    "## Commands Used",
    "",
    ...entries.map((entry) => `- \`${entry.targetId}\`: \`${entry.command}\``),
    "",
    "## Canonical Failure Proof",
    "",
    "- Startup diagnosis: [`server-pdf-startup-fail.json`](./artifacts/server-pdf-startup-fail.json) and [`server-pdf-startup-fail-report.md`](./artifacts/server-pdf-startup-fail-report.md)"
  ].join("\n");

  await writeFile(proofIndexPath, index + "\n", "utf8");
}

async function main(): Promise<void> {
  await mkdir(artifactsDir, { recursive: true });
  const targetFiles = (await readdir(targetsDir))
    .filter((file) => file.endsWith(".json"))
    .sort();

  let sawFailure = false;
  const summaryEntries: MatrixSummaryEntry[] = [];

  for (const fileName of targetFiles) {
    const targetPath = path.join(targetsDir, fileName);
    const target = JSON.parse(
      await readFile(targetPath, "utf8"),
    ) as TargetConfig;
    const artifact = await runTarget(target);
    const artifactPath = path.join(
      artifactsDir,
      `${artifact.target.targetId}.json`,
    );
    const markdownPath = path.join(
      artifactsDir,
      `${artifact.target.targetId}-report.md`,
    );

    await writeFile(artifactPath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
    await writeFile(markdownPath, renderMarkdown(artifact) + "\n", "utf8");
    process.stdout.write(
      `${artifact.target.targetId}: ${artifact.gate} -> ${artifactPath}\n`,
    );

    summaryEntries.push({
      targetId: artifact.target.targetId,
      packageName:
        target.metadata?.package ??
        artifact.target.serverName ??
        artifact.target.targetId,
      packageVersion: artifact.target.serverVersion,
      runDate: artifact.createdAt,
      gate: artifact.gate,
      tools: checkStatus(artifact, "tools"),
      prompts: checkStatus(artifact, "prompts"),
      resources: checkStatus(artifact, "resources"),
      artifactPath: relativeToRoot(artifactPath),
      reportPath: relativeToRoot(markdownPath),
      command: target.adapter === "http" ? target.url : [target.command, ...target.args].join(" "),
      whyItMatters:
        target.metadata?.whyItMatters ??
        target.metadata?.shape ??
        "Checked-in real-server proof."
    });

    if (artifact.gate === "fail") {
      sawFailure = true;
    }
  }

  await writeSummaryAndIndex(summaryEntries);

  // Append to history (capped at 90 entries)
  let history: Array<{ date: string; entries: MatrixSummaryEntry[] }> = [];
  try {
    history = JSON.parse(await readFile(matrixHistoryPath, "utf8"));
  } catch {
    // No history yet
  }
  history.push({ date: new Date().toISOString().split("T")[0]!, entries: summaryEntries });
  if (history.length > 90) history = history.slice(-90);
  await writeFile(matrixHistoryPath, JSON.stringify(history, null, 2) + "\n", "utf8");

  if (sawFailure) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
