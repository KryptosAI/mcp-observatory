import { recordEvent, buildEvent } from "../command-events.js";
import type { RunArtifact } from "../types.js";

let eventsWarm = false;

export function ensureCommandContext(): void {
  if (eventsWarm) return;
  eventsWarm = true;
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
  lines.push("");
  for (const check of artifact.checks) {
    lines.push(`  [${check.status}] ${check.id}: ${check.message}`);
  }
  if (artifact.fatalError) {
    lines.push(`\nFatal error: ${artifact.fatalError}`);
  }
  return lines.join("\n");
}
