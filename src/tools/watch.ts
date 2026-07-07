import { readdir } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { diffArtifacts } from "../diff.js";
import { renderMarkdown } from "../reporters/markdown.js";
import { runTarget } from "../runner.js";
import { defaultRunsDirectory, writeRunArtifact, readArtifact } from "../storage.js";
import { errorMessage } from "../utils/errors.js";
import { validateArgs, validateCommand } from "../utils/security.js";
import { formatRun, logRequest } from "./helpers.js";

export const name = "watch";
export const description = "Use this to check a server and see what changed since the last check. Runs all checks, saves the result, and diffs against the previous run for the same target. Shows regressions, recoveries, and schema drift in one call.";
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

    const artifact = await runTarget(target);
    const outDir = defaultRunsDirectory();
    const outPath = await writeRunArtifact(artifact, outDir);

    let diffText = "";
    try {
      const files = await readdir(outDir);
      const needle = target.targetId.toLowerCase();
      const matching = files
        .filter((f) => f.endsWith(".json") && f.toLowerCase().includes(needle) && path.join(outDir, f) !== outPath)
        .sort()
        .reverse();

      if (matching.length > 0) {
        const prevArtifact = await readArtifact(path.join(outDir, matching[0]!));
        if (prevArtifact.artifactType === "run") {
          const diff = diffArtifacts(prevArtifact, artifact);
          if (diff.summary.regressions > 0 || diff.summary.recoveries > 0 || diff.summary.added > 0 || diff.summary.removed > 0) {
            diffText = `\n\nChanges since last run:\n${renderMarkdown(diff)}`;
          } else {
            diffText = "\n\nNo changes since last run.";
          }
        }
      }
    } catch {
      // No previous run — that's fine
    }

    logRequest("watch", startMs);
    return {
      content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nArtifact saved: ${outPath}${diffText}` }],
    };
  } catch (error) {
    const msg = errorMessage(error);
    logRequest("watch", startMs, true);
    return { content: [{ type: "text" as const, text: `Error watching: ${msg}` }], isError: true };
  }
}
