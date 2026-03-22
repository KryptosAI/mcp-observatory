#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { Command } from "commander";

import { isCI } from "./ci.js";
import { ANSI, LOGO, c, getBinName, useColor } from "./commands/helpers.js";
import { registerDiffCommands } from "./commands/diff.js";
import { registerLegacyCommands } from "./commands/legacy.js";
import { registerRecordReplayCommands } from "./commands/record-replay.js";
import { registerScanCommands } from "./commands/scan.js";
import { registerScoreCommands } from "./commands/score.js";
import { registerServeCommands } from "./commands/serve.js";
import { registerSuggestCommands } from "./commands/suggest.js";
import { registerTelemetryCommands } from "./commands/telemetry.js";
import { registerTestCommands } from "./commands/test.js";
import { registerWatchCommands } from "./commands/watch.js";
import { runTarget } from "./index.js";
import type { RunArtifact, TargetConfig } from "./types.js";
import { loadTelemetryConfig, collectUserIdentity, recordEvent, buildEvent } from "./telemetry.js";
import { TOOL_VERSION } from "./version.js";

// ── Interactive Menu ─────────────────────────────────────────────────────────

interface MenuItem {
  command: string[];
  label: string;
  outcome: string;
  recommended?: boolean;
}

interface MenuGroup {
  heading: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    heading: "",
    items: [
      { command: ["scan"],         label: "scan",      outcome: "Check all your MCP servers",                      recommended: true },
      { command: ["scan", "deep"], label: "scan deep", outcome: "^ plus invoke tools to verify they actually work" },
      { command: ["suggest"],      label: "suggest",   outcome: "Discover MCP servers for your stack" },
      { command: ["score"],        label: "score",     outcome: "Health score (0-100) for a specific server" },
    ],
  },
  {
    heading: "CI / Regression Testing",
    items: [
      { command: ["watch"],   label: "watch",   outcome: "Run a check, diff against previous, alert on regressions" },
      { command: ["record"],  label: "record",  outcome: "Capture a session for offline replay or CI" },
      { command: ["diff"],    label: "diff",    outcome: "Compare two runs for regressions" },
      { command: ["test"],    label: "test",    outcome: "Test a single server by command" },
    ],
  },
];

function getAllMenuItems(): MenuItem[] {
  return MENU_GROUPS.flatMap((g) => g.items);
}

