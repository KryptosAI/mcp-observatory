export const SCHEMA_VERSION = "1.0.0";

export type ArtifactType = "run" | "diff";
export type Gate = "pass" | "fail";
export type CheckStatus =
  | "pass"
  | "fail"
  | "partial"
  | "unsupported"
  | "flaky"
  | "skipped";
export type CheckId = "tools" | "prompts" | "resources" | "tools-invoke" | "security" | "conformance" | "schema-quality";

export const STATUS_RANK: Record<CheckStatus, number> = {
  pass: 6, partial: 5, flaky: 4, unsupported: 3, skipped: 2, fail: 1
};

export interface LocalProcessTargetConfig {
  targetId: string;
  adapter: "local-process";
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  metadata?: Record<string, string>;
  /** Skip tool invocation checks for this target even with `scan deep`. */
  skipInvoke?: boolean;
}

export interface HttpTargetConfig {
  targetId: string;
  adapter: "http";
  url: string;
  authToken?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  metadata?: Record<string, string>;
  /** Skip tool invocation checks for this target even with `scan deep`. */
  skipInvoke?: boolean;
}

export type TargetConfig = LocalProcessTargetConfig | HttpTargetConfig;

export interface TargetSnapshot {
  targetId: string;
  adapter: TargetConfig["adapter"];
  command: string;
  args: string[];
  url?: string;
  cwd?: string;
  metadata?: Record<string, string>;
  serverVersion?: string;
  serverName?: string;
}

export interface EnvironmentSnapshot {
  platform: string;
  nodeVersion: string;
}

export interface EvidenceSummary {
  endpoint: string;
  advertised: boolean;
  responded: boolean;
  minimalShapePresent: boolean;
  itemCount?: number;
  identifiers?: string[];
  diagnostics?: string[];
  schemas?: Record<string, object>;
  responseSnapshots?: Record<string, unknown>;
}

export interface CheckResult {
  id: CheckId;
  capability: CheckId;
  status: CheckStatus;
  durationMs: number;
  message: string;
  evidence: EvidenceSummary[];
}

export interface StatusCounts {
  total: number;
  pass: number;
  fail: number;
  partial: number;
  unsupported: number;
  flaky: number;
  skipped: number;
}

export interface RunSummary extends StatusCounts {
  gate: Gate;
}

export interface RunArtifact {
  artifactType: "run";
  schemaVersion: typeof SCHEMA_VERSION;
  gate: Gate;
  runId: string;
  createdAt: string;
  toolVersion: string;
  target: TargetSnapshot;
  environment: EnvironmentSnapshot;
  summary: RunSummary;
  checks: CheckResult[];
  healthScore?: HealthScore;
  performanceMetrics?: PerformanceMetrics;
  fatalError?: string;
}

export type HealthGrade = "A" | "B" | "C" | "D" | "F";

export interface ScoreDimension {
  name: string;
  weight: number;
  score: number;
  details: string[];
}

export interface HealthScore {
  overall: number;
  grade: HealthGrade;
  dimensions: ScoreDimension[];
}

export interface PerformanceMetrics {
  connectMs: number;
  toolsListMs?: number;
  promptsListMs?: number;
  resourcesListMs?: number;
  toolInvokeMs?: Record<string, number>;
}

export interface DiffEntry {
  id: CheckId;
  capability: CheckId;
  fromStatus?: CheckStatus;
  toStatus?: CheckStatus;
  message: string;
}

export interface SchemaDriftEntry {
  capability: CheckId;
  name: string;
  changes: string[];
}

export interface ResponseChangeEntry {
  capability: CheckId;
  name: string;
  change: string;
}

export interface DiffSummary {
  regressions: number;
  recoveries: number;
  unchanged: number;
  added: number;
  removed: number;
  schemaDriftCount?: number;
  responseChangeCount?: number;
  gate: Gate;
}

export interface DiffArtifact {
  artifactType: "diff";
  schemaVersion: typeof SCHEMA_VERSION;
  gate: Gate;
  baseRunId: string;
  headRunId: string;
  createdAt: string;
  summary: DiffSummary;
  regressions: DiffEntry[];
  recoveries: DiffEntry[];
  unchanged: DiffEntry[];
  added: DiffEntry[];
  removed: DiffEntry[];
  schemaDrift?: SchemaDriftEntry[];
  responseChanges?: ResponseChangeEntry[];
}
