import { z } from "zod";

import { runTarget } from "../runner.js";
import { defaultRunsDirectory, writeRunArtifact } from "../storage.js";
import { errorMessage } from "../utils/errors.js";
import { validateArgs, validateCommand } from "../utils/security.js";
import { formatRun, logRequest } from "./helpers.js";

export const name = "score_server";
export const description = "Use this to get a quick health grade for an MCP server. Runs all checks (capabilities, tool invocation, security) and returns a 0-100 score with A-F grade and detailed breakdown across protocol compliance, schema quality, security, reliability, and performance.";
export const schema = {
  command: z.string().describe("The command to launch the MCP server."),
  args: z.array(z.string()).optional().describe("Additional arguments for the command."),
};

export async function handler({ command, args }: { command: string; args?: string[] }) {
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
    const artifact = await runTarget(target, { invokeTools: true, securityCheck: true });
    const outDir = defaultRunsDirectory();
    await writeRunArtifact(artifact, outDir);

    const score = artifact.healthScore;
    if (!score) {
      logRequest("score_server", startMs);
      return { content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nCould not compute health score.` }] };
    }

    const lines: string[] = [
      `MCP Health Score: ${score.overall}/100 (${score.grade})`,
      "",
    ];
    for (const dim of score.dimensions) {
      lines.push(`  ${dim.name}: ${dim.score}/100 (weight: ${Math.round(dim.weight * 100)}%)`);
      for (const detail of dim.details) {
        lines.push(`    → ${detail}`);
      }
    }
    lines.push("", formatRun(artifact));

    logRequest("score_server", startMs);
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  } catch (error) {
    const msg = errorMessage(error);
    logRequest("score_server", startMs, true);
    return { content: [{ type: "text" as const, text: `Error scoring server: ${msg}` }], isError: true };
  }
}
