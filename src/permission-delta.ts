import type { CheckId, PermissionDeltaEntry, PermissionDeltaRisk } from "./types.js";

const PERMISSION_FIELD_PATTERN = /(?:allow|allowlist|command|cmd|directory|dir|endpoint|exec|file|filename|filepath|host|mode|namespace|path|permission|role|root|scope|secret|shell|token|uri|url|workspace)/i;
const MUTATING_MODES = new Set(["append", "create", "delete", "execute", "modify", "mutate", "patch", "post", "put", "remove", "run", "send", "update", "upload", "write"]);
const JSON_TYPES = new Set(["array", "boolean", "integer", "null", "number", "object", "string"]);
const ROOT_KEYWORDS = new Set([
  "$id", "$schema", "additionalProperties", "default", "deprecated", "description",
  "examples", "properties", "readOnly", "required", "title", "type", "writeOnly",
]);
const PROPERTY_KEYWORDS = new Set([
  "$id", "$schema", "default", "deprecated", "description", "enum", "examples",
  "readOnly", "title", "type", "writeOnly",
]);

type JsonAtom = "array" | "boolean" | "integer" | "noninteger-number" | "null" | "object" | "string";

interface SchemaInspection {
  issue?: string;
  properties: Record<string, Record<string, unknown>>;
  required: Set<string>;
  satisfiable: boolean;
}

