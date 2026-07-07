import type {
  CheckResult,
  CheckStatus,
  DiffArtifact,
  DiffEntry,
  DiffSummary,
  EnvironmentSnapshot,
  EvidenceSummary,
  Gate,
  HealthScore,
  PerformanceMetrics,
  ResponseChangeEntry,
  RunArtifact,
  RunSummary,
  SchemaDriftEntry,
  TargetConfig,
  TargetSnapshot,
  SCHEMA_VERSION,
} from "./types.js";

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function requireString(obj: Record<string, unknown>, field: string, label: string): string {
  const value = obj[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is missing required field '${field}'.`);
  }
  return value;
}

function requireArray(obj: Record<string, unknown>, field: string, label: string): unknown[] {
  const value = obj[field];
  if (!Array.isArray(value)) {
    throw new Error(`${label} is missing required field '${field}' (expected an array).`);
  }
  return value;
}

function optionalNumber(obj: Record<string, unknown>, field: string, label: string): number | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}.${field} must be a finite number.`);
  }
  return value;
}

function requireNumber(obj: Record<string, unknown>, field: string, label: string): number {
  const value = optionalNumber(obj, field, label);
  if (value === undefined) {
    throw new Error(`${label} is missing required field '${field}'.`);
  }
  return value;
}

function requireGate(value: unknown, label: string): Gate {
  if (value !== "pass" && value !== "fail") {
    throw new Error(`${label} has invalid gate '${String(value)}'.`);
  }
  return value;
}

function requireStatus(value: unknown, label: string): CheckStatus {
  const statuses = new Set(["pass", "fail", "partial", "unsupported", "flaky", "skipped"]);
  if (typeof value !== "string" || !statuses.has(value)) {
    throw new Error(`${label} has invalid status '${String(value)}'.`);
  }
  return value as CheckStatus;
}

function requireCheckId(value: unknown, label: string): string {
  const ids = new Set(["tools", "prompts", "resources", "tools-invoke", "security", "security-lite", "attack-sim", "conformance", "schema-quality"]);
  if (typeof value !== "string" || !ids.has(value)) {
    throw new Error(`${label} has invalid check id '${String(value)}'.`);
  }
  return value;
}

function validateRunSummary(value: unknown): RunSummary {
  if (!isObject(value)) {
    throw new Error("Run artifact is missing required field 'summary'.");
  }
  const gate = requireGate(value["gate"], "Run artifact summary");
  return {
    gate,
    total: requireNumber(value, "total", "Run artifact summary"),
    pass: requireNumber(value, "pass", "Run artifact summary"),
    fail: requireNumber(value, "fail", "Run artifact summary"),
    partial: requireNumber(value, "partial", "Run artifact summary"),
    unsupported: requireNumber(value, "unsupported", "Run artifact summary"),
    flaky: requireNumber(value, "flaky", "Run artifact summary"),
    skipped: requireNumber(value, "skipped", "Run artifact summary"),
  };
}

function validateCheck(value: unknown, index: number): CheckResult {
  if (!isObject(value)) {
    throw new Error(`Run artifact checks[${index}] must be an object.`);
  }
  const id = requireCheckId(value["id"], `Run artifact checks[${index}]`);
  const capability = requireCheckId(value["capability"], `Run artifact checks[${index}] capability`);
  const status = requireStatus(value["status"], `Run artifact checks[${index}]`);
  return {
    id: id as CheckResult["id"],
    capability: capability as CheckResult["capability"],
    status,
    durationMs: requireNumber(value, "durationMs", `Run artifact checks[${index}]`),
    message: requireString(value, "message", `Run artifact checks[${index}]`),
    evidence: (Array.isArray(value["evidence"]) ? value["evidence"].filter(isObject) : []) as unknown as EvidenceSummary[],
  };
}

function expandEnvValue(value: string, label: string): string {
  const match =
    value.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/) ??
    value.match(/^\$([A-Za-z_][A-Za-z0-9_]*)$/) ??
    value.match(/^env:([A-Za-z_][A-Za-z0-9_]*)$/);
  if (!match) return value;
  const name = match[1]!;
  const envValue = process.env[name];
  if (envValue === undefined) {
    throw new Error(`${label} references missing environment variable '${name}'.`);
  }
  return envValue;
}

