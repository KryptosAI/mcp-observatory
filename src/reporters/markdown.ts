import type { CheckResult, DiffArtifact, DiffEntry, EvidenceSummary, RunArtifact } from "../types.js";
import {
  describeCheckList,
  findChecksByStatus,
  focusLabel,
  previewList,
  recommendRunNextStep,
  sortChecksByActionability
} from "./common.js";

function table(entries: string[][]): string {
  if (entries.length === 0) {
    return "_None._";
  }

  const header = entries[0]!;
  const rows = entries.slice(1);
  const divider = header.map(() => "---");
  return [header, divider, ...rows].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function renderEvidence(evidence: EvidenceSummary[]): string {
  if (evidence.length === 0) {
    return "_No evidence was captured._";
  }

  return evidence
    .map((entry) => {
      return [
        `- Endpoint: \`${entry.endpoint}\``,
        `  - Advertised: \`${String(entry.advertised)}\``,
        `  - Responded: \`${String(entry.responded)}\``,
        `  - Minimal shape present: \`${String(entry.minimalShapePresent)}\``,
        `  - Item count: \`${entry.itemCount ?? 0}\``,
        `  - Identifiers: ${previewList(entry.identifiers)}`,
        `  - Diagnostics: ${previewList(entry.diagnostics, 3)}`
      ].join("\n");
    })
    .join("\n");
}

function renderRunAtAGlance(artifact: RunArtifact): string {
  const failingChecks = findChecksByStatus(artifact.checks, "fail");
  const partialChecks = [
    ...findChecksByStatus(artifact.checks, "partial"),
    ...findChecksByStatus(artifact.checks, "flaky")
  ];
  const unsupportedChecks = findChecksByStatus(artifact.checks, "unsupported");
  const skippedChecks = findChecksByStatus(artifact.checks, "skipped");

  return [
    `## At a Glance`,
    ``,
    `- Failing checks: ${describeCheckList(failingChecks)}`,
    `- Partial or flaky checks: ${describeCheckList(partialChecks)}`,
    `- Skipped checks: ${describeCheckList(skippedChecks)}`,
    `- Unsupported checks: ${describeCheckList(unsupportedChecks)}`,
    `- Suggested next step: ${recommendRunNextStep(artifact)}`
  ].join("\n");
}

function renderFailureDiagnosis(artifact: RunArtifact): string[] {
  if (artifact.fatalError === undefined) {
    return [];
  }

  return [
    `## Failure Diagnosis`,
    ``,
    "```text",
    artifact.fatalError,
    "```",
    ``
  ];
}

function renderCheckSection(check: CheckResult): string[] {
  return [
    `### ${check.id} — ${check.status}`,
    ``,
    `Summary: ${check.message}`,
    ``,
    renderEvidence(check.evidence),
    ``
  ];
}

function renderDiffEntries(title: string, entries: DiffEntry[]): string {
  return `## ${title}\n\n${table([
    ["Check", "From", "To", "Message"],
    ...entries.map((entry) => [
      entry.id,
      entry.fromStatus ?? "n/a",
      entry.toStatus ?? "n/a",
      entry.message
    ])
  ])}`;
}

function renderRunMarkdown(artifact: RunArtifact): string {
  const orderedChecks = sortChecksByActionability(artifact.checks);
  return [
    `# MCP Observatory Run Report`,
    ``,
    `Generated at ${artifact.createdAt}`,
    ``,
    `## Target and Environment Metadata`,
    ``,
    `- Target: \`${artifact.target.targetId}\``,
    `- Adapter: \`${artifact.target.adapter}\``,
    `- Command: \`${artifact.target.command} ${artifact.target.args.join(" ")}\``,
    `- Server: \`${artifact.target.serverName ?? "unknown"} ${artifact.target.serverVersion ?? ""}\``,
    `- Platform: \`${artifact.environment.platform}\``,
    `- Node: \`${artifact.environment.nodeVersion}\``,
    ``,
    `## Executive Summary`,
    ``,
    table([
      ["Gate", "Total", "Pass", "Fail", "Partial", "Unsupported", "Flaky", "Skipped"],
      [
        artifact.gate,
        String(artifact.summary.total),
        String(artifact.summary.pass),
        String(artifact.summary.fail),
        String(artifact.summary.partial),
        String(artifact.summary.unsupported),
        String(artifact.summary.flaky),
        String(artifact.summary.skipped)
      ]
    ]),
    ``,
    renderRunAtAGlance(artifact),
    ``,
    `## Regressions and Recoveries`,
    ``,
    `_Use the \`diff\` command against another run artifact to classify regressions and recoveries over time._`,
    ``,
    ...renderFailureDiagnosis(artifact),
    `## Full Capability Status Table`,
    ``,
    table([
      ["Focus", "Check", "Status", "Duration (ms)", "Message"],
      ...orderedChecks.map((check) => [
        focusLabel(check.status),
        check.id,
        check.status,
        check.durationMs.toFixed(2),
        check.message
      ])
    ]),
    ``,
    `## Evidence Snippets`,
    ``,
    ...orderedChecks.flatMap(renderCheckSection),
    `## Reproduction Commands`,
    ``,
    "```bash",
    "npm run cli -- run --target <path-to-target-config.json>",
    "npm run cli -- report --run <path-to-run-artifact.json> --format markdown",
    "```",
    ``,
    `## Artifact Provenance`,
    ``,
    `- Artifact type: \`${artifact.artifactType}\``,
    `- Schema version: \`${artifact.schemaVersion}\``,
    `- Run ID: \`${artifact.runId}\``,
    `- Gate: \`${artifact.gate}\``
  ].join("\n");
}

function renderDiffMarkdown(artifact: DiffArtifact): string {
  const regressionList =
    artifact.regressions.length > 0
      ? artifact.regressions.map((entry) => `- ${entry.id}: ${entry.message}`).join("\n")
      : "_None._";
  const recoveryList =
    artifact.recoveries.length > 0
      ? artifact.recoveries.map((entry) => `- ${entry.id}: ${entry.message}`).join("\n")
      : "_None._";
  const suggestedNextStep =
    artifact.regressions.length > 0
      ? `Start with the regressions: ${artifact.regressions.map((entry) => entry.id).join(", ")}.`
      : artifact.recoveries.length > 0
        ? "No regressions were detected. Review recoveries and decide whether they should become part of the expected baseline."
        : "No status movement was detected. Save the diff artifact with the paired run artifacts for future comparison.";
  return [
    `# MCP Observatory Diff Report`,
    ``,
    `Generated at ${artifact.createdAt}`,
    ``,
    `## Target and Environment Metadata`,
    ``,
    `- Base run: \`${artifact.baseRunId}\``,
    `- Head run: \`${artifact.headRunId}\``,
    ``,
    `## Executive Summary`,
    ``,
    table([
      ["Gate", "Regressions", "Recoveries", "Unchanged", "Added", "Removed"],
      [
        artifact.gate,
        String(artifact.summary.regressions),
        String(artifact.summary.recoveries),
        String(artifact.summary.unchanged),
        String(artifact.summary.added),
        String(artifact.summary.removed)
      ]
    ]),
    ``,
    `## At a Glance`,
    ``,
    `- Regressions: ${artifact.regressions.map((entry) => entry.id).join(", ") || "none"}`,
    `- Recoveries: ${artifact.recoveries.map((entry) => entry.id).join(", ") || "none"}`,
    `- Suggested next step: ${suggestedNextStep}`,
    ``,
    `## Regressions`,
    ``,
    regressionList,
    ``,
    `## Recoveries`,
    ``,
    recoveryList,
    ``,
    `## Full Capability Status Table`,
    ``,
    table([
      ["Bucket", "Check", "From", "To", "Message"],
      ...[
        ...artifact.regressions.map((entry) => ["regression", entry] as const),
        ...artifact.recoveries.map((entry) => ["recovery", entry] as const),
        ...artifact.unchanged.map((entry) => ["unchanged", entry] as const),
        ...artifact.added.map((entry) => ["added", entry] as const),
        ...artifact.removed.map((entry) => ["removed", entry] as const)
      ].map(([bucket, entry]) => [
        bucket,
        entry.id,
        entry.fromStatus ?? "n/a",
        entry.toStatus ?? "n/a",
        entry.message
      ])
    ]),
    ``,
    `## Evidence Snippets`,
    ``,
    `_Diff artifacts summarize status movement. For detailed evidence, inspect the underlying run artifacts._`,
    ``,
    `## Reproduction Commands`,
    ``,
    "```bash",
    "npm run cli -- diff --base <path-to-base-run.json> --head <path-to-head-run.json> --format markdown",
    "```",
    ``,
    `## Artifact Provenance`,
    ``,
    `- Artifact type: \`${artifact.artifactType}\``,
    `- Schema version: \`${artifact.schemaVersion}\``,
    `- Gate: \`${artifact.gate}\``
  ].join("\n");
}

export function renderMarkdown(artifact: RunArtifact | DiffArtifact): string {
  return artifact.artifactType === "run"
    ? renderRunMarkdown(artifact)
    : renderDiffMarkdown(artifact);
}
