import type { DiffArtifact, DiffEntry, EvidenceSummary, RunArtifact } from "../types.js";

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
      const identifiers =
        entry.identifiers !== undefined && entry.identifiers.length > 0
          ? `Identifiers: ${entry.identifiers.join(", ")}`
          : "Identifiers: none";
      const diagnostics =
        entry.diagnostics !== undefined && entry.diagnostics.length > 0
          ? entry.diagnostics.join("; ")
          : "none";

      return [
        `- Endpoint: \`${entry.endpoint}\``,
        `  - Advertised: \`${String(entry.advertised)}\``,
        `  - Responded: \`${String(entry.responded)}\``,
        `  - Minimal shape present: \`${String(entry.minimalShapePresent)}\``,
        `  - Item count: \`${entry.itemCount ?? 0}\``,
        `  - ${identifiers}`,
        `  - Diagnostics: ${diagnostics}`
      ].join("\n");
    })
    .join("\n");
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
      ["Gate", "Pass", "Fail", "Partial", "Unsupported", "Flaky", "Skipped"],
      [
        artifact.gate,
        String(artifact.summary.pass),
        String(artifact.summary.fail),
        String(artifact.summary.partial),
        String(artifact.summary.unsupported),
        String(artifact.summary.flaky),
        String(artifact.summary.skipped)
      ]
    ]),
    ``,
    `## Regressions and Recoveries`,
    ``,
    `_Use the \`diff\` command against another run artifact to classify regressions and recoveries over time._`,
    ``,
    `## Full Capability Status Table`,
    ``,
    table([
      ["Check", "Status", "Duration (ms)", "Message"],
      ...artifact.checks.map((check) => [
        check.id,
        check.status,
        check.durationMs.toFixed(2),
        check.message
      ])
    ]),
    ``,
    `## Evidence Snippets`,
    ``,
    ...artifact.checks.flatMap((check) => [
      `### ${check.id}`,
      ``,
      renderEvidence(check.evidence),
      ``
    ]),
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
    renderDiffEntries("Regressions and Recoveries", [
      ...artifact.regressions,
      ...artifact.recoveries
    ]),
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
