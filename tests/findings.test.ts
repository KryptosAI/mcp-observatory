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

  it("normalizes attack-sim findings and fallback controls", () => {
    const artifact = makeArtifact([{
      id: "attack-sim",
      capability: "security",
      status: "partial",
      durationMs: 10,
      message: "attack findings",
      evidence: [{
        endpoint: "attack-sim/safe",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        findings: [{
          ruleId: "attack-sim/custom-rule",
          attackClass: "custom-class",
          severity: "medium",
          itemType: "schema",
          itemName: "write_file",
          message: "Schema broadened unexpectedly.",
          recommendation: "Review schema drift.",
        }],
      }],
    }]);

    const findings = extractObservatoryFindings(artifact);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "mcp-observatory/attack-sim/custom-rule",
      title: "Attack simulation: custom-class",
      severity: "medium",
      category: "attack-sim",
      subject: { type: "check", name: "write_file" },
      recommendation: "Review schema drift.",
      controlRefs: ["mcp-observatory:attack-sim"],
    });
  });

  it("emits generic and fatal findings for failed runs without structured evidence", () => {
    const artifact = {
      ...makeArtifact([{
        id: "tools",
        capability: "tools",
        status: "flaky",
        durationMs: 10,
        message: "Tool listing was flaky.",
        evidence: [{
          endpoint: "tools/list",
          advertised: true,
          responded: false,
          minimalShapePresent: false,
        }],
      }]),
      fatalError: "startup failed\nstack trace",
    };

    const findings = extractObservatoryFindings(artifact);
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      ruleId: "mcp-observatory/tools/flaky",
      severity: "medium",
      subject: { type: "check", name: "tools" },
    });
    expect(findings[1]).toMatchObject({
      ruleId: "mcp-observatory/run/fatal-error",
      severity: "high",
      message: "startup failed",
      subject: { type: "target" },
    });
  });

  it("keeps malformed diagnostic severities as info diagnostics", () => {
    const artifact = makeArtifact([{
      id: "conformance",
      capability: "conformance",
      status: "pass",
      durationMs: 10,
      message: "diagnostic",
      evidence: [{
        endpoint: "conformance/check",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        diagnostics: ["[not-a-severity] keep the whole message", "[high]"],
      }],
    }]);

    const findings = extractObservatoryFindings(artifact);
    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.message)).toEqual([
      "[not-a-severity] keep the whole message",
      "[high]",
    ]);
    expect(findings.every((finding) => finding.severity === "info")).toBe(true);
  });
});
