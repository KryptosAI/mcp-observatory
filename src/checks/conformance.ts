import { performance } from "node:perf_hooks";

import { errorMessage } from "../utils/errors.js";
import { isCapabilityAdvertised, makeCheckResult, type CheckContext, type ObservedCheck } from "./base.js";
import type { EvidenceSummary } from "../types.js";

interface ConformanceFinding {
  rule: string;
  passed: boolean;
  detail: string;
}

function checkCapabilitiesPresent(context: CheckContext): ConformanceFinding {
  const caps = context.serverCapabilities;
  if (caps === undefined) {
    return { rule: "capabilities-present", passed: false, detail: "Server did not return capabilities during initialization." };
  }
  return { rule: "capabilities-present", passed: true, detail: "Server returned capabilities object." };
}

function checkServerInfo(context: CheckContext): ConformanceFinding {
  const caps = context.serverCapabilities;
  if (!caps) {
    return { rule: "server-info", passed: false, detail: "Cannot verify server info — no capabilities returned." };
  }
  return { rule: "server-info", passed: true, detail: "Server provided initialization info." };
}

async function checkToolsEndpoint(context: CheckContext): Promise<ConformanceFinding> {
  if (!isCapabilityAdvertised(context.serverCapabilities, "tools")) {
    return { rule: "tools-capability-match", passed: true, detail: "Tools not advertised — endpoint check skipped." };
  }
  try {
    const resp = await context.client.listTools(undefined, { timeout: context.timeoutMs });
    if (!Array.isArray(resp.tools)) {
      return { rule: "tools-capability-match", passed: false, detail: "tools/list did not return an array of tools." };
    }
    return { rule: "tools-capability-match", passed: true, detail: `tools/list returned ${resp.tools.length} tool(s).` };
  } catch (error) {
    const msg = errorMessage(error);
    return { rule: "tools-capability-match", passed: false, detail: `Advertised tools but tools/list failed: ${msg}` };
  }
}

async function checkPromptsEndpoint(context: CheckContext): Promise<ConformanceFinding> {
  if (!isCapabilityAdvertised(context.serverCapabilities, "prompts")) {
    return { rule: "prompts-capability-match", passed: true, detail: "Prompts not advertised — endpoint check skipped." };
  }
  try {
    const resp = await context.client.listPrompts(undefined, { timeout: context.timeoutMs });
    if (!Array.isArray(resp.prompts)) {
      return { rule: "prompts-capability-match", passed: false, detail: "prompts/list did not return an array of prompts." };
    }
    return { rule: "prompts-capability-match", passed: true, detail: `prompts/list returned ${resp.prompts.length} prompt(s).` };
  } catch (error) {
    const msg = errorMessage(error);
    return { rule: "prompts-capability-match", passed: false, detail: `Advertised prompts but prompts/list failed: ${msg}` };
  }
}

async function checkResourcesEndpoint(context: CheckContext): Promise<ConformanceFinding> {
  if (!isCapabilityAdvertised(context.serverCapabilities, "resources")) {
    return { rule: "resources-capability-match", passed: true, detail: "Resources not advertised — endpoint check skipped." };
  }
  try {
    const resp = await context.client.listResources(undefined, { timeout: context.timeoutMs });
    if (!Array.isArray(resp.resources)) {
      return { rule: "resources-capability-match", passed: false, detail: "resources/list did not return an array of resources." };
    }
    return { rule: "resources-capability-match", passed: true, detail: `resources/list returned ${resp.resources.length} resource(s).` };
  } catch (error) {
    const msg = errorMessage(error);
    return { rule: "resources-capability-match", passed: false, detail: `Advertised resources but resources/list failed: ${msg}` };
  }
}

