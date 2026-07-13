import { performance } from "node:perf_hooks";

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { makeCheckResult, type ObservedCheck } from "./base.js";
import type { EgressEntry, EvidenceSummary, RuntimeProfile, StateMutation } from "../types.js";

const EGRESS_PARAM_PATTERNS = [
  /^url$/i, /^uri$/i, /^endpoint$/i, /^host$/i, /^hostname$/i,
  /^server$/i, /^address$/i, /^base_?url$/i,
  /^webhook$/i, /^callback$/i, /^domain$/i, /^origin$/i,
];

const EGRESS_DESC_PATTERNS = [
  /\burl\b/i, /\bhttps?\b/i, /\bendpoint\b/i,
  /\bhost\b/i, /\bapi\b/i, /\bwebhook\b/i,
];

const MUTATION_PARAM_PATTERNS = [
  /^path$/i, /^file$/i, /^filename$/i, /^filepath$/i, /^filePath$/i,
  /^directory$/i, /^dir$/i, /^folder$/i,
  /^env$/i, /^environ$/i, /^environment$/i,
  /^command$/i, /^cmd$/i, /^exec$/i, /^shell$/i,
];

const MUTATION_DESC_PATTERNS = [
  /\bwrite\b/i, /\bdelete\b/i, /\bremove\b/i, /\bcreate\b/i,
  /\bexecute\b/i, /\brun\b/i, /\bset\b/i, /\bupdate\b/i,
  /\bmodify\b/i, /\bsave\b/i, /\bfile\b/i, /\bpath\b/i,
  /\bdirectory\b/i, /\benvironment\b/i, /\bcommand\b/i,
];

const MUTATION_NAME_PATTERNS = [
  /write/i, /delete/i, /remove/i, /create/i,
  /exec(ute)?/i, /run/i, /set/i, /update/i,
  /modify/i, /save/i,
];

