import { describe, expect, it } from "vitest";

import { buildToolDecisions } from "../src/decisions.js";
import type { RunArtifact } from "../src/types.js";

function artifactWithFindings(findings: Array<Record<string, unknown>>): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate: findings.length > 0 ? "fail" : "pass",
    runId: "run_decisions",
    createdAt: "2026-08-05T00:00:00.000Z",
    toolVersion: "test",
    target: { targetId: "fixture", adapter: "local-process", command: "fixture", args: [] },
    environment: { platform: "test", nodeVersion: "test" },
    summary: { total: 2, pass: 1, fail: findings.length > 0 ? 1 : 0, partial: 0, unsupported: 0, flaky: 0, skipped: 0, gate: findings.length > 0 ? "fail" : "pass" },
    checks: [
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 1,
        message: "Tools listed.",
        evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, identifiers: ["read_file", "run_command"] }],
      },
      {
        id: "security-lite",
        capability: "security-lite",
        status: findings.length > 0 ? "fail" : "pass",
        durationMs: 1,
        message: "Security check.",
        evidence: [{ endpoint: "security/scan-lite", advertised: true, responded: true, minimalShapePresent: true, findings }],
      },
    ],
  };
}

describe("tool decisions", () => {
  it("maps evidence severity to allow, review, and block decisions", () => {
    const artifact = artifactWithFindings([
      { ruleId: "shell-injection", severity: "high", toolName: "run_command", message: "executes commands" },
      { ruleId: "broad-filesystem", severity: "medium", toolName: "read_file", message: "broad path" },
    ]);
    expect(buildToolDecisions(artifact)).toEqual([
      { toolName: "run_command", decision: "block", reason: "executes commands", findingIds: [expect.any(String)] },
      { toolName: "read_file", decision: "review", reason: "broad path", findingIds: [expect.any(String)] },
    ]);
  });

  it("allows tools with no tool-level findings", () => {
    const decisions = buildToolDecisions(artifactWithFindings([]));
    expect(decisions).toEqual([
      { toolName: "read_file", decision: "allow", reason: "No tool-level findings were detected.", findingIds: [] },
      { toolName: "run_command", decision: "allow", reason: "No tool-level findings were detected.", findingIds: [] },
    ]);
  });
});
