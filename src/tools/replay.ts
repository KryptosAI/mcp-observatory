import { z } from "zod";

import { defaultCassettesDirectory, loadCassette } from "../cassette.js";
import { TOOL_VERSION } from "../version.js";
import { errorMessage } from "../utils/errors.js";
import { validatePath } from "../utils/security.js";
import { logRequest } from "./helpers.js";

export const name = "replay";
export const description = "Use this to test a server without running it. Replays a previously recorded cassette offline and runs all checks against the recorded responses. Useful in CI or when the live server is unavailable.";
export const schema = {
  cassette: z.string().describe("Path to a cassette JSON file."),
};

export async function handler({ cassette: cassettePath }: { cassette: string }) {
  const startMs = Date.now();
  try {
    const cassettesDir = defaultCassettesDirectory();
    validatePath(cassettePath, cassettesDir);
    const { ReplayTransport } = await import("../transport/replay-transport.js");
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { runToolsCheck } = await import("../checks/tools.js");
    const { runPromptsCheck } = await import("../checks/prompts.js");
    const { runResourcesCheck } = await import("../checks/resources.js");
    const { runToolsInvokeCheck } = await import("../checks/tools-invoke.js");

    const cassette = await loadCassette(cassettePath);
    const replayTransport = new ReplayTransport(cassette.entries);
    const client = new Client({ name: "mcp-observatory", version: TOOL_VERSION }, { capabilities: {} });
    await client.connect(replayTransport);

    const checkContext = {
      client,
      serverCapabilities: client.getServerCapabilities(),
      target: { targetId: cassette.targetId, adapter: "local-process" as const, command: "replay", args: [] as string[] },
      timeoutMs: 10_000,
      stderrLines: [] as string[],
    };

    const checks = [
      (await runToolsCheck(checkContext)).result,
      (await runPromptsCheck(checkContext)).result,
      (await runResourcesCheck(checkContext)).result,
      (await runToolsInvokeCheck(checkContext)).result,
    ];
    await client.close();

    const lines = [`Replay of ${cassette.targetId} (${cassette.entries.length} entries):\n`];
    for (const check of checks) {
      lines.push(`  [${check.status}] ${check.id}: ${check.message}`);
    }
    logRequest("replay", startMs);
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  } catch (error) {
    const msg = errorMessage(error);
    logRequest("replay", startMs, true);
    return { content: [{ type: "text" as const, text: `Error replaying: ${msg}` }], isError: true };
  }
}
