import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderMarkdown, runTarget, type TargetConfig } from "../src/index.js";

async function loadTargetConfig(): Promise<TargetConfig> {
  const filePath = path.join(process.cwd(), "tests", "fixtures", "sample-target-config.json");
  return JSON.parse(await readFile(filePath, "utf8")) as TargetConfig;
}

describe("runTarget", () => {
  it("produces a stable run artifact and markdown report", async () => {
    const target = await loadTargetConfig();
    const artifact = await runTarget(target);

    expect(artifact.artifactType).toBe("run");
    expect(artifact.schemaVersion).toBe("1.0.0");
    expect(artifact.gate).toBe("pass");
    expect(artifact.summary.total).toBe(4);
    expect(artifact.summary.fail).toBe(0);
    expect(artifact.summary.pass).toBe(4);
    expect(artifact.checks.map((check) => check.id)).toEqual([
      "tools",
      "prompts",
      "resources",
      "semantics"
    ]);

    const markdown = renderMarkdown(artifact);
    expect(markdown).toContain("# MCP Observatory Run Report");
    expect(markdown).toContain("## Target and Environment Metadata");
    expect(markdown).toContain("## Executive Summary");
    expect(markdown).toContain("## Full Capability Status Table");
    expect(markdown).toContain("## Evidence Snippets");
    expect(markdown).toContain("## Reproduction Commands");
    expect(markdown).toContain("## Artifact Provenance");
  });
});
