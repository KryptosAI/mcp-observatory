import { performance } from "node:perf_hooks";

import type { Prompt, Resource, ResourceTemplate, Tool } from "@modelcontextprotocol/sdk/types.js";

import type { CheckResult, EvidenceSummary, RunArtifact } from "../types.js";
import { CREDENTIAL_PATTERNS } from "./security-rules.js";
import { isCapabilityAdvertised, makeCheckResult, type CheckContext, type ObservedCheck } from "./base.js";

export type AttackClass =
  | "tool-poisoning"
  | "exfiltration-canary"
  | "permission-boundary"
  | "contract-drift";

export type AttackFindingSeverity = "high" | "medium" | "low";

export interface AttackSimulationFinding {
  ruleId: string;
  attackClass: AttackClass;
  severity: AttackFindingSeverity;
  itemType: "target" | "tool" | "prompt" | "resource" | "schema" | "response";
  itemName: string;
  message: string;
  evidence: Record<string, unknown>;
  recommendation: string;
}

export interface AttackSimulationOptions {
  baseline?: RunArtifact;
}

interface ListedSurfaces {
  tools: Tool[];
  prompts: Prompt[];
  resources: Resource[];
  resourceTemplates: ResourceTemplate[];
}

const POISONING_PATTERNS: Array<{ id: string; severity: AttackFindingSeverity; pattern: RegExp; label: string }> = [
  { id: "hidden-instruction", severity: "high", pattern: /\b(ignore|override|bypass)\b.{0,80}\b(previous|system|developer|user)\b.{0,80}\b(instruction|prompt|message|policy)s?\b/i, label: "hidden instruction override" },
  { id: "secret-exfiltration-instruction", severity: "high", pattern: /\b(send|post|upload|exfiltrate|leak|copy)\b.{0,80}\b(secret|token|api[_ -]?key|credential|password|env|environment)\b/i, label: "secret exfiltration instruction" },
  { id: "stealth-instruction", severity: "high", pattern: /\b(do not|don't)\b.{0,60}\b(tell|reveal|mention|disclose)\b.{0,80}\b(user|operator|developer|maintainer)\b/i, label: "stealth instruction" },
  { id: "agent-behavior-control", severity: "medium", pattern: /\b(always|must|before answering|when called)\b.{0,80}\b(call|invoke|use|execute)\b.{0,80}\btool\b/i, label: "agent behavior control" },
  { id: "remote-fetch-instruction", severity: "medium", pattern: /\b(fetch|download|curl|wget|open url|visit)\b.{0,80}\b(http:\/\/|https:\/\/)\S+/i, label: "remote fetch instruction" },
];

const CANARY_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "MCP Observatory canary", pattern: /MCP_OBSERVATORY_CANARY_[A-Z0-9_-]+/i },
  { name: "safe exfiltration canary", pattern: /OBSERVATORY_SAFE_CANARY_[A-Z0-9_-]+/i },
  { name: "fake GitHub token canary", pattern: /ghp_OBSERVATORY_CANARY_[A-Za-z0-9_]+/ },
];

const BROAD_PARAM_NAMES = new Set([
  "command", "cmd", "exec", "shell", "script", "code", "query", "url", "uri",
  "endpoint", "host", "path", "file", "filepath", "filename", "directory",
  "dir", "glob", "pattern", "headers", "body", "method",
]);

const DESTRUCTIVE_WORDS = /\b(write|delete|remove|overwrite|create|modify|update|execute|run|post|put|patch|mutate|send|upload)\b/i;

function stringifyForScan(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function walkText(value: unknown, path: string[] = []): Array<{ path: string; text: string }> {
  if (typeof value === "string") {
    return [{ path: path.join(".") || "(root)", text: value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => walkText(entry, [...path, String(index)]));
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, entry]) => walkText(entry, [...path, key]));
  }
  return [];
}

function propertyNames(schema: unknown): string[] {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) return [];
  const props = (schema as Record<string, unknown>)["properties"];
  if (typeof props !== "object" || props === null || Array.isArray(props)) return [];
  return Object.keys(props);
}

function requiredFields(schema: unknown): string[] {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) return [];
  const required = (schema as Record<string, unknown>)["required"];
  return Array.isArray(required) ? required.filter((entry): entry is string => typeof entry === "string") : [];
}

function additionalProperties(schema: unknown): unknown {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) return undefined;
  return (schema as Record<string, unknown>)["additionalProperties"];
}

function isDestructiveTool(tool: Tool): boolean {
  const annotations = tool.annotations;
  return annotations?.["destructiveHint"] === true ||
    annotations?.["readOnlyHint"] === false ||
    DESTRUCTIVE_WORDS.test(tool.name) ||
    DESTRUCTIVE_WORDS.test(tool.description ?? "");
}

