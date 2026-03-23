import type { Command } from "commander";

import { scanForTargets } from "../discovery.js";
import {
  readLockFile,
  writeLockFile,
  buildServerLockEntry,
  verifyAgainstLock,
  mergeLockFile,
  defaultLockPath,
} from "../lockfile.js";
import type { LockFileServerEntry } from "../lockfile.js";
import { runTarget } from "../runner.js";
import { ANSI, c, getBinName } from "./helpers.js";

// ── Register ────────────────────────────────────────────────────────────────

export function registerLockCommands(program: Command): void {
  const lockCmd = program
    .command("lock")
    .description("Manage MCP server schema lock files.");

  lockCmd
    .command("create", { isDefault: true })
    .description("Snapshot all MCP server schemas into a lock file.")
    .option("--config <path>", "Path to MCP config file.")
    .option("--update", "Merge with existing lock file instead of overwriting.", false)
    .action(async (options: { config?: string; update: boolean }) => {
      const targets = await scanForTargets(options.config);

      if (targets.length === 0) {
        const bin = getBinName();
        process.stdout.write(
          c(ANSI.yellow, "  No MCP servers found.\n\n") +
          c(ANSI.dim, "  Looked in ~/.claude.json, Claude Desktop config, .mcp.json (+ parent dirs)\n\n") +
          `  Test a specific server:\n` +
          `    ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} test npx -y @modelcontextprotocol/server-filesystem .`)}\n\n`,
        );
        return;
      }

      const entries: LockFileServerEntry[] = [];

      for (const t of targets) {
        process.stdout.write(`  ${c(ANSI.cyan, "⟳")} Locking ${t.config.targetId}...\n`);
        try {
          const artifact = await runTarget(t.config);
          entries.push(buildServerLockEntry(artifact));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          process.stdout.write(`  ${c(ANSI.red, "✗")} Failed to lock ${t.config.targetId}: ${msg}\n`);
        }
      }

      if (entries.length === 0) {
        process.stdout.write(c(ANSI.red, "\n  No servers could be locked.\n\n"));
        process.exitCode = 1;
        return;
      }

      let lockFile;
      if (options.update) {
        try {
          const existing = await readLockFile();
          lockFile = mergeLockFile(existing, entries);
        } catch {
          // No existing lock file — create fresh
          lockFile = {
            version: 1 as const,
            lockedAt: new Date().toISOString(),
            servers: entries,
          };
        }
      } else {
        lockFile = {
          version: 1 as const,
          lockedAt: new Date().toISOString(),
          servers: entries,
        };
      }

      const lockPath = await writeLockFile(lockFile);
      process.stdout.write(
        `\n  ${c(ANSI.green, "✓")} Locked ${entries.length} server${entries.length === 1 ? "" : "s"} to ${lockPath}\n\n`,
      );
    });

  lockCmd
    .command("verify")
    .description("Verify live servers match the lock file.")
    .option("--config <path>", "Path to MCP config file.")
    .action(async (options: { config?: string }) => {
      let lock;
      try {
        lock = await readLockFile();
      } catch {
        const bin = getBinName();
        process.stdout.write(
          c(ANSI.red, "  ✗ No lock file found.\n\n") +
          `  Create one first:\n` +
          `    ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} lock`)}\n\n`,
        );
        process.exitCode = 1;
        return;
      }

      const targets = await scanForTargets(options.config);
      const lockMap = new Map<string, LockFileServerEntry>(
        lock.servers.map((s) => [s.targetId, s]),
      );

      let anyFailed = false;

      for (const t of targets) {
        const lockEntry = lockMap.get(t.config.targetId);
        if (!lockEntry) {
          process.stdout.write(
            `  ${c(ANSI.dim, "⊘")} ${t.config.targetId} ${c(ANSI.dim, "(not in lock file, skipping)")}\n`,
          );
          continue;
        }

        process.stdout.write(`  ${c(ANSI.cyan, "⟳")} Verifying ${t.config.targetId}...\n`);

        try {
          const artifact = await runTarget(t.config);
          const result = verifyAgainstLock(lockEntry, artifact);

          if (result.passed) {
            process.stdout.write(`  ${c(ANSI.green, "✓")} ${t.config.targetId}\n`);
          } else {
            anyFailed = true;
            process.stdout.write(`  ${c(ANSI.red, "✗")} ${t.config.targetId}\n`);
            for (const d of result.drift) {
              process.stdout.write(
                `    ${c(ANSI.yellow, "→")} ${d.category}/${d.name}: ${d.change}\n`,
              );
            }
          }
        } catch (err) {
          anyFailed = true;
          const msg = err instanceof Error ? err.message : String(err);
          process.stdout.write(`  ${c(ANSI.red, "✗")} ${t.config.targetId}: ${msg}\n`);
        }
      }

      process.stdout.write("\n");

      if (anyFailed) {
        process.exitCode = 1;
      }
    });
}
