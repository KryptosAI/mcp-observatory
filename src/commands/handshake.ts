import type { Command } from "commander";

import { getPassthroughArgs, targetFromCommand } from "./helpers.js";
import {
  assertPassingReceipt,
  defaultProtectPath,
  execWrappedServer,
  protectMcpConfig,
} from "../handshake.js";

export function registerHandshakeCommands(program: Command): void {
  program
    .command("wrap")
    .description("Fail-closed stdio wrapper: start a server only if a passing local receipt exists.")
    .option("--allow-fail", "Start even when the last receipt failed. Default is deny.")
    .action(async (options: { allowFail?: boolean }) => {
      const command = getPassthroughArgs();
      if (command.length === 0) {
        throw new Error("Usage: mcp-observatory wrap -- <server-command> [args...]");
      }
      if (!options.allowFail) {
        try {
          await assertPassingReceipt(targetFromCommand(command).targetId);
        } catch (error) {
          process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
          process.exitCode = 1;
          return;
        }
      }
      process.exitCode = await execWrappedServer(command);
    });

  program
    .command("protect")
    .description("Rewrite an mcp.json so stdio servers start through wrap (fail-closed).")
    .argument("[file]", "Path to an MCP client config. Defaults to ./.mcp.json")
    .action(async (file?: string) => {
      const target = file ?? defaultProtectPath();
      const result = await protectMcpConfig(target);
      process.stdout.write(`Wrapped ${result.wrapped} server(s) in ${target} (${result.skipped} skipped). Backup: ${target}.observatory.bak\n`);
      process.stdout.write("Restart the MCP client. Scan first: npx -y @kryptosai/mcp-observatory@latest test <command>\n");
    });
}
