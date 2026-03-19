import type { DiffArtifact, DiffEntry, RunArtifact } from "../types.js";

function formatEntry(entry: DiffEntry): string {
  return `- ${entry.id}: ${entry.fromStatus ?? "n/a"} -> ${entry.toStatus ?? "n/a"} (${entry.message})`;
}

function renderRunTerminal(artifact: RunArtifact): string {
  const lines = [
    `MCP Observatory Run`,
    `Run ID: ${artifact.runId}`,
    `Gate: ${artifact.gate}`,
    `Target: ${artifact.target.targetId} (${artifact.target.adapter})`,
    `Server: ${artifact.target.serverName ?? "unknown"} ${artifact.target.serverVersion ?? ""}`.trim(),
    `Counts: pass=${artifact.summary.pass}, fail=${artifact.summary.fail}, partial=${artifact.summary.partial}, unsupported=${artifact.summary.unsupported}, flaky=${artifact.summary.flaky}, skipped=${artifact.summary.skipped}`
  ];

  if (artifact.fatalError !== undefined) {
    lines.push(`Fatal error: ${artifact.fatalError}`);
  }

  lines.push("Checks:");
  for (const check of artifact.checks) {
    lines.push(`- ${check.id}: ${check.status} (${check.message})`);
  }

  return lines.join("\n");
}

function renderDiffTerminal(artifact: DiffArtifact): string {
  const lines = [
    `MCP Observatory Diff`,
    `Base: ${artifact.baseRunId}`,
    `Head: ${artifact.headRunId}`,
    `Gate: ${artifact.gate}`,
    `Counts: regressions=${artifact.summary.regressions}, recoveries=${artifact.summary.recoveries}, unchanged=${artifact.summary.unchanged}, added=${artifact.summary.added}, removed=${artifact.summary.removed}`
  ];

  if (artifact.regressions.length > 0) {
    lines.push("Regressions:");
    lines.push(...artifact.regressions.map(formatEntry));
  }
  if (artifact.recoveries.length > 0) {
    lines.push("Recoveries:");
    lines.push(...artifact.recoveries.map(formatEntry));
  }
  if (artifact.regressions.length === 0 && artifact.recoveries.length === 0) {
    lines.push("No regressions or recoveries were detected.");
  }

  return lines.join("\n");
}

export function renderTerminal(artifact: RunArtifact | DiffArtifact): string {
  return artifact.artifactType === "run"
    ? renderRunTerminal(artifact)
    : renderDiffTerminal(artifact);
}
