import { z } from "zod";

import { diffArtifacts } from "../diff.js";
import { renderMarkdown } from "../reporters/markdown.js";
import { defaultRunsDirectory, readArtifact } from "../storage.js";
import { errorMessage } from "../utils/errors.js";
import { validatePath } from "../utils/security.js";
import { logRequest } from "./helpers.js";

export const name = "diff_runs";
export const description = "Use this to find what changed between two server checks. Compares two run artifacts and surfaces regressions (things that broke), recoveries (things that got fixed), schema drift (added/removed/changed tool parameters), and gate status changes. Essential after updating a server.";
export const schema = {
  base: z.string().describe("Path to the base run artifact JSON file."),
  head: z.string().describe("Path to the head run artifact JSON file."),
  format: z.enum(["markdown", "json"]).optional().describe("Output format: 'markdown' (default) or 'json'."),
};

export async function handler({ base, head, format }: { base: string; head: string; format?: "markdown" | "json" }) {
  const startMs = Date.now();
  try {
    const runsDir = defaultRunsDirectory();
    const basePath = validatePath(base, runsDir);
    const headPath = validatePath(head, runsDir);

    const baseArtifact = await readArtifact(basePath);
    const headArtifact = await readArtifact(headPath);

    if (baseArtifact.artifactType !== "run" || headArtifact.artifactType !== "run") {
      return { content: [{ type: "text" as const, text: "Both files must be run artifacts (not diff artifacts)." }], isError: true };
    }

    const diff = diffArtifacts(baseArtifact, headArtifact);
    const output = format === "json"
      ? JSON.stringify(diff, null, 2)
      : renderMarkdown(diff);
    logRequest("diff_runs", startMs);
    return { content: [{ type: "text" as const, text: output }] };
  } catch (error) {
    const msg = errorMessage(error);
    logRequest("diff_runs", startMs, true);
    return { content: [{ type: "text" as const, text: `Error diffing runs: ${msg}` }], isError: true };
  }
}
