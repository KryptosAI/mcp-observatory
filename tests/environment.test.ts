import { describe, expect, it } from "vitest";
import { detectEnvironment } from "../src/environment.js";

describe("detectEnvironment", () => {
  it("detects Node.js/TypeScript in the observatory repo itself", async () => {
    const env = await detectEnvironment(process.cwd());
    expect(env.languages).toContain("Node.js / JavaScript / TypeScript");
    expect(env.cicd).toContain("GitHub Actions");
  });

  it("returns empty arrays for a directory with no project files", async () => {
    const env = await detectEnvironment("/tmp");
    expect(env.languages).toEqual([]);
    expect(env.frameworks).toEqual([]);
    expect(env.databases).toEqual([]);
    expect(env.cloud).toEqual([]);
    expect(env.services).toEqual([]);
  });
});
