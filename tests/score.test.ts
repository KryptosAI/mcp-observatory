import { describe, expect, it } from "vitest";

import { computeHealthScore, getTrustTier, gradeFromScore } from "../src/score.js";
import type { CheckResult, PerformanceMetrics } from "../src/types.js";

function makeCheck(id: string, status: string): CheckResult {
  return {
    id: id as CheckResult["id"],
    capability: id as CheckResult["capability"],
    status: status as CheckResult["status"],
    durationMs: 100,
    message: `${id} ${status}`,
    evidence: [],
  };
}

describe("gradeFromScore", () => {
  it("returns correct grades", () => {
    expect(gradeFromScore(95)).toBe("A");
    expect(gradeFromScore(90)).toBe("A");
    expect(gradeFromScore(85)).toBe("B");
    expect(gradeFromScore(80)).toBe("B");
    expect(gradeFromScore(75)).toBe("C");
    expect(gradeFromScore(65)).toBe("D");
    expect(gradeFromScore(55)).toBe("F");
    expect(gradeFromScore(0)).toBe("F");
  });
});

describe("getTrustTier", () => {
  it("buckets scores into tiers at the documented thresholds", () => {
    expect(getTrustTier(100)).toBe("platinum");
    expect(getTrustTier(92)).toBe("platinum");
    expect(getTrustTier(90)).toBe("platinum"); // boundary
    expect(getTrustTier(89)).toBe("gold");
    expect(getTrustTier(81)).toBe("gold");
    expect(getTrustTier(80)).toBe("gold"); // boundary
    expect(getTrustTier(79)).toBe("silver");
    expect(getTrustTier(67)).toBe("silver");
    expect(getTrustTier(65)).toBe("silver"); // boundary
    expect(getTrustTier(64)).toBe("bronze");
    expect(getTrustTier(52)).toBe("bronze");
    expect(getTrustTier(50)).toBe("bronze"); // boundary
    expect(getTrustTier(49)).toBe("unrated");
    expect(getTrustTier(30)).toBe("unrated");
    expect(getTrustTier(0)).toBe("unrated");
  });
});

describe("computeHealthScore", () => {
  it("scores all-pass checks highly", () => {
    const checks = [
      makeCheck("tools", "pass"),
      makeCheck("prompts", "pass"),
      makeCheck("resources", "pass"),
      makeCheck("tools-invoke", "pass"),
      makeCheck("security", "pass"),
      makeCheck("conformance", "pass"),
      makeCheck("schema-quality", "pass"),
    ];
    const score = computeHealthScore(checks);
    expect(score.overall).toBeGreaterThanOrEqual(90);
    expect(score.grade).toBe("A");
    expect(score.dimensions).toHaveLength(5);
  });

  it("scores all-fail checks low", () => {
    const checks = [
      makeCheck("tools", "fail"),
      makeCheck("prompts", "fail"),
      makeCheck("resources", "fail"),
      makeCheck("security", "fail"),
      makeCheck("conformance", "fail"),
      makeCheck("schema-quality", "fail"),
    ];
    const score = computeHealthScore(checks);
    expect(score.overall).toBeLessThanOrEqual(10);
    expect(score.grade).toBe("F");
  });

  it("handles mixed statuses", () => {
    const checks = [
      makeCheck("tools", "pass"),
      makeCheck("prompts", "pass"),
      makeCheck("resources", "partial"),
      makeCheck("security", "partial"),
      makeCheck("conformance", "pass"),
      makeCheck("schema-quality", "fail"),
    ];
    const score = computeHealthScore(checks);
    expect(score.overall).toBeGreaterThan(30);
    expect(score.overall).toBeLessThan(90);
  });

  it("counts security-lite as a security signal", () => {
    const checks = [
      makeCheck("tools", "pass"),
      makeCheck("prompts", "pass"),
      makeCheck("resources", "pass"),
      makeCheck("conformance", "pass"),
      makeCheck("schema-quality", "pass"),
      makeCheck("security-lite", "pass"),
    ];
    const score = computeHealthScore(checks);
    const security = score.dimensions.find((dimension) => dimension.name === "Security");
    expect(security?.score).toBe(100);
    expect(security?.details).toContain("security-lite: pass (100/100)");
  });

  it("lowers the security dimension when security-lite fails", () => {
    const checks = [
      makeCheck("tools", "pass"),
      makeCheck("prompts", "pass"),
      makeCheck("resources", "pass"),
      makeCheck("conformance", "pass"),
      makeCheck("schema-quality", "pass"),
      makeCheck("security-lite", "fail"),
    ];
    const score = computeHealthScore(checks);
    const security = score.dimensions.find((dimension) => dimension.name === "Security");
    expect(security?.score).toBe(0);
    expect(score.overall).toBeLessThan(90);
  });

  it("averages deep security and security-lite when both run", () => {
    const checks = [
      makeCheck("security", "pass"),
      makeCheck("security-lite", "partial"),
      makeCheck("conformance", "pass"),
      makeCheck("schema-quality", "pass"),
      makeCheck("tools", "pass"),
    ];
    const score = computeHealthScore(checks);
    const security = score.dimensions.find((dimension) => dimension.name === "Security");
    expect(security?.score).toBe(80);
  });

  it("handles missing checks gracefully", () => {
    const checks = [
      makeCheck("tools", "pass"),
      makeCheck("prompts", "pass"),
    ];
    const score = computeHealthScore(checks);
    expect(score.overall).toBeGreaterThan(0);
    expect(score.dimensions).toHaveLength(5);
  });

  it("uses performance metrics when provided", () => {
    const checks = [
      makeCheck("tools", "pass"),
      makeCheck("conformance", "pass"),
      makeCheck("schema-quality", "pass"),
      makeCheck("security", "pass"),
    ];
    const fastMetrics: PerformanceMetrics = {
      connectMs: 50,
      toolsListMs: 100,
      promptsListMs: 80,
    };
    const slowMetrics: PerformanceMetrics = {
      connectMs: 5000,
      toolsListMs: 8000,
      promptsListMs: 6000,
    };
    const fastScore = computeHealthScore(checks, fastMetrics);
    const slowScore = computeHealthScore(checks, slowMetrics);
    expect(fastScore.overall).toBeGreaterThan(slowScore.overall);
  });

  it("accepts custom weights", () => {
    const checks = [
      makeCheck("security", "fail"),
      makeCheck("conformance", "pass"),
      makeCheck("schema-quality", "pass"),
      makeCheck("tools", "pass"),
    ];
    const highSecurity = computeHealthScore(checks, undefined, { security: 0.80, protocolCompliance: 0.05, schemaQuality: 0.05, reliability: 0.05, performance: 0.05 });
    const lowSecurity = computeHealthScore(checks, undefined, { security: 0.05, protocolCompliance: 0.30, schemaQuality: 0.25, reliability: 0.25, performance: 0.15 });
    expect(highSecurity.overall).toBeLessThan(lowSecurity.overall);
  });
});