export function detectPermissionDeltas(
  capability: CheckId,
  base: Record<string, object>,
  head: Record<string, object>,
): PermissionDeltaEntry[] {
  const entries: PermissionDeltaEntry[] = [];
  const names = [...new Set([...Object.keys(base), ...Object.keys(head)])];

  for (const name of names) {
    const basePresent = Object.prototype.hasOwnProperty.call(base, name);
    const headPresent = Object.prototype.hasOwnProperty.call(head, name);
    const baseSchema = basePresent ? asRecord(base[name]) : undefined;
    const headSchema = headPresent ? asRecord(head[name]) : undefined;
    if ((basePresent && baseSchema === undefined) || (headPresent && headSchema === undefined)) {
      entries.push(entry(capability, name, "review", "malformed contract",
        "An advertised contract is not a supported schema object."));
      continue;
    }

    if (baseSchema === undefined && headSchema !== undefined) {
      entries.push(entry(
        capability,
        name,
        "review",
        "tool contract added",
        "A newly advertised tool creates an authority boundary that was not part of the approved contract set.",
      ));
      continue;
    }

    if (baseSchema !== undefined && headSchema === undefined) {
      entries.push(entry(
        capability,
        name,
        "narrowing",
        "tool contract removed",
        "Removing an advertised tool contracts the request surface while preserving an audit record.",
      ));
      continue;
    }

    if (baseSchema === undefined || headSchema === undefined || JSON.stringify(baseSchema) === JSON.stringify(headSchema)) {
      continue;
    }

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
  const baseInspection = inspectSchema(base);
  const headInspection = inspectSchema(head);

  if (baseInspection.issue !== undefined || headInspection.issue !== undefined) {
    const details = [baseInspection.issue, headInspection.issue].filter((value): value is string => value !== undefined);
    return [entry(
      capability,
      name,
      "review",
      "unsupported or malformed schema change",
      `The supported flat fragment does not cover this contract pair: ${details.join("; ")}.`,
    )];
  }

  if (!baseInspection.satisfiable && headInspection.satisfiable) {
    return [entry(
      capability,
      name,
      "widening",
      "schema changed from unsatisfiable to satisfiable",
      "The updated contract admits requests while the approved contract admitted none.",
      undefined,
      sampleAcceptedObject(headInspection),
    )];
  }

  if (baseInspection.satisfiable && !headInspection.satisfiable) {
    return [entry(
      capability,
      name,
      "narrowing",
      "schema changed from satisfiable to unsatisfiable",
      "The updated contract removes the entire request surface.",
    )];
  }

  if (!baseInspection.satisfiable && !headInspection.satisfiable) {
    return [entry(
      capability,
      name,
      "neutral",
      "unsatisfiable schema changed",
      "Neither endpoint contract admits a request, so the permission grant remains empty.",
    )];
  }

  const entries: PermissionDeltaEntry[] = [];
  const baseClosed = base["additionalProperties"] === false;
  const headClosed = head["additionalProperties"] === false;

  if (baseClosed && !headClosed) {
    entries.push(entry(
      capability,
      name,
      "widening",
      "additionalProperties widened",
      "Schema moved from explicit-property-only to accepting additional input keys.",
      undefined,
      sampleAcceptedObject(headInspection, undefined, { [freshSensitiveField({ ...baseInspection.properties, ...headInspection.properties })]: "permission-delta-witness" }),
    ));
  } else if (!baseClosed && headClosed) {
    entries.push(entry(
      capability,
      name,
      "narrowing",
      "additionalProperties narrowed",
      "Schema moved from accepting undeclared input keys to an explicit-property-only surface.",
    ));
  }

  const propNames = [...new Set([
    ...Object.keys(baseInspection.properties),
    ...Object.keys(headInspection.properties),
  ])];

  for (const field of propNames) {
    const baseProp = baseInspection.properties[field];
    const headProp = headInspection.properties[field];
    const sensitive = isPermissionField(field);

    if (baseProp === undefined && headProp !== undefined) {
      const permissionBearing = sensitive || hasValidMutatingEnumValue(headProp);
      if (permissionBearing) {
        entries.push(entry(
          capability,
          name,
          "review",
          `permission-sensitive field '${field}' added`,
          "A new permission selector or mutation coordinate entered the accepted payload surface.",
          field,
        ));
      } else if (headInspection.required.has(field)) {
        entries.push(entry(
          capability,
          name,
          "narrowing",
          `required parser field '${field}' added`,
          "A required, permission-insensitive coordinate contracts accepted requests without expanding the grant.",
          field,
        ));
      } else {
        entries.push(entry(
          capability,
          name,
          "neutral",
          `optional parser field '${field}' added`,
          "Parser shape changed without a permission-sensitive field name or mutation boundary.",
          field,
        ));
      }
      continue;
    }

    if (baseProp !== undefined && headProp === undefined) {
      const permissionBearing = sensitive || hasValidMutatingEnumValue(baseProp);
      entries.push(entry(
        capability,
        name,
        permissionBearing ? "review" : "neutral",
        permissionBearing ? `permission-sensitive field '${field}' removed` : `parser field '${field}' removed`,
        permissionBearing
          ? "A previously explicit permission selector or mutation coordinate disappeared and may have shifted server-side."
          : "Removing a permission-insensitive coordinate leaves the projected grant unchanged.",
        field,
      ));
      continue;
    }

    if (baseProp === undefined || headProp === undefined) continue;

    const wasRequired = baseInspection.required.has(field);
    const isRequired = headInspection.required.has(field);
    if (wasRequired && !isRequired) {
      entries.push(entry(
        capability,
        name,
        sensitive ? "widening" : "neutral",
        sensitive ? `required permission field '${field}' became optional` : `required parser field '${field}' became optional`,
        sensitive
          ? "A missing permission-like field may now be defaulted or repaired by the server."
          : "Relaxing a permission-insensitive coordinate does not change the projected grant.",
        field,
        sensitive ? sampleAcceptedObject(headInspection, field) : undefined,
      ));
    } else if (!wasRequired && isRequired) {
      entries.push(entry(
        capability,
        name,
        "narrowing",
        `optional field '${field}' became required`,
        "The updated contract removes requests that omit this coordinate.",
        field,
      ));
    }

    const baseHasEnum = Object.prototype.hasOwnProperty.call(baseProp, "enum");
    const headHasEnum = Object.prototype.hasOwnProperty.call(headProp, "enum");
    if (baseHasEnum !== headHasEnum) {
      entries.push(entry(
        capability,
        name,
        "review",
        `enum boundary for '${field}' ${headHasEnum ? "added" : "removed"}`,
        "Adding or removing an enum keyword crosses the supported classifier's finite-carrier boundary.",
        field,
      ));
    } else if (baseHasEnum && headHasEnum) {
      const baseValues = rawEnumValues(baseProp);
      const headValues = rawEnumValues(headProp);
      const added = setDifference(headValues, baseValues).filter((value) => typeAccepts(headProp["type"], value));
      const removed = setDifference(baseValues, headValues).filter((value) => typeAccepts(baseProp["type"], value));

      if (added.length > 0) {
        const widening = sensitive || added.some(isMutatingValue);
        entries.push(entry(
          capability,
          name,
          widening ? "widening" : "neutral",
          `enum values for '${field}' expanded`,
          widening
            ? "Accepted values now include a broader permission or mutation surface."
            : "Only permission-insensitive, non-mutating enum values were added.",
          field,
          widening ? sampleAcceptedObject(headInspection, undefined, { [field]: added[0] }) : undefined,
        ));
      }

      if (removed.length > 0) {
        const narrowing = sensitive || removed.some(isMutatingValue);
        entries.push(entry(
          capability,
          name,
          narrowing ? "narrowing" : "neutral",
          `enum values for '${field}' narrowed`,
          narrowing
            ? "Previously projected permission values or advertised mutation modes are no longer accepted."
            : "Only permission-insensitive, non-mutating enum values were removed.",
          field,
        ));
      }
    }

    if (!setsEqual(typeAtoms(baseProp["type"]), typeAtoms(headProp["type"]))) {
      entries.push(...classifyTypeChange(capability, name, field, baseProp, headProp, sensitive, baseHasEnum === headHasEnum, headInspection));
    }
  }

  return entries;
}

function classifyTypeChange(
  capability: CheckId,
  name: string,
  field: string,
  baseProp: Record<string, unknown>,
  headProp: Record<string, unknown>,
  sensitive: boolean,
  enumBoundaryStable: boolean,
  headInspection: SchemaInspection,
): PermissionDeltaEntry[] {
  if (!enumBoundaryStable) return [];

  const baseHasEnum = Object.prototype.hasOwnProperty.call(baseProp, "enum");
  if (baseHasEnum) {
    const baseValues = validEnumValues(baseProp);
    const headValues = validEnumValues(headProp);
    const newlyValid = setDifference(headValues, baseValues);
    const newlyInvalid = setDifference(baseValues, headValues);
    const entries: PermissionDeltaEntry[] = [];

    if (newlyValid.some(isMutatingValue)) {
      entries.push(entry(
        capability,
        name,
        "widening",
        `type change for '${field}' admits a mutating enum value`,
        "A mutating constant already present in the enum became type-valid in the updated contract.",
        field,
        sampleAcceptedObject(headInspection, undefined, { [field]: newlyValid.find(isMutatingValue) }),
      ));
    }

    if (newlyInvalid.some(isMutatingValue) || (sensitive && newlyInvalid.length > 0)) {
      entries.push(entry(
        capability,
        name,
        "narrowing",
        `type change for '${field}' removes permission values`,
        "The updated carrier rejects values that contributed to the approved grant.",
        field,
      ));
    }

    if (sensitive && newlyValid.length > 0 && !newlyValid.some(isMutatingValue)) {
      entries.push(entry(
        capability,
        name,
        "review",
        `type for permission field '${field}' broadened`,
        "A permission-like field accepts previously invalid enum values after a carrier change.",
        field,
      ));
    }

    if (entries.length === 0) {
      entries.push(entry(
        capability,
        name,
        "neutral",
        `type carrier for '${field}' changed without altering valid enum values`,
        "The carrier edit leaves the effective finite value set and mutation surface unchanged.",
        field,
      ));
    }

    return entries;
  }

  const baseAtoms = typeAtoms(baseProp["type"]);
  const headAtoms = typeAtoms(headProp["type"]);
  const headWithinBase = isSubset(headAtoms, baseAtoms);
  const baseWithinHead = isSubset(baseAtoms, headAtoms);

  if (!sensitive) {
    return [entry(
      capability,
      name,
      "neutral",
      `type carrier for parser field '${field}' changed`,
      "Changing a permission-insensitive, non-mutating carrier leaves the projected grant unchanged.",
      field,
    )];
  }

  if (headWithinBase && !baseWithinHead) {
    return [entry(
      capability,
      name,
      "narrowing",
      `type for permission field '${field}' narrowed`,
      "The permission-bearing carrier accepts a strict subset of its previously accepted types.",
      field,
    )];
  }

  return [entry(
    capability,
    name,
    "review",
    `type for permission field '${field}' ${baseWithinHead ? "broadened" : "changed incomparably"}`,
    "A permission-bearing carrier gained types or moved to an incomparable set and requires review.",
    field,
  )];
}

function inspectSchema(schema: Record<string, unknown>): SchemaInspection {
  for (const key of Object.keys(schema)) {
    if (!ROOT_KEYWORDS.has(key) && !key.startsWith("x-")) {
      return emptyInspection(`unsupported root keyword '${key}'`);
    }
  }

  const rootType = schema["type"];
  if (rootType !== undefined && rootType !== "object") {
    return emptyInspection("the root type is not the flat object type");
  }

  const additionalProperties = schema["additionalProperties"];
  if (additionalProperties !== undefined && typeof additionalProperties !== "boolean") {
    return emptyInspection("additionalProperties is not boolean");
  }

  const rawProperties = schema["properties"];
  if (rawProperties !== undefined && asRecord(rawProperties) === undefined) {
    return emptyInspection("properties is not an object");
  }

  const rawRequired = schema["required"];
  if (rawRequired !== undefined && (!Array.isArray(rawRequired) || rawRequired.some((value) => typeof value !== "string"))) {
    return emptyInspection("required is not a string array");
  }

  const required = new Set(Array.isArray(rawRequired) ? rawRequired as string[] : []);
  const properties: Record<string, Record<string, unknown>> = Object.create(null) as Record<string, Record<string, unknown>>;
  for (const [field, rawProperty] of Object.entries(asRecord(rawProperties) ?? {})) {
    if (["__proto__", "constructor", "prototype"].includes(field)) {
      return emptyInspection(`property '${field}' requires review for cross-validator object semantics`);
    }
    const property = asRecord(rawProperty);
    if (property === undefined) return emptyInspection(`property '${field}' is not a schema object`);

    for (const key of Object.keys(property)) {
      if (!PROPERTY_KEYWORDS.has(key) && !key.startsWith("x-")) {
        return emptyInspection(`property '${field}' uses unsupported keyword '${key}'`);
      }
    }

    const typeIssue = validateType(property["type"]);
    if (typeIssue !== undefined) return emptyInspection(`property '${field}' ${typeIssue}`);
    if (Object.prototype.hasOwnProperty.call(property, "enum") && !Array.isArray(property["enum"])) {
      return emptyInspection(`property '${field}' has a non-array enum`);
    }
    properties[field] = property;
  }

  for (const field of required) {
    if (properties[field] === undefined) {
      return emptyInspection(`required field '${field}' is not declared in properties`);
    }
  }

  const satisfiable = [...required].every((field) => propertyDomainNonempty(properties[field]!));
  return { properties, required, satisfiable };
}

function emptyInspection(issue: string): SchemaInspection {
  return { issue, properties: {}, required: new Set(), satisfiable: false };
}

function validateType(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const values = typeof value === "string" ? [value] : Array.isArray(value) ? value : undefined;
  if (values === undefined || values.length === 0 || values.some((item) => typeof item !== "string" || !JSON_TYPES.has(item))) {
    return "has an invalid type carrier";
  }
  return undefined;
}

function propertyDomainNonempty(property: Record<string, unknown>): boolean {
  if (!Object.prototype.hasOwnProperty.call(property, "enum")) return typeAtoms(property["type"]).size > 0;
  return validEnumValues(property).length > 0;
}

function sampleAcceptedObject(
  inspection: SchemaInspection,
  omitField?: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const value: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const field of inspection.required) {
    if (field === omitField) continue;
    value[field] = samplePropertyValue(inspection.properties[field]!);
  }
  return { ...value, ...overrides };
}

