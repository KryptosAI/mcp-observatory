import { performance } from "node:perf_hooks";

import type { Resource, ResourceTemplate } from "@modelcontextprotocol/sdk/types.js";

import {
  baseEvidence,
  isCapabilityAdvertised,
  makeCheckResult,
  summarizeObservation,
  type CheckContext,
  type ObservedCheck
} from "./base.js";

function hasMinimalResourceShape(resource: Resource): boolean {
  return typeof resource.uri === "string" && resource.uri.trim().length > 0;
}

function hasMinimalTemplateShape(template: ResourceTemplate): boolean {
  return (
    typeof template.uriTemplate === "string" &&
    template.uriTemplate.trim().length > 0
  );
}

export async function runResourcesCheck(context: CheckContext): Promise<ObservedCheck> {
  const startedAt = performance.now();
  const advertised = isCapabilityAdvertised(context.serverCapabilities, "resources");

  if (!advertised) {
    return {
      observation: {
        capability: "resources",
        advertised: false,
        responded: false,
        minimalShapePresent: false,
        endpoint: "resources/list | resources/templates/list",
        diagnostics: []
      },
      result: makeCheckResult(
        "resources",
        "unsupported",
        performance.now() - startedAt,
        "Resources are not advertised by the target.",
        [
          {
            endpoint: "resources/list | resources/templates/list",
            advertised: false,
            responded: false,
            minimalShapePresent: false,
            diagnostics: []
          }
        ],
      )
    };
  }

  const diagnostics: string[] = [];
  let responded = false;
  let minimalShapePresent = false;
  const identifiers: string[] = [];
  let itemCount = 0;

  try {
    const listResources = await context.client.listResources(undefined, {
      timeout: context.timeoutMs
    });
    responded = true;
    itemCount += listResources.resources.length;
    identifiers.push(...listResources.resources.map((resource) => resource.uri));
    minimalShapePresent = minimalShapePresent || listResources.resources.every(hasMinimalResourceShape);
  } catch (error) {
    diagnostics.push(
      `resources/list: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    const listTemplates = await context.client.listResourceTemplates(undefined, {
      timeout: context.timeoutMs
    });
    responded = true;
    itemCount += listTemplates.resourceTemplates.length;
    identifiers.push(
      ...listTemplates.resourceTemplates.map((template) => template.uriTemplate),
    );
    minimalShapePresent =
      minimalShapePresent ||
      listTemplates.resourceTemplates.every(hasMinimalTemplateShape);
  } catch (error) {
    diagnostics.push(
      `resources/templates/list: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const observation = {
    capability: "resources" as const,
    advertised: true,
    responded,
    minimalShapePresent,
    endpoint: "resources/list | resources/templates/list",
    itemCount,
    identifiers,
    diagnostics
  };

  const status = responded
    ? minimalShapePresent
      ? "pass"
      : "partial"
    : "fail";

  return {
    observation,
    result: makeCheckResult(
      "resources",
      status,
      performance.now() - startedAt,
      summarizeObservation(observation),
      [baseEvidence(observation, context.stderrLines)],
    )
  };
}
