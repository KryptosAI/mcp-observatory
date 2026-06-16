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

  // Structure validated above. The intermediate unknown cast is required because
  // TypeScript can't narrow Record<string, unknown> to a specific interface.
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
