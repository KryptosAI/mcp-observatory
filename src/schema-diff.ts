import type { CheckId, SchemaDriftEntry, SchemaDriftSeverity } from "./types.js";

const SCHEMA_DRIFT_SEVERITY_RANK: Record<SchemaDriftSeverity, number> = {
  info: 1,
  medium: 2,
  high: 3,
};

function severityForChange(change: string): SchemaDriftSeverity {
  if (
    change === "removed"
    || change.startsWith("added required field")
    || change.startsWith("removed property")
    || change.startsWith("changed ")
  ) {
    return "high";
  }
  if (change.startsWith("removed required field") || change.startsWith("added (new ")) {
    return "medium";
  }
  return "info";
}

export function classifySchemaDriftSeverity(changes: string[]): SchemaDriftSeverity {
  return changes.reduce<SchemaDriftSeverity>((max, change) => {
    const current = severityForChange(change);
    return SCHEMA_DRIFT_SEVERITY_RANK[current] > SCHEMA_DRIFT_SEVERITY_RANK[max] ? current : max;
  }, "info");
}

/**
 * Compare two schema maps and return human-readable drift descriptions.
 * Each map is keyed by item name (e.g., tool name) with the schema object as value.
 */
export function diffSchemas(
  capability: CheckId,
  base: Record<string, object>,
  head: Record<string, object>,
): SchemaDriftEntry[] {
  const entries: SchemaDriftEntry[] = [];
  const allNames = new Set([...Object.keys(base), ...Object.keys(head)]);

  for (const name of allNames) {
    const baseSchema = base[name] as Record<string, unknown> | undefined;
    const headSchema = head[name] as Record<string, unknown> | undefined;

    if (baseSchema === undefined && headSchema !== undefined) {
      const changes = [`added (new ${capability.replace("-invoke", "")})`];
      entries.push({ capability, name, severity: classifySchemaDriftSeverity(changes), changes });
      continue;
    }
    if (baseSchema !== undefined && headSchema === undefined) {
      const changes = ["removed"];
      entries.push({ capability, name, severity: classifySchemaDriftSeverity(changes), changes });
      continue;
    }
    if (baseSchema === undefined || headSchema === undefined) {
      continue;
    }

    const changes = compareSchemas(baseSchema, headSchema);
    if (changes.length > 0) {
      entries.push({ capability, name, severity: classifySchemaDriftSeverity(changes), changes });
    }
  }

  return entries;
}

function compareSchemas(
  base: Record<string, unknown>,
  head: Record<string, unknown>,
): string[] {
  const changes: string[] = [];

  // Compare required fields
  const baseRequired = asStringArray(base["required"]);
  const headRequired = asStringArray(head["required"]);
  for (const field of headRequired) {
    if (!baseRequired.includes(field)) {
      changes.push(`added required field '${field}'`);
    }
  }
  for (const field of baseRequired) {
    if (!headRequired.includes(field)) {
      changes.push(`removed required field '${field}'`);
    }
  }

  // Compare properties
  const baseProps = asRecord(base["properties"]);
  const headProps = asRecord(head["properties"]);
  const allProps = new Set([...Object.keys(baseProps), ...Object.keys(headProps)]);

  for (const prop of allProps) {
    const baseProp = baseProps[prop] as Record<string, unknown> | undefined;
    const headProp = headProps[prop] as Record<string, unknown> | undefined;

    if (baseProp === undefined && headProp !== undefined) {
      changes.push(`added property '${prop}'`);
      continue;
    }
    if (baseProp !== undefined && headProp === undefined) {
      changes.push(`removed property '${prop}'`);
      continue;
    }
    if (baseProp !== undefined && headProp !== undefined) {
      if (baseProp["type"] !== headProp["type"]) {
        changes.push(`changed '${prop}' type from '${String(baseProp["type"])}' to '${String(headProp["type"])}'`);
      }
    }
  }

  return changes;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
