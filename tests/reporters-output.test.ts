import { describe, expect, it } from "vitest";

import { renderHtml } from "../src/reporters/html.js";
import { renderAttackSimulationMarkdown } from "../src/reporters/attack-sim.js";
import { renderMarkdown } from "../src/reporters/markdown.js";
import {
  renderTerminal,
  renderWatchChanges,
  renderWatchFirstRun,
  renderWatchNoChanges,
} from "../src/reporters/terminal.js";
import type { DiffArtifact, RunArtifact } from "../src/types.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

function check(id: RunArtifact["checks"][number]["id"], status: RunArtifact["checks"][number]["status"], message = `${status} message`): RunArtifact["checks"][number] {
  return {
    id,
    capability: id,
    status,
    durationMs: 12.34,
    message,
    evidence: [
      {
        endpoint: `${id}/endpoint`,
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        itemCount: 2,
        identifiers: ["alpha", "beta"],
        diagnostics: ["first diagnostic", "second diagnostic", "third diagnostic", "fourth diagnostic"],
        schemas: { alpha: { type: "object" } },
      },
    ],
  };
}

function richRunArtifact(overrides: Partial<RunArtifact> = {}): RunArtifact {
  const artifact = makeArtifact([
    check("tools", "pass", "Tools OK"),
    check("security-lite", "fail", "Security issue"),
    check("prompts", "partial", "Prompt partial"),
    check("resources", "unsupported", "Resources unavailable"),
    check("schema-quality", "skipped", "Skipped quality"),
  ]);
  artifact.gate = "fail";
  artifact.summary = {
    total: artifact.checks.length,
    pass: 1,
    fail: 1,
    partial: 1,
    unsupported: 1,
    flaky: 0,
    skipped: 1,
    gate: "fail",
  };
  artifact.target = {
    ...artifact.target,
    targetId: "danger<&>server",
    serverName: "Danger Server",
    serverVersion: "1.2.3",
  };
  artifact.healthScore = {
    overall: 64,
    grade: "C",
    dimensions: [
      { name: "Security", score: 40, weight: 0.5, details: ["needs review"] },
      { name: "Reliability", score: 88, weight: 0.5, details: ["steady"] },
    ],
  };
  return { ...artifact, ...overrides };
}

function diffArtifact(overrides: Partial<DiffArtifact> = {}): DiffArtifact {
  return {
    artifactType: "diff",
    schemaVersion: "1.0.0",
    gate: "fail",
    baseRunId: "base-run",
    headRunId: "head-run",
    createdAt: "2026-07-02T00:00:00Z",
    summary: {
      regressions: 1,
      recoveries: 1,
      unchanged: 1,
      added: 1,
      removed: 1,
      schemaDriftCount: 1,
      schemaDriftSeverityCounts: { high: 1, medium: 0, info: 0 },
      responseChangeCount: 1,
      gate: "fail",
    },
    regressions: [{ id: "tools", capability: "tools", fromStatus: "pass", toStatus: "fail", message: "Tool broke" }],
    recoveries: [{ id: "prompts", capability: "prompts", fromStatus: "fail", toStatus: "pass", message: "Prompt recovered" }],
    unchanged: [{ id: "resources", capability: "resources", fromStatus: "pass", toStatus: "pass", message: "Still OK" }],
    added: [{ id: "schema-quality", capability: "schema-quality", toStatus: "partial", message: "New check" }],
    removed: [{ id: "security", capability: "security", fromStatus: "unsupported", message: "Removed check" }],
    schemaDrift: [{ capability: "tools", name: "create_issue", severity: "high", changes: ["added required property type"] }],
    responseChanges: [{ capability: "tools", name: "search", change: "shape changed" }],
    ...overrides,
  };
}

describe("terminal reporters", () => {
  it("renders rich run output including health, fatal diagnosis, and security diagnostics", () => {
    process.env["NO_COLOR"] = "1";
    const artifact = richRunArtifact({ fatalError: "Startup failed\nDiagnosis: missing token" });

    const out = renderTerminal(artifact);

    expect(out).toContain("MCP Observatory Run");
    expect(out).toContain("Safety Verdict:");
    expect(out).toContain("Health Score: 64/100 (C)");
    expect(out).toContain("Failure diagnosis:");
    expect(out).toContain("Diagnosis: missing token");
    expect(out).toContain("Security:");
    expect(out).toContain("...and 1 more");
  });

  it("renders watch summaries for clean, failed, and changed runs", () => {
    process.env["NO_COLOR"] = "1";
    const artifact = richRunArtifact();
    const first = renderWatchFirstRun(artifact);
    const noChanges = renderWatchNoChanges(artifact);
    const changes = renderWatchChanges(artifact, diffArtifact());

    expect(first).toContain("Danger Server 1.2.3");
    expect(first).toContain("FAIL");
    expect(first).toContain("security-lite");
    expect(noChanges).toContain("No changes");
    expect(changes).toContain("Tool broke");
    expect(changes).toContain("Prompt recovered");
    expect(changes).toContain("create_issue");
    expect(changes).toContain("shape changed");
  });

  it("renders fatal watch diagnosis without full stack noise", () => {
    process.env["NO_COLOR"] = "1";
    const out = renderWatchFirstRun(richRunArtifact({ fatalError: "Stack line\nDiagnosis: bad env\nMore stack" }));

    expect(out).toContain("Server failed to start:");
    expect(out).toContain("Diagnosis: bad env");
    expect(out).not.toContain("More stack");
  });

  it("renders diff output for movement and no-change cases", () => {
    process.env["NO_COLOR"] = "1";
    const moved = renderTerminal(diffArtifact());
    expect(moved).toContain("MCP Observatory Diff");
    expect(moved).toContain("Regressions:");
    expect(moved).toContain("Recoveries:");
    expect(moved).toContain("Schema Drift:");
    expect(moved).toContain("Response Changes:");

    const clean = renderTerminal(diffArtifact({
      gate: "pass",
      summary: { regressions: 0, recoveries: 0, unchanged: 0, added: 0, removed: 0, gate: "pass" },
      regressions: [],
      recoveries: [],
      unchanged: [],
      added: [],
      removed: [],
      schemaDrift: [],
      responseChanges: [],
    }));
    expect(clean).toContain("No regressions, recoveries, schema drift, permission deltas, or response changes detected.");
  });
});

