import { describe, expect, it } from "vitest";

import { buildAuditReport, renderAuditMarkdown, renderAuditSarif } from "../src/audit.js";
import { renderSarif } from "../src/reporters/sarif.js";
import { taxonomyForFinding, taxonomyForRule, taxonomyTags, type RiskTaxonomy } from "../src/risk-taxonomy.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

interface SarifOutput {
  runs: Array<{
    tool: {
      driver: {
        rules: Array<{ id: string; properties?: Record<string, unknown> }>;
      };
    };
    results: Array<{ ruleId: string; properties?: Record<string, unknown> }>;
  }>;
}

function parseSarif(json: string): SarifOutput {
  return JSON.parse(json) as SarifOutput;
}

function shellInjectionArtifact() {
  return makeArtifact([
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
}

describe("risk taxonomy mappings", () => {
  it("returns exact rule taxonomy before category fallback", () => {
    const taxonomy = taxonomyForRule("mcp-observatory/security/shell-injection", "schema-quality");
    expect(taxonomy?.cwe).toEqual(["CWE-78"]);
    expect(taxonomy?.owasp).toContain("OWASP Top 10 2021 A03: Injection");
    expect(taxonomy?.mitreAttack).toEqual(["T1059"]);
  });

  it("falls back to category taxonomy when the rule has no exact match", () => {
    const taxonomy = taxonomyForFinding({
      ruleId: "mcp-observatory/schema-quality/schema-description-too-short",
      category: "schema-quality",
    });
    expect(taxonomy?.cwe).toEqual(["CWE-20"]);
    expect(taxonomy?.owasp).toContain("OWASP API Security Top 10 2023 API8: Security Misconfiguration");
  });

  it("returns undefined for unknown rules without category matches", () => {
    expect(taxonomyForRule("mcp-observatory/security/not-a-real-rule")).toBeUndefined();
    expect(taxonomyForFinding({
      ruleId: "mcp-observatory/security/not-a-real-rule",
      category: "unknown-category",
    })).toBeUndefined();
  });

  it("builds tags from CWE, OWASP, and MITRE fields only", () => {
    expect(taxonomyTags(undefined)).toEqual([]);

    const emptyTaxonomy: RiskTaxonomy = {
      cwe: [],
      owasp: [],
      mitreAttack: [],
      cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
    };
    expect(taxonomyTags(emptyTaxonomy)).toEqual([]);

    const taxonomy: RiskTaxonomy = {
      cwe: ["CWE-78"],
      owasp: ["OWASP Top 10 2021 A03: Injection"],
      mitreAttack: ["T1059"],
      cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
    };
    expect(taxonomyTags(taxonomy)).toEqual([
      "CWE-78",
      "OWASP Top 10 2021 A03: Injection",
      "T1059",
    ]);
  });

  it("surfaces taxonomy in normalized audit findings and audit SARIF", () => {
    const report = buildAuditReport(shellInjectionArtifact(), {
      targetId: "fixture",
      adapter: "local-process",
      command: "node",
      args: ["server.mjs"],
      metadata: { audit: "structured events" },
    });
    const shell = report.findings.find((finding) => finding.rule_id === "mcp-observatory/security/shell-injection");
    expect(shell?.risk_taxonomy).toMatchObject({
      cwe: ["CWE-78"],
      mitreAttack: ["T1059"],
    });

    const markdown = renderAuditMarkdown(report);
    expect(markdown).toContain("Taxonomy: CWE-78");
    expect(markdown).toContain("CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H");

    const sarif = parseSarif(renderAuditSarif(report));
    const shellResult = sarif.runs[0]!.results.find((result) => result.ruleId === "mcp-observatory/security/shell-injection");
    const shellRule = sarif.runs[0]!.tool.driver.rules.find((rule) => rule.id === "mcp-observatory/security/shell-injection");
    expect(shellResult?.properties?.["risk_taxonomy"]).toMatchObject({ cwe: ["CWE-78"], mitreAttack: ["T1059"] });
    expect(shellResult?.properties?.["tags"]).toEqual(expect.arrayContaining(["CWE-78", "T1059"]));
    expect(shellRule?.properties?.["risk_taxonomy"]).toMatchObject({ cwe: ["CWE-78"], mitreAttack: ["T1059"] });
    expect(shellRule?.properties?.["tags"]).toEqual(expect.arrayContaining(["CWE-78", "T1059"]));
  });

  it("surfaces taxonomy in code scanning SARIF rules and results", () => {
    const sarif = parseSarif(renderSarif(shellInjectionArtifact()));
    const shellResult = sarif.runs[0]!.results.find((result) => result.ruleId === "mcp-observatory/security/shell-injection");
    const shellRule = sarif.runs[0]!.tool.driver.rules.find((rule) => rule.id === "mcp-observatory/security/shell-injection");

    expect(shellResult?.properties?.["riskTaxonomy"]).toMatchObject({
      cwe: ["CWE-78"],
      mitreAttack: ["T1059"],
    });
    expect(shellResult?.properties?.["tags"]).toEqual(expect.arrayContaining(["CWE-78", "T1059"]));
    expect(shellRule?.properties?.["riskTaxonomy"]).toMatchObject({
      cwe: ["CWE-78"],
      mitreAttack: ["T1059"],
    });
    expect(shellRule?.properties?.["tags"]).toEqual(expect.arrayContaining(["CWE-78", "T1059"]));
  });
});
