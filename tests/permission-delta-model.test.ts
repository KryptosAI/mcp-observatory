import { describe, expect, it } from "vitest";

import { detectPermissionDeltas } from "../src/permission-delta.js";

type EnumConfig = { present: false } | { present: true; values: string[] };
type ToolSchema = Record<string, object>;

const FIELD_LABELS = ["path", "format"] as const;
const REQUIREDNESS = [false, true] as const;
const CLOSEDNESS = [false, true] as const;
const TYPE_CARRIERS: Array<string | string[]> = ["string", ["string", "number"]];
const ENUM_CONFIGS: EnumConfig[] = [
  { present: false },
  { present: true, values: [] },
  { present: true, values: ["read"] },
  { present: true, values: ["read", "write"] },
];
const FIELD_VALUES: unknown[] = [undefined, "read", "write", 0];
const EXTRA_VALUES: unknown[] = [undefined, "secret-value"];

interface Grant {
  mutations: Set<string>;
  projections: Set<string>;
}

function makeSchema(
  field: string,
  required: boolean,
  closed: boolean,
  type: string | string[],
  enumConfig: EnumConfig,
): ToolSchema {
  const property: Record<string, unknown> = { type };
  if (enumConfig.present) property["enum"] = enumConfig.values;
  return {
    tool: {
      type: "object",
      properties: { [field]: property },
      ...(required ? { required: [field] } : {}),
      ...(closed ? { additionalProperties: false } : {}),
    },
  };
}

function grantOf(toolSchemas: ToolSchema): Grant {
  const schema = toolSchemas["tool"] as Record<string, unknown>;
  const properties = schema["properties"] as Record<string, Record<string, unknown>>;
  const [field] = Object.keys(properties);
  const property = properties[field!]!;
  const required = new Set(Array.isArray(schema["required"]) ? schema["required"] as string[] : []);
  const closed = schema["additionalProperties"] === false;
  const projections = new Set<string>();

  for (const fieldValue of FIELD_VALUES) {
    for (const extraValue of EXTRA_VALUES) {
      const value: Record<string, unknown> = {};
      if (fieldValue !== undefined) value[field!] = fieldValue;
      if (extraValue !== undefined) value["secret"] = extraValue;
      if (!accepts(value, field!, property, required.has(field!), closed)) continue;

      const projection: Record<string, unknown> = {};
      for (const [key, candidate] of Object.entries(value)) {
        if (key === "path" || key === "secret") projection[key] = candidate;
      }
      projections.add(stableKey(projection));
    }
  }

  const mutations = new Set<string>();
  // Mutation atoms must occur in an accepted request. An unsatisfiable
  // schema has an empty grant, even if an unrelated optional enum says write.
  if (projections.size > 0 && Array.isArray(property["enum"])) {
    for (const value of property["enum"]) {
      if (value === "write" && acceptsType(property["type"], value)) {
        mutations.add(`${field}:write`);
      }
    }
  }

  return { mutations, projections };
}

function schemaAccepts(toolSchemas: ToolSchema, value: Record<string, unknown>): boolean {
  const schema = toolSchemas["tool"] as Record<string, unknown>;
  const properties = schema["properties"] as Record<string, Record<string, unknown>>;
  const [field] = Object.keys(properties);
  const required = new Set(Array.isArray(schema["required"]) ? schema["required"] as string[] : []);
  return accepts(value, field!, properties[field!]!, required.has(field!), schema["additionalProperties"] === false);
}

function accepts(
  value: Record<string, unknown>,
  field: string,
  property: Record<string, unknown>,
  required: boolean,
  closed: boolean,
): boolean {
  if (required && !(field in value)) return false;
  if (closed && Object.keys(value).some((key) => key !== field)) return false;
  if (!(field in value)) return true;
  if (!acceptsType(property["type"], value[field])) return false;
  return !Array.isArray(property["enum"]) || property["enum"].some((candidate) => Object.is(candidate, value[field]));
}

function acceptsType(type: unknown, value: unknown): boolean {
  const types = typeof type === "string" ? [type] : Array.isArray(type) ? type : [];
  if (typeof value === "string") return types.includes("string");
  if (typeof value === "number") return types.includes("number") || (types.includes("integer") && Number.isInteger(value));
  return false;
}

function stableKey(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableKey(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? String(value);
}

function isSubset<T>(left: Set<T>, right: Set<T>): boolean {
  return [...left].every((value) => right.has(value));
}

function grantsEqual(left: Grant, right: Grant): boolean {
  return isSubset(left.projections, right.projections)
    && isSubset(right.projections, left.projections)
    && isSubset(left.mutations, right.mutations)
    && isSubset(right.mutations, left.mutations);
}

describe("permission-delta finite model", () => {
  it("preserves grants for every admitted pair in the 2,048-pair model", () => {
    let pairCount = 0;

    for (const field of FIELD_LABELS) {
      for (const baseRequired of REQUIREDNESS) {
        for (const headRequired of REQUIREDNESS) {
          for (const baseClosed of CLOSEDNESS) {
            for (const headClosed of CLOSEDNESS) {
              for (const baseType of TYPE_CARRIERS) {
                for (const headType of TYPE_CARRIERS) {
                  for (const baseEnum of ENUM_CONFIGS) {
                    for (const headEnum of ENUM_CONFIGS) {
                      pairCount += 1;
                      const base = makeSchema(field, baseRequired, baseClosed, baseType, baseEnum);
                      const head = makeSchema(field, headRequired, headClosed, headType, headEnum);
                      const deltas = detectPermissionDeltas("tools", base, head);
                      const risks = new Set(deltas.map((delta) => delta.risk));
                      const baseGrant = grantOf(base);
                      const headGrant = grantOf(head);

                      for (const delta of deltas.filter((entry) => entry.risk === "widening")) {
                        expect(delta.witness).toBeDefined();
                        expect(schemaAccepts(head, delta.witness!)).toBe(true);
                        expect(schemaAccepts(base, delta.witness!)).toBe(false);
                      }

                      if (!risks.has("widening") && !risks.has("review")) {
                        expect(isSubset(headGrant.projections, baseGrant.projections)).toBe(true);
                        expect(isSubset(headGrant.mutations, baseGrant.mutations)).toBe(true);
                      }

                      if (risks.size === 0 || (risks.size === 1 && risks.has("neutral"))) {
                        expect(grantsEqual(baseGrant, headGrant)).toBe(true);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(pairCount).toBe(2_048);
  });
});
