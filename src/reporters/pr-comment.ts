import type { CheckResult, DiffArtifact, RunArtifact, SchemaDriftEntry, TrendInfo } from "../types.js";
import { findChecksByStatus } from "./common.js";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ParsedFinding {
  severity: string;
  message: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_ITEMS_PER_SECTION = 5;
const REPO_URL = "https://github.com/KryptosAI/mcp-observatory";

// ── Extraction helpers (exported for matrix comment reuse) ──────────────────

export function extractSecurityFindings(checks: CheckResult[]): ParsedFinding[] {
  const securityChecks = checks.filter(c => c.id === "security" || c.id === "security-lite");
  const findings: ParsedFinding[] = [];
  for (const check of securityChecks) {
    for (const ev of check.evidence) {
      for (const diag of ev.diagnostics ?? []) {
        const match = diag.match(/^\[(high|medium|low)]\s+(.+)$/);
        if (match) {
          findings.push({ severity: match[1]!, message: match[2]! });
        }
      }
    }
  }
  return findings;
}

export function extractQualityFindings(checks: CheckResult[]): ParsedFinding[] {
  const qualityChecks = checks.filter(c => c.id === "schema-quality");
  const findings: ParsedFinding[] = [];
  for (const check of qualityChecks) {
    for (const ev of check.evidence) {
      for (const diag of ev.diagnostics ?? []) {
        const match = diag.match(/^\[(warning|info)]\s+(.+)$/i);
        if (match) {
          findings.push({ severity: match[1]!, message: match[2]! });
        }
      }
    }
  }
  return findings;
}

export function countCapabilities(checks: CheckResult[]): { tools: number; prompts: number; resources: number } {
  const get = (id: string) => {
    const check = checks.find(c => c.id === id);
    return check?.evidence[0]?.itemCount ?? 0;
  };
  return { tools: get("tools"), prompts: get("prompts"), resources: get("resources") };
}

function conformanceSummary(checks: CheckResult[]): string | undefined {
  const check = checks.find(c => c.id === "conformance");
  if (!check || check.status === "pass") return undefined;
  return check.message;
}

// ── Formatting helpers ──────────────────────────────────────────────────────

export function blockquoteList(items: string[], max = MAX_ITEMS_PER_SECTION): string {
  const shown = items.slice(0, max);
  const lines = shown.map(item => `> ${item}`);
  const remaining = items.length - max;
  if (remaining > 0) {
    lines.push(`> ...and ${remaining} more`);
  }
  return lines.join("\n");
}

export function prCommentFooter(): string {
  return [
    "",
    "---",
    `<sub>🔭 <a href="${REPO_URL}">MCP Observatory</a> — test your MCP servers for breaking changes · <a href="${REPO_URL}">⭐ Star</a></sub>`,
  ].join("\n");
}

// ── Run artifact rendering ──────────────────────────────────────────────────

function renderRunComment(artifact: RunArtifact, trend?: TrendInfo): string {
  const sections: string[] = [];
  const security = extractSecurityFindings(artifact.checks);
  const quality = extractQualityFindings(artifact.checks);
  const failingChecks = findChecksByStatus(artifact.checks, "fail")
    .filter(c => c.id !== "security" && c.id !== "security-lite");
  const conformance = conformanceSummary(artifact.checks);

  const highMedSecurity = security.filter(f => f.severity === "high" || f.severity === "medium");
  const issueCount = highMedSecurity.length + failingChecks.length + quality.length + (conformance ? 1 : 0);

  // Header
  if (issueCount === 0) {
    sections.push("## 🔭 MCP Observatory — All clear ✅");
    sections.push("");
    sections.push("All checks passed. No security issues, no schema quality warnings.");
  } else {
    sections.push(`## 🔭 MCP Observatory — ${issueCount} issue${issueCount === 1 ? "" : "s"} found`);
  }

  // Security (red)
  if (highMedSecurity.length > 0) {
    const highCount = highMedSecurity.filter(f => f.severity === "high").length;
    const medCount = highMedSecurity.filter(f => f.severity === "medium").length;
    const parts: string[] = [];
    if (highCount > 0) parts.push(`${highCount} high`);
    if (medCount > 0) parts.push(`${medCount} medium`);
    sections.push("");
    sections.push(`### 🔴 SECURITY (${parts.join(", ")})`);
    sections.push(blockquoteList(highMedSecurity.map(f => `\`${f.severity}\` ${f.message}`)));
  }

  // Failing checks (red)
  if (failingChecks.length > 0) {
    sections.push("");
    sections.push(`### 🔴 FAILING (${failingChecks.length})`);
    sections.push(blockquoteList(failingChecks.map(c => `**${c.id}**: ${c.message}`)));
  }

  // Quality warnings (yellow)
  const qualityItems: string[] = [];
  for (const f of quality) {
    qualityItems.push(f.message);
  }
  if (conformance) {
    qualityItems.push(`Conformance: ${conformance}`);
  }
  if (qualityItems.length > 0) {
    sections.push("");
    sections.push(`### ⚠️ QUALITY (${qualityItems.length} warning${qualityItems.length === 1 ? "" : "s"})`);
    sections.push(blockquoteList(qualityItems));
  }

  // Summary stats
  const caps = countCapabilities(artifact.checks);
  const healthPart = artifact.healthScore
    ? `Health: **${artifact.healthScore.grade}** (${artifact.healthScore.overall})`
    : `Gate: **${artifact.gate}**`;

  const trendPart = trend && trend.direction !== "new" && trend.previous
    ? ` ${trend.direction === "up" ? "↗" : trend.direction === "down" ? "↘" : "→"} was ${trend.previous.grade} (${trend.previous.healthScore})`
    : "";

  const statsLine = [
    healthPart + trendPart,
    `${caps.tools} tools`,
    `${caps.prompts} prompts`,
    `${caps.resources} resources`,
  ].join(" · ");

  sections.push("");
  sections.push(`### 📊 Summary`);
  sections.push(`> ${statsLine}`);

  sections.push(prCommentFooter());
  return sections.join("\n");
}

// ── Diff artifact rendering ─────────────────────────────────────────────────

function renderDiffComment(artifact: DiffArtifact): string {
  const sections: string[] = [];
  const { regressions, recoveries, schemaDrift } = artifact;
  const driftCount = schemaDrift?.length ?? 0;
  const totalIssues = regressions.length + driftCount;

  // Header
  if (totalIssues === 0) {
    sections.push("## 🔭 MCP Observatory — No regressions ✅");
    sections.push("");
    sections.push("All checks stable. No regressions, no schema drift.");
  } else {
    const parts: string[] = [];
    if (regressions.length > 0) parts.push(`${regressions.length} regression${regressions.length === 1 ? "" : "s"}`);
    if (driftCount > 0) parts.push(`${driftCount} schema change${driftCount === 1 ? "" : "s"}`);
    sections.push(`## 🔭 MCP Observatory — ${parts.join(", ")} detected`);
  }

  // Regressions (red)
  if (regressions.length > 0) {
    sections.push("");
    sections.push(`### 🔴 REGRESSIONS (${regressions.length})`);
    sections.push(blockquoteList(regressions.map(r => {
      const transition = r.fromStatus && r.toStatus ? `${r.fromStatus} → ${r.toStatus}` : "";
      return `**${r.id}**: ${transition}${transition ? " — " : ""}${r.message}`;
    })));
  }

  // Schema drift (red)
  if (schemaDrift && schemaDrift.length > 0) {
    sections.push("");
    sections.push(`### 🔴 SCHEMA DRIFT (${schemaDrift.length})`);
    const driftLines = flattenDrift(schemaDrift);
    sections.push(blockquoteList(driftLines));
  }

  // Recoveries (green)
  if (recoveries.length > 0) {
    sections.push("");
    sections.push(`### ✅ RECOVERED (${recoveries.length})`);
    sections.push(blockquoteList(recoveries.map(r => {
      const transition = r.fromStatus && r.toStatus ? `${r.fromStatus} → ${r.toStatus}` : "";
      return `**${r.id}**: ${transition}`;
    })));
  }

  // Summary
  const { summary } = artifact;
  const statsLine = [
    `Gate: **${artifact.gate}**`,
    `Regressions: ${summary.regressions}`,
    `Recoveries: ${summary.recoveries}`,
    `Unchanged: ${summary.unchanged}`,
  ].join(" · ");

  sections.push("");
  sections.push(`### 📊 Summary`);
  sections.push(`> ${statsLine}`);

  sections.push(prCommentFooter());
  return sections.join("\n");
}

function flattenDrift(drift: SchemaDriftEntry[]): string[] {
  const lines: string[] = [];
  for (const entry of drift) {
    for (const change of entry.changes) {
      lines.push(`**${entry.name}**: ${change}`);
    }
  }
  return lines;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function renderPrComment(artifact: RunArtifact | DiffArtifact, trend?: TrendInfo): string {
  return artifact.artifactType === "run"
    ? renderRunComment(artifact, trend)
    : renderDiffComment(artifact);
}