function addPoisoningFindings(
  findings: AttackSimulationFinding[],
  itemType: AttackSimulationFinding["itemType"],
  itemName: string,
  value: unknown,
): void {
  const texts = walkText(value);
  for (const { path, text } of texts) {
    for (const pattern of POISONING_PATTERNS) {
      const match = text.match(pattern.pattern);
      if (!match) continue;
      findings.push({
        ruleId: `attack-sim/tool-poisoning/${pattern.id}`,
        attackClass: "tool-poisoning",
        severity: pattern.severity,
        itemType,
        itemName,
        message: `${itemType} "${itemName}" contains ${pattern.label} text that could steer an agent.`,
        evidence: { path, excerpt: text.slice(0, 240), match: match[0] },
        recommendation: "Remove hidden or behavioral instructions from MCP metadata; keep descriptions factual and user-visible.",
      });
    }
  }
}

function addPermissionBoundaryFindings(findings: AttackSimulationFinding[], tool: Tool): void {
  const params = propertyNames(tool.inputSchema);
  const broadParams = params.filter((name) => BROAD_PARAM_NAMES.has(name.toLowerCase()));
  if (broadParams.length === 0 || !isDestructiveTool(tool)) return;
  findings.push({
    ruleId: "attack-sim/permission-boundary/broad-destructive-tool",
    attackClass: "permission-boundary",
    severity: broadParams.some((name) => ["command", "cmd", "exec", "shell", "script", "code"].includes(name.toLowerCase())) ? "high" : "medium",
    itemType: "tool",
    itemName: tool.name,
    message: `Tool "${tool.name}" combines broad parameters (${broadParams.join(", ")}) with destructive or non-read-only behavior.`,
    evidence: { broadParams, annotations: tool.annotations, description: tool.description },
    recommendation: "Constrain this tool with typed inputs, allowlists, explicit read-only/destructive annotations, and a harmless CI fixture.",
  });
}

function addCanaryFindings(findings: AttackSimulationFinding[], source: string, value: unknown): void {
  const text = stringifyForScan(value);
  if (!text) return;
  for (const canary of CANARY_PATTERNS) {
    const match = text.match(canary.pattern);
    if (match) {
      findings.push({
        ruleId: "attack-sim/exfiltration-canary/canary-exposed",
        attackClass: "exfiltration-canary",
        severity: "high",
        itemType: "response",
        itemName: source,
        message: `${canary.name} appeared in captured MCP evidence for "${source}".`,
        evidence: { source, match: match[0] },
        recommendation: "Redact canary-like or secret-like values from tool responses before exposing them to agents or logs.",
      });
    }
  }
  for (const credential of CREDENTIAL_PATTERNS) {
    const match = text.match(credential.pattern);
    if (match) {
      findings.push({
        ruleId: "attack-sim/exfiltration-canary/credential-like-output",
        attackClass: "exfiltration-canary",
        severity: "high",
        itemType: "response",
        itemName: source,
        message: `Captured MCP evidence for "${source}" contains credential-like text (${credential.name}).`,
        evidence: { source, credentialPattern: credential.name },
        recommendation: "Redact credentials from MCP responses and move secrets into environment or secret storage.",
      });
    }
  }
}

function toolSchemasFromArtifact(artifact: RunArtifact | undefined): Record<string, object> {
  const toolsCheck = artifact?.checks.find((check) => check.id === "tools");
  const schemas = toolsCheck?.evidence.flatMap((entry) => entry.schemas ? [entry.schemas] : []) ?? [];
  return Object.assign({}, ...schemas) as Record<string, object>;
}

function toolNamesFromArtifact(artifact: RunArtifact | undefined): Set<string> {
  const toolsCheck = artifact?.checks.find((check) => check.id === "tools");
  return new Set(toolsCheck?.evidence.flatMap((entry) => entry.identifiers ?? []) ?? []);
}

function addDriftFindings(findings: AttackSimulationFinding[], tools: Tool[], baseline?: RunArtifact): void {
  if (!baseline) return;
  const baselineNames = toolNamesFromArtifact(baseline);
  const baselineSchemas = toolSchemasFromArtifact(baseline);
  for (const tool of tools) {
    const currentSchema = tool.inputSchema;
    const baselineSchema = baselineSchemas[tool.name];
    if (!baselineNames.has(tool.name) && isDestructiveTool(tool)) {
      findings.push({
        ruleId: "attack-sim/contract-drift/new-destructive-tool",
        attackClass: "contract-drift",
        severity: "high",
        itemType: "tool",
        itemName: tool.name,
        message: `New destructive-looking tool "${tool.name}" appeared after the baseline.`,
        evidence: { toolName: tool.name, description: tool.description, annotations: tool.annotations },
        recommendation: "Review and approve new destructive tool surfaces before agents can depend on this server update.",
      });
    }
    if (!baselineSchema || !currentSchema) continue;
    const oldRequired = new Set(requiredFields(baselineSchema));
    const newRequired = new Set(requiredFields(currentSchema));
    const removedRequired = [...oldRequired].filter((field) => !newRequired.has(field));
    if (removedRequired.length > 0) {
      findings.push({
        ruleId: "attack-sim/contract-drift/required-fields-removed",
        attackClass: "contract-drift",
        severity: "medium",
        itemType: "schema",
        itemName: tool.name,
        message: `Tool "${tool.name}" removed required fields from its schema: ${removedRequired.join(", ")}.`,
        evidence: { removedRequired },
        recommendation: "Treat required-field removals as agent contract drift and require maintainer review.",
      });
    }
    const oldAdditional = additionalProperties(baselineSchema);
    const newAdditional = additionalProperties(currentSchema);
    if (oldAdditional === false && newAdditional !== false) {
      findings.push({
        ruleId: "attack-sim/contract-drift/schema-broadened",
        attackClass: "contract-drift",
        severity: "medium",
        itemType: "schema",
        itemName: tool.name,
        message: `Tool "${tool.name}" broadened its schema by allowing additional properties.`,
        evidence: { previousAdditionalProperties: oldAdditional, currentAdditionalProperties: newAdditional },
        recommendation: "Keep agent-facing schemas strict or document why additional properties are safe.",
      });
    }
  }
}

