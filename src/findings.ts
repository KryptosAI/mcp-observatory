import type { CheckId, CheckResult, CheckStatus, RunArtifact } from "./types.js";

export type ObservatoryFindingSeverity = "high" | "medium" | "low" | "info";

export interface ObservatoryFindingSubject {
  type: "target" | "tool" | "prompt" | "resource" | "check";
  name?: string;
}

export interface ObservatoryFinding {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: ObservatoryFindingSeverity;
  category: string;
  checkId: CheckId;
  subject: ObservatoryFindingSubject;
  recommendation?: string;
  controlRefs: string[];
  evidence?: Record<string, unknown>;
}

const SECURITY_CONTROL_REFS: Record<string, string[]> = {
  "shell-injection": ["mcp-observatory:tool-safety", "mcp-observatory:command-execution"],
  "broad-filesystem": ["mcp-observatory:tool-safety", "mcp-observatory:filesystem-access"],
  "permissive-schema": ["mcp-observatory:schema-quality", "mcp-observatory:least-privilege"],
  "credential-pattern": ["mcp-observatory:data-exposure", "mcp-observatory:secret-handling"],
  "no-auth-http": ["mcp-observatory:transport-security", "mcp-observatory:authentication"],
};

const SECURITY_RECOMMENDATIONS: Record<string, string> = {
  "shell-injection": "Constrain command execution tools with strict allowlists, typed inputs, and clear destructive annotations.",
  "broad-filesystem": "Narrow filesystem scope, prefer read-only access, and document destructive behavior explicitly.",
  "permissive-schema": "Use a strict input schema and avoid accepting arbitrary properties for destructive tools.",
  "credential-pattern": "Redact secrets from tool responses and move credentials into environment or secret storage.",
  "no-auth-http": "Require authentication for HTTP MCP targets before exposing them to shared networks.",
};

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function toText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function severityFromStatus(status: CheckStatus): ObservatoryFindingSeverity {
  if (status === "fail") return "high";
  if (status === "partial" || status === "flaky") return "medium";
  return "info";
}

function normalizeSecuritySeverity(value: unknown, fallback: CheckStatus): ObservatoryFindingSeverity {
  if (value === "high" || value === "medium" || value === "low") return value;
  return severityFromStatus(fallback);
}

function normalizeQualitySeverity(value: unknown): ObservatoryFindingSeverity {
  return value === "warning" ? "medium" : "info";
}

function findingId(parts: {
  targetId: string;
  checkId: CheckId;
  ruleId: string;
  subjectName?: string;
  message: string;
  index: number;
}): string {
  const input = [
    parts.targetId,
    parts.checkId,
    parts.ruleId,
    parts.subjectName ?? "",
    parts.message,
    String(parts.index),
  ].join("\n");
  return `mcp-observatory/${parts.checkId}/${parts.ruleId}/${stableHash(input)}`;
}

function stripDiagnosticSeverity(diagnostic: string): { severity?: ObservatoryFindingSeverity; message: string } {
  if (!diagnostic.startsWith("[")) return { message: diagnostic };
  const end = diagnostic.indexOf("]");
  if (end <= 1 || end > 16) return { message: diagnostic };
  const raw = diagnostic.slice(1, end).toLowerCase();
  if (!["high", "medium", "low", "warning", "info", "error", "note"].includes(raw)) {
    return { message: diagnostic };
  }
  const message = diagnostic.slice(end + 1).trimStart();
  if (!message) return { message: diagnostic };
  const severity = raw === "high" || raw === "error" ? "high"
    : raw === "medium" || raw === "warning" ? "medium"
    : raw === "low" ? "low"
    : "info";
  return { severity, message };
}

function securityFindingFromRecord(
  artifact: RunArtifact,
  check: CheckResult,
  record: Record<string, unknown>,
  index: number,
): ObservatoryFinding | undefined {
  const ruleName = toText(record["ruleId"]) ?? "security";
  const message = toText(record["message"]);
  if (!message) return undefined;
  const toolName = toText(record["toolName"]) ?? artifact.target.targetId;
  return {
    id: findingId({
      targetId: artifact.target.targetId,
      checkId: check.id,
      ruleId: ruleName,
      subjectName: toolName,
      message,
      index,
    }),
    ruleId: `mcp-observatory/security/${ruleName}`,
    title: `Security: ${ruleName}`,
    message,
    severity: normalizeSecuritySeverity(record["severity"], check.status),
    category: "security",
    checkId: check.id,
    subject: {
      type: toolName === "(target)" ? "target" : "tool",
      name: toolName === "(target)" ? artifact.target.targetId : toolName,
    },
    recommendation: SECURITY_RECOMMENDATIONS[ruleName],
    controlRefs: SECURITY_CONTROL_REFS[ruleName] ?? ["mcp-observatory:security"],
    evidence: record,
  };
}

