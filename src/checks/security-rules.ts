export type Severity = "high" | "medium" | "low";

export interface SecurityFinding {
  ruleId: string;
  severity: Severity;
  toolName: string;
  message: string;
}

export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

export interface SecurityRule {
  id: string;
  severity: Severity;
  name: string;
  match: (tool: ToolInfo) => SecurityFinding | null;
}

const SHELL_PARAM_NAMES = new Set([
  "command", "cmd", "exec", "shell", "eval", "code", "script", "bash", "sh",
]);

const SHELL_DESC_PATTERNS = [
  /execut\w*\s+command/i,
  /run\s+(a\s+)?shell/i,
  /run\s+(a\s+)?command/i,
  /shell\s+command/i,
  /execute\s+arbitrary/i,
  /run\s+arbitrary/i,
];

const SHELL_NAME_PATTERNS = [
  /exec/i, /run_command/i, /shell/i, /evaluate/i,
];

function getPropertyNames(schema?: Record<string, unknown>): string[] {
  const props = schema?.["properties"];
  if (typeof props === "object" && props !== null && !Array.isArray(props)) {
    return Object.keys(props);
  }
  return [];
}

function getDescription(tool: ToolInfo): string {
  return tool.description ?? "";
}

export const SECURITY_RULES: SecurityRule[] = [
  {
    id: "shell-injection",
    severity: "high",
    name: "Shell injection surface",
    match(tool) {
      const paramNames = getPropertyNames(tool.inputSchema);
      const dangerousParam = paramNames.find(p => SHELL_PARAM_NAMES.has(p.toLowerCase()));
      if (dangerousParam) {
        return {
          ruleId: this.id,
          severity: this.severity,
          toolName: tool.name,
          message: `Tool "${tool.name}" has parameter "${dangerousParam}" which may allow arbitrary command execution.`,
        };
      }

      const desc = getDescription(tool);
      const descMatch = SHELL_DESC_PATTERNS.find(p => p.test(desc));
      if (descMatch) {
        return {
          ruleId: this.id,
          severity: this.severity,
          toolName: tool.name,
          message: `Tool "${tool.name}" description suggests command execution: "${desc.slice(0, 100)}".`,
        };
      }

      const nameMatch = SHELL_NAME_PATTERNS.find(p => p.test(tool.name));
      if (nameMatch) {
        return {
          ruleId: this.id,
          severity: this.severity,
          toolName: tool.name,
          message: `Tool "${tool.name}" name suggests command execution capability.`,
        };
      }

      return null;
    },
  },

  {
    id: "broad-filesystem",
    severity: "medium",
    name: "Broad filesystem access",
    match(tool) {
      const paramNames = getPropertyNames(tool.inputSchema);
      const fsParams = new Set(["path", "file", "filepath", "filename", "directory", "dir", "glob"]);
      const hasFsParam = paramNames.some(p => fsParams.has(p.toLowerCase()));
      if (!hasFsParam) return null;

      const readOnly = tool.annotations?.["readOnlyHint"];
      const destructive = tool.annotations?.["destructiveHint"];
      const desc = getDescription(tool).toLowerCase();
      const isDestructive =
        readOnly === false ||
        destructive === true ||
        /\b(write|delete|remove|overwrite|create|modify)\b/.test(desc);

      if (isDestructive) {
        return {
          ruleId: this.id,
          severity: this.severity,
          toolName: tool.name,
          message: `Tool "${tool.name}" accepts filesystem paths and has destructive capabilities.`,
        };
      }

      return null;
    },
  },

  {
    id: "permissive-schema",
    severity: "low",
    name: "Overly permissive schema",
    match(tool) {
      const schema = tool.inputSchema;
      const destructive = tool.annotations?.["destructiveHint"] === true;
      const notReadOnly = tool.annotations?.["readOnlyHint"] === false;
      const isDangerous = destructive || notReadOnly;

      if (!schema && isDangerous) {
        return {
          ruleId: this.id,
          severity: this.severity,
          toolName: tool.name,
          message: `Tool "${tool.name}" has no input schema but is marked as destructive.`,
        };
      }

      if (schema?.["additionalProperties"] === true && isDangerous) {
        return {
          ruleId: this.id,
          severity: this.severity,
          toolName: tool.name,
          message: `Tool "${tool.name}" accepts additional properties and is marked as destructive.`,
        };
      }

      const props = schema?.["properties"];
      if (schema && (!props || (typeof props === "object" && Object.keys(props).length === 0)) && isDangerous) {
        return {
          ruleId: this.id,
          severity: this.severity,
          toolName: tool.name,
          message: `Tool "${tool.name}" has an empty schema but is marked as destructive.`,
        };
      }

      return null;
    },
  },
];

/** Credential patterns to scan in tool response content. */
export const CREDENTIAL_PATTERNS = [
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "OpenAI API Key", pattern: /sk-[a-zA-Z0-9]{20,}/ },
  { name: "GitHub Token", pattern: /ghp_[a-zA-Z0-9]{36,}/ },
  { name: "Slack Token", pattern: /xox[bpas]-[a-zA-Z0-9-]+/ },
  { name: "Generic Secret", pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{8,}["']/i },
];
