import { describe, it, expect } from "vitest";
import { taxonomyForRule, taxonomyForFinding, taxonomyTags, RULE_TAXONOMY, CATEGORY_TAXONOMY } from "../src/risk-taxonomy.js";

describe("risk-taxonomy", () => {
  describe("taxonomyForRule", () => {
    it("returns CWE-78 + T1059 for shell-injection", () => {
      const t = taxonomyForRule("mcp-observatory/security/shell-injection");
      expect(t).toBeDefined();
      expect(t!.cwe).toContain("CWE-78");
      expect(t!.mitreAttack).toContain("T1059");
    });

    it("returns CWE-22 for broad-filesystem", () => {
      const t = taxonomyForRule("mcp-observatory/security/broad-filesystem");
      expect(t).toBeDefined();
      expect(t!.cwe).toContain("CWE-22");
    });

    it("returns CWE-20 for permissive-schema", () => {
      const t = taxonomyForRule("mcp-observatory/security/permissive-schema");
      expect(t).toBeDefined();
      expect(t!.cwe).toContain("CWE-20");
    });

    it("returns CWE-306 for no-auth-http", () => {
      const t = taxonomyForRule("mcp-observatory/security/no-auth-http");
      expect(t).toBeDefined();
      expect(t!.cwe).toContain("CWE-306");
    });

    it("returns CWE-200 + T1552 for credential-pattern", () => {
      const t = taxonomyForRule("mcp-observatory/security/credential-pattern");
      expect(t).toBeDefined();
      expect(t!.cwe).toContain("CWE-200");
      expect(t!.mitreAttack).toContain("T1552");
    });

    it("returns undefined for unknown rule with no category", () => {
      const t = taxonomyForRule("mcp-observatory/security/nonexistent-rule");
      expect(t).toBeUndefined();
    });

    it("falls back to category taxonomy for unknown rule with known category", () => {
      const t = taxonomyForRule("mcp-observatory/security/nonexistent", "schema-quality");
      expect(t).toBeDefined();
    });

    it("returns undefined for unknown rule with unknown category", () => {
      const t = taxonomyForRule("nonexistent", "nonexistent");
      expect(t).toBeUndefined();
    });
  });

  describe("taxonomyForFinding", () => {
    it("returns taxonomy for known rule", () => {
      const t = taxonomyForFinding({ ruleId: "mcp-observatory/security/shell-injection" });
      expect(t).toBeDefined();
      expect(t!.cwe).toContain("CWE-78");
    });

    it("falls back to category for unknown rule", () => {
      const t = taxonomyForFinding({ ruleId: "unknown", category: "schema-quality" });
      expect(t).toBeDefined();
    });
  });

  describe("taxonomyTags", () => {
    it("returns array of CWE + OWASP strings", () => {
      const t = taxonomyForRule("mcp-observatory/security/shell-injection");
      const tags = taxonomyTags(t!);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.some(t => t.includes("CWE-78"))).toBe(true);
    });

    it("returns empty array for undefined taxonomy", () => {
      expect(taxonomyTags(undefined)).toEqual([]);
    });
  });

  describe("RULE_TAXONOMY coverage", () => {
    it("has entries for core security rules", () => {
      expect(RULE_TAXONOMY).toHaveProperty("mcp-observatory/security/shell-injection");
      expect(RULE_TAXONOMY).toHaveProperty("mcp-observatory/security/broad-filesystem");
      expect(RULE_TAXONOMY).toHaveProperty("mcp-observatory/security/permissive-schema");
      expect(RULE_TAXONOMY).toHaveProperty("mcp-observatory/security/credential-pattern");
      expect(RULE_TAXONOMY).toHaveProperty("mcp-observatory/security/no-auth-http");
    });
  });

  describe("CATEGORY_TAXONOMY coverage", () => {
    it("has fallback entries", () => {
      expect(CATEGORY_TAXONOMY).toHaveProperty("schema-quality");
    });
  });
});