function samplePropertyValue(property: Record<string, unknown>): unknown {
  const enumValues = validEnumValues(property);
  if (Object.prototype.hasOwnProperty.call(property, "enum") && enumValues.length > 0) return enumValues[0];
  const atoms = typeAtoms(property["type"]);
  if (atoms.has("string")) return "";
  if (atoms.has("integer")) return 0;
  if (atoms.has("noninteger-number")) return 0.5;
  if (atoms.has("boolean")) return false;
  if (atoms.has("null")) return null;
  if (atoms.has("array")) return [];
  if (atoms.has("object")) return {};
  return null;
}

function freshSensitiveField(properties: Record<string, Record<string, unknown>>): string {
  let candidate = "permission_delta_secret";
  while (properties[candidate] !== undefined) candidate += "_secret";
  return candidate;
}

function validEnumValues(property: Record<string, unknown>): unknown[] {
  const values = rawEnumValues(property);
  return values.filter((value) => typeAccepts(property["type"], value));
}

function rawEnumValues(property: Record<string, unknown>): unknown[] {
  return Array.isArray(property["enum"]) ? property["enum"] : [];
}

function typeAccepts(type: unknown, value: unknown): boolean {
  const atoms = typeAtoms(type);
  if (value === null) return atoms.has("null");
  if (Array.isArray(value)) return atoms.has("array");
  switch (typeof value) {
    case "boolean": return atoms.has("boolean");
    case "string": return atoms.has("string");
    case "number": return Number.isInteger(value) ? atoms.has("integer") : atoms.has("noninteger-number");
    case "object": return atoms.has("object");
    default: return false;
  }
}