function optionalStringRecord(value: unknown, label: string, expand = false): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value)) {
    throw new Error(`${label} must be an object with string values.`);
  }
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "string") {
      throw new Error(`${label}.${key} must be a string.`);
    }
    result[key] = expand ? expandEnvValue(raw, `${label}.${key}`) : raw;
  }
  return result;
}

function optionalStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of strings.`);
  }
  return value.map((entry, i) => {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${label}[${i}] must be a non-empty string.`);
    }
    return entry;
  });
}

export function validateTargetConfig(data: unknown): TargetConfig {
  if (!isObject(data)) {
    throw new Error("Target config must be a JSON object.");
  }

  const targetId = requireString(data, "targetId", "Target config");
  const adapter = requireString(data, "adapter", "Target config");

  if (adapter === "http") {
    const url = requireString(data, "url", "Target config");
    return {
      targetId,
      adapter: "http",
      url,
      authToken: typeof data["authToken"] === "string" ? expandEnvValue(data["authToken"], "Target config authToken") : undefined,
      headers: optionalStringRecord(data["headers"], "Target config headers", true),
      timeoutMs: typeof data["timeoutMs"] === "number" ? data["timeoutMs"] : undefined,
      metadata: optionalStringRecord(data["metadata"], "Target config metadata"),
      securitySuppressions: optionalStringArray(data["securitySuppressions"], "Target config securitySuppressions"),
      skipInvoke: data["skipInvoke"] === true ? true : undefined,
    };
  }

  if (adapter !== "local-process") {
    throw new Error(`Target config has unsupported adapter '${adapter}'. Supported: 'local-process', 'http'.`);
  }

  const command = requireString(data, "command", "Target config");
  const argsRaw = requireArray(data, "args", "Target config");
  const args = argsRaw.map((arg, i) => {
    if (typeof arg !== "string") {
      throw new Error(`Target config args[${i}] must be a string.`);
    }
    return arg;
  });

  return {
    targetId,
    adapter,
    command,
    args,
    cwd: typeof data["cwd"] === "string" ? data["cwd"] : undefined,
    env: optionalStringRecord(data["env"], "Target config env", true),
    timeoutMs: typeof data["timeoutMs"] === "number" ? data["timeoutMs"] : undefined,
    metadata: optionalStringRecord(data["metadata"], "Target config metadata"),
    securitySuppressions: optionalStringArray(data["securitySuppressions"], "Target config securitySuppressions"),
    skipInvoke: data["skipInvoke"] === true ? true : undefined,
  };
}

export function validateRunArtifact(data: unknown): RunArtifact {
  if (!isObject(data)) {
    throw new Error("Expected a run artifact but got a non-object value.");
  }
  if (data["artifactType"] !== "run") {
    throw new Error(`Expected a run artifact but got artifactType='${String(data["artifactType"])}'.`);
  }

  const runId = requireString(data, "runId", "Run artifact");
  const createdAt = requireString(data, "createdAt", "Run artifact");
  const schemaVersion = requireString(data, "schemaVersion", "Run artifact");
  const toolVersion = requireString(data, "toolVersion", "Run artifact");
  const gate = requireGate(data["gate"], "Run artifact");

  if (!isObject(data["target"])) {
    throw new Error("Run artifact is missing required field 'target'.");
  }
  const target: TargetSnapshot = {
    targetId: requireString(data["target"], "targetId", "Run artifact target"),
    adapter: requireString(data["target"], "adapter", "Run artifact target") as TargetSnapshot["adapter"],
    command: typeof data["target"]["command"] === "string" ? data["target"]["command"] : "",
    args: isStringArray(data["target"]["args"]) ? data["target"]["args"].filter((a): a is string => typeof a === "string") : [],
    url: typeof data["target"]["url"] === "string" ? data["target"]["url"] : undefined,
    cwd: typeof data["target"]["cwd"] === "string" ? data["target"]["cwd"] : undefined,
    metadata: optionalStringRecord(data["target"]["metadata"], "Run artifact target metadata"),
    serverVersion: typeof data["target"]["serverVersion"] === "string" ? data["target"]["serverVersion"] : undefined,
    serverName: typeof data["target"]["serverName"] === "string" ? data["target"]["serverName"] : undefined,
  };

  if (!isObject(data["environment"])) {
    throw new Error("Run artifact is missing required field 'environment'.");
  }
  const environment: EnvironmentSnapshot = {
    platform: requireString(data["environment"], "platform", "Run artifact environment"),
    nodeVersion: requireString(data["environment"], "nodeVersion", "Run artifact environment"),
  };

  const summary = validateRunSummary(data["summary"]);
  const checksRaw = requireArray(data, "checks", "Run artifact");
  const checks: CheckResult[] = checksRaw.map((c, i) => validateCheck(c, i));

  const healthScore: HealthScore | undefined = isObject(data["healthScore"])
    ? data["healthScore"] as unknown as HealthScore
    : undefined;

  const performanceMetrics: PerformanceMetrics | undefined = isObject(data["performanceMetrics"])
    ? data["performanceMetrics"] as unknown as PerformanceMetrics
    : undefined;

  const fatalError: string | undefined = typeof data["fatalError"] === "string" ? data["fatalError"] : undefined;

  return {
    artifactType: "run",
    schemaVersion: schemaVersion as typeof SCHEMA_VERSION,
    gate,
    runId,
    createdAt,
    toolVersion,
    target,
    environment,
    summary,
    checks,
    healthScore,
    performanceMetrics,
    fatalError,
  };
}

