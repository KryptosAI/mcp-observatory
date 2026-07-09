import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { diffArtifacts, renderTerminal, type RunArtifact } from "../src/index.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

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

  it("classifies schema drift severity and gates on the configured threshold", () => {
    const base = makeArtifact([{
      id: "tools",
      capability: "tools",
      status: "pass",
      durationMs: 10,
      message: "Base tools",
      evidence: [{
        endpoint: "tools/list",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        schemas: {
          write_file: {
            type: "object",
            properties: {
              path: { type: "string" },
              contents: { type: "string" },
            },
            required: ["path", "contents"],
          },
        },
      }],
    }]);
    const head = makeArtifact([{
      id: "tools",
      capability: "tools",
      status: "pass",
      durationMs: 10,
      message: "Head tools",
      evidence: [{
        endpoint: "tools/list",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        schemas: {
          write_file: {
            type: "object",
            properties: {
              path: { type: "number" },
              contents: { type: "string" },
              mode: { type: "string" },
            },
            required: ["path", "contents"],
          },
        },
      }],
    }]);

    const reviewOnly = diffArtifacts(base, head);
    expect(reviewOnly.gate).toBe("pass");
    expect(reviewOnly.schemaDrift).toHaveLength(1);
    expect(reviewOnly.schemaDrift![0]!.severity).toBe("high");
    expect(reviewOnly.summary.schemaDriftSeverityCounts).toEqual({ high: 1, medium: 0, info: 0 });

    const gated = diffArtifacts(base, head, { failOnSchemaDrift: "high" });
    expect(gated.gate).toBe("fail");
  });
});
