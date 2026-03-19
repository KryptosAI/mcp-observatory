import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { diffArtifacts, renderTerminal, type RunArtifact } from "../src/index.js";

async function loadRunArtifact(name: string): Promise<RunArtifact> {
  const filePath = path.join(process.cwd(), "tests", "fixtures", name);
  return JSON.parse(await readFile(filePath, "utf8")) as RunArtifact;
}

describe("diffArtifacts", () => {
  it("classifies regressions and recoveries with a CI-friendly gate", async () => {
    const base = await loadRunArtifact("sample-run-a.json");
    const head = await loadRunArtifact("sample-run-b.json");

    const diff = diffArtifacts(base, head);

    expect(diff.artifactType).toBe("diff");
    expect(diff.schemaVersion).toBe("1.0.0");
    expect(diff.gate).toBe("fail");
    expect(diff.summary.regressions).toBeGreaterThan(0);
    expect(diff.summary.recoveries).toBeGreaterThan(0);

    const output = renderTerminal(diff);
    expect(output).toContain("Regressions:");
    expect(output).toContain("Recoveries:");
  });
});
