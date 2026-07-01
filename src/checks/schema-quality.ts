import { performance } from "node:perf_hooks";

import type { Prompt, Resource, Tool } from "@modelcontextprotocol/sdk/types.js";

import { isCapabilityAdvertised, makeCheckResult, type CheckContext, type ObservedCheck } from "./base.js";
import type { EvidenceSummary } from "../types.js";

export interface QualityFinding {
  itemType: "tool" | "prompt" | "resource";
  itemName: string;
  issue: string;
  severity: "warning" | "info";
}

function checkToolQuality(tool: Tool): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const name = tool.name;

  if (!tool.description || tool.description.trim().length === 0) {
    findings.push({ itemType: "tool", itemName: name, issue: "Missing description", severity: "warning" });
  }

  if (/\s/.test(name)) {
    findings.push({ itemType: "tool", itemName: name, issue: "Tool name contains whitespace", severity: "warning" });
  }

  if (name.length > 64) {
    findings.push({ itemType: "tool", itemName: name, issue: "Tool name exceeds 64 characters", severity: "info" });
  }

  const schema = tool.inputSchema as Record<string, unknown> | undefined;
  if (!schema) {
    findings.push({ itemType: "tool", itemName: name, issue: "Missing input schema", severity: "warning" });
    return findings;
  }

  const properties = schema["properties"] as Record<string, Record<string, unknown>> | undefined;
  if (properties && Object.keys(properties).length > 0) {
    const required = schema["required"] as string[] | undefined;
    if (!required || !Array.isArray(required)) {
      findings.push({ itemType: "tool", itemName: name, issue: "Has properties but no 'required' array declared", severity: "info" });
    }

    for (const [propName, propDef] of Object.entries(properties)) {
      if (!propDef["description"] || (typeof propDef["description"] === "string" && propDef["description"].trim().length === 0)) {
        findings.push({ itemType: "tool", itemName: name, issue: `Property '${propName}' missing description`, severity: "info" });
      }
    }
  }

  return findings;
}

function checkPromptQuality(prompt: Prompt): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const name = prompt.name;

  if (!prompt.description || prompt.description.trim().length === 0) {
    findings.push({ itemType: "prompt", itemName: name, issue: "Missing description", severity: "warning" });
  }

  if (prompt.arguments) {
    for (const arg of prompt.arguments) {
      if (!arg.description || arg.description.trim().length === 0) {
        findings.push({ itemType: "prompt", itemName: name, issue: `Argument '${arg.name}' missing description`, severity: "info" });
      }
    }
  }

  return findings;
}

function checkResourceQuality(resource: Resource): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const name = resource.name;

  if (!resource.description || resource.description.trim().length === 0) {
    findings.push({ itemType: "resource", itemName: name, issue: "Missing description", severity: "warning" });
  }

  return findings;
}

export async function runSchemaQualityCheck(context: CheckContext): Promise<ObservedCheck> {
  const startedAt = performance.now();
  const findings: QualityFinding[] = [];
  let totalItems = 0;

  // Check tools
  if (isCapabilityAdvertised(context.serverCapabilities, "tools")) {
    try {
      const { tools } = await context.client.listTools(undefined, { timeout: context.timeoutMs });
      totalItems += tools.length;
      for (const tool of tools) {
        findings.push(...checkToolQuality(tool));
      }
    } catch {
      // tools check already reports this failure
    }
  }

  // Check prompts
  if (isCapabilityAdvertised(context.serverCapabilities, "prompts")) {
    try {
      const { prompts } = await context.client.listPrompts(undefined, { timeout: context.timeoutMs });
      totalItems += prompts.length;
      for (const prompt of prompts) {
        findings.push(...checkPromptQuality(prompt));
      }
    } catch {
      // prompts check already reports this failure
    }
  }

  // Check resources
  if (isCapabilityAdvertised(context.serverCapabilities, "resources")) {
    try {
      const { resources } = await context.client.listResources(undefined, { timeout: context.timeoutMs });
      totalItems += resources.length;
      for (const resource of resources) {
        findings.push(...checkResourceQuality(resource));
      }
    } catch {
      // resources check already reports this failure
    }
  }

  const warnings = findings.filter(f => f.severity === "warning").length;
  const infos = findings.filter(f => f.severity === "info").length;

  let status: "pass" | "partial" | "fail";
  if (totalItems === 0) {
    status = "pass";
  } else if (warnings > totalItems * 0.5) {
    status = "fail";
  } else if (findings.length > 0) {
    status = "partial";
  } else {
    status = "pass";
  }

  const message = findings.length === 0
    ? `All ${totalItems} item(s) have good schema quality.`
    : `Found ${findings.length} quality finding(s) across ${totalItems} item(s): ${warnings} warnings, ${infos} info.`;

  const diagnostics = findings.map(f => `[${f.severity}] ${f.itemType} "${f.itemName}": ${f.issue}`);

  const evidence: EvidenceSummary = {
    endpoint: "schema-quality/scan",
    advertised: true,
    responded: true,
    minimalShapePresent: true,
    itemCount: findings.length,
    identifiers: [...new Set(findings.map(f => f.itemName))],
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    findings: findings.length > 0 ? findings.map((finding) => ({ ...finding })) : undefined,
  };

  return {
    result: makeCheckResult(
      "schema-quality",
      status,
      performance.now() - startedAt,
      message,
      [evidence],
    ),
  };
}
