import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  renderMarkdown,
  runTarget,
  validateRunArtifact,
  type CheckResult,
  type RunArtifact,
  type TargetConfig,
} from "../src/index.js";

const root = process.cwd();
const indexDir = path.join(root, "docs", "safety-index");
const targetsPath = path.join(indexDir, "targets.json");
const artifactsDir = path.join(indexDir, "artifacts");
const outputPath = path.join(root, "docs", "mcp-server-safety-index.md");

export type SafetyVerdict =
  | "Ready for CI"
  | "Needs review before production"
  | "Not reproducible"
  | "Unsafe default posture"
  | "Could not evaluate";

export interface SafetyIndexTarget {
  id: string;
  name: string;
  repo: string;
  packageName?: string;
  category: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  securitySuppressions?: string[];
  riskClass: string;
  failureClass: string;
  whyItMatters: string;
  reproductionNotes: string;
  status?: string;
  publicProof?: string;
}

export interface SafetyIndexEntry {
  target: SafetyIndexTarget;
  artifact: RunArtifact;
  verdict: SafetyVerdict;
  artifactPath: string;
  reportPath: string;
}

function relativeToRoot(filePath: string): string {
  return `./${path.relative(root, filePath).replaceAll(path.sep, "/")}`;
}

function relativeToIndex(filePath: string): string {
  return `./${path.relative(path.dirname(outputPath), filePath).replaceAll(path.sep, "/")}`;
}

function markdownLink(label: string, href: string): string {
  return `[${label}](${href})`;
}

function commandFor(target: SafetyIndexTarget): string {
  return [target.command, ...target.args].join(" ");
}

function securityDiagnostics(checks: CheckResult[]): string[] {
  return checks
    .filter((check) => check.id === "security" || check.id === "security-lite")
    .flatMap((check) => check.evidence.flatMap((evidence) => evidence.diagnostics ?? []));
}

function hasSecuritySeverity(checks: CheckResult[], severity: "high" | "medium"): boolean {
  return securityDiagnostics(checks).some((diagnostic) => diagnostic.toLowerCase().startsWith(`[${severity}]`));
}

export function verdictForArtifact(artifact: RunArtifact): SafetyVerdict {
  if (artifact.fatalError) return "Not reproducible";

  const tools = artifact.checks.find((check) => check.id === "tools");
  if (tools?.status === "fail") return "Not reproducible";
  if (hasSecuritySeverity(artifact.checks, "high")) return "Unsafe default posture";
  if (artifact.gate === "fail" || hasSecuritySeverity(artifact.checks, "medium")) return "Needs review before production";
  return "Ready for CI";
}

function targetConfigFor(target: SafetyIndexTarget): TargetConfig {
  return {
    targetId: target.id,
    adapter: "local-process",
    command: target.command,
    args: target.args,
    cwd: target.cwd ?? ".",
    env: target.env,
    timeoutMs: target.timeoutMs ?? 60_000,
    securitySuppressions: target.securitySuppressions,
    metadata: {
      package: target.packageName ?? target.name,
      purpose: "mcp-safety-index",
      riskClass: target.riskClass,
      failureClass: target.failureClass,
      whyItMatters: target.whyItMatters,
    },
  };
}

export async function loadSafetyTargets(filePath = targetsPath): Promise<SafetyIndexTarget[]> {
  const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error("Safety Index targets must be an array.");
  }

  return raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`Safety Index target ${index} must be an object.`);
    }
    const target = entry as Partial<SafetyIndexTarget>;
    for (const field of ["id", "name", "repo", "category", "command", "riskClass", "failureClass", "whyItMatters", "reproductionNotes"] as const) {
      if (typeof target[field] !== "string" || target[field]?.length === 0) {
        throw new Error(`Safety Index target ${index} missing ${field}.`);
      }
    }
    if (!Array.isArray(target.args) || !target.args.every((arg) => typeof arg === "string")) {
      throw new Error(`Safety Index target ${index} args must be an array of strings.`);
    }
    return target as SafetyIndexTarget;
  });
}

