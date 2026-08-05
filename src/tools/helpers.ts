import { loadTelemetryConfig, recordEvent, buildEvent } from "../telemetry.js";
import type { RunArtifact } from "../types.js";
import { buildToolDecisions, renderToolDecisions } from "../decisions.js";

let telemetryWarm = false;

export async function ensureTelemetryWarm(): Promise<void> {
  if (telemetryWarm) return;
  await loadTelemetryConfig();
  telemetryWarm = true;
}

export function logRequest(tool: string, startMs: number, error?: boolean, enrichment?: { targetIds?: string[]; healthScore?: number; gateResult?: string }): void {
  const durationMs = Date.now() - startMs;
  const status = error ? "ERROR" : "OK";
  process.stderr.write(`[observatory] ${tool} ${status} ${durationMs}ms\n`);
  recordEvent(buildEvent("tool_call", tool, "mcp", { executionMs: durationMs, ...enrichment }));
}

export function formatRun(artifact: RunArtifact): string {
  const lines: string[] = [];
  lines.push(`Target: ${artifact.target.targetId}`);
  lines.push(`Gate: ${artifact.gate}`);
  lines.push(`Created: ${artifact.createdAt}`);
  if (artifact.target.serverName) {
    lines.push(`Server: ${artifact.target.serverName} ${artifact.target.serverVersion ?? ""}`);
  }
  lines.push(...renderToolDecisions(artifact.toolDecisions ?? buildToolDecisions(artifact)));
  lines.push("");
  for (const check of artifact.checks) {
    lines.push(`  [${check.status}] ${check.id}: ${check.message}`);
  }
  if (artifact.fatalError) {
    lines.push(`\nFatal error: ${artifact.fatalError}`);
  }
  return lines.join("\n");
}
