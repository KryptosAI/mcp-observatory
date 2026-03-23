import type { CheckResult, CheckStatus, DiffArtifact, DiffEntry, RunArtifact } from "../types.js";
import {
  describeCheckList,
  findChecksByStatus,
  recommendRunNextStep,
  sortChecksByActionability
} from "./common.js";

// ── Watch-specific compact renderers ────────────────────────────────────────

function watchStatusIcon(status: CheckStatus): string {
  switch (status) {
    case "pass": return co(ANSI.green, "✓");
    case "fail": return co(ANSI.red, "✗");
    case "partial":
    case "flaky": return co(ANSI.yellow, "⚠");
    case "unsupported":
    case "skipped": return co(ANSI.dim, "–");
  }
}

function scoreString(artifact: RunArtifact): string {
  if (!artifact.healthScore) return "";
  const s = artifact.healthScore;
  const color = s.grade === "A" || s.grade === "B" ? ANSI.green
    : s.grade === "C" ? ANSI.yellow : ANSI.red;
  return co(color, `${s.overall}/100 (${s.grade})`);
}

function serverLabel(artifact: RunArtifact): string {
  const name = artifact.target.serverName ?? artifact.target.targetId;
  const version = artifact.target.serverVersion ?? "";
  return version ? `${name} ${version}` : name;
}

/** Compact single-line header: server name — score — gate */
function watchHeader(artifact: RunArtifact): string {
  const parts = [co(ANSI.bold, serverLabel(artifact))];
  const score = scoreString(artifact);
  if (score) parts.push(score);
  parts.push(artifact.gate === "pass" ? co(ANSI.green, "pass") : co(ANSI.red, "FAIL"));
  return parts.join(" — ");
}

/** First run: header + one line per check + fatal error if any */
export function renderWatchFirstRun(artifact: RunArtifact): string {
  const lines = [watchHeader(artifact)];

  if (artifact.fatalError !== undefined) {
    lines.push("");
    lines.push(co(ANSI.red, "Server failed to start:"));
    // Show just the diagnosis, not the full multi-paragraph dump
    const diagLines = artifact.fatalError.split("\n");
    const diagIdx = diagLines.findIndex(l => l.startsWith("Diagnosis:"));
    if (diagIdx >= 0) {
      lines.push(`  ${diagLines[diagIdx]}`);
    } else {
      lines.push(`  ${diagLines[0]}`);
    }
    return lines.join("\n");
  }

  const orderedChecks = sortChecksByActionability(artifact.checks);
  for (const check of orderedChecks) {
    const icon = watchStatusIcon(check.status);
    // Compact: only show detail for non-pass checks
    if (check.status === "pass") {
      lines.push(`  ${icon} ${check.id}`);
    } else {
      lines.push(`  ${icon} ${check.id}  ${co(ANSI.dim, check.message)}`);
    }
  }

  return lines.join("\n");
}

/** No changes: header + ✓ */
export function renderWatchNoChanges(artifact: RunArtifact): string {
  return `${watchHeader(artifact)}\n${co(ANSI.green, "✓ No changes")}`;
}

/** Changes detected: header + only the changes */
export function renderWatchChanges(artifact: RunArtifact, diff: DiffArtifact): string {
  const lines = [watchHeader(artifact)];

  if (diff.regressions.length > 0) {
    lines.push("");
    for (const e of diff.regressions) {
      lines.push(co(ANSI.red, `  ✗ ${e.id}: ${e.fromStatus ?? "n/a"} → ${e.toStatus ?? "n/a"}  ${e.message}`));
    }
  }
  if (diff.recoveries.length > 0) {
    lines.push("");
    for (const e of diff.recoveries) {
      lines.push(co(ANSI.green, `  ✓ ${e.id}: ${e.fromStatus ?? "n/a"} → ${e.toStatus ?? "n/a"}  ${e.message}`));
    }
  }
  if (diff.schemaDrift && diff.schemaDrift.length > 0) {
    lines.push("");
    for (const e of diff.schemaDrift) {
      lines.push(co(ANSI.yellow, `  ⚠ ${e.name} (${e.capability}): ${e.changes.join(", ")}`));
    }
  }
  if (diff.responseChanges && diff.responseChanges.length > 0) {
    for (const e of diff.responseChanges) {
      lines.push(co(ANSI.yellow, `  ⚠ ${e.name} (${e.capability}): ${e.change}`));
    }
  }

  return lines.join("\n");
}

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

  if (artifact.healthScore) {
    const score = artifact.healthScore;
    const gradeColor = score.grade === "A" || score.grade === "B" ? ANSI.green
      : score.grade === "C" ? ANSI.yellow
      : ANSI.red;
    lines.push(`Health Score: ${co(gradeColor, `${score.overall}/100 (${score.grade})`)}`);
  }

  lines.push("Checks (most actionable first):");
  for (const check of orderedChecks) {
    lines.push(formatCheck(check));
  }

  // Show security-lite findings prominently even without --security flag
  const secLite = artifact.checks.find(ch => ch.id === "security-lite");
  if (secLite && secLite.status !== "pass" && secLite.evidence.length > 0) {
    const diagnostics = secLite.evidence[0]?.diagnostics ?? [];
    if (diagnostics.length > 0) {
      lines.push("");
      lines.push(co(ANSI.red, "  Security:"));
      for (const d of diagnostics.slice(0, 3)) {
        lines.push(`    ${co(ANSI.dim, "→")} ${d}`);
      }
      if (diagnostics.length > 3) {
        lines.push(`    ${co(ANSI.dim, `  ...and ${diagnostics.length - 3} more (run with --security for full scan)`)}`);
      }
    }
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
  if (artifact.responseChanges && artifact.responseChanges.length > 0) {
    lines.push(co(ANSI.yellow, "Response Changes:"));
    for (const entry of artifact.responseChanges) {
      lines.push(co(ANSI.yellow, `- ${entry.name} (${entry.capability}): ${entry.change}`));
    }
  }
  if (artifact.regressions.length === 0 && artifact.recoveries.length === 0 && (!artifact.schemaDrift || artifact.schemaDrift.length === 0) && (!artifact.responseChanges || artifact.responseChanges.length === 0)) {
    lines.push(co(ANSI.dim, "No regressions, recoveries, schema drift, or response changes detected."));
  }

  return lines.join("\n");
}

export function renderTerminal(artifact: RunArtifact | DiffArtifact): string {
  return artifact.artifactType === "run"
    ? renderRunTerminal(artifact)
    : renderDiffTerminal(artifact);
}