async function showInteractiveMenu(): Promise<string[] | null> {
  // Non-interactive (piped stdin) — fall back to scan
  if (!process.stdin.isTTY) {
    return ["scan"];
  }

  const allItems = getAllMenuItems();
  let cursor = 0; // start on "scan" (recommended)

  const write = (s: string) => process.stdout.write(s);

  // Render the menu with the current cursor position.
  // Returns lines WITHOUT a trailing newline so line count is exact.
  function render(): string {
    const lines: string[] = [];
    let idx = 0;
    for (const group of MENU_GROUPS) {
      if (group.heading) {
        lines.push("");
        lines.push(`  ${c(ANSI.dim, group.heading)}`);
      }
      for (const item of group.items) {
        const selected = idx === cursor;
        const pointer = selected ? c(ANSI.cyan, "❯") : " ";
        const label = selected ? c(ANSI.cyan, c(ANSI.bold, item.label)) : `  ${item.label}`;
        const pad = " ".repeat(Math.max(1, 13 - item.label.length));
        const outcome = selected ? item.outcome : c(ANSI.dim, item.outcome);
        const tag = item.recommended && !selected ? ` ${c(ANSI.dim, "← start here")}` : "";
        lines.push(`  ${pointer} ${label}${pad}${outcome}${tag}`);
        idx++;
      }
    }
    lines.push("");
    lines.push(`  ${c(ANSI.dim, "↑↓ navigate  enter select  q quit")}`);
    return lines.join("\n");
  }

  // Print header + initial render
  write(useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n\n` : LOGO + `  v${TOOL_VERSION}\n\n`);
  write(`  ${c(ANSI.bold, "What would you like to do?")}\n`);

  const rendered = render();
  // Exact number of lines in the menu (used for cursor repositioning)
  const menuLineCount = rendered.split("\n").length;
  write(rendered + "\n");

  // Use readline keypress events for reliable key detection on macOS/Linux
  const { emitKeypressEvents } = await import("node:readline");
  const stdin = process.stdin;
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  // Arrow-key selection loop
  return new Promise<string[] | null>((resolve) => {

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("keypress", onKeypress);
    };

    const redraw = () => {
      // Move cursor up to start of menu, clear to end of screen, re-render
      write(`\x1b[${menuLineCount}A\x1b[0J`);
      write(render() + "\n");
    };

    const onKeypress = (_ch: string | undefined, key: { name?: string; ctrl?: boolean; sequence?: string } | undefined) => {
      if (!key) return;

      // Ctrl+C
      if (key.ctrl && key.name === "c") {
        cleanup();
        write("\n");
        process.exit(0);
      }

      // q or Q or Escape
      if (key.name === "q" || key.name === "escape") {
        cleanup();
        write("\n");
        resolve(null);
        return;
      }

      // Enter / Return
      if (key.name === "return") {
        cleanup();
        const item = allItems[cursor]!;
        // Clear menu and show what was picked
        write(`\x1b[${menuLineCount}A\x1b[0J`);
        write(`  ${c(ANSI.cyan, "❯")} ${c(ANSI.bold, item.label)}\n\n`);
        resolve(item.command);
        return;
      }

      // Arrow up / k
      if (key.name === "up" || key.name === "k") {
        if (cursor > 0) {
          cursor--;
          redraw();
        }
      }

      // Arrow down / j
      if (key.name === "down" || key.name === "j") {
        if (cursor < allItems.length - 1) {
          cursor++;
          redraw();
        }
      }
    };

    stdin.on("keypress", onKeypress);
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const bin = getBinName();

  // Telemetry: load config and warm identity cache in background
  await loadTelemetryConfig();
  collectUserIdentity().catch(() => {});

  // Update check (CLI only, not MCP server mode)
  if (process.argv[2] !== "serve") {
    try {
      const { default: updateNotifier } = await import("update-notifier");
      const notifier = updateNotifier({
        pkg: { name: "@kryptosai/mcp-observatory", version: TOOL_VERSION },
        updateCheckInterval: 1000 * 60 * 60, // check every hour
      });
      notifier.notify({
        isGlobal: true,
        message: "Update available: {currentVersion} → {latestVersion}\nRun: npx @kryptosai/mcp-observatory@latest",
      });
    } catch {
      // update-notifier not available — skip silently
    }
  }

  const program = new Command();
  program
    .name(bin)
    .enablePositionalOptions()
    .description("Test your MCP servers for breaking changes.")
    .version(TOOL_VERSION)
    .addHelpText("before", useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n` : LOGO + `  v${TOOL_VERSION}\n`)
    .addHelpText("after", (() => {
      const lines = [
        "",
        `  ${c(ANSI.bold, "Quick Start")}`,
        "",
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} scan`)}              Check all your MCP servers`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} scan deep`)}         ^ plus invoke tools to verify they work`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} suggest`)}           Discover MCP servers for your stack`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} score`)} ${c(ANSI.dim, "<cmd>")}       Health score (0-100) for any server`,
        "",
        `  ${c(ANSI.bold, "CI / Regression Testing")}`,
        "",
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} watch`)} ${c(ANSI.dim, "<cmd>")}       Run check, diff against previous, alert regressions`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} record`)} ${c(ANSI.dim, "<cmd>")}      Capture a session for offline replay`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} diff`)} ${c(ANSI.dim, "<a> <b>")}      Compare two runs for regressions`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} badge`)} ${c(ANSI.dim, "<cmd>")}       Generate a health badge for README`,
        "",
        `  ${c(ANSI.dim, `Run ${bin} <command> --help for details on any command.`)}`,
        "",
      ];
      return lines.join("\n");
    })());

  // Register all command modules
  registerScanCommands(program, bin);
  registerTestCommands(program);
  registerDiffCommands(program);
  registerRecordReplayCommands(program, bin);
  registerWatchCommands(program);
  registerServeCommands(program);
  registerSuggestCommands(program);
  registerScoreCommands(program);
  registerLegacyCommands(program);
  registerTelemetryCommands(program);

  // ── smithery ─────────────────────────────────────────────────────────

  const smitheryCmd = program
    .command("smithery")
    .description("Smithery registry integration — scan, report, and batch-check servers.");

  smitheryCmd
    .command("scan")
    .description("Resolve a Smithery server, run checks, and output a report.")
    .argument("<qualified-name>", "Smithery qualified name (e.g. @anthropic/mcp-server-fetch)")
    .option("--security", "Run security analysis on tool schemas.")
    .option("--api-key <key>", "Smithery API key.")
    .option("--base-url <url>", "Override Smithery API base URL.")
    .action(async (qualifiedName: string, options: { security?: boolean; apiKey?: string; baseUrl?: string }) => {
      const smithery = await import("./integrations/smithery.js");
      const smitheryConfig = { apiKey: options.apiKey, baseUrl: options.baseUrl };

      process.stdout.write(`  Resolving ${qualifiedName} from Smithery...\n`);
      const target = await smithery.resolveSmitheryTarget(qualifiedName, smitheryConfig);

      process.stdout.write(`  Running checks against ${target.targetId}...\n`);
      const artifact = await runTarget(target, { securityCheck: options.security });

      const submission = smithery.generateSubmission(qualifiedName, artifact);
      const md = smithery.renderSubmissionMarkdown(submission);

      process.stdout.write(`\n${md}\n`);
    });

  smitheryCmd
    .command("report")
    .description("Generate a formatted markdown report suitable for submitting to Smithery.")
    .argument("<qualified-name>", "Smithery qualified name")
    .option("--output <path>", "Write report to file instead of stdout.")
    .option("--security", "Run security analysis on tool schemas.")
    .option("--api-key <key>", "Smithery API key.")
    .option("--base-url <url>", "Override Smithery API base URL.")
    .action(async (qualifiedName: string, options: { output?: string; security?: boolean; apiKey?: string; baseUrl?: string }) => {
      const smithery = await import("./integrations/smithery.js");
      const smitheryConfig = { apiKey: options.apiKey, baseUrl: options.baseUrl };

      process.stdout.write(`  Resolving ${qualifiedName} from Smithery...\n`);
      const target = await smithery.resolveSmitheryTarget(qualifiedName, smitheryConfig);

      process.stdout.write(`  Running checks against ${target.targetId}...\n`);
      const artifact = await runTarget(target, { securityCheck: options.security });

      const submission = smithery.generateSubmission(qualifiedName, artifact);
      const md = smithery.renderSubmissionMarkdown(submission);

      if (options.output) {
        await writeFile(options.output, md, "utf8");
        process.stdout.write(`  Report written to ${options.output}\n`);
      } else {
        process.stdout.write(`\n${md}\n`);
      }
    });

  smitheryCmd
    .command("batch")
    .description("Scan top N servers from the Smithery registry and generate a comparative report.")
    .option("--top <n>", "Number of servers to scan.", "10")
    .option("--output <path>", "Write report to file instead of stdout.")
    .option("--api-key <key>", "Smithery API key.")
    .option("--base-url <url>", "Override Smithery API base URL.")
    .action(async (options: { top: string; output?: string; apiKey?: string; baseUrl?: string }) => {
      const smithery = await import("./integrations/smithery.js");
      const smitheryConfig = { apiKey: options.apiKey, baseUrl: options.baseUrl };
      const top = parseInt(options.top, 10) || 10;

      process.stdout.write(`  Scanning top ${top} servers from Smithery registry...\n`);

      const results = await smithery.batchScanServers(
        (target: TargetConfig): Promise<RunArtifact> => runTarget(target, {}),
        smitheryConfig,
        { top },
      );

      const md = smithery.renderBatchReportMarkdown(results);

      if (options.output) {
        await writeFile(options.output, md, "utf8");
        process.stdout.write(`  Batch report written to ${options.output}\n`);
      } else {
        process.stdout.write(`\n${md}\n`);
      }
    });

  // Interactive menu when invoked with no arguments
  if (process.argv.length === 2 && !isCI) {
    const choice = await showInteractiveMenu();
    if (!choice) return;
    process.argv.push(...choice);
  }

  // Telemetry: record command usage
  const commandName = process.argv[2] ?? "interactive";
  recordEvent(buildEvent("command_run", commandName, "cli"));

  await program.parseAsync(process.argv);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  let friendly = message;
  if (message.includes("Unexpected end of JSON") || message.includes("Unexpected token")) {
    friendly = "Invalid config file — expected valid JSON. Check the file path and contents.";
  } else if (message.includes("ENOENT")) {
    friendly = `File not found: ${message.replace(/.*ENOENT[^']*'([^']*)'.*/, "$1")}`;
  }
  process.stderr.write(`\n  ${useColor() ? `\x1b[31m✗\x1b[0m` : "✗"} ${friendly}\n\n`);
  process.exitCode = 1;
});
