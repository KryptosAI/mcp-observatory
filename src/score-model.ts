export type ScoreModelHealthGrade = "A" | "B" | "C" | "D" | "F";

export interface ScoreModelCheck {
  id: string;
  status: string;
}

export interface ScoreModelPerformanceMetrics {
  connectMs: number;
  toolsListMs?: number;
  promptsListMs?: number;
  resourcesListMs?: number;
  toolInvokeMs?: Record<string, number>;
}

export interface ScoreModelWeights {
  protocolCompliance: number;
  schemaQuality: number;
  security: number;
  reliability: number;
  performance: number;
}

export interface ScoreModelDimension {
  name: string;
  weight: number;
  score: number;
  details: string[];
}

export interface ScoreModelResult {
  overall: number;
  grade: ScoreModelHealthGrade;
  dimensions: ScoreModelDimension[];
}

export const DEFAULT_SCORE_MODEL_WEIGHTS: ScoreModelWeights = {
  protocolCompliance: 0.30,
  schemaQuality: 0.20,
  security: 0.20,
  reliability: 0.20,
  performance: 0.10,
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

export function gradeFromScoreModel(score: number): ScoreModelHealthGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function scoreDimension(
  name: string,
  weight: number,
  checks: ScoreModelCheck[],
  ids: string[],
): ScoreModelDimension {
  const matching = checks.filter((check) => ids.includes(check.id));
  if (matching.length === 0) return { name, weight, score: 50, details: ["No matching checks ran."] };
  const total = matching.reduce((sum, check) => sum + scoreForStatus(check.status), 0);
  const score = Math.round(total / matching.length);
  return {
    name,
    weight,
    score,
    details: matching.map((check) => `${check.id}: ${check.status} (${scoreForStatus(check.status)}/100)`),
  };
}

function scorePerformance(weight: number, metrics?: ScoreModelPerformanceMetrics): ScoreModelDimension {
  if (!metrics) return { name: "Performance", weight, score: 50, details: ["No performance data collected."] };

  const latencies: number[] = [];
  if (metrics.toolsListMs !== undefined) latencies.push(metrics.toolsListMs);
  if (metrics.promptsListMs !== undefined) latencies.push(metrics.promptsListMs);
  if (metrics.resourcesListMs !== undefined) latencies.push(metrics.resourcesListMs);
  if (metrics.toolInvokeMs) latencies.push(...Object.values(metrics.toolInvokeMs));

  if (latencies.length === 0) {
    const score = metrics.connectMs < 1000 ? 100 : metrics.connectMs < 3000 ? 70 : 40;
    return { name: "Performance", weight, score, details: [`Connect: ${Math.round(metrics.connectMs)}ms`] };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.min(Math.ceil(sorted.length * 0.95) - 1, sorted.length - 1);
  const p95 = sorted[p95Index] ?? 0;
  const score = p95 < 500 ? 100 : p95 < 1000 ? 80 : p95 < 2000 ? 60 : p95 < 5000 ? 40 : 20;
  return {
    name: "Performance",
    weight,
    score,
    details: [`Connect: ${Math.round(metrics.connectMs)}ms`, `p95 latency: ${Math.round(p95)}ms (${latencies.length} operations)`],
  };
}

export function computeScoreModel(
  checks: ScoreModelCheck[],
  performanceMetrics?: ScoreModelPerformanceMetrics,
  weights?: Partial<ScoreModelWeights>,
  securityCheckIds = ["security", "security-lite", "attack-sim"],
): ScoreModelResult {
  const w = { ...DEFAULT_SCORE_MODEL_WEIGHTS, ...weights };
  const dimensions = [
    scoreDimension("Protocol Compliance", w.protocolCompliance, checks, ["conformance"]),
    scoreDimension("Schema Quality", w.schemaQuality, checks, ["schema-quality"]),
    scoreDimension("Security", w.security, checks, securityCheckIds),
    scoreDimension("Reliability", w.reliability, checks, ["tools", "prompts", "resources", "tools-invoke"]),
    scorePerformance(w.performance, performanceMetrics),
  ];
  const overall = Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0));
  return { overall, grade: gradeFromScoreModel(overall), dimensions };
}
