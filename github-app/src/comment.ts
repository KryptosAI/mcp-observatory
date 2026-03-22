/**
 * Generates markdown PR comments from MCP Observatory run artifacts.
 */

// --- Types (local copies, not imported from main project) ---

export interface HealthScoreDimension {
  name: string;
  weight: number;
  score: number;
  details: string[];
}

export interface HealthScore {
  overall: number;
  grade: string;
  dimensions: HealthScoreDimension[];
}

export interface CheckResult {
  id: string;
  status: "pass" | "fail" | "warn" | "skip";
  message: string;
  evidence: string[];
}

export interface RunArtifact {
  gate: "pass" | "fail" | "warn";
  checks: CheckResult[];
  healthScore?: HealthScore;
  target: {
    targetId: string;
  };
}

// --- Constants ---

/** HTML comment used to identify and update existing Observatory comments. */
export const COMMENT_MARKER = "<!-- mcp-observatory -->";

const STATUS_EMOJI: Record<string, string> = {
  pass: "&#x2705;",
  fail: "&#x274C;",
  warn: "&#x26A0;&#xFE0F;",
  skip: "&#x23ED;&#xFE0F;",
};

const GRADE_EMOJI: Record<string, string> = {
  A: "&#x1F7E2;",
  B: "&#x1F7E1;",
  C: "&#x1F7E0;",
  D: "&#x1F534;",
  F: "&#x1F534;",
};

// --- Comment generation ---

function formatGateStatus(gate: string): string {
  const label = gate.charAt(0).toUpperCase() + gate.slice(1);
  return `${STATUS_EMOJI[gate] ?? ""} ${label}`;
}

function buildSummaryTable(artifacts: RunArtifact[]): string {
  const rows = artifacts.map((a) => {
    const score = a.healthScore?.overall ?? 0;
    const grade = a.healthScore?.grade ?? "N/A";
    const gradeIcon = GRADE_EMOJI[grade] ?? "";
    const status = formatGateStatus(a.gate);
    return `| ${a.target.targetId} | ${score}/100 | ${gradeIcon} ${grade} | ${status} |`;
  });

  return [
    "| Server | Score | Grade | Status |",
    "|--------|-------|-------|--------|",
    ...rows,
  ].join("\n");
}

function buildDimensionDetails(artifacts: RunArtifact[]): string {
  const sections = artifacts
    .filter((a) => a.healthScore && a.healthScore.dimensions.length > 0)
    .map((a) => {
      const header = `### ${a.target.targetId}\n`;
      const table = [
        "| Dimension | Weight | Score | Details |",
        "|-----------|--------|-------|---------|",
        ...a.healthScore!.dimensions.map((d) => {
          const detailText = d.details.length > 0 ? d.details.join("; ") : "-";
          return `| ${d.name} | ${(d.weight * 100).toFixed(0)}% | ${d.score}/100 | ${detailText} |`;
        }),
      ].join("\n");
      return header + table;
    });

  return sections.join("\n\n");
}

function buildCheckDetails(artifacts: RunArtifact[]): string {
  const sections = artifacts.map((a) => {
    const header = `### ${a.target.targetId}\n`;
    const lines = a.checks.map((c) => {
      const icon = STATUS_EMOJI[c.status] ?? "";
      const evidenceText =
        c.evidence.length > 0 ? `\n  - ${c.evidence.join("\n  - ")}` : "";
      return `- ${icon} **${c.id}**: ${c.message}${evidenceText}`;
    });
    return header + lines.join("\n");
  });

  return sections.join("\n\n");
}

/**
 * Generate a full markdown comment body from one or more run artifacts.
 */
export function generateComment(artifacts: RunArtifact[]): string {
  if (artifacts.length === 0) {
    return [
      COMMENT_MARKER,
      "## MCP Observatory Report",
      "",
      "No MCP server configurations detected in this PR.",
      "",
      "---",
      "*Powered by [MCP Observatory](https://github.com/KryptosAI/mcp-observatory)*",
    ].join("\n");
  }

  const summaryTable = buildSummaryTable(artifacts);
  const dimensionDetails = buildDimensionDetails(artifacts);
  const checkDetails = buildCheckDetails(artifacts);

  const parts: string[] = [
    COMMENT_MARKER,
    "## MCP Observatory Report",
    "",
    summaryTable,
    "",
  ];

  if (dimensionDetails) {
    parts.push(
      "<details><summary>Detailed Breakdown</summary>",
      "",
      dimensionDetails,
      "",
      "</details>",
      ""
    );
  }

  if (checkDetails) {
    parts.push(
      "<details><summary>Check Results</summary>",
      "",
      checkDetails,
      "",
      "</details>",
      ""
    );
  }

  parts.push(
    "---",
    "*Powered by [MCP Observatory](https://github.com/KryptosAI/mcp-observatory)*"
  );

  return parts.join("\n");
}
