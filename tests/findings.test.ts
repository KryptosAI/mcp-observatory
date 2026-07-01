import { describe, expect, it } from "vitest";

import { extractObservatoryFindings } from "../src/findings.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

describe("extractObservatoryFindings", () => {
  it("normalizes structured security findings", () => {
    const artifact = makeArtifact([{
      id: "security",
      capability: "security",
      status: "fail",
      durationMs: 10,
      message: "1 finding",
      evidence: [{
        endpoint: "security/scan",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        findings: [{
          ruleId: "shell-injection",
          severity: "high",
          toolName: "run_cmd",
          message: "Tool may execute arbitrary commands.",
        }],
      }],
    }]);

    const findings = extractObservatoryFindings(artifact);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "mcp-observatory/security/shell-injection",
      severity: "high",
      category: "security",
      checkId: "security",
      subject: { type: "tool", name: "run_cmd" },
    });
    expect(findings[0]!.id).toMatch(/^mcp-observatory\/security\/shell-injection\//);
    expect(findings[0]!.controlRefs).toContain("mcp-observatory:command-execution");
  });

  it("normalizes schema-quality findings", () => {
    const artifact = makeArtifact([{
      id: "schema-quality",
      capability: "schema-quality",
      status: "partial",
      durationMs: 10,
      message: "1 finding",
      evidence: [{
        endpoint: "schema-quality/scan",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        findings: [{
          itemType: "tool",
          itemName: "search",
          issue: "Missing description",
          severity: "warning",
        }],
      }],
    }]);

    const findings = extractObservatoryFindings(artifact);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "medium",
      category: "schema-quality",
      subject: { type: "tool", name: "search" },
    });
    expect(findings[0]!.ruleId).toContain("schema-missing-description");
  });

  it("falls back to legacy diagnostics", () => {
    const artifact = makeArtifact([{
      id: "security",
      capability: "security",
      status: "fail",
      durationMs: 10,
      message: "legacy",
      evidence: [{
        endpoint: "security/scan",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        diagnostics: ["[high] Shell injection risk in tool run_cmd"],
      }],
    }]);

    const findings = extractObservatoryFindings(artifact);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "high",
      message: "Shell injection risk in tool run_cmd",
      ruleId: "mcp-observatory/security/security-diagnostic",
    });
  });
});