function scanPreviousSnapshots(findings: AttackSimulationFinding[], previousChecks: CheckResult[]): void {
  for (const check of previousChecks) {
    for (const evidence of check.evidence) {
      if (evidence.responseSnapshots) {
        for (const [name, snapshot] of Object.entries(evidence.responseSnapshots)) {
          addCanaryFindings(findings, `${check.id}:${name}`, snapshot);
        }
      }
      addCanaryFindings(findings, check.id, evidence.findings);
    }
  }
}

async function listSurfaces(context: CheckContext): Promise<ListedSurfaces> {
  const surfaces: ListedSurfaces = { tools: [], prompts: [], resources: [], resourceTemplates: [] };
  if (isCapabilityAdvertised(context.serverCapabilities, "tools")) {
    try {
      surfaces.tools = (await context.client.listTools(undefined, { timeout: context.timeoutMs })).tools;
    } catch {
      // Existing capability checks already report list failures.
    }
  }
  if (isCapabilityAdvertised(context.serverCapabilities, "prompts")) {
    try {
      surfaces.prompts = (await context.client.listPrompts(undefined, { timeout: context.timeoutMs })).prompts;
    } catch {
      // Existing capability checks already report list failures.
    }
  }
  if (isCapabilityAdvertised(context.serverCapabilities, "resources")) {
    try {
      surfaces.resources = (await context.client.listResources(undefined, { timeout: context.timeoutMs })).resources;
    } catch {
      // Existing capability checks already report list failures.
    }
    try {
      surfaces.resourceTemplates = (await context.client.listResourceTemplates(undefined, { timeout: context.timeoutMs })).resourceTemplates;
    } catch {
      // Existing capability checks already report list failures.
    }
  }
  return surfaces;
}

function statusForFindings(findings: AttackSimulationFinding[]): "pass" | "partial" | "fail" {
  if (findings.some((finding) => finding.severity === "high")) return "fail";
  if (findings.some((finding) => finding.severity === "medium")) return "partial";
  return "pass";
}

export async function runAttackSimulationCheck(
  context: CheckContext,
  previousChecks: CheckResult[],
  options: AttackSimulationOptions = {},
): Promise<ObservedCheck> {
  const startedAt = performance.now();
  const surfaces = await listSurfaces(context);
  const findings: AttackSimulationFinding[] = [];

  for (const tool of surfaces.tools) {
    addPoisoningFindings(findings, "tool", tool.name, {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    });
    addPermissionBoundaryFindings(findings, tool);
  }
  for (const prompt of surfaces.prompts) {
    addPoisoningFindings(findings, "prompt", prompt.name, prompt);
  }
  for (const resource of surfaces.resources) {
    addPoisoningFindings(findings, "resource", resource.uri, resource);
  }
  for (const template of surfaces.resourceTemplates) {
    addPoisoningFindings(findings, "resource", template.uriTemplate, template);
  }
  scanPreviousSnapshots(findings, previousChecks);
  addDriftFindings(findings, surfaces.tools, options.baseline);

  const status = statusForFindings(findings);
  const high = findings.filter((finding) => finding.severity === "high").length;
  const medium = findings.filter((finding) => finding.severity === "medium").length;
  const low = findings.filter((finding) => finding.severity === "low").length;
  const message = findings.length === 0
    ? "Safe attack simulation found no high-risk MCP attack-readiness findings."
    : `Safe attack simulation found ${findings.length} finding(s): ${high} high, ${medium} medium, ${low} low.`;

  const diagnostics = findings.map((finding) => `[${finding.severity}] ${finding.message}`);
  const evidence: EvidenceSummary = {
    endpoint: options.baseline ? "attack-sim/safe+baseline" : "attack-sim/safe",
    advertised: true,
    responded: true,
    minimalShapePresent: true,
    itemCount: findings.length,
    identifiers: [...new Set(findings.map((finding) => finding.itemName))],
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    findings: findings.length > 0 ? findings.map((finding) => ({ ...finding })) : undefined,
  };

  return {
    result: makeCheckResult(
      "attack-sim",
      status,
      performance.now() - startedAt,
      message,
      [evidence],
    ),
  };
}
