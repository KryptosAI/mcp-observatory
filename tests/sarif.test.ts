import { describe, expect, it } from "vitest";

import { renderSarif } from "../src/reporters/sarif.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

interface SarifOutput {
  version: string;
  $schema: string;
  runs: Array<{
    tool: { driver: { name: string; rules: Array<{ id: string; properties?: Record<string, unknown> }> } };
    results: Array<{
      level: string;
      ruleId: string;
      locations?: Array<{ physicalLocation: { artifactLocation: { uri: string } } }>;
      partialFingerprints?: Record<string, string>;
      properties?: Record<string, unknown>;
    }>;
  }>;
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
    expect(sarif.runs[0]!.results[0]!.ruleId).toBe("mcp-observatory/tools/fail");
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
          findings: [
            { ruleId: "shell-injection", severity: "high", toolName: "run_cmd", message: "Shell injection risk in tool run_cmd" },
            { ruleId: "no-auth-http", severity: "medium", toolName: "(target)", message: "No auth configured" },
          ],
        }],
      },
    ])));
    expect(sarif.runs[0]!.results).toHaveLength(2);
    expect(sarif.runs[0]!.results[0]!.level).toBe("error");
    expect(sarif.runs[0]!.results[1]!.level).toBe("warning");
    expect(sarif.runs[0]!.results[0]!.partialFingerprints?.["mcp-observatory/finding-id"]).toMatch(/^mcp-observatory\/security\/shell-injection\//);
    expect(sarif.runs[0]!.results[0]!.properties?.["controlRefs"]).toContain("mcp-observatory:command-execution");
  });

  it("includes rules definitions", () => {
    const sarif = parseSarif(renderSarif(makeArtifact([
      { id: "conformance", capability: "conformance", status: "partial", durationMs: 100, message: "5/7 passed", evidence: [] },
    ])));
    expect(sarif.runs[0]!.tool.driver.rules).toHaveLength(1);
    expect(sarif.runs[0]!.tool.driver.rules[0]!.id).toBe("mcp-observatory/conformance/partial");
  });

  it("uses the provided run artifact path as the SARIF location", () => {
    const sarif = parseSarif(renderSarif(makeArtifact([
      { id: "tools", capability: "tools", status: "fail", durationMs: 50, message: "Tools failed", evidence: [] },
    ]), { artifactUri: ".mcp-observatory/runs/example.json" }));
    expect(sarif.runs[0]!.results[0]!.locations?.[0]?.physicalLocation.artifactLocation.uri).toBe(".mcp-observatory/runs/example.json");
  });
});
