import { access } from "node:fs/promises";
import type { Command } from "commander";

import { scanForTargets } from "../discovery.js";
import {
  runTarget,
} from "../index.js";
import { appendHistory, buildHistoryEntry } from "../history.js";
import { buildEvent, recordEvent } from "../telemetry.js";
import { TOOL_VERSION } from "../version.js";
import { ANSI, LOGO, c, useColor } from "./helpers.js";

// ── Scan implementation ─────────────────────────────────────────────────────

async function runScan(bin: string, configPath: string | undefined, invokeTools: boolean, securityCheck?: boolean): Promise<void> {
  const t0 = Date.now();
  process.stdout.write(useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n\n` : LOGO + `  v${TOOL_VERSION}\n\n`);

  if (configPath) {
    try {
      await access(configPath);
    } catch {
      process.stdout.write(c(ANSI.red, `  ✗ Config file not found: ${configPath}\n\n`));
      process.exitCode = 1;
      return;
    }
  }

  const targets = await scanForTargets(configPath);

  if (targets.length === 0) {
    process.stdout.write(c(ANSI.yellow, "  No MCP servers found.\n\n"));
    process.stdout.write(c(ANSI.dim, "  Looked in ~/.claude.json, Claude Desktop config, .mcp.json (+ parent dirs)\n\n"));
    process.stdout.write("  Test a specific server:\n");
    process.stdout.write(`    ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} test npx -y @modelcontextprotocol/server-filesystem .`)}\n\n`);
    return;
  }

  process.stdout.write(c(ANSI.bold, `  Found ${targets.length} MCP server${targets.length === 1 ? "" : "s"}:\n`));
  for (const t of targets) {
    process.stdout.write(`  ${c(ANSI.cyan, "●")} ${c(ANSI.bold, t.config.targetId)} ${c(ANSI.dim, `← ${t.source}`)}\n`);
  }
  process.stdout.write("\n");

  interface ScanRow {
    targetId: string;
    gate: string;
    toolCount: number;
    promptCount: number;
    resourceCount: number;
    error?: string;
    diagnostics: string[];
  }

  const results: ScanRow[] = [];
  const checkStatusMap: Record<string, string> = {};
  let passCount = 0;
  let failCount = 0;
  let totalTools = 0;
  let totalPrompts = 0;
  let totalResources = 0;

  for (const t of targets) {
    process.stdout.write(`  ${c(ANSI.dim, "⟳")} Checking ${c(ANSI.bold, t.config.targetId)}...`);
    try {
      const artifact = await runTarget(t.config, { invokeTools, securityCheck });
      const toolsCheck = artifact.checks.find((ch) => ch.id === "tools");
      const promptsCheck = artifact.checks.find((ch) => ch.id === "prompts");
      const resourcesCheck = artifact.checks.find((ch) => ch.id === "resources");

      const toolCount = toolsCheck?.evidence[0]?.itemCount ?? 0;
      const promptCount = promptsCheck?.evidence[0]?.itemCount ?? 0;
      const resourceCount = resourcesCheck?.evidence[0]?.itemCount ?? 0;

      totalTools += toolCount;
      totalPrompts += promptCount;
      totalResources += resourceCount;

      const diagnostics: string[] = [];
      for (const check of artifact.checks) {
        if (check.status === "fail" || check.status === "partial") {
          diagnostics.push(`${check.id}: ${check.message}`);
        }
      }

      const gateIcon = artifact.gate === "pass" ? c(ANSI.green, " ✓") : c(ANSI.red, " ✗");
      process.stdout.write(`\r  ${gateIcon} ${c(ANSI.bold, t.config.targetId)}${" ".repeat(Math.max(1, 40 - t.config.targetId.length))}`);
      process.stdout.write(`${c(ANSI.dim, `${toolCount} tools, ${promptCount} prompts, ${resourceCount} resources`)}\n`);

      if (artifact.fatalError) {
        process.stdout.write(`    ${c(ANSI.red, "→")} ${artifact.fatalError.split("\n")[0]}\n`);
      } else if (artifact.gate === "fail" && diagnostics.length > 0) {
        process.stdout.write(`    ${c(ANSI.dim, "→")} ${diagnostics[0]}\n`);
      }

      for (const check of artifact.checks) {
        checkStatusMap[`${t.config.targetId}:${check.id}`] = check.status;
      }

      // Track history
      await appendHistory(buildHistoryEntry(artifact)).catch(() => {});

      results.push({ targetId: t.config.targetId, gate: artifact.gate, toolCount, promptCount, resourceCount, diagnostics });
      if (artifact.gate === "pass") passCount++; else failCount++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      let friendlyMsg = msg;
      if (msg.includes("ENOENT") || msg.includes("not found")) {
        const cmd = t.config.adapter === "http" ? (t.config as { url: string }).url : (t.config as { command: string }).command;
        friendlyMsg = `Could not start server — "${cmd}" not found. Is it installed?`;
      } else if (msg.includes("ECONNREFUSED")) {
        friendlyMsg = `Server is not running or refused the connection.`;
      } else if (msg.includes("timed out") || msg.includes("timeout")) {
        friendlyMsg = `Server took too long to respond.`;
      }

      process.stdout.write(`\r  ${c(ANSI.red, "✗")} ${c(ANSI.bold, t.config.targetId)}\n`);
      process.stdout.write(`    ${c(ANSI.red, friendlyMsg)}\n`);

      // Docker-specific hint
      const serverCmd = t.config.adapter === "local-process" ? (t.config as { command: string }).command : "";
      if (serverCmd === "docker" || serverCmd.startsWith("docker ")) {
        process.stdout.write(`    ${c(ANSI.dim, "Tip: Docker servers need the Docker daemon running and env vars configured.")}\n`);
      }

      results.push({ targetId: t.config.targetId, gate: "fail", toolCount: 0, promptCount: 0, resourceCount: 0, error: friendlyMsg, diagnostics: [] });
      failCount++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────
  process.stdout.write("\n");

  if (failCount === 0) {
    process.stdout.write(c(ANSI.green, `  ✓ All ${passCount} server${passCount === 1 ? "" : "s"} healthy`));
    process.stdout.write(c(ANSI.dim, ` — ${totalTools} tools, ${totalPrompts} prompts, ${totalResources} resources\n`));
  } else {
    process.stdout.write(c(ANSI.red, `  ✗ ${failCount} of ${passCount + failCount} server${passCount + failCount === 1 ? "" : "s"} failing`));
    if (totalTools > 0 || totalPrompts > 0 || totalResources > 0) {
      process.stdout.write(c(ANSI.dim, ` — ${totalTools} tools, ${totalPrompts} prompts, ${totalResources} resources found\n`));
    } else {
      process.stdout.write("\n");
    }
  }

  // Show diagnostics for failures or notable partials
  const issues = results.filter((r) => r.diagnostics.length > 0 && !r.error);
  if (issues.length > 0) {
    process.stdout.write("\n");
    for (const r of issues) {
      process.stdout.write(`  ${c(ANSI.yellow, r.targetId)}:\n`);
      for (const d of r.diagnostics.slice(0, 3)) {
        process.stdout.write(`    ${c(ANSI.dim, "→")} ${d}\n`);
      }
    }
  }

  // ── Next step ────────────────────────────────────────────────────────
  process.stdout.write("\n");
  if (!invokeTools && totalTools > 0) {
    process.stdout.write(c(ANSI.dim, `  Next: ${c(ANSI.cyan, `${bin} scan deep`)} to also test that tools run\n`));
  } else {
    process.stdout.write(c(ANSI.dim, `  Run ${c(ANSI.cyan, `${bin} --help`)} for more commands\n`));
  }
  process.stdout.write("\n");

  recordEvent(buildEvent("command_complete", "scan", "cli", {
    serversScanned: results.length,
    toolsFound: totalTools,
    promptsFound: totalPrompts,
    resourcesFound: totalResources,
    gateResult: failCount === 0 ? "pass" : "fail",
    executionMs: Date.now() - t0,
    securityFlag: securityCheck,
    targetIds: results.map((r) => r.targetId),
    installedServers: targets.map((t) => t.config.targetId),
    serverCommands: targets.map((t) =>
      t.config.adapter === "http" ? (t.config as { url: string }).url : `${(t.config as { command: string }).command} ${t.config.args.join(" ")}`,
    ),
    checkStatuses: checkStatusMap,
  }));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

// ── Register ────────────────────────────────────────────────────────────────

export function registerScanCommands(program: Command, bin: string): void {
  const scanCmd = program
    .command("scan")
    .description("Check all MCP servers in your Claude configs.")
    .option("--config <path>", "Path to a specific MCP config file.")
    .option("--security", "Run deep security scan (credential patterns, response analysis). Lightweight security is always included.")
    .option("--no-color", "Disable colored output.");

  // `scan` with no subcommand — basic scan
  scanCmd.action(async (options: { config?: string; security?: boolean }) => {
    await runScan(bin, options.config, false, options.security);
  });

  // `scan deep` — scan + invoke tools
  scanCmd
    .command("deep")
    .description("Scan and also invoke safe tools to verify they execute.")
    .option("--config <path>", "Path to a specific MCP config file.")
    .option("--security", "Run deep security scan (credential patterns, response analysis). Lightweight security is always included.")
    .action(async (options: { config?: string; security?: boolean }) => {
      // Inherit parent config option if set
      const parentConfig = scanCmd.opts().config as string | undefined;
      const parentSecurity = scanCmd.opts().security as boolean | undefined;
      await runScan(bin, options.config ?? parentConfig, true, options.security ?? parentSecurity ?? true);
    });
}
