import type { CheckResult, DiffArtifact, DiffEntry, RunArtifact } from "./types.js";
import { SCHEMA_VERSION, STATUS_RANK } from "./types.js";

function toEntry(base: CheckResult | undefined, head: CheckResult | undefined): DiffEntry {
  const source = head ?? base;
  if (source === undefined) {
    throw new Error("Expected at least one check result when building a diff entry.");
  }
  return {
    id: source.id,
    capability: source.capability,
    fromStatus: base?.status,
    toStatus: head?.status,
    message:
      head?.message ??
      base?.message ??
      "No additional diagnostic message was recorded."
  };
}

export function diffArtifacts(base: RunArtifact, head: RunArtifact): DiffArtifact {
  const baseChecks = new Map(base.checks.map((check) => [check.id, check]));
  const headChecks = new Map(head.checks.map((check) => [check.id, check]));
  const checkIds = Array.from(new Set([...baseChecks.keys(), ...headChecks.keys()]));

  const regressions: DiffEntry[] = [];
  const recoveries: DiffEntry[] = [];
  const unchanged: DiffEntry[] = [];
  const added: DiffEntry[] = [];
  const removed: DiffEntry[] = [];

  for (const checkId of checkIds) {
    const baseCheck = baseChecks.get(checkId);
    const headCheck = headChecks.get(checkId);

    if (baseCheck === undefined && headCheck !== undefined) {
      added.push(toEntry(undefined, headCheck));
      continue;
    }
    if (baseCheck !== undefined && headCheck === undefined) {
      removed.push(toEntry(baseCheck, undefined));
      continue;
    }
    if (baseCheck === undefined || headCheck === undefined) {
      continue;
    }

    if (baseCheck.status === headCheck.status) {
      unchanged.push(toEntry(baseCheck, headCheck));
      continue;
    }

    if (STATUS_RANK[headCheck.status] < STATUS_RANK[baseCheck.status]) {
      regressions.push(toEntry(baseCheck, headCheck));
      continue;
    }

    recoveries.push(toEntry(baseCheck, headCheck));
  }

  const summary = {
    regressions: regressions.length,
    recoveries: recoveries.length,
    unchanged: unchanged.length,
    added: added.length,
    removed: removed.length,
    gate: regressions.length > 0 ? ("fail" as const) : ("pass" as const)
  };

  return {
    artifactType: "diff",
    schemaVersion: SCHEMA_VERSION,
    gate: summary.gate,
    baseRunId: base.runId,
    headRunId: head.runId,
    createdAt: new Date().toISOString(),
    summary,
    regressions,
    recoveries,
    unchanged,
    added,
    removed
  };
}
