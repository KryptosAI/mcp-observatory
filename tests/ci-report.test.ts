import { describe, expect, it } from "vitest";

import { buildCiReport } from "../src/commands/ci-report.js";
import type { RunArtifact, CheckResult } from "../src/types.js";

function makeCheck(id: string, status: string, message = `${id} ${status}`): CheckResult {
  return {
    id: id as CheckResult["id"],
    capability: id as CheckResult["capability"],
    status: status as CheckResult["status"],
    durationMs: 100,
    message,
    evidence: [],
  };
}

function makeArtifact(
  targetId: string,
  gate: "pass" | "fail",
  checks: CheckResult[] = [],
): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate,
    runId: `run-${targetId}`,
    createdAt: "2026-03-23T00:00:00Z",
    toolVersion: "0.1.0",
    target: {
      targetId,
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
    },
    environment: { platform: "linux", nodeVersion: "22.0.0" },
    summary: {
      gate,
      total: checks.length,
      pass: checks.filter((c) => c.status === "pass").length,
      fail: checks.filter((c) => c.status === "fail").length,
      partial: 0,
      unsupported: 0,
      flaky: 0,
      skipped: 0,
    },
    checks,
  };
}

describe("buildCiReport", () => {
  it("returns all-clear for empty artifacts", () => {
    const report = buildCiReport([]);
    expect(report.hasRegressions).toBe(false);
    expect(report.title).toContain("all clear");
    expect(report.serverCount).toBe(0);
    expect(report.failCount).toBe(0);
  });

  it("returns all-clear when all artifacts pass", () => {
    const artifacts = [
      makeArtifact("server-a", "pass", [makeCheck("tools", "pass")]),
      makeArtifact("server-b", "pass", [makeCheck("tools", "pass")]),
    ];
    const report = buildCiReport(artifacts);
    expect(report.hasRegressions).toBe(false);
    expect(report.title).toContain("all clear");
    expect(report.serverCount).toBe(2);
    expect(report.failCount).toBe(0);
  });

  it("detects a single regression", () => {
    const artifacts = [
      makeArtifact("server-a", "pass", [makeCheck("tools", "pass")]),
      makeArtifact("server-b", "fail", [
        makeCheck("tools", "fail", "tools listing returned empty"),
      ]),
    ];
    const report = buildCiReport(artifacts);
    expect(report.hasRegressions).toBe(true);
    expect(report.title).toContain("1 regression");
    expect(report.failCount).toBe(1);
    expect(report.serverCount).toBe(2);
  });

  it("detects multiple regressions", () => {
    const artifacts = [
      makeArtifact("server-a", "fail", [makeCheck("tools", "fail")]),
      makeArtifact("server-b", "fail", [makeCheck("prompts", "fail")]),
      makeArtifact("server-c", "pass", [makeCheck("tools", "pass")]),
    ];
    const report = buildCiReport(artifacts);
    expect(report.hasRegressions).toBe(true);
    expect(report.title).toContain("2 regressions");
    expect(report.failCount).toBe(2);
  });

  it("includes failing server target IDs in the body", () => {
    const artifacts = [
      makeArtifact("my-failing-server", "fail", [
        makeCheck("tools", "fail", "tools returned empty"),
        makeCheck("conformance", "partial", "missing initialize"),
      ]),
    ];
    const report = buildCiReport(artifacts);
    expect(report.body).toContain("my-failing-server");
    expect(report.body).toContain("tools");
    expect(report.body).toContain("conformance");
  });

  it("always includes mcp-observatory label", () => {
    const report = buildCiReport([]);
    expect(report.labels).toContain("mcp-observatory");

    const report2 = buildCiReport([
      makeArtifact("server-a", "fail", [makeCheck("tools", "fail")]),
    ]);
    expect(report2.labels).toContain("mcp-observatory");
  });
});
