import { extractObservatoryFindings, type ObservatoryFinding, type ObservatoryFindingSeverity } from "./findings.js";
import type { RunArtifact, ToolDecision, ToolDecisionAction } from "./types.js";

const ACTION_RANK: Record<ToolDecisionAction, number> = { allow: 0, review: 1, block: 2 };
const SEVERITY_RANK: Record<ObservatoryFindingSeverity, number> = { info: 0, low: 1, medium: 2, high: 3 };

function decisionForFindings(findings: ObservatoryFinding[]): ToolDecisionAction {
  const highest = findings.reduce((max, finding) => Math.max(max, SEVERITY_RANK[finding.severity]), 0);
  if (highest >= SEVERITY_RANK.high) return "block";
  if (highest >= SEVERITY_RANK.low) return "review";
  return "allow";
}

function toolNamesFromArtifact(artifact: RunArtifact, findings: ObservatoryFinding[]): string[] {
  const names = new Set<string>();
  for (const check of artifact.checks) {
    if (check.id !== "tools") continue;
    for (const evidence of check.evidence) {
      for (const name of evidence.identifiers ?? []) names.add(name);
    }
  }
  for (const finding of findings) {
    if (finding.subject.type === "tool" && finding.subject.name) names.add(finding.subject.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function buildToolDecisions(artifact: RunArtifact): ToolDecision[] {
  const findings = extractObservatoryFindings(artifact);
  return toolNamesFromArtifact(artifact, findings)
    .map((toolName) => {
      const toolFindings = findings.filter(
        (finding) => finding.subject.type === "tool" && finding.subject.name === toolName,
      );
      const decision = decisionForFindings(toolFindings);
      return {
        toolName,
        decision,
        reason: toolFindings[0]?.message ?? "No tool-level findings were detected.",
        findingIds: toolFindings.map((finding) => finding.id),
      };
    })
    .sort((a, b) => ACTION_RANK[b.decision] - ACTION_RANK[a.decision] || a.toolName.localeCompare(b.toolName));
}

export function renderToolDecisions(decisions: ToolDecision[]): string[] {
  if (decisions.length === 0) return [];
  return [
    "Tool decisions:",
    ...decisions.map((decision) => `- ${decision.toolName}: ${decision.decision} — ${decision.reason}`),
  ];
}
