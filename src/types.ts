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
export type CheckId = "tools" | "prompts" | "resources" | "semantics";

export interface TargetConfig {
  targetId: string;
  adapter: "local-process";
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  metadata?: Record<string, string>;
}

export interface TargetSnapshot {
  targetId: string;
  adapter: TargetConfig["adapter"];
  command: string;
  args: string[];
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
  fatalError?: string;
}

export interface DiffEntry {
  id: CheckId;
  capability: CheckId;
  fromStatus?: CheckStatus;
  toStatus?: CheckStatus;
  message: string;
}

export interface DiffSummary {
  regressions: number;
  recoveries: number;
  unchanged: number;
  added: number;
  removed: number;
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
}