function inferProtocol(value: string): string {
  if (/^https:\/\//i.test(value)) return "HTTPS";
  if (/^http:\/\//i.test(value)) return "HTTP";
  if (/^wss?:\/\//i.test(value)) return "WSS";
  if (/^tcp:\/\//i.test(value)) return "TCP";
  if (/^udp:\/\//i.test(value)) return "UDP";
  return "unknown";
}

function inferMutationResource(paramName: string): string {
  if (/^env|^environ/i.test(paramName)) return "environment";
  if (/^(command|cmd|exec|shell)$/i.test(paramName)) return "network";
  return "filesystem";
}

function inferMutationOperation(toolName: string, paramName: string): string {
  if (/\bdelet|remov\b/i.test(toolName)) return "delete";
  if (/\bwrit|creat|sav\b/i.test(toolName)) return "write";
  if (/\bexec|run|command|shell|cmd\b/i.test(toolName) || /^command|cmd|exec|shell$/i.test(paramName)) return "execute";
  return "write";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function inferMutationScope(schemaProperties: Record<string, Record<string, unknown>> | undefined, paramName: string, _toolName: string): string {
  if (/^env|^environ/i.test(paramName)) return "global";
  if (/^(command|cmd|exec|shell)$/i.test(paramName)) return "specific_path";
  if (schemaProperties?.[paramName]?.default !== undefined) return "specific_path";
  return "working_directory";
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function normalizeToolSchema(tool: Tool): {
  name: string;
  description: string;
  propertyNames: string[];
  propertyDescriptions: string[];
  properties: Record<string, Record<string, unknown>> | undefined;
} {
  const schema = tool.inputSchema as Record<string, unknown> | undefined;
  const properties = schema?.["properties"] as Record<string, Record<string, unknown>> | undefined;
  const propertyNames = properties ? Object.keys(properties) : [];
  const propertyDescriptions = propertyNames
    .map((name) => stringValue(properties![name]?.description ?? ""))
    .filter(Boolean);
  return {
    name: tool.name,
    description: stringValue(tool.description ?? ""),
    propertyNames,
    propertyDescriptions,
    properties,
  };
}

export function analyzeRuntimeProfile(tools: Tool[]): RuntimeProfile {
  const egress: EgressEntry[] = [];
  const mutations: StateMutation[] = [];

  for (const tool of tools) {
    const normalized = normalizeToolSchema(tool);

    for (const paramName of normalized.propertyNames) {
      if (EGRESS_PARAM_PATTERNS.some((p) => p.test(paramName))) {
        const paramSchema = normalized.properties?.[paramName];
        const defaultVal = stringValue(paramSchema?.default ?? paramSchema?.example ?? paramName);
        egress.push({
          target: defaultVal,
          protocol: inferProtocol(defaultVal),
          source: "tool_schema",
          confidence: "high",
        });
      }

      if (MUTATION_PARAM_PATTERNS.some((p) => p.test(paramName))) {
        mutations.push({
          resource: inferMutationResource(paramName),
          operation: inferMutationOperation(tool.name, paramName),
          scope: inferMutationScope(normalized.properties, paramName, tool.name),
          source: "tool_schema",
        });
      }
    }

    for (const desc of normalized.propertyDescriptions) {
      if (EGRESS_DESC_PATTERNS.some((p) => p.test(desc))) {
        egress.push({
          target: desc,
          protocol: "unknown",
          source: "description_analysis",
          confidence: "medium",
        });
      }
      if (MUTATION_DESC_PATTERNS.some((p) => p.test(desc))) {
        mutations.push({
          resource: "filesystem",
          operation: "write",
          scope: "working_directory",
          source: "description_analysis",
        });
      }
    }

    if (EGRESS_DESC_PATTERNS.some((p) => p.test(normalized.description))) {
      egress.push({
        target: normalized.name,
        protocol: "unknown",
        source: "description_analysis",
        confidence: "low",
      });
    }

    if (MUTATION_DESC_PATTERNS.some((p) => p.test(normalized.description))) {
      mutations.push({
        resource: "filesystem",
        operation: "write",
        scope: "working_directory",
        source: "description_analysis",
      });
    }

    if (MUTATION_NAME_PATTERNS.some((p) => p.test(normalized.name))) {
      mutations.push({
        resource: "filesystem",
        operation: inferMutationOperation(tool.name, ""),
        scope: "working_directory",
        source: "description_analysis",
      });
    }
  }

  const confidence: "high" | "medium" | "low" =
    egress.some((e) => e.confidence === "high") || mutations.some((m) => m.source === "tool_schema")
      ? "high"
      : egress.length > 0 || mutations.length > 0
        ? "medium"
        : "low";

  return {
    egress: egress.length > 0 ? egress : undefined,
    stateMutations: mutations.length > 0 ? mutations : undefined,
    analyzedAt: new Date().toISOString(),
    confidence,
  };
}

function structuredEgressFindings(entries: EgressEntry[]): Array<Record<string, unknown>> {
  return entries.map((e) => ({ ...e }));
}

function structuredMutationFindings(entries: StateMutation[]): Array<Record<string, unknown>> {
  return entries.map((m) => ({ ...m }));
}

export function runRuntimeProfileCheck(tools: Tool[]): ObservedCheck {
  const startedAt = performance.now();
  const profile = analyzeRuntimeProfile(tools);

  const egressCount = profile.egress?.length ?? 0;
  const mutationCount = profile.stateMutations?.length ?? 0;

  let status: "pass" | "partial" | "fail";
  let message: string;

  if (egressCount === 0 && mutationCount === 0) {
    status = "pass";
    message = "No egress or state mutation indicators detected in tool schemas.";
  } else if (profile.confidence === "high") {
    status = "partial";
    message = `Detected ${egressCount} potential egress target(s) and ${mutationCount} potential state mutation(s) with high confidence.`;
  } else {
    status = "pass";
    message = `Detected ${egressCount} potential egress target(s) and ${mutationCount} potential state mutation(s) with low confidence.`;
  }

  const evidenceList: EvidenceSummary[] = [];
  if (egressCount > 0 || mutationCount > 0) {
    evidenceList.push({
      endpoint: "runtime-profile/analyze",
      advertised: true,
      responded: true,
      minimalShapePresent: true,
      itemCount: egressCount + mutationCount,
      diagnostics: [
        `Egress entries: ${egressCount}`,
        `State mutations: ${mutationCount}`,
        `Confidence: ${profile.confidence}`,
      ],
      findings: [
        ...(profile.egress ? structuredEgressFindings(profile.egress) : []),
        ...(profile.stateMutations ? structuredMutationFindings(profile.stateMutations) : []),
      ],
    });
  }

  return { result: makeCheckResult("runtime-profile", status, performance.now() - startedAt, message, evidenceList) };
}
