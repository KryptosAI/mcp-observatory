import { describe, expect, it } from "vitest";

import { renderSarif } from "../src/reporters/sarif.js";
import type { RunArtifact } from "../src/types.js";

interface SarifOutput {
  version: string;
  $schema: string;
  runs: Array<{
    tool: { driver: { name: string; rules: Array<{ id: string }> } };
    results: Array<{ level: string; ruleId: string }>;
  }>;
}

function makeArtifact(checks: RunArtifact["checks"] = []): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate: "pass",
    runId: "test-run-id",
    createdAt: "2026-03-21T00:00:00Z",
    toolVersion: "0.9.0",
    target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
    environment: { platform: "darwin", nodeVersion: "v22.0.0" },
    summary: { total: checks.length, pass: 0, fail: 0, partial: 0, unsupported: 0, flaky: 0, skipped: 0, gate: "pass" },
    checks,
  };
}

function parseSarif(json: string): SarifOutput {
  return JSON.parse(json) as SarifOutput;
}

describe("renderSarif", () => {
  it("produces valid SARIF structure", () => {
    const sarif = parseSarif(renderSarif(makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [] },
    ])));
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.$schema).toContain("sarif-schema");
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0]!.tool.driver.name).toBe("mcp-observatory");
  });

  it("creates results for failing checks", () => {
    const sarif = parseSarif(renderSarif(makeArtifact([
      { id: "tools", capability: "tools", status: "fail", durationMs: 50, message: "Tools failed", evidence: [] },
    ])));
    expect(sarif.runs[0]!.results).toHaveLength(1);
    expect(sarif.runs[0]!.results[0]!.level).toBe("error");
    expect(sarif.runs[0]!.results[0]!.ruleId).toBe("mcp-observatory/tools");
  });

  it("skips results for passing checks", () => {
    const sarif = parseSarif(renderSarif(makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [] },
    ])));
    expect(sarif.runs[0]!.results).toHaveLength(0);
  });

  it("expands security findings into individual results", () => {
    const sarif = parseSarif(renderSarif(makeArtifact([
      {
        id: "security",
        capability: "security",
        status: "fail",
        durationMs: 30,
        message: "2 findings",
        evidence: [{
          endpoint: "security/scan",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          diagnostics: [
            "[high] Shell injection risk in tool run_cmd",
            "[medium] No auth configured",
          ],
        }],
      },
    ])));
    expect(sarif.runs[0]!.results).toHaveLength(2);
    expect(sarif.runs[0]!.results[0]!.level).toBe("error");
    expect(sarif.runs[0]!.results[1]!.level).toBe("warning");
  });

  it("includes rules definitions", () => {
    const sarif = parseSarif(renderSarif(makeArtifact([
      { id: "conformance", capability: "conformance", status: "partial", durationMs: 100, message: "5/7 passed", evidence: [] },
    ])));
    expect(sarif.runs[0]!.tool.driver.rules).toHaveLength(1);
    expect(sarif.runs[0]!.tool.driver.rules[0]!.id).toBe("mcp-observatory/conformance");
  });
});
