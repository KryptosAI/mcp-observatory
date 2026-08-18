import type { Command } from "commander";

import { getPassthroughArgs, targetFromCommand } from "./helpers.js";
import {
  assertPassingReceipt,
  defaultProtectPath,
  execWrappedServer,
  findProtectableConfigs,
  protectMcpConfig,
  unprotectMcpConfig,
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
    .description("Rewrite MCP client configs so stdio servers start through wrap (fail-closed).")
    .argument("[file]", "Optional single config path. Default: all discovered client configs.")
    .option("--undo", "Restore .observatory.bak backups.", false)
    .action(async (file?: string, options?: { undo?: boolean }) => {
      const targets = file ? [file] : await findProtectableConfigs();
      if (targets.length === 0) {
        throw new Error(`No MCP client configs found. Create ${defaultProtectPath()} or pass a file.`);
      }
      for (const target of targets) {
        if (options?.undo) {
          const restored = await unprotectMcpConfig(target);
          process.stdout.write(restored ? `Restored ${target}\n` : `No backup for ${target}\n`);
          continue;
        }
        try {
          const result = await protectMcpConfig(target);
          process.stdout.write(`Wrapped ${result.wrapped} in ${target} (${result.skipped} skipped HTTP/already-wrapped). Backup: ${target}.observatory.bak\n`);
        } catch (error) {
          process.stdout.write(`Skipped ${target}: ${error instanceof Error ? error.message : String(error)}\n`);
        }
      }
      if (!options?.undo) {
        process.stdout.write("Restart MCP clients. Scan first: npx -y @kryptosai/mcp-observatory@latest test <command>\n");
      }
    });
}
