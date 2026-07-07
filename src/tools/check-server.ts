import { z } from "zod";

import { runTarget } from "../runner.js";
import type { RunOptions } from "../runner.js";
import { defaultRunsDirectory, writeRunArtifact } from "../storage.js";
import { errorMessage } from "../utils/errors.js";
import { validateArgs, validateCommand } from "../utils/security.js";
import { formatRun, logRequest } from "./helpers.js";

export const name = "check_server";
export const description = "Use this to test a specific MCP server before installing or after updating it. Launches the server by command, checks all capabilities, and saves a run artifact for future comparison. Example: check_server({ command: 'npx -y @modelcontextprotocol/server-everything' }). Use deep=true to invoke tools, security=true to analyze schemas for vulnerabilities.";
export const schema = {
  command: z.string().describe("The command to launch the MCP server (e.g. 'npx -y @modelcontextprotocol/server-everything')."),
  args: z.array(z.string()).optional().describe("Additional arguments for the command."),
  deep: z.boolean().optional().describe("Also invoke safe tools to verify they execute."),
  security: z.boolean().optional().describe("Run security analysis on tool schemas."),
};

export async function handler({ command, args, deep, security }: { command: string; args?: string[]; deep?: boolean; security?: boolean }) {
  const startMs = Date.now();
  try {
    validateCommand(command);
    validateArgs(args ?? []);
    const target = {
      targetId: command,
      adapter: "local-process" as const,
      command,
      args: args ?? [],
      timeoutMs: 15_000,
    };
    const opts: RunOptions = {};
    if (deep) opts.invokeTools = true;
    if (security) opts.securityCheck = true;
    const artifact = await runTarget(target, opts);
    const outDir = defaultRunsDirectory();
    const outPath = await writeRunArtifact(artifact, outDir);
    logRequest("check_server", startMs);
    return {
      content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nArtifact saved: ${outPath}` }],
    };
  } catch (error) {
    const msg = errorMessage(error);
    logRequest("check_server", startMs, true);
    return { content: [{ type: "text" as const, text: `Error checking server: ${msg}` }], isError: true };
  }
}
