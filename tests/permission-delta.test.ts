import { describe, expect, it } from "vitest";

import { diffArtifacts } from "../src/diff.js";
import { detectPermissionDeltas } from "../src/permission-delta.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

describe("detectPermissionDeltas", () => {
  it("reports harmless parser-shape repairs separately from permission widening", () => {
    const deltas = detectPermissionDeltas("tools", {
      search: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    }, {
      search: {
        type: "object",
        properties: {
          query: { type: "string" },
          format: { type: "string", enum: ["text", "json"] },
        },
        required: ["query"],
      },
    });

    expect(deltas).toEqual([expect.objectContaining({
      field: "format",
      risk: "neutral",
      change: "optional parser field 'format' added",
    })]);
  });

  it("flags permission-like fields that become optional or accept broader values", () => {
    const deltas = detectPermissionDeltas("tools", {
      write_file: {
        type: "object",
        additionalProperties: false,
        properties: {
          path: { type: "string" },
          mode: { type: "string", enum: ["read"] },
        },
        required: ["path"],
      },
    }, {
      write_file: {
        type: "object",
        properties: {
          path: { type: "string" },
          mode: { type: "string", enum: ["read", "write"] },
        },
        required: [],
      },
    });

    expect(deltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        risk: "widening",
        change: "additionalProperties widened",
      }),
      expect.objectContaining({
        field: "path",
        risk: "widening",
        change: "required permission field 'path' became optional",
      }),
      expect.objectContaining({
        field: "mode",
        risk: "widening",
        change: "enum values for 'mode' expanded",
      }),
    ]));
  });

  it("emits both widening and narrowing for an enum rotation", () => {
    const deltas = detectPermissionDeltas("tools", {
      manage: {
        type: "object",
        properties: { mode: { type: "string", enum: ["read", "list"] } },
        required: ["mode"],
      },
    }, {
      manage: {
        type: "object",
        properties: { mode: { type: "string", enum: ["read", "delete"] } },
        required: ["mode"],
      },
    });

    expect(deltas.map((delta) => delta.risk)).toEqual(expect.arrayContaining(["widening", "narrowing"]));
  });

  it("records contraction of a sensitive type carrier as narrowing", () => {
    const deltas = detectPermissionDeltas("tools", {
      connect: {
        type: "object",
        properties: { host: { type: ["string", "number"] } },
        required: ["host"],
      },
    }, {
      connect: {
        type: "object",
        properties: { host: { type: "string" } },
        required: ["host"],
      },
    });

    expect(deltas).toContainEqual(expect.objectContaining({ field: "host", risk: "narrowing" }));
  });

  it("routes enum-keyword removal to review", () => {
    const deltas = detectPermissionDeltas("tools", {
      manage: {
        type: "object",
        properties: { mode: { type: "string", enum: ["read"] } },
        required: ["mode"],
      },
    }, {
      manage: {
        type: "object",
        properties: { mode: { type: "string" } },
        required: ["mode"],
      },
    });

    expect(deltas).toContainEqual(expect.objectContaining({ field: "mode", risk: "review" }));
  });

  it("records removal of a mutating enum value even on an insensitive field", () => {
    const deltas = detectPermissionDeltas("tools", {
      transform: {
        type: "object",
        properties: { operation: { type: "string", enum: ["read", "write"] } },
      },
    }, {
      transform: {
        type: "object",
        properties: { operation: { type: "string", enum: ["read"] } },
      },
    });

    expect(deltas).toContainEqual(expect.objectContaining({ field: "operation", risk: "narrowing" }));

    const lifted = detectPermissionDeltas("tools", {
      transform: {
        type: "object",
        properties: { operation: { type: "number", enum: [0, "write"] } },
        required: ["operation"],
      },
    }, {
      transform: {
        type: "object",
        properties: { operation: { type: ["number", "string"], enum: [0, "write"] } },
        required: ["operation"],
      },
    });
    expect(lifted).toContainEqual(expect.objectContaining({ field: "operation", risk: "widening", witness: { operation: "write" } }));
  });

  it("audits tool additions and removals", () => {
    const readSchema = {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    };
    const writeSchema = {
      type: "object",
      properties: { path: { type: "string" }, contents: { type: "string" } },
      required: ["path", "contents"],
    };

    expect(detectPermissionDeltas("tools", { read: readSchema }, { read: readSchema, write: writeSchema }))
      .toContainEqual(expect.objectContaining({ name: "write", risk: "review" }));
    expect(detectPermissionDeltas("tools", { read: readSchema, write: writeSchema }, { read: readSchema }))
      .toContainEqual(expect.objectContaining({ name: "write", risk: "narrowing" }));
  });

  it("records optional-to-required transitions as narrowing", () => {
    const deltas = detectPermissionDeltas("tools", {
      render: {
        type: "object",
        properties: { format: { type: "string" } },
      },
    }, {
      render: {
        type: "object",
        properties: { format: { type: "string" } },
        required: ["format"],
      },
    });

    expect(deltas).toContainEqual(expect.objectContaining({ field: "format", risk: "narrowing" }));
  });

  it("routes unsupported fragments to review", () => {
    const deltas = detectPermissionDeltas("tools", {
      search: {
        type: "object",
        properties: { query: { type: "string" } },
      },
    }, {
      search: {
        type: "object",
        properties: { query: { type: "string" } },
        allOf: [{ required: ["query"] }],
      },
    });

    expect(deltas).toContainEqual(expect.objectContaining({ name: "search", risk: "review" }));
  });

  it("enforces distinct widening and review gate thresholds", () => {
    const base = makeArtifact([{
      id: "tools",
      capability: "tools",
      status: "pass",
      durationMs: 1,
      message: "base",
      evidence: [{
        endpoint: "tools/list",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        schemas: {
          search: {
            type: "object",
            properties: { query: { type: "string" }, mode: { type: "string", enum: ["read"] } },
            required: ["query"],
          },
        },
      }],
    }]);
    const reviewHead = makeArtifact([{
      id: "tools",
      capability: "tools",
      status: "pass",
      durationMs: 1,
      message: "review head",
      evidence: [{
        endpoint: "tools/list",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        schemas: {
          search: {
            type: "object",
            properties: { query: { type: "string" }, mode: { type: "string", enum: ["read"] }, token: { type: "string" } },
            required: ["query"],
          },
        },
      }],
    }]);
    const wideningHead = makeArtifact([{
      id: "tools",
      capability: "tools",
      status: "pass",
      durationMs: 1,
      message: "widening head",
      evidence: [{
        endpoint: "tools/list",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        schemas: {
          search: {
            type: "object",
            properties: { query: { type: "string" }, mode: { type: "string", enum: ["read", "write"] } },
            required: ["query"],
          },
        },
      }],
    }]);

    expect(diffArtifacts(base, reviewHead, { failOnPermissionDelta: "widening" }).gate).toBe("pass");
    expect(diffArtifacts(base, reviewHead, { failOnPermissionDelta: "review" }).gate).toBe("fail");
    expect(diffArtifacts(base, wideningHead, { failOnPermissionDelta: "widening" }).gate).toBe("fail");
  });
});
