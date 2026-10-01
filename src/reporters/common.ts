import { extractObservatoryFindings } from "../findings.js";
import type { CheckResult, CheckStatus, RunArtifact } from "../types.js";
import { STATUS_RANK } from "../types.js";

const STATUS_PRIORITY: Record<CheckStatus, number> = Object.fromEntries(
  Object.entries(STATUS_RANK).map(([status, rank]) => [status, -rank])
) as Record<CheckStatus, number>;

export function sortChecksByActionability(checks: CheckResult[]): CheckResult[] {
  return [...checks].sort((left, right) => {
    const priorityDiff = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return left.id.localeCompare(right.id);
  });
}

export function findChecksByStatus(
  checks: CheckResult[],
  status: CheckStatus,
): CheckResult[] {
  return checks.filter((check) => check.status === status);
}

export function describeCheckList(checks: CheckResult[]): string {
  return checks.length > 0 ? checks.map((check) => check.id).join(", ") : "none";
}

export function focusLabel(status: CheckStatus): string {
  switch (status) {
    case "fail":
      return "act now";
    case "partial":
    case "flaky":
      return "review";
    case "skipped":
      return "inspect startup";
    case "unsupported":
      return "confirm intent";
    case "pass":
      return "healthy";
  }
}

export function previewList(values: string[] | undefined, limit = 5): string {
  if (values === undefined || values.length === 0) {
    return "none";
  }

  if (values.length <= limit) {
    return values.join(", ");
  }

  return `${values.slice(0, limit).join(", ")} (+${values.length - limit} more)`;
}

export type SafetyVerdict = "Ready" | "Needs review" | "Blocked";

export interface SafetySummary {
  verdict: SafetyVerdict;
  reason: string;
  topRisks: string[];
  regressionSummary: string;
  nextActions: string[];
  ciCta: string;
}

export function recommendRunNextStep(artifact: RunArtifact): string {
  if (artifact.fatalError !== undefined) {
    return "Run the target command manually, compare stderr with the diagnosis below, and only raise timeoutMs if startup is genuinely slow.";
  }

  const fix = extractObservatoryFindings(artifact).find((finding) => finding.recommendation)?.recommendation;
  if (fix) return `Fix: ${fix}`;

  const failingChecks = findChecksByStatus(artifact.checks, "fail");
  if (failingChecks.length > 0) {
    return `Start with the failing checks: ${describeCheckList(failingChecks)}.`;
  }

  const partialChecks = [
    ...findChecksByStatus(artifact.checks, "partial"),
    ...findChecksByStatus(artifact.checks, "flaky")
  ];
  if (partialChecks.length > 0) {
    return `Review the caveated checks next: ${describeCheckList(partialChecks)}.`;
  }

  const unsupportedChecks = findChecksByStatus(artifact.checks, "unsupported");
  if (unsupportedChecks.length > 0) {
    return `Confirm that unsupported capabilities are intentional for this target: ${describeCheckList(unsupportedChecks)}.`;
  }

  return "Save this run artifact and diff it against the next meaningful server or package change.";
}

function checkRiskLabel(check: CheckResult): string {
  return `${check.id}: ${check.message}`;
}

function riskList(artifact: RunArtifact): string[] {
  const risks: string[] = [];
  if (artifact.fatalError) {
    risks.push("startup: server failed to start");
  }
  for (const check of sortChecksByActionability(artifact.checks)) {
    if (check.status === "fail" || check.status === "partial" || check.status === "flaky") {
      risks.push(checkRiskLabel(check));
    }
  }
  return risks.slice(0, 3);
}

export function summarizeRunSafety(artifact: RunArtifact): SafetySummary {
  const failingChecks = findChecksByStatus(artifact.checks, "fail");
  const partialChecks = [
    ...findChecksByStatus(artifact.checks, "partial"),
    ...findChecksByStatus(artifact.checks, "flaky"),
  ];
  const unsupportedChecks = findChecksByStatus(artifact.checks, "unsupported");
  const score = artifact.healthScore?.overall;
  const verdict: SafetyVerdict = artifact.fatalError || artifact.gate === "fail" || failingChecks.length > 0 || (typeof score === "number" && score < 60)
    ? "Blocked"
    : partialChecks.length > 0 || unsupportedChecks.length > 0 || (typeof score === "number" && score < 80)
      ? "Needs review"
      : "Ready";
  const reason = verdict === "Ready"
    ? "No blocking MCP compatibility or security issues were detected."
    : verdict === "Blocked"
      ? "One or more checks can break agent dependence and should be fixed before production use."
      : "The server is usable, but caveated checks should be reviewed before agents depend on it.";
  const topRisks = riskList(artifact);
  return {
    verdict,
    reason,
    topRisks: topRisks.length > 0 ? topRisks : ["No high-priority risks detected."],
    regressionSummary: "Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.",
    nextActions: [
      recommendRunNextStep(artifact),
      "Add MCP Observatory to CI so every server change gets the same check.",
    ],
    ciCta: verdict === "Blocked"
      ? "Upload one hosted snapshot free: npx -y @kryptosai/mcp-observatory@latest cloud upload"
      : "Add CI: npx -y @kryptosai/mcp-observatory@latest setup-ci --all --command \"npx -y <server-package>\"",
  };
}

export function summarizeDiffSafety(artifact: { gate: string; regressions: unknown[]; schemaDrift?: unknown[]; responseChanges?: unknown[]; permissionDeltas?: unknown[] }): SafetySummary {
  const driftCount = artifact.schemaDrift?.length ?? 0;
  const responseChangeCount = artifact.responseChanges?.length ?? 0;
  const permissionDeltaCount = artifact.permissionDeltas?.length ?? 0;
  const regressionCount = artifact.regressions.length;
  const verdict: SafetyVerdict = artifact.gate === "fail" || regressionCount > 0
    ? "Blocked"
    : driftCount > 0 || responseChangeCount > 0
      ? "Needs review"
      : "Ready";
  const topRisks = [
    regressionCount > 0 ? `${regressionCount} regression${regressionCount === 1 ? "" : "s"} detected` : undefined,
    driftCount > 0 ? `${driftCount} schema drift item${driftCount === 1 ? "" : "s"} detected` : undefined,
    permissionDeltaCount > 0 ? `${permissionDeltaCount} permission delta${permissionDeltaCount === 1 ? "" : "s"} detected` : undefined,
    responseChangeCount > 0 ? `${responseChangeCount} response change${responseChangeCount === 1 ? "" : "s"} detected` : undefined,
  ].filter((entry): entry is string => Boolean(entry));
  return {
    verdict,
    reason: verdict === "Ready"
      ? "No regressions, schema drift, or response changes were detected."
      : verdict === "Blocked"
        ? "Regressions can break dependent agents and should be fixed or intentionally accepted."
        : "Schema or response changes were detected and should be reviewed before release.",
    topRisks: topRisks.length > 0 ? topRisks.slice(0, 3) : ["No high-priority risks detected."],
    regressionSummary: `Regressions: ${regressionCount}; schema drift: ${driftCount}; permission deltas: ${permissionDeltaCount}; response changes: ${responseChangeCount}.`,
    nextActions: [
      regressionCount > 0 ? "Fix or explicitly accept the listed regressions before release." : "Save this diff as release evidence.",
      "Keep this comparison running in CI for future MCP server changes.",
    ],
    ciCta: verdict === "Blocked"
      ? "Upload one hosted snapshot free: npx -y @kryptosai/mcp-observatory@latest cloud upload"
      : "Add CI: npx -y @kryptosai/mcp-observatory@latest setup-ci --all --command \"npx -y <server-package>\"",
  };
}
