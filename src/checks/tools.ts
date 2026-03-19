import { performance } from "node:perf_hooks";

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  baseEvidence,
  isCapabilityAdvertised,
  makeCheckResult,
  summarizeObservation,
  type CheckContext,
  type ObservedCheck
} from "./base.js";

function hasMinimalToolShape(tool: Tool): boolean {
  return typeof tool.name === "string" && tool.name.trim().length > 0;
}

export async function runToolsCheck(context: CheckContext): Promise<ObservedCheck> {
  const startedAt = performance.now();
  const advertised = isCapabilityAdvertised(context.serverCapabilities, "tools");

  if (!advertised) {
    return {
      observation: {
        capability: "tools",
        advertised: false,
        responded: false,
        minimalShapePresent: false,
        endpoint: "tools/list",
        diagnostics: []
      },
      result: makeCheckResult(
        "tools",
        "unsupported",
        performance.now() - startedAt,
        "Tools are not advertised by the target.",
        [
          {
            endpoint: "tools/list",
            advertised: false,
            responded: false,
            minimalShapePresent: false,
            diagnostics: []
          }
        ],
      )
    };
  }

  try {
    const response = await context.client.listTools(undefined, {
      timeout: context.timeoutMs
    });
    const identifiers = response.tools.map((tool) => tool.name);
    const minimalShapePresent = response.tools.every(hasMinimalToolShape);
    const observation = {
      capability: "tools" as const,
      advertised: true,
      responded: true,
      minimalShapePresent,
      endpoint: "tools/list",
      itemCount: response.tools.length,
      identifiers,
      diagnostics: []
    };

    return {
      observation,
      result: makeCheckResult(
        "tools",
        minimalShapePresent ? "pass" : "partial",
        performance.now() - startedAt,
        summarizeObservation(observation),
        [baseEvidence(observation, context.stderrLines)],
      )
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const observation = {
      capability: "tools" as const,
      advertised: true,
      responded: false,
      minimalShapePresent: false,
      endpoint: "tools/list",
      diagnostics: [message]
    };
    return {
      observation,
      result: makeCheckResult(
        "tools",
        "fail",
        performance.now() - startedAt,
        `Advertised capability failed during tools/list: ${message}`,
        [baseEvidence(observation, context.stderrLines)],
      )
    };
  }
}
