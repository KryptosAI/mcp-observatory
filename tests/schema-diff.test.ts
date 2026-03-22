import { describe, expect, it } from "vitest";

import { diffSchemas } from "../src/schema-diff.js";

describe("diffSchemas", () => {
  it("returns empty array for matching schemas", () => {
    const base = {
      echo: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
    };
    const head = {
      echo: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
    };
    const result = diffSchemas("tools", base, head);
    expect(result).toHaveLength(0);
  });

  it("detects added items", () => {
    const base = {};
    const head = {
      newTool: { type: "object", properties: {} },
    };
    const result = diffSchemas("tools", base, head);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("newTool");
    expect(result[0]!.changes[0]).toContain("added");
  });

  it("detects removed items", () => {
    const base = {
      oldTool: { type: "object", properties: {} },
    };
    const head = {};
    const result = diffSchemas("tools", base, head);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("oldTool");
    expect(result[0]!.changes[0]).toContain("removed");
  });

  it("detects added properties", () => {
    const base = {
      echo: { type: "object", properties: { message: { type: "string" } } },
    };
    const head = {
      echo: { type: "object", properties: { message: { type: "string" }, verbose: { type: "boolean" } } },
    };
    const result = diffSchemas("tools", base, head);
    expect(result).toHaveLength(1);
    expect(result[0]!.changes).toContain("added property 'verbose'");
  });

  it("detects removed properties", () => {
    const base = {
      echo: { type: "object", properties: { message: { type: "string" }, debug: { type: "boolean" } } },
    };
    const head = {
      echo: { type: "object", properties: { message: { type: "string" } } },
    };
    const result = diffSchemas("tools", base, head);
    expect(result).toHaveLength(1);
    expect(result[0]!.changes).toContain("removed property 'debug'");
  });

  it("detects type changes", () => {
    const base = {
      echo: { type: "object", properties: { count: { type: "number" } } },
    };
    const head = {
      echo: { type: "object", properties: { count: { type: "string" } } },
    };
    const result = diffSchemas("tools", base, head);
    expect(result).toHaveLength(1);
    expect(result[0]!.changes[0]).toContain("changed 'count' type from 'number' to 'string'");
  });

  it("detects added and removed required fields", () => {
    const base = {
      echo: { type: "object", properties: {}, required: ["message"] },
    };
    const head = {
      echo: { type: "object", properties: {}, required: ["text"] },
    };
    const result = diffSchemas("tools", base, head);
    expect(result).toHaveLength(1);
    expect(result[0]!.changes).toContain("added required field 'text'");
    expect(result[0]!.changes).toContain("removed required field 'message'");
  });

  it("handles multiple items with mixed changes", () => {
    const base = {
      unchanged: { type: "object", properties: { a: { type: "string" } } },
      removed: { type: "object", properties: {} },
    };
    const head = {
      unchanged: { type: "object", properties: { a: { type: "string" } } },
      added: { type: "object", properties: {} },
    };
    const result = diffSchemas("tools", base, head);
    // "unchanged" has no changes, "removed" is removed, "added" is added
    expect(result).toHaveLength(2);
    const names = result.map(e => e.name).sort();
    expect(names).toEqual(["added", "removed"]);
  });
});
