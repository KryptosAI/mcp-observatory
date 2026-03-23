import type { RunArtifact, TrendInfo } from "../types.js";
import { findChecksByStatus } from "./common.js";
import {
  extractSecurityFindings,
  extractQualityFindings,
  countCapabilities,
  blockquoteList,
  prCommentFooter,
  type ParsedFinding,
} from "./pr-comment.js";

// ── Types ───────────────────────────────────────────────────────────────────

export interface MatrixRow {
  artifact: RunArtifact;
  trend?: TrendInfo;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface RowAnalysis {
  row: MatrixRow;
  security: ParsedFinding[];
  quality: ParsedFinding[];
  failingChecks: ReturnType<typeof findChecksByStatus>;
  highMedSecurity: ParsedFinding[];
  issueCount: number;
  toolCount: number;
}

function analyzeRow(row: MatrixRow): RowAnalysis {
  const security = extractSecurityFindings(row.artifact.checks);
  const quality = extractQualityFindings(row.artifact.checks);
  const failingChecks = findChecksByStatus(row.artifact.checks, "fail")
    .filter(c => c.id !== "security" && c.id !== "security-lite");
  const highMedSecurity = security.filter(
    f => f.severity === "high" || f.severity === "medium",
  );
  const issueCount = highMedSecurity.length + quality.length + failingChecks.length;
  const caps = countCapabilities(row.artifact.checks);
  return { row, security, quality, failingChecks, highMedSecurity, issueCount, toolCount: caps.tools };
}

function trendArrow(trend?: TrendInfo): string {
  if (!trend || trend.direction === "new") return "";
  switch (trend.direction) {
    case "up":
      return " ↗";
    case "down":
      return " ↘";
    case "stable":
      return " →";
  }
}

function healthCell(artifact: RunArtifact, trend?: TrendInfo): string {
  const hs = artifact.healthScore;
  const base = hs ? `**${hs.grade}** (${hs.overall})` : `**${artifact.gate}**`;
  return base + trendArrow(trend);
}

function issuesCell(analysis: RowAnalysis): string {
  const { highMedSecurity, quality, failingChecks, issueCount } = analysis;
  if (issueCount === 0) return "✅";

  const hasSecurityOrFailing = highMedSecurity.length > 0 || failingChecks.length > 0;
  const hasQuality = quality.length > 0;

  if (hasSecurityOrFailing && hasQuality) {
    return `🔴 ${issueCount} issues`;
  }
  if (hasSecurityOrFailing) {
    const count = highMedSecurity.length + failingChecks.length;
    return `🔴 ${count} security`;
  }
  // quality only
  return `⚠️ ${quality.length} quality`;
}

function renderDetailsBlock(analysis: RowAnalysis): string | undefined {
  const items: string[] = [];

  for (const f of analysis.highMedSecurity) {
    items.push(`\`${f.severity}\` ${f.message}`);
  }
  for (const c of analysis.failingChecks) {
    items.push(`\`fail\` **${c.id}**: ${c.message}`);
  }
  for (const f of analysis.quality) {
    items.push(`\`${f.severity}\` ${f.message}`);
  }

  if (items.length === 0) return undefined;

  const targetId = analysis.row.artifact.target.targetId;
  const hasSecurityOrFailing =
    analysis.highMedSecurity.length > 0 || analysis.failingChecks.length > 0;
  const icon = hasSecurityOrFailing ? "🔴" : "⚠️";
  const lines: string[] = [];
  lines.push(`<details><summary>${icon} ${targetId} — ${items.length} issue${items.length === 1 ? "" : "s"}</summary>`);
  lines.push("");
  lines.push(blockquoteList(items));
  lines.push("");
  lines.push("</details>");
  return lines.join("\n");
}

// ── Public API ──────────────────────────────────────────────────────────────

export function renderMatrixComment(rows: MatrixRow[]): string {
  if (rows.length === 0) {
    return ["## 🔭 MCP Observatory — No servers scanned", "", "No servers were scanned in this run.", prCommentFooter()].join("\n");
  }

  const sections: string[] = [];
  const analyses = rows.map(analyzeRow);

  // Header
  sections.push(
    `## 🔭 MCP Observatory — ${rows.length} server${rows.length === 1 ? "" : "s"} scanned`,
  );
  sections.push("");

  // Table header
  sections.push("| Server | Health | Tools | Issues |");
  sections.push("| --- | --- | --- | --- |");

  // Table rows
  for (const analysis of analyses) {
    const server = analysis.row.artifact.target.targetId;
    const health = healthCell(analysis.row.artifact, analysis.row.trend);
    const tools = String(analysis.toolCount);
    const issues = issuesCell(analysis);
    sections.push(`| ${server} | ${health} | ${tools} | ${issues} |`);
  }

  // Details blocks for rows with issues
  const detailBlocks = analyses
    .map(renderDetailsBlock)
    .filter((b): b is string => b !== undefined);

  if (detailBlocks.length > 0) {
    sections.push("");
    sections.push(detailBlocks.join("\n\n"));
  }

  sections.push(prCommentFooter());
  return sections.join("\n");
}
