import { describe, expect, it } from "vitest";
import { validateTargetConfig } from "../src/validate.js";

describe("validateTargetConfig", () => {
  it("validates a correct local-process config", () => {
    const config = validateTargetConfig({
      targetId: "test",
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
    });
    expect(config.targetId).toBe("test");
    expect(config.adapter).toBe("local-process");
  });

  it("throws on missing targetId", () => {
    expect(() => validateTargetConfig({ adapter: "local-process", command: "node", args: [] }))
      .toThrow("targetId");
  });

  it("throws on missing adapter", () => {
    expect(() => validateTargetConfig({ targetId: "test", command: "node", args: [] }))
      .toThrow("adapter");
  });

  it("throws on non-object input", () => {
    expect(() => validateTargetConfig("not an object")).toThrow();
  });
});
