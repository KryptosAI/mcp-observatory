import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";

import { runLightweightSecurityCheck } from "../src/checks/security.js";

interface BenchmarkFixture {
  schemaVersion: string;
  id: string;
  category: string;
  description: string;
  tools: Tool[];
  expectedFindings: Array<{ toolName: string; ruleId: string; severity: string }>;
}

async function loadManifest(): Promise<{ fixtures: string[] }> {
  return JSON.parse(await readFile(path.join(process.cwd(), "benchmarks", "manifest.json"), "utf8")) as { fixtures: string[] };
}

describe("public benchmark corpus", () => {
  it("detects every seeded expected finding without network or credentials", async () => {
    const manifest = await loadManifest();
    for (const relativePath of manifest.fixtures) {
      const fixture = JSON.parse(await readFile(path.join(process.cwd(), "benchmarks", relativePath), "utf8")) as BenchmarkFixture;
      const result = runLightweightSecurityCheck(fixture.tools, {
        targetId: fixture.id,
        adapter: "local-process",
        command: "fixture",
        args: [],
      }).result;
      const findings = (result.evidence[0]?.findings ?? []).map((finding) => ({
        toolName: String(finding["toolName"]),
        ruleId: String(finding["ruleId"]),
        severity: String(finding["severity"]),
      }));
      expect(findings, fixture.id).toEqual(expect.arrayContaining(fixture.expectedFindings));
      if (fixture.expectedFindings.length === 0) expect(findings, fixture.id).toHaveLength(0);
    }
  });
});
