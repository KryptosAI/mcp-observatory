import { describe, expect, it } from "vitest";

import { renderPrComment } from "../src/reporters/pr-comment.js";
import type { DiffArtifact } from "../src/types.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

// ── Run artifact tests ──────────────────────────────────────────────────────

describe("renderPrComment (RunArtifact)", () => {
  it("shows all-clear when no issues", () => {
    const out = renderPrComment(makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 5, identifiers: ["a", "b", "c", "d", "e"] }] },
    ]));
    expect(out).toContain("All clear");
    expect(out).not.toContain("🔴");
  });

  it("shows security findings", () => {
    const out = renderPrComment(makeArtifact([
      { id: "security", capability: "security", status: "fail", durationMs: 50, message: "1 finding", evidence: [{ endpoint: "security/scan", advertised: true, responded: true, minimalShapePresent: true, diagnostics: ['[high] Tool "execute_command" has parameter "command" which may allow arbitrary command execution.'] }] },
    ]));
    expect(out).toContain("SECURITY");
    expect(out).toContain("high");
    expect(out).toContain("execute_command");
  });

  it("shows failing checks", () => {
    const out = renderPrComment(makeArtifact([
      { id: "tools", capability: "tools", status: "fail", durationMs: 50, message: "Tools endpoint returned error", evidence: [] },
    ]));
    expect(out).toContain("FAILING");
    expect(out).toContain("tools");
    expect(out).toContain("Tools endpoint returned error");
  });

  it("does not say all clear when the run is blocked without check findings", () => {
    const artifact = makeArtifact([], "server failed to start");
    artifact.gate = "fail";
    artifact.summary.gate = "fail";

    const out = renderPrComment(artifact);
    expect(out).toContain("Action needed");
    expect(out).toContain("run did not clear the gate");
    expect(out).toContain("**Blocked**");
    expect(out).not.toContain("All clear");
  });

  it("shows quality warnings from schema-quality check", () => {
    const out = renderPrComment(makeArtifact([
      { id: "schema-quality", capability: "schema-quality", status: "partial", durationMs: 30, message: "2 issues", evidence: [{ endpoint: "schema-quality", advertised: true, responded: true, minimalShapePresent: true, diagnostics: ['[warning] tool "list_repos": Missing description', '[warning] tool "search": Property \'query\' missing description'] }] },
    ]));
    expect(out).toContain("QUALITY");
    expect(out).toContain("list_repos");
  });

  it("renders health score when present", () => {
    const artifact = makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 24 }] },
    ]);
    artifact.healthScore = { overall: 95, grade: "A", dimensions: [] };
    const out = renderPrComment(artifact);
    expect(out).toContain("**A** (95)");
  });

  it("shows capability counts", () => {
    const out = renderPrComment(makeArtifact([
      { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [{ endpoint: "tools/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 24 }] },
      { id: "prompts", capability: "prompts", status: "pass", durationMs: 50, message: "OK", evidence: [{ endpoint: "prompts/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 3 }] },
      { id: "resources", capability: "resources", status: "pass", durationMs: 50, message: "OK", evidence: [{ endpoint: "resources/list", advertised: true, responded: true, minimalShapePresent: true, itemCount: 5 }] },
    ]));
    expect(out).toContain("24 tools");
    expect(out).toContain("3 prompts");
    expect(out).toContain("5 resources");
  });

  it("truncates long lists at 5 items", () => {
    const diagnostics = Array.from({ length: 8 }, (_, i) => `[warning] tool "tool_${i}": Missing description`);
    const out = renderPrComment(makeArtifact([
      { id: "schema-quality", capability: "schema-quality", status: "partial", durationMs: 30, message: "8 issues", evidence: [{ endpoint: "schema-quality", advertised: true, responded: true, minimalShapePresent: true, diagnostics }] },
    ]));
    expect(out).toContain("and 3 more");
  });

  it("always includes footer with MCP Observatory link", () => {
    const out = renderPrComment(makeArtifact([]));
    expect(out).toContain("MCP Observatory");
    expect(out).toContain("KryptosAI/mcp-observatory");
  });

  it("does not count security checks as FAILING", () => {
    const out = renderPrComment(makeArtifact([
      { id: "security", capability: "security", status: "fail", durationMs: 50, message: "1 finding", evidence: [{ endpoint: "security/scan", advertised: true, responded: true, minimalShapePresent: true, diagnostics: ["[high] Bad stuff"] }] },
    ]));
    expect(out).toContain("SECURITY");
    expect(out).not.toContain("FAILING");
  });
});

// ── Diff artifact tests ─────────────────────────────────────────────────────

function makeDiff(overrides: Partial<DiffArtifact> = {}): DiffArtifact {
  return {
    artifactType: "diff",
    schemaVersion: "1.0.0",
    gate: "pass",
    baseRunId: "base-run",
    headRunId: "head-run",
    createdAt: "2026-03-21T00:00:00Z",
    summary: { regressions: 0, recoveries: 0, unchanged: 0, added: 0, removed: 0, gate: "pass" },
    regressions: [],
    recoveries: [],
    unchanged: [],
    added: [],
    removed: [],
    ...overrides,
  };
}

describe("renderPrComment (DiffArtifact)", () => {
  it("shows no-regressions message when clean", () => {
    const out = renderPrComment(makeDiff({ unchanged: [{ id: "tools", capability: "tools", message: "OK" }] }));
    expect(out).toContain("No regressions");
    expect(out).not.toContain("🔴");
  });

  it("shows regressions with status transitions", () => {
    const out = renderPrComment(makeDiff({
      gate: "fail",
      summary: { regressions: 1, recoveries: 0, unchanged: 2, added: 0, removed: 0, gate: "fail" },
      regressions: [{ id: "tools-invoke", capability: "tools-invoke", fromStatus: "pass", toStatus: "fail", message: "search_code invocation error" }],
    }));
    expect(out).toContain("REGRESSIONS (1)");
    expect(out).toContain("pass → fail");
    expect(out).toContain("search_code");
  });

  it("shows schema drift entries", () => {
    const out = renderPrComment(makeDiff({
      gate: "fail",
      summary: {
        regressions: 0,
        recoveries: 0,
        unchanged: 2,
        added: 0,
        removed: 0,
        schemaDriftCount: 2,
        schemaDriftSeverityCounts: { high: 2, medium: 0, info: 0 },
        gate: "fail",
      },
      schemaDrift: [
        { capability: "tools", name: "create_issue", severity: "high", changes: ["added required property 'type'"] },
        { capability: "tools", name: "search_code", severity: "high", changes: ["removed property 'language'"] },
      ],
    }));
    expect(out).toContain("SCHEMA DRIFT (2)");
    expect(out).toContain("create_issue");
    expect(out).toContain("`high`");
    expect(out).toContain("added required property");
  });

  it("shows recoveries", () => {
    const out = renderPrComment(makeDiff({
      summary: { regressions: 0, recoveries: 1, unchanged: 2, added: 0, removed: 0, gate: "pass" },
      recoveries: [{ id: "prompts", capability: "prompts", fromStatus: "fail", toStatus: "pass", message: "Recovered" }],
    }));
    expect(out).toContain("RECOVERED (1)");
    expect(out).toContain("fail → pass");
  });

  it("always includes footer", () => {
    const out = renderPrComment(makeDiff());
    expect(out).toContain("MCP Observatory");
    expect(out).toContain("KryptosAI/mcp-observatory");
  });
});
