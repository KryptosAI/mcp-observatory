import path from "node:path";

import { z } from "zod";

import { buildCiReport } from "../commands/ci-report.js";
import type { RunArtifact } from "../types.js";
import { logRequest } from "./helpers.js";

export const name = "ci_report";
export const description = "Generate a CI regression report from run artifacts.";
export const schema = {
  artifactsDir: z.string().optional().describe("Directory containing run artifacts. Defaults to .mcp-observatory/runs/"),
};

export async function handler({ artifactsDir }: { artifactsDir?: string }) {
  const startMs = Date.now();
  try {
    const { readdir, readFile } = await import("node:fs/promises");
    const dir = artifactsDir ?? path.join(process.cwd(), ".mcp-observatory", "runs");
    const files = await readdir(dir);
    const artifacts: RunArtifact[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await readFile(path.join(dir, f), "utf8");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed["artifactType"] === "run") artifacts.push(parsed as unknown as RunArtifact);
      } catch { /* skip invalid */ }
    }

    const report = buildCiReport(artifacts);
    logRequest("ci_report", startMs);
    return { content: [{ type: "text" as const, text: JSON.stringify(report, null, 2) }] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logRequest("ci_report", startMs, true);
    return { content: [{ type: "text" as const, text: `CI report failed: ${msg}` }], isError: true };
  }
}
