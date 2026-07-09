import { detectPermissionDeltas } from "./permission-delta.js";
import { diffSchemas } from "./schema-diff.js";
import type { CheckResult, DiffArtifact, DiffEntry, PermissionDeltaEntry, PermissionDeltaRisk, ResponseChangeEntry, RunArtifact, SchemaDriftEntry } from "./types.js";
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
    // Both must be defined at this point — prior branches handle all undefined cases
    const base = baseCheck!;
    const head = headCheck!;

    if (base.status === head.status) {
      unchanged.push(toEntry(base, head));
      continue;
    }

    if (STATUS_RANK[head.status] < STATUS_RANK[base.status]) {
      regressions.push(toEntry(base, head));
      continue;
    }

    recoveries.push(toEntry(base, head));
  }

  // Schema drift detection
  const schemaDrift: SchemaDriftEntry[] = [];
  const permissionDeltas: PermissionDeltaEntry[] = [];
  for (const checkId of checkIds) {
    const baseCheck = baseChecks.get(checkId);
    const headCheck = headChecks.get(checkId);
    if (baseCheck === undefined || headCheck === undefined) continue;

    const baseSchemas = extractSchemas(baseCheck);
    const headSchemas = extractSchemas(headCheck);
    if (baseSchemas === undefined && headSchemas === undefined) continue;

    const drift = diffSchemas(checkId, baseSchemas ?? {}, headSchemas ?? {});
    schemaDrift.push(...drift);
    permissionDeltas.push(...detectPermissionDeltas(checkId, baseSchemas ?? {}, headSchemas ?? {}));
  }

  // Response snapshot comparison
  const responseChanges: ResponseChangeEntry[] = [];
  for (const checkId of checkIds) {
    const baseCheck = baseChecks.get(checkId);
    const headCheck = headChecks.get(checkId);
    if (baseCheck === undefined || headCheck === undefined) continue;

    const baseSnapshots = extractResponseSnapshots(baseCheck);
    const headSnapshots = extractResponseSnapshots(headCheck);
    if (baseSnapshots === undefined && headSnapshots === undefined) continue;

    const allNames = new Set([
      ...Object.keys(baseSnapshots ?? {}),
      ...Object.keys(headSnapshots ?? {}),
    ]);

    for (const name of allNames) {
      const baseVal = baseSnapshots?.[name];
      const headVal = headSnapshots?.[name];

      if (baseVal === undefined && headVal !== undefined) {
        responseChanges.push({ capability: checkId, name, change: "added" });
      } else if (baseVal !== undefined && headVal === undefined) {
        responseChanges.push({ capability: checkId, name, change: "removed" });
      } else if (JSON.stringify(baseVal) !== JSON.stringify(headVal)) {
        responseChanges.push({ capability: checkId, name, change: "response content changed" });
      }
    }
  }

  const summary = {
    regressions: regressions.length,
    recoveries: recoveries.length,
    unchanged: unchanged.length,
    added: added.length,
    removed: removed.length,
    schemaDriftCount: schemaDrift.length > 0 ? schemaDrift.length : undefined,
    responseChangeCount: responseChanges.length > 0 ? responseChanges.length : undefined,
    permissionDeltaCount: permissionDeltas.length > 0 ? permissionDeltas.length : undefined,
    permissionDeltaRiskCounts: permissionDeltas.length > 0 ? countPermissionDeltaRisks(permissionDeltas) : undefined,
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
    removed,
    schemaDrift: schemaDrift.length > 0 ? schemaDrift : undefined,
    responseChanges: responseChanges.length > 0 ? responseChanges : undefined,
    permissionDeltas: permissionDeltas.length > 0 ? permissionDeltas : undefined,
  };
}

function extractSchemas(check: CheckResult): Record<string, object> | undefined {
  for (const ev of check.evidence) {
    if (ev.schemas !== undefined) {
      return ev.schemas;
    }
  }
  return undefined;
}

function extractResponseSnapshots(check: CheckResult): Record<string, unknown> | undefined {
  for (const ev of check.evidence) {
    if (ev.responseSnapshots !== undefined) {
      return ev.responseSnapshots;
    }
  }
  return undefined;
}

function countPermissionDeltaRisks(entries: PermissionDeltaEntry[]): Record<PermissionDeltaRisk, number> {
  return {
    neutral: entries.filter((entry) => entry.risk === "neutral").length,
    review: entries.filter((entry) => entry.risk === "review").length,
    widening: entries.filter((entry) => entry.risk === "widening").length,
  };
}
