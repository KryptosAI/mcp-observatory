import { readdir } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { defaultRunsDirectory, readArtifact } from "../storage.js";
import { errorMessage } from "../utils/errors.js";
import { formatRun, logRequest } from "./helpers.js";

export const name = "get_last_run";
export const description = "Return the last Observatory run for a server, including handshake allow/deny from the local receipt. No hosted account required.";
export const schema = {
  targetId: z.string().describe("The target ID to find the last run for (e.g. server name or command)."),
};

export async function handler({ targetId }: { targetId: string }) {
  const startMs = Date.now();
  try {
    const dir = defaultRunsDirectory();
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      return { content: [{ type: "text" as const, text: `No runs directory found at ${dir}` }], isError: true };
    }

    const needle = targetId.toLowerCase();
    const matching = files
      .filter((f) => f.endsWith(".json") && f.toLowerCase().includes(needle))
      .sort()
      .reverse();

    if (matching.length === 0) {
      return { content: [{ type: "text" as const, text: `No run artifacts found for target "${targetId}" in ${dir}` }] };
    }

    const latest = matching[0]!;
    const artifact = await readArtifact(path.join(dir, latest));
    if (artifact.artifactType !== "run") {
      return { content: [{ type: "text" as const, text: `Latest matching file is not a run artifact: ${latest}` }], isError: true };
    }

    logRequest("get_last_run", startMs);
    const connect = artifact.gate === "pass" && !artifact.fatalError ? "allow" : "deny";
    return {
      content: [{ type: "text" as const, text: `handshake: ${connect}\ngate: ${artifact.gate}\n${formatRun(artifact)}\n\nFile: ${path.join(dir, latest)}` }],
    };
  } catch (error) {
    const msg = errorMessage(error);
    logRequest("get_last_run", startMs, true);
    return { content: [{ type: "text" as const, text: `Error reading last run: ${msg}` }], isError: true };
  }
}
