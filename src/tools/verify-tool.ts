import { z } from "zod";

import { defaultCassettesDirectory, loadCassette } from "../cassette.js";
import { runTargetRecording } from "../runner.js";
import { compareResponses } from "../verify.js";
import { errorMessage } from "../utils/errors.js";
import { validateCommand, validatePath } from "../utils/security.js";
import { logRequest } from "./helpers.js";

export const name = "verify";
export const description = "Use this after updating a server to confirm nothing broke. Connects to the live server, sends the same requests from a recorded cassette, and compares responses. Reports exactly what changed — added tools, removed parameters, different response shapes.";
export const schema = {
  cassette: z.string().describe("Path to a cassette JSON file."),
  command: z.string().describe("The command to launch the MCP server."),
  args: z.array(z.string()).optional().describe("Additional arguments for the command."),
};

export async function handler({ cassette: cassettePath, command, args }: { cassette: string; command: string; args?: string[] }) {
  const startMs = Date.now();
  try {
    validateCommand(command);
    const cassettesDir = defaultCassettesDirectory();
    validatePath(cassettePath, cassettesDir);
    const cassette = await loadCassette(cassettePath);
    const target = {
      targetId: command,
      adapter: "local-process" as const,
      command,
      args: args ?? [],
      timeoutMs: 15_000,
    };

    const { cassetteEntries } = await runTargetRecording(target, { invokeTools: true });
    if (!cassetteEntries) {
      return { content: [{ type: "text" as const, text: "Failed to record live session for comparison." }], isError: true };
    }

    const result = compareResponses(cassette, cassetteEntries);
    const lines: string[] = [`Verify: ${result.passed} passed, ${result.failed} changed, ${result.missing} missing\n`];
    for (const entry of result.entries) {
      const icon = entry.status === "pass" ? "\u2713" : entry.status === "fail" ? "\u2717" : "?";
      lines.push(`  ${icon} ${entry.method}${entry.diff ? ` \u2014 ${entry.diff}` : ""}`);
    }
    logRequest("verify", startMs);
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  } catch (error) {
    const msg = errorMessage(error);
    logRequest("verify", startMs, true);
    return { content: [{ type: "text" as const, text: `Error verifying: ${msg}` }], isError: true };
  }
}