function qualityFindingFromRecord(
  artifact: RunArtifact,
  check: CheckResult,
  record: Record<string, unknown>,
  index: number,
): ObservatoryFinding | undefined {
  const itemType = toText(record["itemType"]);
  const itemName = toText(record["itemName"]) ?? artifact.target.targetId;
  const issue = toText(record["issue"]);
  if (!itemType || !issue) return undefined;
  const normalizedItemType = itemType === "tool" || itemType === "prompt" || itemType === "resource"
    ? itemType
    : "check";
  const ruleName = `schema-${issue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "quality"}`;
  const message = `${itemType} "${itemName}": ${issue}`;
  return {
    id: findingId({
      targetId: artifact.target.targetId,
      checkId: check.id,
      ruleId: ruleName,
      subjectName: itemName,
      message,
      index,
    }),
    ruleId: `mcp-observatory/schema-quality/${ruleName}`,
    title: `Schema quality: ${issue}`,
    message,
    severity: normalizeQualitySeverity(record["severity"]),
    category: "schema-quality",
    checkId: check.id,
    subject: { type: normalizedItemType, name: itemName },
    recommendation: "Add clear names, descriptions, and strict JSON schema metadata so agents can call the MCP server safely.",
    controlRefs: ["mcp-observatory:schema-quality", "mcp-observatory:agent-readiness"],
    evidence: record,
  };
}

function diagnosticFindings(artifact: RunArtifact, check: CheckResult, diagnostics: string[]): ObservatoryFinding[] {
  return diagnostics.map((diagnostic, index) => {
    const parsed = stripDiagnosticSeverity(diagnostic);
    const ruleName = check.id === "schema-quality" ? "schema-diagnostic"
      : check.id === "security" || check.id === "security-lite" ? "security-diagnostic"
      : "diagnostic";
    return {
      id: findingId({
        targetId: artifact.target.targetId,
        checkId: check.id,
        ruleId: ruleName,
        message: parsed.message,
        index,
      }),
      ruleId: `mcp-observatory/${check.id}/${ruleName}`,
      title: `${check.id}: diagnostic`,
      message: parsed.message,
      severity: parsed.severity ?? severityFromStatus(check.status),
      category: check.id,
      checkId: check.id,
      subject: { type: "check", name: check.id },
      recommendation: "Review the check output and update the MCP server or target configuration before release.",
      controlRefs: [`mcp-observatory:${check.id}`],
      evidence: { diagnostic },
    };
  });
}

function genericCheckFinding(artifact: RunArtifact, check: CheckResult): ObservatoryFinding {
  const ruleName = `${check.id}-${check.status}`;
  return {
    id: findingId({
      targetId: artifact.target.targetId,
      checkId: check.id,
      ruleId: ruleName,
      message: check.message,
      index: 0,
    }),
    ruleId: `mcp-observatory/${check.id}/${check.status}`,
    title: `${check.id}: ${check.status}`,
    message: check.message,
    severity: severityFromStatus(check.status),
    category: check.id,
    checkId: check.id,
    subject: { type: "check", name: check.id },
    recommendation: "Fix the failing MCP Observatory check or document why this release should proceed.",
    controlRefs: [`mcp-observatory:${check.id}`],
  };
}

export function extractObservatoryFindings(artifact: RunArtifact): ObservatoryFinding[] {
  const findings: ObservatoryFinding[] = [];

  for (const check of artifact.checks) {
    let addedStructured = false;
    for (const evidence of check.evidence) {
      const records = evidence.findings ?? [];
      for (const [index, record] of records.entries()) {
        const finding = check.id === "security" || check.id === "security-lite"
          ? securityFindingFromRecord(artifact, check, record, index)
          : check.id === "schema-quality"
            ? qualityFindingFromRecord(artifact, check, record, index)
            : undefined;
        if (finding) {
          findings.push(finding);
          addedStructured = true;
        }
      }
    }

    if (!addedStructured) {
      const diagnostics = check.evidence.flatMap((evidence) => evidence.diagnostics ?? []);
      if (diagnostics.length > 0) {
        findings.push(...diagnosticFindings(artifact, check, diagnostics));
        continue;
      }
    }

    if (!addedStructured && check.status !== "pass" && check.status !== "skipped" && check.status !== "unsupported") {
      findings.push(genericCheckFinding(artifact, check));
    }
  }

  if (artifact.fatalError) {
    findings.push({
      id: findingId({
        targetId: artifact.target.targetId,
        checkId: "conformance",
        ruleId: "fatal-error",
        message: artifact.fatalError,
        index: 0,
      }),
      ruleId: "mcp-observatory/run/fatal-error",
      title: "Run failed before MCP checks completed",
      message: artifact.fatalError.split("\n")[0] ?? "Run failed before MCP checks completed.",
      severity: "high",
      category: "runtime",
      checkId: "conformance",
      subject: { type: "target", name: artifact.target.targetId },
      recommendation: "Fix the startup or transport failure before relying on this MCP server in CI.",
      controlRefs: ["mcp-observatory:runtime-readiness"],
    });
  }

  return findings;
}