export function validateDiffArtifact(data: unknown): DiffArtifact {
  if (!isObject(data)) {
    throw new Error("Expected a diff artifact but got a non-object value.");
  }
  if (data["artifactType"] !== "diff") {
    throw new Error(`Expected a diff artifact but got artifactType='${String(data["artifactType"])}'.`);
  }

  const baseRunId = requireString(data, "baseRunId", "Diff artifact");
  const headRunId = requireString(data, "headRunId", "Diff artifact");
  const createdAt = requireString(data, "createdAt", "Diff artifact");
  const schemaVersion = requireString(data, "schemaVersion", "Diff artifact");
  const gate = requireGate(data["gate"], "Diff artifact");

  const summaryObj = data["summary"];
  if (!isObject(summaryObj)) {
    throw new Error("Diff artifact is missing required field 'summary'.");
  }
  const summary: DiffSummary = {
    regressions: requireNumber(summaryObj, "regressions", "Diff artifact summary"),
    recoveries: requireNumber(summaryObj, "recoveries", "Diff artifact summary"),
    unchanged: requireNumber(summaryObj, "unchanged", "Diff artifact summary"),
    added: requireNumber(summaryObj, "added", "Diff artifact summary"),
    removed: requireNumber(summaryObj, "removed", "Diff artifact summary"),
    schemaDriftCount: optionalNumber(summaryObj, "schemaDriftCount", "Diff artifact summary"),
    responseChangeCount: optionalNumber(summaryObj, "responseChangeCount", "Diff artifact summary"),
    gate: requireGate(summaryObj["gate"], "Diff artifact summary"),
  };

  const regressions = Array.isArray(data["regressions"]) ? (data["regressions"] as DiffEntry[]) : [];
  const recoveries = Array.isArray(data["recoveries"]) ? (data["recoveries"] as DiffEntry[]) : [];
  const unchanged = Array.isArray(data["unchanged"]) ? (data["unchanged"] as DiffEntry[]) : [];
  const added = Array.isArray(data["added"]) ? (data["added"] as DiffEntry[]) : [];
  const removed = Array.isArray(data["removed"]) ? (data["removed"] as DiffEntry[]) : [];
  const schemaDrift = Array.isArray(data["schemaDrift"]) ? (data["schemaDrift"] as SchemaDriftEntry[]) : undefined;
  const responseChanges = Array.isArray(data["responseChanges"]) ? (data["responseChanges"] as ResponseChangeEntry[]) : undefined;

  return {
    artifactType: "diff",
    schemaVersion: schemaVersion as typeof SCHEMA_VERSION,
    gate,
    baseRunId,
    headRunId,
    createdAt,
    summary,
    regressions,
    recoveries,
    unchanged,
    added,
    removed,
    schemaDrift,
    responseChanges,
  };
}
