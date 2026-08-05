import type { CheckResult, HealthGrade, HealthScore, PerformanceMetrics, ScoreDimension, TrustTier } from "./types.js";
import {
  computeScoreModel,
  DEFAULT_SCORE_MODEL_WEIGHTS,
  gradeFromScoreModel,
  type ScoreModelWeights,
} from "./score-model.js";

export type ScoreWeights = ScoreModelWeights;

export const DEFAULT_WEIGHTS: ScoreWeights = DEFAULT_SCORE_MODEL_WEIGHTS;

export function gradeFromScore(score: number): HealthGrade {
  return gradeFromScoreModel(score);
}

export function getTrustTier(score: number): TrustTier {
  if (score >= 90) return "platinum";
  if (score >= 80) return "gold";
  if (score >= 65) return "silver";
  if (score >= 50) return "bronze";
  return "unrated";
}

export function computeHealthScore(
  checks: CheckResult[],
  performanceMetrics?: PerformanceMetrics,
  weights?: Partial<ScoreWeights>,
): HealthScore {
  const result = computeScoreModel(checks, performanceMetrics, weights);
  return {
    overall: result.overall,
    grade: result.grade,
    dimensions: result.dimensions as ScoreDimension[],
  };
}