function typeAtoms(type: unknown): Set<JsonAtom> {
  const all = new Set<JsonAtom>(["array", "boolean", "integer", "noninteger-number", "null", "object", "string"]);
  if (type === undefined) return all;
  const values = typeof type === "string" ? [type] : Array.isArray(type) ? type : [];
  const atoms = new Set<JsonAtom>();
  for (const value of values) {
    switch (value) {
      case "array": atoms.add("array"); break;
      case "boolean": atoms.add("boolean"); break;
      case "integer": atoms.add("integer"); break;
      case "null": atoms.add("null"); break;
      case "number": atoms.add("integer"); atoms.add("noninteger-number"); break;
      case "object": atoms.add("object"); break;
      case "string": atoms.add("string"); break;
    }
  }
  return atoms;
}

function hasValidMutatingEnumValue(property: Record<string, unknown>): boolean {
  return validEnumValues(property).some(isMutatingValue);
}

function isMutatingValue(value: unknown): boolean {
  return typeof value === "string" && MUTATING_MODES.has(value.toLowerCase());
}

function isPermissionField(field: string): boolean {
  return PERMISSION_FIELD_PATTERN.test(field);
}

function setDifference(left: unknown[], right: unknown[]): unknown[] {
  const rightKeys = new Set(right.map(stableKey));
  return left.filter((value) => !rightKeys.has(stableKey(value)));
}

function isSubset<T>(left: Set<T>, right: Set<T>): boolean {
  return [...left].every((value) => right.has(value));
}

function setsEqual<T>(left: Set<T>, right: Set<T>): boolean {
  return left.size === right.size && isSubset(left, right);
}

function stableKey(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableKey(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? String(value);
}

function entry(
  capability: CheckId,
  name: string,
  risk: PermissionDeltaRisk,
  change: string,
  reason: string,
  field?: string,
  witness?: Record<string, unknown>,
): PermissionDeltaEntry {
  return {
    capability,
    name,
    risk,
    change,
    reason,
    ...(field === undefined ? {} : { field }),
    ...(witness === undefined ? {} : { witness }),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
