import { performance } from "node:perf_hooks";

import type { Resource, ResourceTemplate } from "@modelcontextprotocol/sdk/types.js";

import { errorMessage } from "../utils/errors.js";
import {
  baseEvidence,
  isCapabilityAdvertised,
  makeCheckResult,
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

function isOptionalEndpointFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("method not found") ||
    lower.includes("not implemented") ||
    lower.includes("not supported")
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
  const identifiers: string[] = [];
  const endpointEvidence = [] as ReturnType<typeof baseEvidence>[];
  let itemCount = 0;
  let respondedEndpoints = 0;
  let hardEndpointFailures = 0;
  let shapeProblems = 0;

  try {
    const listResources = await context.client.listResources(undefined, {
      timeout: context.timeoutMs
    });
    itemCount += listResources.resources.length;
    identifiers.push(...listResources.resources.map((resource) => resource.uri));
    respondedEndpoints += 1;
    const minimalShapePresent = listResources.resources.every(hasMinimalResourceShape);
    if (!minimalShapePresent) {
      shapeProblems += 1;
    }
    endpointEvidence.push(
      baseEvidence(
        {
          capability: "resources",
          advertised: true,
          responded: true,
          minimalShapePresent,
          endpoint: "resources/list",
          itemCount: listResources.resources.length,
          identifiers: listResources.resources.map((resource) => resource.uri),
          diagnostics: []
        },
        context.stderrLines,
      ),
    );
  } catch (error) {
    const message = errorMessage(error);
    diagnostics.push(
      `resources/list: ${message}`,
    );
    if (!isOptionalEndpointFailure(message)) {
      hardEndpointFailures += 1;
    }
    endpointEvidence.push(
      baseEvidence(
        {
          capability: "resources",
          advertised: true,
          responded: false,
          minimalShapePresent: false,
          endpoint: "resources/list",
          diagnostics: [message]
        },
        context.stderrLines,
      ),
    );
  }

  try {
    const listTemplates = await context.client.listResourceTemplates(undefined, {
      timeout: context.timeoutMs
    });
    itemCount += listTemplates.resourceTemplates.length;
    const templateIdentifiers = listTemplates.resourceTemplates.map(
      (template) => template.uriTemplate,
    );
    identifiers.push(...templateIdentifiers);
    respondedEndpoints += 1;
    const minimalShapePresent =
      listTemplates.resourceTemplates.every(hasMinimalTemplateShape);
    if (!minimalShapePresent) {
      shapeProblems += 1;
    }
    endpointEvidence.push(
      baseEvidence(
        {
          capability: "resources",
          advertised: true,
          responded: true,
          minimalShapePresent,
          endpoint: "resources/templates/list",
          itemCount: listTemplates.resourceTemplates.length,
          identifiers: templateIdentifiers,
          diagnostics: []
        },
        context.stderrLines,
      ),
    );
  } catch (error) {
    const message = errorMessage(error);
    diagnostics.push(
      `resources/templates/list: ${message}`,
    );
    if (!isOptionalEndpointFailure(message)) {
      hardEndpointFailures += 1;
    }
    endpointEvidence.push(
      baseEvidence(
        {
          capability: "resources",
          advertised: true,
          responded: false,
          minimalShapePresent: false,
          endpoint: "resources/templates/list",
          diagnostics: [message]
        },
        context.stderrLines,
      ),
    );
  }

  const responded = respondedEndpoints > 0;
  const minimalShapePresent = responded && shapeProblems === 0;
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

  const status = !responded
    ? "fail"
    : hardEndpointFailures > 0 || shapeProblems > 0
      ? "partial"
      : "pass";

  const message = !responded
    ? "Advertised capability did not respond successfully."
    : hardEndpointFailures > 0
      ? "Advertised capability responded, but at least one resource endpoint failed unexpectedly."
      : shapeProblems > 0
        ? "Advertised capability responded, but at least one resource endpoint missed the minimal expected shape."
        : diagnostics.length > 0
          ? "Advertised capability responded with the minimal expected shape, but one optional resource endpoint appears unsupported."
          : `Advertised capability responded with the minimal expected shape (${itemCount} items).`;

  return {
    observation,
    result: makeCheckResult(
      "resources",
      status,
      performance.now() - startedAt,
      message,
      endpointEvidence,
    )
  };
}
