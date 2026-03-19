import type { DiffArtifact, RunArtifact, TargetConfig } from "./types.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

export function validateTargetConfig(data: unknown): TargetConfig {
  if (!isObject(data)) {
    throw new Error("Target config must be a JSON object.");
  }

  const targetId = requireString(data, "targetId", "Target config");
  const adapter = requireString(data, "adapter", "Target config");
  if (adapter !== "local-process") {
    throw new Error(`Target config has unsupported adapter '${adapter}'. Only 'local-process' is supported.`);
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
    env: isObject(data["env"]) ? data["env"] as Record<string, string> : undefined,
    timeoutMs: typeof data["timeoutMs"] === "number" ? data["timeoutMs"] : undefined,
    metadata: isObject(data["metadata"]) ? data["metadata"] as Record<string, string> : undefined,
  };
}

export function validateRunArtifact(data: unknown): RunArtifact {
  if (!isObject(data)) {
    throw new Error("Expected a run artifact but got a non-object value.");
  }
  if (data["artifactType"] !== "run") {
    throw new Error(`Expected a run artifact but got artifactType='${String(data["artifactType"])}'.`);
  }
  requireString(data, "runId", "Run artifact");
  requireString(data, "createdAt", "Run artifact");
  requireString(data, "schemaVersion", "Run artifact");
  requireString(data, "toolVersion", "Run artifact");
  requireArray(data, "checks", "Run artifact");

  if (!isObject(data["target"])) {
    throw new Error("Run artifact is missing required field 'target'.");
  }
  if (!isObject(data["environment"])) {
    throw new Error("Run artifact is missing required field 'environment'.");
  }
  if (!isObject(data["summary"])) {
    throw new Error("Run artifact is missing required field 'summary'.");
  }

  return data as unknown as RunArtifact;
}

export function validateDiffArtifact(data: unknown): DiffArtifact {
  if (!isObject(data)) {
    throw new Error("Expected a diff artifact but got a non-object value.");
  }
  if (data["artifactType"] !== "diff") {
    throw new Error(`Expected a diff artifact but got artifactType='${String(data["artifactType"])}'.`);
  }
  requireString(data, "baseRunId", "Diff artifact");
  requireString(data, "headRunId", "Diff artifact");
  requireString(data, "createdAt", "Diff artifact");
  requireString(data, "schemaVersion", "Diff artifact");

  if (!isObject(data["summary"])) {
    throw new Error("Diff artifact is missing required field 'summary'.");
  }

  return data as unknown as DiffArtifact;
}
