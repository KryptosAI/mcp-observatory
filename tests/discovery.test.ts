import { describe, expect, it } from "vitest";
import { scanForTargets } from "../src/discovery.js";

describe("scanForTargets", () => {
  it("returns an array (may be empty if no configs exist)", async () => {
    const targets = await scanForTargets();
    expect(Array.isArray(targets)).toBe(true);
  });

  it("returns empty array for a nonexistent config path", async () => {
    const targets = await scanForTargets("/nonexistent/path.json");
    expect(targets).toEqual([]);
  });
});
