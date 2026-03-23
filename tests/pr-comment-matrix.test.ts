import { describe, expect, it } from "vitest";

import { renderMatrixComment } from "../src/reporters/pr-comment-matrix.js";
import type { TrendInfo } from "../src/types.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

function makeTrend(direction: TrendInfo["direction"], grade = "B", score = 80): TrendInfo {
  return {
    current: { date: "2026-03-23", targetId: "test", healthScore: 90, grade: "A", toolCount: 5, promptCount: 0, resourceCount: 0, gate: "pass" },
    previous: { date: "2026-03-22", targetId: "test", healthScore: score, grade: grade as TrendInfo["current"]["grade"], toolCount: 5, promptCount: 0, resourceCount: 0, gate: "pass" },
    direction,
    delta: direction === "up" ? 10 : direction === "down" ? -10 : 0,
  };
}

describe("renderMatrixComment", () => {
  it("shows 'No servers scanned' for empty rows", () => {
    const out = renderMatrixComment([]);
    expect(out).toContain("No servers scanned");
    expect(out).toContain("MCP Observatory");
  });

  it("shows table with checkmark for single passing server", () => {
    const artifact = makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 5 }] },
    ]);
    artifact.healthScore = { overall: 95, grade: "A", dimensions: [] };
    const out = renderMatrixComment([{ artifact }]);
    expect(out).toContain("1 server scanned");
    expect(out).toContain("| test |");
    expect(out).toContain("**A** (95)");
    expect(out).toContain("| 5 |");
    expect(out).toContain("✅");
    expect(out).not.toContain("<details>");
  });

  it("shows correct table for multiple servers with mixed results", () => {
    const passing = makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 10 }] },
    ]);
    passing.target = { ...passing.target, targetId: "server-a" };
    passing.healthScore = { overall: 95, grade: "A", dimensions: [] };

    const failing = makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 3 }] },
      { id: "security", capability: "security", status: "fail", durationMs: 50, message: "1 finding", evidence: [{ endpoint: "security/scan", advertised: true, responded: true, minimalShapePresent: true, diagnostics: ['[high] Tool "exec" allows command injection'] }] },
    ]);
    failing.target = { ...failing.target, targetId: "server-b" };
    failing.healthScore = { overall: 40, grade: "D", dimensions: [] };

    const out = renderMatrixComment([
      { artifact: passing },
      { artifact: failing },
    ]);
    expect(out).toContain("2 servers scanned");
    expect(out).toContain("| server-a |");
    expect(out).toContain("| server-b |");
    expect(out).toContain("✅");
    expect(out).toContain("🔴");
  });

  it("adds details block with red icon for security findings", () => {
    const artifact = makeArtifact([
      { id: "security", capability: "security", status: "fail", durationMs: 50, message: "2 findings", evidence: [{ endpoint: "security/scan", advertised: true, responded: true, minimalShapePresent: true, diagnostics: ['[high] Tool "exec" allows command injection', '[medium] Tool "read" exposes file system'] }] },
    ]);
    artifact.target = { ...artifact.target, targetId: "risky-server" };
    const out = renderMatrixComment([{ artifact }]);
    expect(out).toContain("<details>");
    expect(out).toContain("🔴 risky-server — 2 issues");
    expect(out).toContain("`high`");
    expect(out).toContain("command injection");
    expect(out).toContain("`medium`");
    expect(out).toContain("</details>");
  });

  it("adds details block with warning icon for quality-only findings", () => {
    const artifact = makeArtifact([
      { id: "schema-quality", capability: "schema-quality", status: "partial", durationMs: 30, message: "1 issue", evidence: [{ endpoint: "schema-quality", advertised: true, responded: true, minimalShapePresent: true, diagnostics: ['[warning] tool "search": Missing description'] }] },
    ]);
    artifact.target = { ...artifact.target, targetId: "quality-server" };
    const out = renderMatrixComment([{ artifact }]);
    expect(out).toContain("<details>");
    expect(out).toContain("⚠️ quality-server — 1 issue");
    expect(out).toContain("`warning`");
    expect(out).toContain("Missing description");
    expect(out).toContain("⚠️ 1 quality");
  });

  it("shows trend arrow in health column when trend is provided", () => {
    const artifact = makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 5 }] },
    ]);
    artifact.healthScore = { overall: 90, grade: "A", dimensions: [] };

    const upOut = renderMatrixComment([{ artifact, trend: makeTrend("up") }]);
    expect(upOut).toContain("**A** (90) ↗");

    const downOut = renderMatrixComment([{ artifact, trend: makeTrend("down") }]);
    expect(downOut).toContain("**A** (90) ↘");

    const stableOut = renderMatrixComment([{ artifact, trend: makeTrend("stable") }]);
    expect(stableOut).toContain("**A** (90) →");

    // "new" direction should NOT show an arrow
    const newOut = renderMatrixComment([{ artifact, trend: makeTrend("new") }]);
    expect(newOut).toContain("**A** (90)");
    expect(newOut).not.toContain("↗");
    expect(newOut).not.toContain("↘");
    expect(newOut).not.toContain("→");
  });

  it("always includes footer", () => {
    const out = renderMatrixComment([{ artifact: makeArtifact([]) }]);
    expect(out).toContain("MCP Observatory");
    expect(out).toContain("KryptosAI/mcp-observatory");
  });

  it("has correct column headers in the table", () => {
    const artifact = makeArtifact([]);
    const out = renderMatrixComment([{ artifact }]);
    expect(out).toContain("| Server | Health | Tools | Issues |");
  });
});
