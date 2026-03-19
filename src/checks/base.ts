import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";

import type { CheckId, CheckResult, CheckStatus, EvidenceSummary, TargetConfig } from "../types.js";

export interface CheckContext {
  client: Client;
  serverCapabilities?: ServerCapabilities;
  target: TargetConfig;
  timeoutMs: number;
  stderrLines: string[];
}

export interface CapabilityObservation {
  capability: "tools" | "prompts" | "resources";
  advertised: boolean;
  responded: boolean;
  minimalShapePresent: boolean;
  endpoint: string;
  itemCount?: number;
  identifiers?: string[];
  diagnostics: string[];
}

export interface ObservedCheck {
  result: CheckResult;
  observation?: CapabilityObservation;
}

export function makeCheckResult(
  id: CheckId,
  status: CheckStatus,
  durationMs: number,
  message: string,
  evidence: EvidenceSummary[],
): CheckResult {
  return {
    id,
    capability: id,
    status,
    durationMs,
    message,
    evidence
  };
}

export function baseEvidence(
  observation: CapabilityObservation,
  stderrLines: string[],
): EvidenceSummary {
  return {
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
  };
}

export function isCapabilityAdvertised(
  capabilities: ServerCapabilities | undefined,
  capability: keyof Pick<ServerCapabilities, "tools" | "prompts" | "resources">,
): boolean {
  return capabilities?.[capability] !== undefined;
}

export function summarizeObservation(observation: CapabilityObservation): string {
  if (!observation.advertised) {
    return "Capability is not advertised by the target.";
  }
  if (!observation.responded) {
    return "Advertised capability did not respond successfully.";
  }
  if (!observation.minimalShapePresent) {
    return "Endpoint responded, but the minimal expected shape was incomplete.";
  }
  const countSuffix =
    observation.itemCount !== undefined
      ? ` (${observation.itemCount} item${observation.itemCount === 1 ? "" : "s"})`
      : "";
  return `Advertised capability responded with the minimal expected shape${countSuffix}.`;
}
