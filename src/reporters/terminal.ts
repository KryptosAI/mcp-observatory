import type { CheckResult, CheckStatus, DiffArtifact, DiffEntry, RunArtifact } from "../types.js";
import {
  describeCheckList,
  findChecksByStatus,
  recommendRunNextStep,
  sortChecksByActionability
} from "./common.js";

const ANSI = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
} as const;

function shouldColor(): boolean {
  return !process.env["NO_COLOR"] && !process.argv.includes("--no-color");
}

function co(code: string, text: string): string {
  return shouldColor() ? `${code}${text}${ANSI.reset}` : text;
}

function colorStatus(status: CheckStatus): string {
  switch (status) {
    case "pass":
      return co(ANSI.green, status);
    case "fail":
      return co(ANSI.red, status);
    case "partial":
    case "flaky":
      return co(ANSI.yellow, status);
    case "unsupported":
    case "skipped":
      return co(ANSI.dim, status);
  }
}

function colorGate(gate: string): string {
  return gate === "pass" ? co(ANSI.green, gate) : co(ANSI.red, gate);
}

function formatCheck(check: CheckResult): string {
  return `- ${check.id}: ${colorStatus(check.status)} (${check.message})`;
}

function formatEntry(entry: DiffEntry): string {
  const from = entry.fromStatus ?? "n/a";
  const to = entry.toStatus ?? "n/a";
  return `- ${entry.id}: ${from} -> ${to} (${entry.message})`;
}

function renderRunTerminal(artifact: RunArtifact): string {
  const orderedChecks = sortChecksByActionability(artifact.checks);
  const failingChecks = findChecksByStatus(artifact.checks, "fail");
  const partialChecks = [
    ...findChecksByStatus(artifact.checks, "partial"),
    ...findChecksByStatus(artifact.checks, "flaky")
  ];
  const unsupportedChecks = findChecksByStatus(artifact.checks, "unsupported");
  const skippedChecks = findChecksByStatus(artifact.checks, "skipped");
  const lines = [
    co(ANSI.bold, `MCP Observatory Run`),
    `Run ID: ${artifact.runId}`,
    `Gate: ${co(ANSI.bold, colorGate(artifact.gate))}`,
    `Target: ${artifact.target.targetId} (${artifact.target.adapter})`,
    `Server: ${artifact.target.serverName ?? "unknown"} ${artifact.target.serverVersion ?? ""}`.trim(),
    `Counts: pass=${artifact.summary.pass}, fail=${artifact.summary.fail}, partial=${artifact.summary.partial}, unsupported=${artifact.summary.unsupported}, flaky=${artifact.summary.flaky}, skipped=${artifact.summary.skipped}`
  ];

  lines.push(`Actionable now:`);
  lines.push(`- failing checks: ${describeCheckList(failingChecks)}`);
  lines.push(`- partial checks: ${describeCheckList(partialChecks)}`);
  lines.push(`- skipped checks: ${describeCheckList(skippedChecks)}`);
  lines.push(`- unsupported checks: ${describeCheckList(unsupportedChecks)}`);
  lines.push(`Next step: ${recommendRunNextStep(artifact)}`);

  if (artifact.fatalError !== undefined) {
    lines.push("Failure diagnosis:");
    lines.push(...artifact.fatalError.split("\n"));
  }

  lines.push("Checks (most actionable first):");
  for (const check of orderedChecks) {
    lines.push(formatCheck(check));
  }

  return lines.join("\n");
}

function renderDiffTerminal(artifact: DiffArtifact): string {
  const lines = [
    co(ANSI.bold, `MCP Observatory Diff`),
    `Base: ${artifact.baseRunId}`,
    `Head: ${artifact.headRunId}`,
    `Gate: ${co(ANSI.bold, colorGate(artifact.gate))}`,
    `Counts: regressions=${artifact.summary.regressions}, recoveries=${artifact.summary.recoveries}, unchanged=${artifact.summary.unchanged}, added=${artifact.summary.added}, removed=${artifact.summary.removed}`
  ];

  if (artifact.regressions.length > 0) {
    lines.push(co(ANSI.red, "Regressions:"));
    lines.push(...artifact.regressions.map((e) => co(ANSI.red, formatEntry(e))));
  }
  if (artifact.recoveries.length > 0) {
    lines.push(co(ANSI.green, "Recoveries:"));
    lines.push(...artifact.recoveries.map((e) => co(ANSI.green, formatEntry(e))));
  }
  if (artifact.unchanged.length > 0) {
    lines.push(co(ANSI.dim, "Unchanged:"));
    lines.push(...artifact.unchanged.map((e) => co(ANSI.dim, formatEntry(e))));
  }
  if (artifact.schemaDrift && artifact.schemaDrift.length > 0) {
    lines.push(co(ANSI.yellow, "Schema Drift:"));
    for (const entry of artifact.schemaDrift) {
      lines.push(co(ANSI.yellow, `- ${entry.name} (${entry.capability}): ${entry.changes.join(", ")}`));
    }
  }
  if (artifact.regressions.length === 0 && artifact.recoveries.length === 0 && (!artifact.schemaDrift || artifact.schemaDrift.length === 0)) {
    lines.push(co(ANSI.dim, "No regressions, recoveries, or schema drift detected."));
  }

  return lines.join("\n");
}

export function renderTerminal(artifact: RunArtifact | DiffArtifact): string {
  return artifact.artifactType === "run"
    ? renderRunTerminal(artifact)
    : renderDiffTerminal(artifact);
}
