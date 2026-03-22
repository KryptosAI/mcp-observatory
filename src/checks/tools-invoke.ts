import { performance } from "node:perf_hooks";

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { errorMessage } from "../utils/errors.js";
import { isSafeToInvoke, stubFromSchema } from "../utils/schema-stub.js";
import {
  isCapabilityAdvertised,
  makeCheckResult,
  type CheckContext,
  type ObservedCheck
} from "./base.js";

interface InvokeResult {
  name: string;
  invoked: boolean;
  responded: boolean;
  isError: boolean;
  error?: string;
  responseContent?: unknown;
}

export async function runToolsInvokeCheck(context: CheckContext): Promise<ObservedCheck> {
  const startedAt = performance.now();
  const advertised = isCapabilityAdvertised(context.serverCapabilities, "tools");

  if (!advertised) {
    return {
      result: makeCheckResult(
        "tools-invoke",
        "unsupported",
        performance.now() - startedAt,
        "Tools are not advertised by the target.",
        [{
          endpoint: "tools/call",
          advertised: false,
          responded: false,
          minimalShapePresent: false,
          diagnostics: []
        }],
      )
    };
  }

  let tools: Tool[];
  try {
    const resp = await context.client.listTools(undefined, { timeout: context.timeoutMs });
    tools = resp.tools;
  } catch (error) {
    const msg = errorMessage(error);
    return {
      result: makeCheckResult(
        "tools-invoke",
        "fail",
        performance.now() - startedAt,
        `Failed to list tools before invocation: ${msg}`,
        [{
          endpoint: "tools/list",
          advertised: true,
          responded: false,
          minimalShapePresent: false,
          diagnostics: [msg]
        }],
      )
    };
  }

  const safeTools = tools.filter((t) =>
    isSafeToInvoke({
      inputSchema: t.inputSchema as Record<string, unknown> | undefined,
      annotations: t.annotations as Record<string, unknown> | undefined,
    })
  );

  if (safeTools.length === 0) {
    return {
      result: makeCheckResult(
        "tools-invoke",
        "pass",
        performance.now() - startedAt,
        `${tools.length} tool(s) found but none are safe to invoke (all have required parameters). Listing check covers these.`,
        [{
          endpoint: "tools/call",
          advertised: true,
          responded: true,
          minimalShapePresent: true,
          itemCount: 0,
          identifiers: [],
          diagnostics: []
        }],
      )
    };
  }

  const results: InvokeResult[] = [];
  for (const tool of safeTools) {
    const args = stubFromSchema(tool.inputSchema as Record<string, unknown> | undefined);
    try {
      const response = await context.client.callTool(
        { name: tool.name, arguments: args },
        undefined,
        { timeout: context.timeoutMs },
      );
      const isError = response.isError === true;
      results.push({
        name: tool.name,
        invoked: true,
        responded: true,
        isError,
        error: isError ? JSON.stringify(response.content) : undefined,
        responseContent: response.content,
      });
    } catch (error) {
      const msg = errorMessage(error);
      results.push({
        name: tool.name,
        invoked: true,
        responded: false,
        isError: true,
        error: msg,
      });
    }
  }

  const passed = results.filter((r) => r.responded && !r.isError);
  const failed = results.filter((r) => !r.responded || r.isError);
  const diagnostics = failed.map((r) => `${r.name}: ${r.error ?? "no response"}`);

  let status: "pass" | "partial" | "fail";
  if (failed.length === 0) {
    status = "pass";
  } else if (passed.length > 0) {
    status = "partial";
  } else {
    status = "fail";
  }

  const message =
    `Invoked ${results.length}/${safeTools.length} safe tool(s): ` +
    `${passed.length} passed, ${failed.length} failed` +
    (tools.length > safeTools.length
      ? ` (${tools.length - safeTools.length} skipped — have required params)`
      : "");

  // Build response snapshots for diffing
  const responseSnapshots: Record<string, unknown> = {};
  for (const r of results) {
    if (r.responded && r.responseContent !== undefined) {
      responseSnapshots[r.name] = r.responseContent;
    }
  }

  return {
    result: makeCheckResult(
      "tools-invoke",
      status,
      performance.now() - startedAt,
      message,
      [{
        endpoint: "tools/call",
        advertised: true,
        responded: failed.length === 0,
        minimalShapePresent: true,
        itemCount: results.length,
        identifiers: results.map((r) => r.name),
        diagnostics,
        responseSnapshots: Object.keys(responseSnapshots).length > 0 ? responseSnapshots : undefined,
      }],
    )
  };
}
