import { execSync } from "node:child_process";
import type { CheckResult, CheckStatus, DiffArtifact, DiffEntry, RunArtifact } from "../types.js";
import { detectNotObserved } from "../receipt.js";
import {
  describeCheckList,
  findChecksByStatus,
  recommendRunNextStep,
  summarizeDiffSafety,
  summarizeRunSafety,
  sortChecksByActionability
} from "./common.js";

let _seatbeltChecked = false;
let _seatbeltAvailable = false;

export function isSeatbeltAvailable(): boolean {
  if (_seatbeltChecked) return _seatbeltAvailable;
  _seatbeltChecked = true;
  try {
    execSync("command -v mcp-seatbelt 2>/dev/null || npx @kryptosai/mcp-seatbelt --version 2>/dev/null", {
      stdio: "pipe",
      timeout: 5_000,
    });
    _seatbeltAvailable = true;
  } catch {
    _seatbeltAvailable = false;
  }
  return _seatbeltAvailable;
}

function renderNextActions(artifact: RunArtifact): string {
  const isPerfect = artifact.gate === "pass" && !artifact.fatalError;

  if (isPerfect) return "";

  const targetCmd = artifact.target.adapter === "local-process"
    ? `${artifact.target.command} ${(artifact.target.args ?? []).join(" ")}`
    : artifact.target.targetId ?? artifact.target.command ?? "server";

  const lines: string[] = [];
  lines.push("");
  lines.push(co(ANSI.bold, "Next Actions:"));

  lines.push(`  → Auto-enforce: ${co(ANSI.bold, `npx @kryptosai/mcp-observatory enforce ${targetCmd}`)}`);

  if (isSeatbeltAvailable()) {
    lines.push(co(ANSI.dim, "  → This generates a policy AND starts the proxy — protecting you immediately"));
  } else {
    lines.push(co(ANSI.dim, "  → Already know the risks? Enforce at runtime with mcp-seatbelt"));
  }

  return lines.join("\n");
}

export { renderNextActions };

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

const _argvNoColor = process.argv.includes("--no-color");

function shouldColor(): boolean {
  return !process.env["NO_COLOR"] && !_argvNoColor;
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
  const safety = summarizeRunSafety(artifact);
  const failingChecks = findChecksByStatus(artifact.checks, "fail");
  const partialChecks = [
    ...findChecksByStatus(artifact.checks, "partial"),
    ...findChecksByStatus(artifact.checks, "flaky")
  ];
  const unsupportedChecks = findChecksByStatus(artifact.checks, "unsupported");
  const skippedChecks = findChecksByStatus(artifact.checks, "skipped");
  const lines = [
    co(ANSI.bold, `MCP Observatory Run`),
    `Safety Verdict: ${co(safety.verdict === "Ready" ? ANSI.green : safety.verdict === "Needs review" ? ANSI.yellow : ANSI.red, safety.verdict)} — ${safety.reason}`,
    `Run ID: ${artifact.runId}`,
    `Gate: ${co(ANSI.bold, colorGate(artifact.gate))}`,
    `Target: ${artifact.target.targetId} (${artifact.target.adapter})`,
    `Server: ${artifact.target.serverName ?? "unknown"} ${artifact.target.serverVersion ?? ""}`.trim(),
    `Counts: pass=${artifact.summary.pass}, fail=${artifact.summary.fail}, partial=${artifact.summary.partial}, unsupported=${artifact.summary.unsupported}, flaky=${artifact.summary.flaky}, skipped=${artifact.summary.skipped}`
  ];

  lines.push(`Actionable now:`);
  lines.push(`- top risks: ${safety.topRisks.join("; ")}`);
  lines.push(`- failing checks: ${describeCheckList(failingChecks)}`);
  lines.push(`- partial checks: ${describeCheckList(partialChecks)}`);
  lines.push(`- skipped checks: ${describeCheckList(skippedChecks)}`);
  lines.push(`- unsupported checks: ${describeCheckList(unsupportedChecks)}`);
  lines.push(`Next step: ${recommendRunNextStep(artifact)}`);
  lines.push(`CI: ${safety.ciCta}`);

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

  const notObserved = artifact.notObserved ?? detectNotObserved(artifact);
  if (notObserved.length > 0) {
    lines.push("");
    lines.push(co(ANSI.bold, "What Was Not Tested:"));
    for (const entry of notObserved) {
      const icon = entry.severity === "warning" ? co(ANSI.yellow, "⚠") : co(ANSI.dim, "ℹ");
      lines.push(`  ${icon} ${entry.category}: ${entry.detail}`);
    }
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

  return lines.join("\n") + renderNextActions(artifact);
}

function renderDiffTerminal(artifact: DiffArtifact): string {
  const safety = summarizeDiffSafety(artifact);
  const lines = [
    co(ANSI.bold, `MCP Observatory Diff`),
    `Safety Verdict: ${co(safety.verdict === "Ready" ? ANSI.green : safety.verdict === "Needs review" ? ANSI.yellow : ANSI.red, safety.verdict)} — ${safety.reason}`,
    `Base: ${artifact.baseRunId}`,
    `Head: ${artifact.headRunId}`,
    `Gate: ${co(ANSI.bold, colorGate(artifact.gate))}`,
    `Counts: regressions=${artifact.summary.regressions}, recoveries=${artifact.summary.recoveries}, unchanged=${artifact.summary.unchanged}, added=${artifact.summary.added}, removed=${artifact.summary.removed}`
  ];
  lines.push(`Top risks: ${safety.topRisks.join("; ")}`);
  lines.push(`Next step: ${safety.nextActions[0]}`);

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
      lines.push(co(ANSI.yellow, `- ${entry.name} (${entry.capability}, ${entry.severity}): ${entry.changes.join(", ")}`));
    }
  }
  if (artifact.permissionDeltas && artifact.permissionDeltas.length > 0) {
    lines.push(co(ANSI.yellow, "Permission Deltas:"));
    for (const entry of artifact.permissionDeltas) {
      lines.push(co(ANSI.yellow, `- ${entry.name} (${entry.capability}, ${entry.risk}): ${entry.change} - ${entry.reason}`));
    }
  }
  if (artifact.responseChanges && artifact.responseChanges.length > 0) {
    lines.push(co(ANSI.yellow, "Response Changes:"));
    for (const entry of artifact.responseChanges) {
      lines.push(co(ANSI.yellow, `- ${entry.name} (${entry.capability}): ${entry.change}`));
    }
  }
  if (artifact.regressions.length === 0 && artifact.recoveries.length === 0 && (!artifact.schemaDrift || artifact.schemaDrift.length === 0) && (!artifact.permissionDeltas || artifact.permissionDeltas.length === 0) && (!artifact.responseChanges || artifact.responseChanges.length === 0)) {
    lines.push(co(ANSI.dim, "No regressions, recoveries, schema drift, permission deltas, or response changes detected."));
  }

  return lines.join("\n");
}

export function renderTerminal(artifact: RunArtifact | DiffArtifact): string {
  return artifact.artifactType === "run"
    ? renderRunTerminal(artifact)
    : renderDiffTerminal(artifact);
}
