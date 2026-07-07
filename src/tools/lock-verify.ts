import { z } from "zod";

import { scanForTargets } from "../discovery.js";
import { readLockFile, verifyAgainstLock } from "../lockfile.js";
import { runTarget } from "../runner.js";
import { logRequest } from "./helpers.js";

export const name = "lock_verify";
export const description = "Verify that live MCP servers still match a previously saved lock file. Detects schema drift, added/removed tools, and breaking changes.";
export const schema = {
  config: z.string().optional().describe("Path to MCP config file."),
};

export async function handler({ config }: { config?: string }) {
  const startMs = Date.now();
  try {
    const lockFile = await readLockFile();
    const targets = await scanForTargets(config);
    const results: string[] = [];
    let anyFailed = false;

    for (const t of targets) {
      const lockEntry = lockFile.servers.find(s => s.targetId === t.config.targetId);
      if (!lockEntry) continue;

      const artifact = await runTarget(t.config);
      const result = verifyAgainstLock(lockEntry, artifact);
      if (result.passed) {
        results.push(`\u2713 ${t.config.targetId}: no drift`);
      } else {
        anyFailed = true;
        results.push(`\u2717 ${t.config.targetId}: ${result.drift.length} changes`);
        for (const d of result.drift) {
          results.push(`  - ${d.category}: ${d.name} \u2014 ${d.change}`);
        }
      }
    }

    if (results.length === 0) {
      results.push("No servers in lock file match discovered targets.");
    }

    logRequest("lock_verify", startMs, anyFailed);
    return { content: [{ type: "text" as const, text: results.join("\n") }] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logRequest("lock_verify", startMs, true);
    return { content: [{ type: "text" as const, text: `Lock verify failed: ${msg}` }], isError: true };
  }
}
