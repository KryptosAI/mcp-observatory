import { z } from "zod";

import { scanForTargets } from "../discovery.js";
import { runTarget } from "../runner.js";
import type { RunOptions } from "../runner.js";
import { errorMessage } from "../utils/errors.js";
import { formatRun, logRequest } from "./helpers.js";

export const name = "scan";
export const description = "Use this to check if all your MCP servers are healthy. Auto-discovers servers from Claude config files, connects to each one, and verifies tools/prompts/resources respond correctly. Use with deep=true to also invoke tools and confirm they actually execute. Returns pass/fail status for every server.";
export const schema = {
  config: z.string().optional().describe("Path to a specific MCP config file. If omitted, scans default locations."),
  deep: z.boolean().optional().describe("Also invoke safe tools to verify they execute."),
  security: z.boolean().optional().describe("Run security analysis on tool schemas."),
};

export async function handler({ config, deep, security }: { config?: string; deep?: boolean; security?: boolean }) {
  const startMs = Date.now();
  const targets = await scanForTargets(config);
  if (targets.length === 0) {
    logRequest("scan", startMs);
    return { content: [{ type: "text" as const, text: "No MCP server configs found." }] };
  }

  const opts: RunOptions = {};
  if (deep) opts.invokeTools = true;
  if (security) opts.securityCheck = true;

  const lines: string[] = [`Discovered ${targets.length} server(s):\n`];
  for (const t of targets) {
    if (t.config.targetId === "mcp-observatory") continue;

    lines.push(`--- ${t.config.targetId} (from ${t.source}) ---`);
    try {
      const artifact = await runTarget(t.config, opts);
      lines.push(formatRun(artifact));
    } catch (error) {
      const msg = errorMessage(error);
      lines.push(`  Error: ${msg}`);
    }
    lines.push("");
  }
  logRequest("scan", startMs);
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
