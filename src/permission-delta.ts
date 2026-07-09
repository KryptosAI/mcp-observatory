import type { CheckId, PermissionDeltaEntry, PermissionDeltaRisk } from "./types.js";

const PERMISSION_FIELD_PATTERN = /(?:allow|allowlist|command|cmd|directory|dir|endpoint|exec|file|filename|filepath|host|mode|namespace|path|permission|role|root|scope|secret|shell|token|uri|url|workspace)/i;
const MUTATING_MODES = new Set(["append", "create", "delete", "execute", "modify", "mutate", "patch", "post", "put", "remove", "run", "send", "update", "upload", "write"]);

export function detectPermissionDeltas(
  capability: CheckId,
  base: Record<string, object>,
  head: Record<string, object>,
): PermissionDeltaEntry[] {
  const entries: PermissionDeltaEntry[] = [];
  const names = new Set([...Object.keys(base), ...Object.keys(head)]);

  for (const name of names) {
    const baseSchema = asRecord(base[name]);
    const headSchema = asRecord(head[name]);
    if (baseSchema === undefined || headSchema === undefined) continue;
    entries.push(...compareSchemaPermissionSurface(capability, name, baseSchema, headSchema));
  }

  return entries;
}

function compareSchemaPermissionSurface(
  capability: CheckId,
  name: string,
  base: Record<string, unknown>,
  head: Record<string, unknown>,
): PermissionDeltaEntry[] {
  const entries: PermissionDeltaEntry[] = [];
  const baseRequired = new Set(asStringArray(base["required"]));
  const headRequired = new Set(asStringArray(head["required"]));
  const baseProps = asRecord(base["properties"]) ?? {};
  const headProps = asRecord(head["properties"]) ?? {};
  const propNames = new Set([...Object.keys(baseProps), ...Object.keys(headProps)]);

  if (base["additionalProperties"] === false && head["additionalProperties"] !== false) {
    entries.push(entry(capability, name, "widening", "additionalProperties widened", "Schema moved from explicit-property-only to accepting additional input keys."));
  }

  for (const field of propNames) {
    const baseProp = asRecord(baseProps[field]);
    const headProp = asRecord(headProps[field]);
    const sensitive = isPermissionField(field);

    if (baseProp === undefined && headProp !== undefined) {
      if (sensitive) {
        entries.push(entry(capability, name, "review", `permission-sensitive field '${field}' added`, "New permission-like selector entered the accepted payload surface.", field));
      } else if (!headRequired.has(field)) {
        entries.push(entry(capability, name, "neutral", `optional parser field '${field}' added`, "Parser shape changed without a permission-sensitive field name or required boundary change.", field));
      }
      continue;
    }

    if (baseProp !== undefined && headProp === undefined) {
      if (sensitive) {
        entries.push(entry(capability, name, "review", `permission-sensitive field '${field}' removed`, "A previously explicit permission-like selector disappeared from the accepted payload surface.", field));
      }
      continue;
    }

    if (baseProp === undefined || headProp === undefined) continue;

    if (sensitive && baseRequired.has(field) && !headRequired.has(field)) {
      entries.push(entry(capability, name, "widening", `required permission field '${field}' became optional`, "A missing permission-like field may now be defaulted or repaired by the server.", field));
    }

    const enumDelta = compareEnums(baseProp["enum"], headProp["enum"]);
    if (enumDelta === "expanded") {
      const risk = sensitive || hasMutatingEnumValue(headProp["enum"]) ? "widening" : "neutral";
      entries.push(entry(capability, name, risk, `enum values for '${field}' expanded`, risk === "widening" ? "Accepted values now include a broader permission or mutation surface." : "Accepted values expanded on a non-permission field.", field));
    }

    if (sensitive && isBroaderType(baseProp["type"], headProp["type"])) {
      entries.push(entry(capability, name, "review", `type for permission field '${field}' broadened`, "A permission-like field accepts a broader type than before.", field));
    }
  }

  return entries;
}

function entry(
  capability: CheckId,
  name: string,
  risk: PermissionDeltaRisk,
  change: string,
  reason: string,
  field?: string,
): PermissionDeltaEntry {
  return field === undefined
    ? { capability, name, risk, change, reason }
    : { capability, name, risk, change, reason, field };
}

function isPermissionField(field: string): boolean {
  return PERMISSION_FIELD_PATTERN.test(field);
}

function compareEnums(base: unknown, head: unknown): "expanded" | "narrowed" | "same" {
  const baseValues = asStringArray(base);
  const headValues = asStringArray(head);
  if (baseValues.length === 0 || headValues.length === 0) return "same";
  const baseSet = new Set(baseValues);
  const headSet = new Set(headValues);
  const added = headValues.some((value) => !baseSet.has(value));
  const removed = baseValues.some((value) => !headSet.has(value));
  if (added && !removed) return "expanded";
  if (removed && !added) return "narrowed";
  return added ? "expanded" : "same";
}

function hasMutatingEnumValue(value: unknown): boolean {
  return asStringArray(value).some((entry) => MUTATING_MODES.has(entry.toLowerCase()));
}

function isBroaderType(base: unknown, head: unknown): boolean {
  const baseTypes = asStringArray(Array.isArray(base) ? base : typeof base === "string" ? [base] : []);
  const headTypes = asStringArray(Array.isArray(head) ? head : typeof head === "string" ? [head] : []);
  if (baseTypes.length === 0 || headTypes.length === 0) return false;
  return headTypes.length > baseTypes.length || headTypes.some((type) => !baseTypes.includes(type));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
