import { extractObservatoryFindings, type ObservatoryFindingSeverity } from "./findings.js";
import type { RunArtifact } from "./types.js";

export type ReceiptAction = "allow" | "gate" | "rerun" | "quarantine" | "escalate";

const ACTION_RANK: Record<ReceiptAction, number> = {
  allow: 0,
  rerun: 1,
  gate: 2,
  quarantine: 3,
  escalate: 4,
};

function stronger(a: ReceiptAction, b: ReceiptAction): ReceiptAction {
  return ACTION_RANK[a] >= ACTION_RANK[b] ? a : b;
}

function normalizeReceiptAction(value: unknown): ReceiptAction | undefined {
  return value === "allow" || value === "gate" || value === "rerun" || value === "quarantine" || value === "escalate"
    ? value
    : undefined;
}

export function recommendedActionForFinding(input: {
  attackClass?: string;
  category?: string;
  ruleId?: string;
  severity?: ObservatoryFindingSeverity | "warning" | "error";
}): ReceiptAction {
  const severity = input.severity === "error" ? "high"
    : input.severity === "warning" ? "medium"
    : input.severity;
  const ruleId = input.ruleId ?? "";
  const attackClass = input.attackClass ?? "";
  if (severity === "high" && (
    attackClass === "exfiltration-canary" ||
    ruleId.includes("credential") ||
    ruleId.includes("canary") ||
    ruleId.includes("secret")
  )) {
    return "escalate";
  }
  if (severity === "high" && input.category === "runtime") return "rerun";
  if (severity === "high" && (input.category === "attack-sim" || ruleId.includes("attack-sim"))) return "quarantine";
  if (severity === "high") return "gate";
  if (severity === "medium" && attackClass === "contract-drift") return "rerun";
  if (severity === "medium") return "gate";
  if (severity === "low") return "allow";
  return "allow";
}

export interface ActionReceipt {
  action: ReceiptAction;
  reason: string;
  topFindings: Array<{ severity: ObservatoryFindingSeverity; ruleId: string; message: string }>;
}

export function buildActionReceipt(artifact: RunArtifact): ActionReceipt {
  if (artifact.fatalError) {
    return {
      action: "rerun",
      reason: "The MCP server did not complete startup/readiness checks.",
      topFindings: [{ severity: "high", ruleId: "mcp-observatory/run/fatal-error", message: artifact.fatalError.split("\n")[0] ?? artifact.fatalError }],
    };
  }

  const findings = extractObservatoryFindings(artifact);
  let action: ReceiptAction = artifact.gate === "pass" ? "allow" : "gate";
  for (const finding of findings) {
    const storedAction = normalizeReceiptAction(finding.recommendedAction);
    const computedAction = recommendedActionForFinding({
      attackClass: typeof finding.evidence?.["attackClass"] === "string" ? finding.evidence["attackClass"] : undefined,
      category: finding.category,
      ruleId: finding.ruleId,
      severity: finding.severity,
    });
    action = stronger(action, storedAction ?? computedAction);
  }

  const severityRank: Record<ObservatoryFindingSeverity, number> = { high: 3, medium: 2, low: 1, info: 0 };
  const topFindings = findings
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
    .slice(0, 3)
    .map((finding) => ({ severity: finding.severity, ruleId: finding.ruleId, message: finding.message }));
  const reason = topFindings[0]?.message ?? "No blocking MCP readiness findings were detected.";

  return { action, reason, topFindings };
}

export function renderActionReceipt(artifact: RunArtifact): string {
  const receipt = buildActionReceipt(artifact);
  const lines = [
    `Action Receipt: ${receipt.action}`,
    `Reason: ${receipt.reason}`,
  ];
  if (receipt.topFindings.length > 0) {
    lines.push("Top evidence:");
    for (const finding of receipt.topFindings) {
      lines.push(`- [${finding.severity}] ${finding.ruleId}: ${finding.message}`);
    }
  }
  return lines.join("\n");
}
