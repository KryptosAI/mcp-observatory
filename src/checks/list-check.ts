import { performance } from "node:perf_hooks";

import {
  baseEvidence,
  isCapabilityAdvertised,
  makeCheckResult,
  summarizeObservation,
  type CapabilityObservation,
  type CheckContext,
  type ObservedCheck
} from "./base.js";

export interface ListCheckConfig<TItem> {
  /** Capability name: "tools" or "prompts" */
  capability: "tools" | "prompts";
  /** The endpoint name used in evidence, e.g. "tools/list" */
  endpoint: string;
  /** Calls the appropriate list method on the MCP client */
  listItems: (context: CheckContext) => Promise<TItem[]>;
  /** Validates that a single item has the minimal expected shape */
  hasMinimalShape: (item: TItem) => boolean;
  /** Extracts the display name/identifier from an item */
  getItemName: (item: TItem) => string;
  /** Optionally extracts the schema/definition object for drift detection */
  getItemSchema?: (item: TItem) => object | undefined;
}

export async function runListCheck<TItem>(
  config: ListCheckConfig<TItem>,
  context: CheckContext,
): Promise<ObservedCheck> {
  const startedAt = performance.now();
  const advertised = isCapabilityAdvertised(context.serverCapabilities, config.capability);

  if (!advertised) {
    return {
      observation: {
        capability: config.capability,
        advertised: false,
        responded: false,
        minimalShapePresent: false,
        endpoint: config.endpoint,
        diagnostics: []
      },
      result: makeCheckResult(
        config.capability,
        "unsupported",
        performance.now() - startedAt,
        `${capitalize(config.capability)} are not advertised by the target.`,
        [
          {
            endpoint: config.endpoint,
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
    const items = await config.listItems(context);
    const identifiers = items.map(config.getItemName);
    const minimalShapePresent = items.every(config.hasMinimalShape);
    const observation: CapabilityObservation = {
      capability: config.capability,
      advertised: true,
      responded: true,
      minimalShapePresent,
      endpoint: config.endpoint,
      itemCount: items.length,
      identifiers,
      diagnostics: []
    };

    const evidence = baseEvidence(observation, context.stderrLines);
    if (config.getItemSchema) {
      const schemas: Record<string, object> = {};
      for (const item of items) {
        const schema = config.getItemSchema(item);
        if (schema !== undefined) {
          schemas[config.getItemName(item)] = schema;
        }
      }
      if (Object.keys(schemas).length > 0) {
        evidence.schemas = schemas;
      }
    }

    return {
      observation,
      result: makeCheckResult(
        config.capability,
        minimalShapePresent ? "pass" : "partial",
        performance.now() - startedAt,
        summarizeObservation(observation),
        [evidence],
      )
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const observation: CapabilityObservation = {
      capability: config.capability,
      advertised: true,
      responded: false,
      minimalShapePresent: false,
      endpoint: config.endpoint,
      diagnostics: [message]
    };
    return {
      observation,
      result: makeCheckResult(
        config.capability,
        "fail",
        performance.now() - startedAt,
        `Advertised capability failed during ${config.endpoint}: ${message}`,
        [baseEvidence(observation, context.stderrLines)],
      )
    };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
