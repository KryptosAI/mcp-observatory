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

export function recommendRunNextStep(artifact: RunArtifact): string {
  if (artifact.fatalError !== undefined) {
    return "Run the target command manually, compare stderr with the diagnosis below, and only raise timeoutMs if startup is genuinely slow.";
  }

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
