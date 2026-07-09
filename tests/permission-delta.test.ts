import { describe, expect, it } from "vitest";

import { detectPermissionDeltas } from "../src/permission-delta.js";

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
});
