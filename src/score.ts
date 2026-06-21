// IMPORTANT: Scoring logic is duplicated in api/src/worker.ts for the Cloudflare Worker
// deployment (which can't import from src/). Keep both files in sync when making changes.

import type { CheckResult, HealthGrade, HealthScore, PerformanceMetrics, ScoreDimension } from "./types.js";

export interface ScoreWeights {
  protocolCompliance: number;
  schemaQuality: number;
  security: number;
  reliability: number;
  performance: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  protocolCompliance: 0.30, // Highest — spec compliance is foundational for interop
  schemaQuality: 0.20,      // Good schemas enable AI agents to use tools correctly
  security: 0.20,           // Parity with quality — both critical for production use
  reliability: 0.20,        // Tools/prompts/resources actually responding as expected
  performance: 0.10,        // Lowest — latency matters less than correctness
};

const STATUS_SCORES: Record<string, number> = {
  pass: 100,
  partial: 60,
  flaky: 40,
  unsupported: 50,
  skipped: 50,
  fail: 0,
};

function scoreForStatus(status: string): number {
  return STATUS_SCORES[status] ?? 0;
}

export function gradeFromScore(score: number): HealthGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function scoreDimension(
  name: string,
  weight: number,
  checks: CheckResult[],
  ids: string[],
): ScoreDimension {
  const matching = checks.filter(c => ids.includes(c.id));
  if (matching.length === 0) {
    return { name, weight, score: 50, details: ["No matching checks ran."] };
  }
  const total = matching.reduce((sum, c) => sum + scoreForStatus(c.status), 0);
  const score = Math.round(total / matching.length);
  const details = matching.map(c => `${c.id}: ${c.status} (${scoreForStatus(c.status)}/100)`);
  return { name, weight, score, details };
}

function scorePerformance(
  weight: number,
  metrics?: PerformanceMetrics,
): ScoreDimension {
  if (!metrics) {
    return { name: "Performance", weight, score: 50, details: ["No performance data collected."] };
  }

  const latencies: number[] = [];
  if (metrics.toolsListMs !== undefined) latencies.push(metrics.toolsListMs);
  if (metrics.promptsListMs !== undefined) latencies.push(metrics.promptsListMs);
  if (metrics.resourcesListMs !== undefined) latencies.push(metrics.resourcesListMs);
  if (metrics.toolInvokeMs) {
    for (const ms of Object.values(metrics.toolInvokeMs)) {
      latencies.push(ms);
    }
  }

  if (latencies.length === 0) {
    const connScore = metrics.connectMs < 1000 ? 100 : metrics.connectMs < 3000 ? 70 : 40;
    return { name: "Performance", weight, score: connScore, details: [`Connect: ${Math.round(metrics.connectMs)}ms`] };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.min(Math.ceil(sorted.length * 0.95) - 1, sorted.length - 1);
  const p95 = sorted[p95Index] ?? 0;

  // p95 latency thresholds for performance scoring
  // <500ms = excellent (100), <1s = good (80), <2s = acceptable (60), <5s = slow (40), >5s = poor (20)
  let score: number;
  if (p95 < 500) score = 100;
  else if (p95 < 1000) score = 80;
  else if (p95 < 2000) score = 60;
  else if (p95 < 5000) score = 40;
  else score = 20;

  const details = [
    `Connect: ${Math.round(metrics.connectMs)}ms`,
    `p95 latency: ${Math.round(p95)}ms (${latencies.length} operations)`,
  ];

  return { name: "Performance", weight, score, details };
}

export function computeHealthScore(
  checks: CheckResult[],
  performanceMetrics?: PerformanceMetrics,
  weights?: Partial<ScoreWeights>,
): HealthScore {
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  const dimensions: ScoreDimension[] = [
    scoreDimension("Protocol Compliance", w.protocolCompliance, checks, ["conformance"]),
    scoreDimension("Schema Quality", w.schemaQuality, checks, ["schema-quality"]),
    scoreDimension("Security", w.security, checks, ["security", "security-lite"]),
    scoreDimension("Reliability", w.reliability, checks, ["tools", "prompts", "resources", "tools-invoke"]),
    scorePerformance(w.performance, performanceMetrics),
  ];

  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  return {
    overall,
    grade: gradeFromScore(overall),
    dimensions,
  };
}
