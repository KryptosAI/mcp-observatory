import { z } from "zod";

import type { Cassette } from "../cassette.js";
import { defaultCassettesDirectory, saveCassette } from "../cassette.js";
import { runTargetRecording } from "../runner.js";
import { errorMessage } from "../utils/errors.js";
import { validateArgs, validateCommand } from "../utils/security.js";
import { formatRun, logRequest } from "./helpers.js";

export const name = "record";
export const description = "Use this to capture a baseline of a working MCP server. Records all JSON-RPC traffic to a cassette file that can be replayed offline (no server needed) or used to verify future versions haven't broken anything. Like VCR for MCP.";
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
    const { artifact, cassetteEntries } = await runTargetRecording(target, { invokeTools: true });

    if (!cassetteEntries || cassetteEntries.length === 0) {
      return { content: [{ type: "text" as const, text: "No traffic recorded." }], isError: true };
    }

    const cassette: Cassette = {
      version: 1,
      targetId: target.targetId,
      recordedAt: new Date().toISOString(),
      transport: "stdio",
      entries: cassetteEntries,
    };

    const cassettePath = await saveCassette(cassette, defaultCassettesDirectory());
    logRequest("record", startMs);
    return {
      content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nCassette saved: ${cassettePath}\n${cassetteEntries.length} entries recorded.\n\nReplay offline: replay({ cassette: "${cassettePath}" })\nVerify live: verify({ cassette: "${cassettePath}", command: "${command}" })` }],
    };
  } catch (error) {
    const msg = errorMessage(error);
    logRequest("record", startMs, true);
    return { content: [{ type: "text" as const, text: `Error recording: ${msg}` }], isError: true };
  }
}
