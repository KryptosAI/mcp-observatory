import { describe, expect, it } from "vitest";

import { renderJUnit } from "../src/reporters/junit.js";
import type { RunArtifact } from "../src/types.js";

function makeArtifact(checks: RunArtifact["checks"] = [], fatalError?: string): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate: checks.some(c => c.status === "fail") ? "fail" : "pass",
    runId: "test-run-id",
    createdAt: "2026-03-21T00:00:00Z",
    toolVersion: "0.9.0",
    target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
    environment: { platform: "darwin", nodeVersion: "v22.0.0" },
    summary: { total: checks.length, pass: 0, fail: 0, partial: 0, unsupported: 0, flaky: 0, skipped: 0, gate: "pass" },
    checks,
    fatalError,
  };
}

describe("renderJUnit", () => {
  it("produces valid XML structure", () => {
    const xml = renderJUnit(makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [] },
    ]));
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<testsuites>");
    expect(xml).toContain("</testsuites>");
    expect(xml).toContain('tests="1"');
    expect(xml).toContain('failures="0"');
  });

  it("marks failing checks with <failure>", () => {
    const xml = renderJUnit(makeArtifact([
      { id: "tools", capability: "tools", status: "fail", durationMs: 50, message: "Tools failed", evidence: [{ endpoint: "tools/list", advertised: true, responded: false, minimalShapePresent: false, diagnostics: ["Connection refused"] }] },
    ]));
    expect(xml).toContain("<failure");
    expect(xml).toContain("Connection refused");
    expect(xml).toContain('failures="1"');
  });

  it("marks skipped checks with <skipped>", () => {
    const xml = renderJUnit(makeArtifact([
      { id: "prompts", capability: "prompts", status: "skipped", durationMs: 0, message: "Skipped", evidence: [] },
    ]));
    expect(xml).toContain("<skipped");
    expect(xml).toContain('skipped="1"');
  });

  it("includes partial check diagnostics in system-out", () => {
    const xml = renderJUnit(makeArtifact([
      { id: "security", capability: "security", status: "partial", durationMs: 30, message: "1 finding", evidence: [{ endpoint: "security/scan", advertised: true, responded: true, minimalShapePresent: true, diagnostics: ["[medium] No auth"] }] },
    ]));
    expect(xml).toContain("<system-out>");
    expect(xml).toContain("No auth");
  });

  it("escapes XML special characters", () => {
    const xml = renderJUnit(makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 10, message: 'Check <tools> & "prompts"', evidence: [] },
    ]));
    expect(xml).toContain("&lt;tools&gt;");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&quot;prompts&quot;");
  });

  it("includes fatal error in system-err", () => {
    const xml = renderJUnit(makeArtifact([], "Server crashed"));
    expect(xml).toContain("<system-err>Server crashed</system-err>");
  });
});