async function runEntry(target: SafetyIndexTarget): Promise<SafetyIndexEntry> {
  const artifact = await runTarget(targetConfigFor(target), { securityCheck: true });
  validateRunArtifact(artifact);

  await mkdir(artifactsDir, { recursive: true });
  const artifactPath = path.join(artifactsDir, `${target.id}.json`);
  const reportPath = path.join(artifactsDir, `${target.id}.md`);
  await writeFile(artifactPath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  await writeFile(reportPath, renderMarkdown(artifact) + "\n", "utf8");

  return {
    target,
    artifact,
    verdict: verdictForArtifact(artifact),
    artifactPath,
    reportPath,
  };
}

export function renderSafetyIndex(entries: SafetyIndexEntry[]): string {
  const verdictCounts = new Map<SafetyVerdict, number>();
  for (const entry of entries) {
    verdictCounts.set(entry.verdict, (verdictCounts.get(entry.verdict) ?? 0) + 1);
  }

  const patternCounts = new Map<string, number>();
  for (const entry of entries) {
    patternCounts.set(entry.target.failureClass, (patternCounts.get(entry.target.failureClass) ?? 0) + 1);
  }
  const patterns = [...patternCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const lines = [
    "# MCP Server Safety Index v1",
    "",
    "The MCP Server Safety Index is an evidence standard for MCP readiness. It is not a leaderboard and does not rank maintainers.",
    "",
    "Each row links to a reproducible command, a JSON run artifact, and a Markdown report generated by MCP Observatory. The goal is to show which failure classes matter before teams let agents depend on MCP servers.",
    "",
    "For the rules behind this page, see the [Safety Methodology](./methodology.md).",
    "",
    "## Snapshot",
    "",
    `- Evaluated servers: ${entries.length}`,
    `- Ready for CI: ${verdictCounts.get("Ready for CI") ?? 0}`,
    `- Needs review before production: ${verdictCounts.get("Needs review before production") ?? 0}`,
    `- Unsafe default posture: ${verdictCounts.get("Unsafe default posture") ?? 0}`,
    `- Not reproducible: ${verdictCounts.get("Not reproducible") ?? 0}`,
    `- Latest run: ${entries.map((entry) => entry.artifact.createdAt).sort().at(-1) ?? "unknown"}`,
    "",
    "## Evaluations",
    "",
    "| # | Server | Category | Verdict | Failure Class | Reproduce | Evidence | Notes |",
    "| ---: | --- | --- | --- | --- | --- | --- | --- |",
  ];

  entries.forEach((entry, index) => {
    const proof = entry.target.publicProof ? ` ${markdownLink("public proof", entry.target.publicProof)}` : "";
    lines.push([
      `| ${index + 1}`,
      `${markdownLink(entry.target.name, entry.target.repo)}`,
      entry.target.category,
      `**${entry.verdict}**`,
      entry.target.failureClass,
      `\`${commandFor(entry.target)}\``,
      `${markdownLink("JSON", relativeToIndex(entry.artifactPath))} / ${markdownLink("report", relativeToIndex(entry.reportPath))}`,
      `${entry.target.reproductionNotes}${proof} |`,
    ].join(" | "));
  });

  lines.push(
    "",
    "## Patterns Observed",
    "",
    ...patterns.map(([pattern, count]) => `- ${pattern}: ${count} server(s)`),
    "",
    "## Publication Rules",
    "",
    "- Use only public repositories, public package commands, public PRs, and generated sanitized artifacts.",
    "- Treat findings as reproducible evidence, not public shaming.",
    "- Prefer “needs review” language unless there is clear artifact-backed proof of a dangerous default.",
    "- Keep raw telemetry, emails, hostnames, private URLs, tokens, and customer claims out of public materials.",
    "- Send maintainers the report first; open CI PRs only when the report is useful and the target can run safely.",
    "",
    "## Next Step",
    "",
    "Use this index to start maintainer conversations and private readiness reviews. The buyer-facing offer is a private MCP readiness review with CI rollout, drift/security reporting, and safe-for-agent-dependency verdicts.",
  );

  return lines.join("\n") + "\n";
}

export async function buildSafetyIndex(): Promise<SafetyIndexEntry[]> {
  const targets = await loadSafetyTargets();
  const entries: SafetyIndexEntry[] = [];
  for (const target of targets) {
    process.stdout.write(`${target.id}: starting\n`);
    const entry = await runEntry(target);
    entries.push(entry);
    process.stdout.write(`${target.id}: ${entry.verdict} -> ${relativeToRoot(entry.artifactPath)}\n`);
  }
  await writeFile(outputPath, renderSafetyIndex(entries), "utf8");
  return entries;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  buildSafetyIndex().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
