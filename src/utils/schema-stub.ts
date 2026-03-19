/**
 * Generate minimal valid JSON from a JSON Schema inputSchema.
 * Used to construct arguments for safe tool invocation during health checks.
 */
export function stubFromSchema(schema: Record<string, unknown> | undefined): Record<string, unknown> {
  if (schema === undefined) {
    return {};
  }

  const required = Array.isArray(schema["required"]) ? (schema["required"] as string[]) : [];
  const properties = (schema["properties"] ?? {}) as Record<string, Record<string, unknown>>;

  if (required.length === 0) {
    return {};
  }

  const stub: Record<string, unknown> = {};
  for (const field of required) {
    const prop = properties[field];
    stub[field] = stubValue(prop);
  }
  return stub;
}

function stubValue(prop: Record<string, unknown> | undefined): unknown {
  if (prop === undefined) {
    return "";
  }
  switch (prop["type"]) {
    case "string":
      return "";
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

/**
 * Returns true if a tool is safe to invoke during health checks:
 * - Has no required parameters, OR
 * - Has readOnlyHint annotation set to true
 */
export function isSafeToInvoke(tool: {
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}): boolean {
  const annotations = tool.annotations;
  if (annotations?.["readOnlyHint"] === true) {
    return true;
  }

  const schema = tool.inputSchema;
  if (schema === undefined) {
    return true;
  }

  const required = schema["required"];
  if (!Array.isArray(required) || required.length === 0) {
    return true;
  }

  return false;
}
