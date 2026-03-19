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

  let status: ObservedCheck["result"]["status"] = "pass";
  let message = "Advertised capabilities responded and returned the minimal expected shape.";

  if (advertised.length === 0) {
    status = "unsupported";
    message = "No capabilities were advertised, so semantics could not be evaluated.";
  } else if (advertised.some((observation) => !observation.responded)) {
    status = "fail";
    message = "At least one advertised capability did not respond successfully.";
  } else if (
    advertised.some((observation) => !observation.minimalShapePresent)
  ) {
    status = "partial";
    message =
      "Advertised capabilities responded, but at least one response missed the minimal expected shape.";
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