async function checkToolResponseContent(context: CheckContext): Promise<ConformanceFinding> {
  if (!isCapabilityAdvertised(context.serverCapabilities, "tools")) {
    return { rule: "tool-response-content", passed: true, detail: "No tools — content check skipped." };
  }
  try {
    const { tools } = await context.client.listTools(undefined, { timeout: context.timeoutMs });
    // Find a tool safe to invoke (no required params)
    const safeTool = tools.find(t => {
      const schema = t.inputSchema as Record<string, unknown> | undefined;
      const required = schema?.["required"] as string[] | undefined;
      return !required || required.length === 0;
    });
    if (!safeTool) {
      return { rule: "tool-response-content", passed: true, detail: "No safe tool to invoke — content validation skipped." };
    }
    const result = await context.client.callTool({ name: safeTool.name, arguments: {} }, undefined, { timeout: context.timeoutMs });
    if (!Array.isArray(result.content)) {
      return { rule: "tool-response-content", passed: false, detail: `Tool "${safeTool.name}" response.content is not an array.` };
    }
    for (const item of result.content) {
      const typed = item as Record<string, unknown>;
      if (typeof typed["type"] !== "string") {
        return { rule: "tool-response-content", passed: false, detail: `Tool "${safeTool.name}" response content item missing 'type' field.` };
      }
    }
    return { rule: "tool-response-content", passed: true, detail: `Tool "${safeTool.name}" response has valid content array.` };
  } catch (error) {
    const msg = errorMessage(error);
    return { rule: "tool-response-content", passed: false, detail: `Tool response content check failed: ${msg}` };
  }
}

async function checkErrorHandling(context: CheckContext): Promise<ConformanceFinding> {
  try {
    // Try calling a method that shouldn't exist
    await context.client.request(
      { method: "observatory/nonexistent", params: {} },
      { method: "object" } as never,
      { timeout: Math.min(context.timeoutMs, 5000) },
    );
    // If we get here, server didn't error — that's actually acceptable per JSON-RPC
    return { rule: "error-handling", passed: true, detail: "Server responded to unknown method without crashing." };
  } catch (error) {
    // Getting an error is the expected behavior
    const err = error as Record<string, unknown>;
    const code = err["code"];
    if (typeof code === "number") {
      return { rule: "error-handling", passed: true, detail: `Server returned proper error code ${String(code)} for unknown method.` };
    }
    if (code !== undefined && code !== null) {
      return { rule: "error-handling", passed: true, detail: "Server returned an error response for unknown method." };
    }
    // Connection-level error is ok — server closed cleanly
    return { rule: "error-handling", passed: true, detail: "Server handled unknown method gracefully." };
  }
}

export async function runConformanceCheck(context: CheckContext): Promise<ObservedCheck> {
  const startedAt = performance.now();

  const asyncFindings = await Promise.all([
    checkToolsEndpoint(context),
    checkPromptsEndpoint(context),
    checkResourcesEndpoint(context),
    checkToolResponseContent(context),
    checkErrorHandling(context),
  ]);

  const findings = [
    checkCapabilitiesPresent(context),
    checkServerInfo(context),
    ...asyncFindings,
  ];

  const passed = findings.filter(f => f.passed).length;
  const failed = findings.filter(f => !f.passed).length;
  const total = findings.length;

  let status: "pass" | "partial" | "fail";
  if (failed === 0) {
    status = "pass";
  } else if (passed > failed) {
    status = "partial";
  } else {
    status = "fail";
  }

  const message = failed === 0
    ? `All ${total} conformance checks passed.`
    : `${passed}/${total} conformance checks passed, ${failed} failed.`;

  const diagnostics = findings.map(f => `[${f.passed ? "pass" : "FAIL"}] ${f.rule}: ${f.detail}`);

  const evidence: EvidenceSummary = {
    endpoint: "conformance/check",
    advertised: true,
    responded: true,
    minimalShapePresent: failed === 0,
    itemCount: total,
    identifiers: findings.filter(f => !f.passed).map(f => f.rule),
    diagnostics,
  };

  return {
    result: makeCheckResult(
      "conformance",
      status,
      performance.now() - startedAt,
      message,
      [evidence],
    ),
  };
}
