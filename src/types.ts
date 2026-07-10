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
export type CheckId = "tools" | "prompts" | "resources" | "tools-invoke" | "security" | "security-lite" | "attack-sim" | "conformance" | "schema-quality" | "runtime-profile";

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
  /** Suppress known security findings by rule id, tool name, or toolName:ruleId. */
  securitySuppressions?: string[];
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
  /** Suppress known security findings by rule id, tool name, or toolName:ruleId. */
  securitySuppressions?: string[];
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
  findings?: Array<Record<string, unknown>>;
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
  runtimeProfile?: RuntimeProfile;
  fatalError?: string;
  notObserved?: NotObserved[];
}

export type HealthGrade = "A" | "B" | "C" | "D" | "F";

/** Safety Index score bucketed for at-a-glance communication (badges, CLI display). */
export type TrustTier = "platinum" | "gold" | "silver" | "bronze" | "unrated";

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

export interface NotObserved {
  category: string;
  detail: string;
  severity: "info" | "warning";
}

export interface EgressEntry {
  target: string;
  protocol: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

export interface StateMutation {
  resource: string;
  operation: string;
  scope: string;
  source: string;
}

export interface RuntimeProfile {
  egress?: EgressEntry[];
  stateMutations?: StateMutation[];
  analyzedAt: string;
  confidence: "high" | "medium" | "low";
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

export type SchemaDriftSeverity = "info" | "medium" | "high";

export interface SchemaDriftEntry {
  capability: CheckId;
  name: string;
  severity: SchemaDriftSeverity;
  changes: string[];
}

export interface ResponseChangeEntry {
  capability: CheckId;
  name: string;
  change: string;
}

export type PermissionDeltaRisk = "neutral" | "review" | "widening";

export interface PermissionDeltaEntry {
  capability: CheckId;
  name: string;
  risk: PermissionDeltaRisk;
  change: string;
  reason: string;
  field?: string;
}

export interface DiffSummary {
  regressions: number;
  recoveries: number;
  unchanged: number;
  added: number;
  removed: number;
  schemaDriftCount?: number;
  schemaDriftSeverityCounts?: Record<SchemaDriftSeverity, number>;
  responseChangeCount?: number;
  permissionDeltaCount?: number;
  permissionDeltaRiskCounts?: Record<PermissionDeltaRisk, number>;
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
  permissionDeltas?: PermissionDeltaEntry[];
}

// ── History / Trend Types ───────────────────────────────────────────────────

export interface HistoryEntry {
  date: string;
  targetId: string;
  healthScore: number;
  grade: HealthGrade;
  toolCount: number;
  promptCount: number;
  resourceCount: number;
  gate: Gate;
}

export interface HistoryFile {
  version: 1;
  entries: HistoryEntry[];
}

export interface TrendInfo {
  current: HistoryEntry;
  previous?: HistoryEntry;
  direction: "up" | "down" | "stable" | "new";
  delta: number;
}

// ── Lock File Types ─────────────────────────────────────────────────────────

export interface LockFileToolEntry {
  name: string;
  description?: string;
  inputSchema: object;
}

export interface LockFilePromptEntry {
  name: string;
  description?: string;
  arguments?: object[];
}

export interface LockFileResourceEntry {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface LockFileServerEntry {
  targetId: string;
  lockedAt: string;
  serverName?: string;
  serverVersion?: string;
  tools: LockFileToolEntry[];
  prompts: LockFilePromptEntry[];
  resources: LockFileResourceEntry[];
}

export interface LockFile {
  version: 1;
  lockedAt: string;
  servers: LockFileServerEntry[];
}

export interface LockDriftEntry {
  targetId: string;
  category: "tools" | "prompts" | "resources";
  name: string;
  change: string;
}

export interface LockVerifyResult {
  targetId: string;
  passed: boolean;
  drift: LockDriftEntry[];
}
