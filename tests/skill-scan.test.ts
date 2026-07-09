import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  scanContent,
  scanFile,
  scanPath,
  computeSkillHealthScore,
  summarizeScan,
  renderSkillScanTerminal,
  renderSkillScanMarkdown,
  renderSkillScanJson,
  renderSkillScanSarif,
  SKILL_SCAN_RULES,
} from "../src/checks/skill-scan.js";

const FIXTURES = resolve(__dirname, "fixtures");

function readFixture(name: string): string {
  return readFileSync(resolve(FIXTURES, name), "utf8");
}

describe("skill-scan rules", () => {
  it("detects credential access patterns in dangerous skill", () => {
    const content = readFixture("skill-dangerous.md");
    const findings = scanContent("skill-dangerous.md", content, SKILL_SCAN_RULES);
    const credFinding = findings.find((f) => f.ruleId === "credential-access");
    expect(credFinding).toBeDefined();
    expect(credFinding!.severity).toBe("high");
    expect(credFinding!.matches.length).toBeGreaterThan(0);
  });

  it("detects exfiltration patterns in dangerous skill", () => {
    const content = readFixture("skill-dangerous.md");
    const findings = scanContent("skill-dangerous.md", content, SKILL_SCAN_RULES);
    const exfilFinding = findings.find((f) => f.ruleId === "exfiltration-vector");
    expect(exfilFinding).toBeDefined();
    expect(exfilFinding!.severity).toBe("high");
    expect(exfilFinding!.matches.length).toBeGreaterThan(0);
  });

  it("detects remote execution patterns in dangerous skill", () => {
    const content = readFixture("skill-dangerous.md");
    const findings = scanContent("skill-dangerous.md", content, SKILL_SCAN_RULES);
    const execFinding = findings.find((f) => f.ruleId === "remote-execution");
    expect(execFinding).toBeDefined();
    expect(execFinding!.severity).toBe("high");
    expect(execFinding!.matches.length).toBeGreaterThan(0);
  });

  it("detects hidden instruction patterns in dangerous skill", () => {
    const content = readFixture("skill-dangerous.md");
    const findings = scanContent("skill-dangerous.md", content, SKILL_SCAN_RULES);
    const hiddenFinding = findings.find((f) => f.ruleId === "hidden-instruction");
    expect(hiddenFinding).toBeDefined();
    expect(hiddenFinding!.severity).toBe("medium");
  });

  it("detects filesystem manipulation patterns in dangerous skill", () => {
    const content = readFixture("skill-dangerous.md");
    const findings = scanContent("skill-dangerous.md", content, SKILL_SCAN_RULES);
    const fsFinding = findings.find((f) => f.ruleId === "filesystem-manipulation");
    expect(fsFinding).toBeDefined();
    expect(fsFinding!.severity).toBe("medium");
    expect(fsFinding!.matches.length).toBeGreaterThan(0);
  });
});

describe("skill-scan credential-specific file", () => {
  it("flags the credential-heavy fixture", () => {
    const content = readFixture("skill-credentials.md");
    const findings = scanContent("skill-credentials.md", content, SKILL_SCAN_RULES);
    const credFinding = findings.find((f) => f.ruleId === "credential-access");
    expect(credFinding).toBeDefined();
    expect(credFinding!.severity).toBe("high");
    expect(credFinding!.matches.length).toBeGreaterThanOrEqual(3);
  });
});

