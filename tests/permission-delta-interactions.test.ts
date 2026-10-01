import { Ajv, type ValidateFunction } from "ajv";
import { describe, expect, it } from "vitest";
import { detectPermissionDeltas } from "../src/permission-delta.js";

type Value = Record<string, unknown>;
interface Schema {
  type: "object";
  properties: Record<string, Value>;
  required: string[];
  additionalProperties: boolean;
}
interface Model {
  schema: Schema;
  validate: ValidateFunction;
  projections: Set<string>;
  mutations: Set<string>;
}

// Independent JSON Schema validation; no classifier helpers are imported.
// Empty enums are interpreted as empty domains, as in the classifier fragment.
const ajv = new Ajv({ strict: false });
const VALUES: unknown[] = [undefined, "", "read", "png", "write", 0, 0.5, false, null, [], {}];
const EXTRA = "permission_delta_secret";
const isSensitive = (field: string): boolean => field === "path" || field.includes("secret");
const projection = (value: Value): Value => Object.fromEntries(
  Object.entries(value).filter(([field]) => isSensitive(field)),
);
const key = (value: unknown): string => JSON.stringify(value);
const subset = (a: Set<string>, b: Set<string>): boolean => [...a].every((item) => b.has(item));

function atoms(schema: Schema, value: Value): Set<string> {
  const result = new Set<string>();
  for (const [field, candidate] of Object.entries(value)) {
    const property = schema.properties[field];
    if (candidate === "write" && Array.isArray(property?.["enum"]) && property["enum"].includes(candidate)) {
      result.add(key([field, candidate]));
    }
  }
  return result;
}

function model(schema: Schema): Model {
  // AJV rejects enum:[] at compile time. A false property schema has exactly
  // the same empty-domain semantics, including when the property is optional.
  const validate = ajv.compile({ ...schema, properties: Object.fromEntries(
    Object.entries(schema.properties).map(([field, property]) => [
      field, Array.isArray(property["enum"]) && property["enum"].length === 0 ? false : property,
    ]),
  ) });
  const projections = new Set<string>();
  const mutations = new Set<string>();
  for (const path of VALUES) for (const format of VALUES) for (const extra of [undefined, "permission-delta-witness"]) {
    const value: Value = {};
    if (path !== undefined) value["path"] = path;
    if (format !== undefined) value["format"] = format;
    if (extra !== undefined) value[EXTRA] = extra;
    if (!validate(value)) continue;
    projections.add(key(projection(value)));
    for (const atom of atoms(schema, value)) mutations.add(atom);
  }
  return { schema, validate, projections, mutations };
}

function canRealizeProjection(base: Model, projected: Value): boolean {
  // format is the model's only insensitive coordinate; its domain has a
  // representative in VALUES for every type/enum used by this experiment.
  return VALUES.some((format) => base.validate(
    format === undefined ? projected : { ...projected, format },
  ));
}

function assertPair(base: Model, head: Model): void {
  const deltas = detectPermissionDeltas("tools", { tool: base.schema }, { tool: head.schema });
  const risks = new Set(deltas.map((delta) => delta.risk));
  const fail = (reason: string): never => {
    throw new Error(JSON.stringify({ reason, base: base.schema, head: head.schema, deltas }));
  };
  for (const delta of deltas) {
    if (delta.risk !== "widening") continue;
    const witness = delta.witness;
    if (!witness || !head.validate(witness) || base.validate(witness)) fail("invalid acceptance witness");
    const value = witness!;
    const newProjection = !canRealizeProjection(base, projection(value));
    const newMutation = [...atoms(head.schema, value)].some((atom) => !base.mutations.has(atom));
    if (!newProjection && !newMutation) fail("witness does not demonstrate abstract expansion");
  }
  if (!risks.has("widening") && !risks.has("review")) {
    if (!subset(head.projections, base.projections) || !subset(head.mutations, base.mutations)) fail("non-expansion violated");
    if (!risks.has("narrowing") && (!subset(base.projections, head.projections) || !subset(base.mutations, head.mutations))) {
      fail("neutral invariance violated");
    }
  }
}

describe("permission-delta interacting-field model", () => {
  it("checks 114,244 endpoint pairs with AJV and realized mutation atoms", () => {
    const properties: Value[] = [
      {},
      { type: "string", enum: [] },
      { type: "string", enum: ["read"] },
      { type: "string", enum: ["read", "png", "write"] },
      { type: "number", enum: [0, "write"] },
      { type: ["string", "number"], enum: [0, "write"] },
    ];
    const choices = [
      { property: undefined, required: false },
      ...properties.flatMap((property) => [false, true].map((required) => ({ property, required }))),
    ];
    const models: Model[] = [];
    for (const path of choices) for (const format of choices) for (const open of [false, true]) {
      const schema: Schema = { type: "object", properties: {}, required: [], additionalProperties: open };
      if (path.property) schema.properties["path"] = path.property;
      if (format.property) schema.properties["format"] = format.property;
      if (path.required) schema.required.push("path");
      if (format.required) schema.required.push("format");
      models.push(model(schema));
    }
    for (const base of models) for (const head of models) assertPair(base, head);
    expect(models.length ** 2).toBe(114_244);
  }, 60_000);

  it("selects the added mutation even when a pure enum value appears first", () => {
    const make = (values: string[]): Model => model({
      type: "object", properties: { format: { type: "string", enum: values } },
      required: [], additionalProperties: false,
    });
    const base = make(["read"]), head = make(["read", "png", "write"]);
    assertPair(base, head);
    expect(detectPermissionDeltas("tools", { tool: base.schema }, { tool: head.schema })[0]?.witness)
      .toEqual({ format: "write" });
  });

  it("assigns no mutation atoms to an impossible request even on an unrelated field", () => {
    const base = model({ type: "object", properties: { format: { enum: ["read"] } }, required: [], additionalProperties: false });
    const head = model({
      type: "object", properties: { path: { enum: [] }, format: { enum: ["write"] } },
      required: ["path"], additionalProperties: false,
    });
    expect(head.mutations.size).toBe(0);
    expect(head.projections.size).toBe(0);
    assertPair(base, head);
    const changedImpossible = model({ ...head.schema, properties: { path: { enum: [] }, format: { enum: ["read"] } } });
    assertPair(head, changedImpossible);
  });
});
