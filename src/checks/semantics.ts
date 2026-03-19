import { performance } from "node:perf_hooks";

import {
  makeCheckResult,
  type CapabilityObservation,
  type ObservedCheck
} from "./base.js";

export function runSemanticsCheck(
  observations: CapabilityObservation[],
  stderrLines: string[],
): ObservedCheck {
  const startedAt = performance.now();
  const advertised = observations.filter((observation) => observation.advertised);
  const failingCapabilities = advertised
    .filter((observation) => !observation.responded)
    .map((observation) => observation.capability);
  const partialCapabilities = advertised
    .filter(
      (observation) =>
        observation.responded && !observation.minimalShapePresent,
    )
    .map((observation) => observation.capability);
  const passingCapabilities = advertised
    .filter(
      (observation) =>
        observation.responded && observation.minimalShapePresent,
    )
    .map((observation) => observation.capability);

  let status: ObservedCheck["result"]["status"] = "pass";
  let message =
    "Advertised capabilities responded and returned the minimal expected shape.";

  if (advertised.length === 0) {
    status = "unsupported";
    message = "No capabilities were advertised, so semantics could not be evaluated.";
  } else if (failingCapabilities.length > 0) {
    status = "fail";
    message = `Advertised capabilities that did not respond cleanly: ${failingCapabilities.join(", ")}.`;
  } else if (partialCapabilities.length > 0) {
    status = "partial";
    message =
      `Advertised capabilities responded with caveats: ${partialCapabilities.join(", ")}.`;
  } else if (passingCapabilities.length > 0) {
    message =
      `Advertised capabilities responded and returned the minimal expected shape: ${passingCapabilities.join(", ")}.`;
  }

  return {
    result: makeCheckResult(
      "semantics",
      status,
      performance.now() - startedAt,
      message,
      observations.map((observation) => ({
        endpoint: observation.endpoint,
        advertised: observation.advertised,
        responded: observation.responded,
        minimalShapePresent: observation.minimalShapePresent,
        itemCount: observation.itemCount,
        identifiers: observation.identifiers,
        diagnostics:
          stderrLines.length > 0
            ? [...observation.diagnostics, ...stderrLines.slice(-5)]
            : observation.diagnostics
      })),
    )
  };
}