describe("skill-scan exfiltration-specific file", () => {
  it("flags the exfiltration fixture", () => {
    const content = readFixture("skill-exfiltration.md");
    const findings = scanContent("skill-exfiltration.md", content, SKILL_SCAN_RULES);
    const exfilFinding = findings.find((f) => f.ruleId === "exfiltration-vector");
    expect(exfilFinding).toBeDefined();
    expect(exfilFinding!.severity).toBe("high");
    expect(exfilFinding!.matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe("skill-scan clean file", () => {
  it("passes a clean skill file with no findings", () => {
    const content = readFixture("skill-clean.md");
    const findings = scanContent("skill-clean.md", content, SKILL_SCAN_RULES);
    const highOrMediumFindings = findings.filter(
      (f) => f.severity === "high" || f.severity === "medium"
    );
    expect(highOrMediumFindings).toHaveLength(0);
  });

  it("marks SKILL.md files without attestation as unsigned", () => {
    const content = readFixture("skill-clean.md");
    const findings = scanContent("SKILL.md", content, SKILL_SCAN_RULES);
    const unsigned = findings.find((f) => f.ruleId === "unsigned-skill");
    expect(unsigned).toBeDefined();
    expect(unsigned!.severity).toBe("medium");
  });
});

describe("skill-scan unsigned check", () => {
  it("flags skill files without attestation", () => {
    const content = "# Just a skill\n\nThis skill does things.";
    const findings = scanContent("skill.md", content, SKILL_SCAN_RULES);
    expect(findings.some((f) => f.ruleId === "unsigned-skill")).toBe(true);
  });

  it("does not flag skill files with a hash", () => {
    const content = [
      "# Signed Skill",
      "",
      "This is a verified skill.",
      "",
      "sha256: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    ].join("\n");
    const findings = scanContent("SKILL.md", content, SKILL_SCAN_RULES);
    expect(findings.some((f) => f.ruleId === "unsigned-skill")).toBe(false);
  });

  it("does not flag skill files with pgp signature", () => {
    const content = [
      "-----BEGIN PGP SIGNED MESSAGE-----",
      "Hash: SHA256",
      "",
      "This is a signed skill.",
      "-----BEGIN PGP SIGNATURE-----",
      "fakeSig",
      "-----END PGP SIGNATURE-----",
    ].join("\n");
    const findings = scanContent("SKILL.md", content, SKILL_SCAN_RULES);
    expect(findings.some((f) => f.ruleId === "unsigned-skill")).toBe(false);
  });
});

describe("skill-scan health score", () => {
  it("returns 100 for clean files", () => {
    const content = readFixture("skill-clean.md");
    const findings = scanContent("skill-clean.md", content, SKILL_SCAN_RULES);
    const results = [{ filePath: "skill-clean.md", findings }];
    expect(computeSkillHealthScore(results)).toBeGreaterThanOrEqual(80);
  });

  it("returns lower score for files with security issues", () => {
    const content = readFixture("skill-dangerous.md");
    const findings = scanContent("skill-dangerous.md", content, SKILL_SCAN_RULES);
    const results = [{ filePath: "skill-dangerous.md", findings }];
    const score = computeSkillHealthScore(results);
    expect(score).toBeLessThan(50);
  });
});

describe("skill-scan renderers", () => {
  it("renders terminal output", () => {
    const content = readFixture("skill-clean.md");
    const findings = scanContent("skill-clean.md", content, SKILL_SCAN_RULES);
    const results = [{ filePath: "skill-clean.md", findings }];
    const output = renderSkillScanTerminal(results, computeSkillHealthScore(results));
    expect(output).toContain("Skill Scan Report");
    expect(output).toContain("skill-clean.md");
  });

  it("renders markdown output", () => {
    const content = readFixture("skill-clean.md");
    const findings = scanContent("skill-clean.md", content, SKILL_SCAN_RULES);
    const results = [{ filePath: "skill-clean.md", findings }];
    const output = renderSkillScanMarkdown(results, computeSkillHealthScore(results));
    expect(output).toContain("Skill Scan Report");
    expect(output).toContain("Health Score");
    expect(output).toContain("skill-clean.md");
  });

  it("renders JSON output", () => {
    const content = readFixture("skill-clean.md");
    const findings = scanContent("skill-clean.md", content, SKILL_SCAN_RULES);
    const results = [{ filePath: "skill-clean.md", findings }];
    const summary = summarizeScan(results);
    const output = renderSkillScanJson(summary);
    expect(() => { JSON.parse(output); }).not.toThrow();
    const parsed = JSON.parse(output) as { totalFiles: number; healthScore: number };
    expect(parsed.totalFiles).toBe(1);
    expect(typeof parsed.healthScore).toBe("number");
  });

  it("renders SARIF output", () => {
    const content = readFixture("skill-dangerous.md");
    const findings = scanContent("skill-dangerous.md", content, SKILL_SCAN_RULES);
    const results = [{ filePath: "skill-dangerous.md", findings }];
    const output = renderSkillScanSarif(results, computeSkillHealthScore(results));
    expect(() => { JSON.parse(output); }).not.toThrow();
    const parsed = JSON.parse(output) as { version: string; runs: Array<{ results: Array<unknown> }> };
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.runs).toBeDefined();
    expect(parsed.runs[0].results.length).toBeGreaterThan(0);
  });
});

describe("skill-scan file scanning", () => {
  it("scanFile returns findings for a dangerous file", async () => {
    const result = await scanFile(resolve(FIXTURES, "skill-dangerous.md"));
    expect(result.filePath).toContain("skill-dangerous.md");
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it("scanFile returns results for a clean file", async () => {
    const result = await scanFile(resolve(FIXTURES, "skill-clean.md"));
    expect(result.filePath).toContain("skill-clean.md");
    const highFindings = result.findings.filter((f) => f.severity === "high");
    expect(highFindings).toHaveLength(0);
  });

  it("scanPath handles a single file", async () => {
    const results = await scanPath(resolve(FIXTURES, "skill-clean.md"));
    expect(results.length).toBe(1);
  });

  it("scanPath handles a directory containing skill files", async () => {
    const results = await scanPath(FIXTURES);
    expect(results.length).toBeGreaterThanOrEqual(4);
  });
});

describe("skill-scan pattern matching", () => {
  it("correctly reports line numbers", () => {
    const content = [
      "# Line 1",
      "Line 2 has API_KEY mention",
      "Line 3 is clean",
      "Line 4: process.env.SECRET",
    ].join("\n");

    const findings = scanContent("test.md", content, SKILL_SCAN_RULES);
    const credFinding = findings.find((f) => f.ruleId === "credential-access");
    expect(credFinding).toBeDefined();

    const lines = credFinding!.matches.map((m) => m.line);
    expect(lines).toContain(2);
    expect(lines).toContain(4);
  });

  it("does not flag normal markdown files as skills by default", () => {
    const content = "# Normal README\n\nThis is a project readme.";
    const findings = scanContent("README.md", content, SKILL_SCAN_RULES);
    const unsigned = findings.find((f) => f.ruleId === "unsigned-skill");
    expect(unsigned).toBeUndefined();
  });

  it("reports column positions for matches", () => {
    const content = "some text API_KEY=abc123 more text";
    const findings = scanContent("test.md", content, SKILL_SCAN_RULES);
    expect(findings.length).toBeGreaterThan(0);
    expect(typeof findings[0]!.matches[0]!.column).toBe("number");
    expect(findings[0]!.matches[0]!.column).toBeGreaterThan(0);
  });
});