describe("markdown and html reporters", () => {
  it("renders run markdown with score, evidence, and fatal diagnostics", () => {
    const out = renderMarkdown(richRunArtifact({ fatalError: "fatal <token>" }));

    expect(out).toContain("# MCP Observatory Run Report");
    expect(out).toContain("**Health Score: 64/100 (C)**");
    expect(out).toContain("## Failure Diagnosis");
    expect(out).toContain("fatal <token>");
    expect(out).toContain("first diagnostic");
    expect(out).toContain("| Focus | Check | Status | Duration (ms) | Message |");
  });

  it("renders diff markdown for regressions, recoveries, and no movement", () => {
    expect(renderMarkdown(diffArtifact())).toContain("Start with the regressions: tools.");
    expect(renderMarkdown(diffArtifact({ regressions: [], summary: { regressions: 0, recoveries: 1, unchanged: 0, added: 0, removed: 0, gate: "pass" } }))).toContain("Review recoveries");
    expect(renderMarkdown(diffArtifact({ regressions: [], recoveries: [], summary: { regressions: 0, recoveries: 0, unchanged: 1, added: 0, removed: 0, gate: "pass" } }))).toContain("No status movement was detected");
  });

  it("renders attack simulation markdown without table breakage", () => {
    const artifact = makeArtifact([{
      id: "attack-sim",
      capability: "attack-sim",
      status: "fail",
      durationMs: 1,
      message: "found issues",
      evidence: [{
        endpoint: "attack-sim/safe",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        itemCount: 1,
        findings: [{
          ruleId: "attack-sim/tool-poisoning/hidden-instruction",
          attackClass: "tool-poisoning",
          severity: "high",
          itemType: "tool",
          itemName: "bad|tool",
          message: "contains | and\nnewline",
          evidence: {},
          recommendation: "fix | now",
        }],
      }],
    }]);
    artifact.target.targetId = "target|with\nnewline";

    const out = renderAttackSimulationMarkdown(artifact, "mcp-observatory attack-sim `weird`\nnext");

    expect(out).toContain("target\\|with newline");
    expect(out).toContain("contains \\| and newline");
    expect(out).toContain("    mcp-observatory attack-sim `weird`");
    expect(out).toContain("    next");
  });

  it("renders medium and clean attack simulation verdicts", () => {
    const mediumArtifact = makeArtifact([{
      id: "attack-sim",
      capability: "attack-sim",
      status: "partial",
      durationMs: 1,
      message: "medium issue",
      evidence: [{
        endpoint: "attack-sim/safe",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        itemCount: 1,
        findings: [{
          ruleId: "attack-sim/permission-boundary/broad-destructive-tool",
          attackClass: "permission-boundary",
          severity: "medium",
          itemType: "tool",
          itemName: "write_file",
          message: "Broad tool boundary.",
          evidence: {},
          recommendation: "Constrain inputs.",
        }],
      }],
    }]);
    const cleanArtifact = makeArtifact([{
      id: "attack-sim",
      capability: "attack-sim",
      status: "pass",
      durationMs: 1,
      message: "clean",
      evidence: [{
        endpoint: "attack-sim/safe",
        advertised: true,
        responded: true,
        minimalShapePresent: true,
        itemCount: 0,
      }],
    }]);

    expect(renderAttackSimulationMarkdown(mediumArtifact, "cmd")).toContain("Medium-risk simulated attack findings");
    expect(renderAttackSimulationMarkdown(cleanArtifact, "cmd")).toContain("No high-risk simulated attack findings were detected.");
  });

  it("escapes run html and renders evidence details", () => {
    const out = renderHtml(richRunArtifact({ fatalError: "fatal <secret>" }));

    expect(out).toContain("<!DOCTYPE html>");
    expect(out).toContain("danger&lt;&amp;&gt;server");
    expect(out).toContain("fatal &lt;secret&gt;");
    expect(out).toContain("Schemas captured:");
    expect(out).toContain("MCP Observatory Run Report");
  });

  it("renders diff html with tables, schema drift, and empty state", () => {
    const moved = renderHtml(diffArtifact());
    expect(moved).toContain("MCP Observatory Diff Report");
    expect(moved).toContain("Regressions (1)");
    expect(moved).toContain("Recoveries (1)");
    expect(moved).toContain("Schema Drift (1)");

    const clean = renderHtml(diffArtifact({
      gate: "pass",
      summary: { regressions: 0, recoveries: 0, unchanged: 0, added: 0, removed: 0, gate: "pass" },
      regressions: [],
      recoveries: [],
      unchanged: [],
      added: [],
      removed: [],
      schemaDrift: [],
      responseChanges: [],
    }));
    expect(clean).toContain("No regressions, recoveries, schema drift, permission deltas, or response changes detected.");
  });
});
