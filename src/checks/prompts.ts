import { performance } from "node:perf_hooks";

import type { Prompt } from "@modelcontextprotocol/sdk/types.js";

import {
  baseEvidence,
  isCapabilityAdvertised,
  makeCheckResult,
  summarizeObservation,
  type CheckContext,
  type ObservedCheck
} from "./base.js";

function hasMinimalPromptShape(prompt: Prompt): boolean {
  return typeof prompt.name === "string" && prompt.name.trim().length > 0;
}

export async function runPromptsCheck(context: CheckContext): Promise<ObservedCheck> {
  const startedAt = performance.now();
  const advertised = isCapabilityAdvertised(context.serverCapabilities, "prompts");

  if (!advertised) {
    return {
      observation: {
        capability: "prompts",
        advertised: false,
        responded: false,
        minimalShapePresent: false,
        endpoint: "prompts/list",
        diagnostics: []
      },
      result: makeCheckResult(
        "prompts",
        "unsupported",
        performance.now() - startedAt,
        "Prompts are not advertised by the target.",
        [
          {
            endpoint: "prompts/list",
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
    const response = await context.client.listPrompts(undefined, {
      timeout: context.timeoutMs
    });
    const identifiers = response.prompts.map((prompt) => prompt.name);
    const minimalShapePresent = response.prompts.every(hasMinimalPromptShape);
    const observation = {
      capability: "prompts" as const,
      advertised: true,
      responded: true,
      minimalShapePresent,
      endpoint: "prompts/list",
      itemCount: response.prompts.length,
      identifiers,
      diagnostics: []
    };

    return {
      observation,
      result: makeCheckResult(
        "prompts",
        minimalShapePresent ? "pass" : "partial",
        performance.now() - startedAt,
        summarizeObservation(observation),
        [baseEvidence(observation, context.stderrLines)],
      )
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const observation = {
      capability: "prompts" as const,
      advertised: true,
      responded: false,
      minimalShapePresent: false,
      endpoint: "prompts/list",
      diagnostics: [message]
    };
    return {
      observation,
      result: makeCheckResult(
        "prompts",
        "fail",
        performance.now() - startedAt,
        `Advertised capability failed during prompts/list: ${message}`,
        [baseEvidence(observation, context.stderrLines)],
      )
    };
  }
}
