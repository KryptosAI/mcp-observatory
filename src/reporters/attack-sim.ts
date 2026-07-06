import { extractObservatoryFindings } from "../findings.js";
import { buildActionReceipt } from "../action-receipt.js";
import type { RunArtifact } from "../types.js";

function table(rows: string[][]): string {
  if (rows.length === 0) return "_None._";
  const [header, ...body] = rows;
  if (!header) return "_None._";
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function codeBlock(value: string): string {
  return value.split("\n").map((line) => `    ${line}`).join("\n");
}

function attackFindings(artifact: RunArtifact) {
  return extractObservatoryFindings(artifact).filter((finding) => finding.checkId === "attack-sim");
}

export function renderAttackSimulationMarkdown(artifact: RunArtifact, reproductionCommand: string): string {
  const findings = attackFindings(artifact);
  const attackCheck = artifact.checks.find((check) => check.id === "attack-sim");
  const high = findings.filter((finding) => finding.severity === "high").length;
  const medium = findings.filter((finding) => finding.severity === "medium").length;
  const low = findings.filter((finding) => finding.severity === "low").length;
  const verdict = high > 0
    ? "High-risk simulated attack findings need review before agent dependency."
    : medium > 0
      ? "Medium-risk simulated attack findings should be reviewed before production use."
      : "No high-risk simulated attack findings were detected.";
  const actionReceipt = buildActionReceipt(artifact);

  return [
    "# MCP Attack Simulation Report",
    "",
    `Generated at ${artifact.createdAt}`,
    "",
    "## Executive Verdict",
    "",
    `**${verdict}**`,
    "",
    `**Action receipt:** \`${actionReceipt.action}\` — ${actionReceipt.reason}`,
    "",
    table([
      ["Target", "Attack Check", "High", "Medium", "Low", "Total"],
      [escapeCell(artifact.target.targetId), escapeCell(attackCheck?.status ?? "skipped"), String(high), String(medium), String(low), String(findings.length)],
    ]),
    "",
    "## Attack Classes Tested",
    "",
    "- Tool poisoning in tool, prompt, resource, and schema metadata.",
    "- Exfiltration canary and credential-like exposure in captured evidence.",
    "- Permission-boundary risk from broad parameters plus destructive behavior.",
    "- Contract-drift readiness when a baseline artifact is supplied.",
    "",
    "## Findings",
    "",
    table([
      ["Severity", "Action", "Rule", "Subject", "Message", "Recommendation"],
      ...findings.map((finding) => [
        finding.severity,
        escapeCell(finding.recommendedAction ?? "gate"),
        `\`${escapeCell(finding.ruleId)}\``,
        escapeCell(`${finding.subject.type}:${finding.subject.name ?? ""}`),
        escapeCell(finding.message),
        escapeCell(finding.recommendation ?? "Review before release."),
      ]),
    ]),
    "",
    "## Reproduction Command",
    "",
    codeBlock(reproductionCommand),
    "",
    "## Maintainer Fixes",
    "",
    "- Keep MCP metadata factual, user-visible, and free of hidden instructions.",
    "- Add strict schemas and avoid broad command/path/network parameters for destructive tools.",
    "- Redact secret-like values from tool responses and captured logs.",
    "- Review new or broadened tool surfaces before agents consume upgraded servers.",
    "",
    "## Safe Simulation Only",
    "",
    "This report uses inert metadata, schema, drift, and captured-evidence checks. It does not execute destructive payloads, contact attacker infrastructure, write/delete files, or exfiltrate real data.",
  ].join("\n");
}
