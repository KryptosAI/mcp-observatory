import { describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  auditScore,
  buildAuditReport,
  renderAuditMarkdown,
  renderAuditSarif,
  resolveAuditTarget,
} from "../src/audit.js";
import { availableSecurityProfiles, loadSecurityProfile } from "../src/security-profiles.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

describe("NSA-MCP audit reports", () => {
  it("loads the nsa-mcp profile with expected control areas", () => {
    const profile = loadSecurityProfile("nsa-mcp");
    expect(profile.controlAreas).toContain("trust_boundaries");
    expect(profile.controlAreas).toContain("tool_permissions");
    expect(profile.controlAreas).toContain("auditability");
    expect(profile.ruleControls["mcp-observatory/security/shell-injection"]).toContain("runtime_safety");
    expect(availableSecurityProfiles().map((item) => item.id)).toContain("nsa-mcp");
    expect(() => loadSecurityProfile("unknown-profile")).toThrow(/Unknown security profile/);
  });

  it("normalizes findings and maps them to nsa-mcp controls", () => {
    const artifact = makeArtifact([
      {
        id: "security",
        capability: "security",
        status: "fail",
        durationMs: 5,
        message: "1 finding",
        evidence: [{
          endpoint: "security/scan",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          findings: [{
            ruleId: "shell-injection",
            severity: "high",
            toolName: "run_shell",
            message: "Tool allows command execution.",
          }],
        }],
      },
    ]);
    const report = buildAuditReport(artifact, {
      targetId: "fixture",
      adapter: "local-process",
      command: "node",
      args: ["server.mjs"],
      env: { DEMO_API_TOKEN: "redacted" },
    });
    expect(report.findings.some((finding) => finding.severity === "critical" && finding.rule_id === "mcp-observatory/audit/env-secret")).toBe(true);
    const shell = report.findings.find((finding) => finding.rule_id === "mcp-observatory/security/shell-injection");
    expect(shell?.control_mappings).toContain("tool_permissions");
    expect(shell?.control_mappings).toContain("runtime_safety");
    expect(shell?.risk_taxonomy?.cwe).toContain("CWE-78");
    expect(shell?.risk_taxonomy?.mitreAttack).toContain("T1059");
    expect(shell?.fingerprint).toMatch(/^[a-f0-9]{24}$/);
    const sarif = JSON.parse(renderAuditSarif(report)) as { runs: Array<{ results: Array<{ ruleId: string; properties?: Record<string, unknown> }> }> };
    const shellSarif = sarif.runs[0]!.results.find((result) => result.ruleId === "mcp-observatory/security/shell-injection");
    expect(shellSarif?.properties?.["risk_taxonomy"]).toMatchObject({ cwe: ["CWE-78"], mitreAttack: ["T1059"] });
  });

  it("computes trust status and score", () => {
    const report = buildAuditReport(makeArtifact([]), {
      targetId: "fixture",
      adapter: "local-process",
      command: "node",
      args: ["server.mjs"],
      env: { DEMO_PASSWORD: "redacted" },
    });
    const score = auditScore(report);
    expect(score.status).toBe("critical_risk");
    expect(score.critical).toBe(1);
    expect(score.score).toBeLessThan(100);
  });

  it("renders markdown and SARIF with normalized findings", () => {
    const report = buildAuditReport(makeArtifact([
      {
        id: "attack-sim",
        capability: "attack-sim",
        status: "fail",
        durationMs: 5,
        message: "1 finding",
        evidence: [{
          endpoint: "attack-sim/safe",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          findings: [{
            ruleId: "attack-sim/tool-poisoning/hidden-instruction",
            attackClass: "tool-poisoning",
            severity: "high",
            itemType: "tool",
            itemName: "run_shell",
            message: "Tool description contains hidden instruction override text.",
            recommendation: "Remove hidden instructions.",
          }],
        }],
      },
    ]), {
      targetId: "fixture",
      adapter: "local-process",
      command: "node",
      args: ["server.mjs"],
    });
    const markdown = renderAuditMarkdown(report);
    expect(markdown).toContain("MCP Observatory Security Audit");
    expect(markdown).toContain("tool_description_integrity");
    const sarif = JSON.parse(renderAuditSarif(report)) as {
      version: string;
      runs: Array<{
        results: Array<{ properties?: Record<string, unknown> }>;
        tool: { driver: { rules: Array<{ properties?: Record<string, unknown> }> } };
      }>;
    };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0]!.results.length).toBeGreaterThan(0);
    expect(sarif.runs[0]!.tool.driver.rules.length).toBeGreaterThan(0);
  });

  it("renders note-level SARIF for low and info findings", () => {
    const report = buildAuditReport(makeArtifact([
      {
        id: "schema-quality",
        capability: "schema-quality",
        status: "pass",
        durationMs: 5,
        message: "schema info",
        evidence: [{
          endpoint: "schema-quality",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          findings: [{
            itemType: "tool",
            itemName: "echo",
            issue: "Description is short",
            severity: "info",
          }],
        }],
      },
    ]), {
      targetId: "fixture",
      adapter: "local-process",
      command: "node",
      args: ["server.mjs"],
      metadata: { audit: "structured events" },
    });
    const sarif = JSON.parse(renderAuditSarif(report)) as { runs: Array<{ results: Array<{ level: string }> }> };
    expect(sarif.runs[0]!.results.some((result) => result.level === "note")).toBe(true);
  });

  it("resolves audit targets from a directory, json file, command args, and empty input", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "obs-audit-target-"));
    try {
      const targetJson = JSON.stringify({
        targetId: "dir-target",
        adapter: "local-process",
        command: "node",
        args: ["server.mjs"],
      }, null, 2);
      await writeFile(path.join(dir, "mcp-observatory.target.json"), `${targetJson}\n`, "utf8");
      const fromDir = await resolveAuditTarget([dir]);
      expect(fromDir.targetId).toBe("dir-target");
      expect(fromDir.adapter === "local-process" ? fromDir.cwd : undefined).toBe(dir);

      const jsonPath = path.join(dir, "target.json");
      await writeFile(jsonPath, `${targetJson}\n`, "utf8");
      const fromJson = await resolveAuditTarget([jsonPath]);
      expect(fromJson.targetId).toBe("dir-target");

      const fromCommand = await resolveAuditTarget(["node", "server.mjs"]);
      expect(fromCommand.adapter).toBe("local-process");
      expect(fromCommand.adapter === "local-process" ? fromCommand.args : []).toEqual(["server.mjs"]);

      await expect(resolveAuditTarget([])).rejects.toThrow(/Provide a target/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
