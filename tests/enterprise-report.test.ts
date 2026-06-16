import { describe, expect, it } from "vitest";

import { buildEnterpriseReport, renderEnterpriseReportHtml } from "../src/commands/enterprise-report.js";
import type { CheckResult, RunArtifact } from "../src/types.js";

function makeCheck(id: CheckResult["id"], status: CheckResult["status"], itemCount = 0, message = `${id} ${status}`): CheckResult {
  return {
    id,
    capability: id,
    status,
    durationMs: 50,
    message,
    evidence: [{ endpoint: id, advertised: true, responded: status !== "fail", minimalShapePresent: status !== "fail", itemCount }],
  };
}

function makeArtifact(targetId: string, gate: "pass" | "fail", checks: CheckResult[]): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate,
    runId: `run-${targetId}`,
    createdAt: "2026-06-16T00:00:00Z",
    toolVersion: "0.20.3",
    target: {
      targetId,
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
    },
    environment: { platform: "darwin", nodeVersion: "v24.0.0" },
    summary: {
      gate,
      total: checks.length,
      pass: checks.filter((check) => check.status === "pass").length,
      fail: checks.filter((check) => check.status === "fail").length,
      partial: checks.filter((check) => check.status === "partial").length,
      unsupported: 0,
      flaky: 0,
      skipped: 0,
    },
    checks,
    healthScore: {
      overall: gate === "pass" ? 92 : 61,
      grade: gate === "pass" ? "A" : "D",
      dimensions: [],
    },
  };
}

describe("enterprise report", () => {
  it("summarizes fleet health and pilot scope", () => {
    const report = buildEnterpriseReport([
      makeArtifact("feishu-doc-mcp", "pass", [
        makeCheck("tools", "pass", 12),
        makeCheck("prompts", "pass", 2),
        makeCheck("resources", "pass", 1),
      ]),
      makeArtifact("internal-http-mcp", "fail", [
        makeCheck("tools", "fail", 0, "tools list failed"),
        makeCheck("security", "partial", 0, "missing auth metadata"),
      ]),
    ], "ThinkingData pilot");

    expect(report).toContain("Account: ThinkingData pilot");
    expect(report).toContain("Servers tested: 2");
    expect(report).toContain("Failing servers: 1");
    expect(report).toContain("feishu-doc-mcp");
    expect(report).toContain("Hosted CI history");
  });

  it("renders a standalone html document", () => {
    const html = renderEnterpriseReportHtml("# Title\n\nBody");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>Body</p>");
  });
});
