#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import { scanForTargets } from "./discovery.js";
import os from "node:os";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import type { Cassette } from "./cassette.js";
import { defaultCassettesDirectory, loadCassette, saveCassette } from "./cassette.js";
import { runPromptsCheck } from "./checks/prompts.js";
import { runResourcesCheck } from "./checks/resources.js";
import { runToolsCheck } from "./checks/tools.js";
import { runToolsInvokeCheck } from "./checks/tools-invoke.js";
import {
  diffArtifacts,
  readArtifact,
  renderHtml,
  renderMarkdown,
  renderTerminal,
  runTarget,
  writeRunArtifact,
  type TargetConfig
} from "./index.js";
import { runTargetRecording } from "./runner.js";
import { defaultRunsDirectory } from "./storage.js";
import { ReplayTransport } from "./transport/replay-transport.js";
import { SCHEMA_VERSION, type RunArtifact } from "./types.js";
import { buildRunId } from "./utils/ids.js";
import { validateTargetConfig } from "./validate.js";
import { compareResponses } from "./verify.js";
import { TOOL_VERSION } from "./version.js";

// ── ASCII Logo ──────────────────────────────────────────────────────────────

const LOGO = `
  ███╗   ███╗ ██████╗██████╗
  ████╗ ████║██╔════╝██╔══██╗
  ██╔████╔██║██║     ██████╔╝
  ██║╚██╔╝██║██║     ██╔═══╝
  ██║ ╚═╝ ██║╚██████╗██║
  ╚═╝     ╚═╝ ╚═════╝╚═╝
     O B S E R V A T O R Y
`;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function readTargetConfig(filePath: string): Promise<TargetConfig> {
  const content = await readFile(filePath, "utf8");
  return validateTargetConfig(JSON.parse(content));
}

function targetFromCommand(args: string[]): TargetConfig {
  if (args.length === 0) {
    throw new Error("No command provided. Usage: mcp-observatory test <command> [args...]");
  }
  const command = args[0]!;
  return {
    targetId: command,
    adapter: "local-process",
    command,
    args: args.slice(1),
    timeoutMs: 15_000,
  };
}

// Extract args after -- before Commander sees them
const _rawArgv = [...process.argv];
const _dashDashIdx = _rawArgv.indexOf("--");
const _passthroughArgs: string[] = _dashDashIdx !== -1 ? _rawArgv.splice(_dashDashIdx) .slice(1) : [];
if (_dashDashIdx !== -1) {
  process.argv = _rawArgv;
}

function getPassthroughArgs(): string[] {
  return _passthroughArgs;
}

async function resolveTarget(options: { target?: string }): Promise<TargetConfig> {
  if (options.target) {
    return readTargetConfig(options.target);
  }
  const passthrough = getPassthroughArgs();
  if (passthrough.length > 0) {
    return targetFromCommand(passthrough);
  }
  throw new Error("Provide --target <config.json> or use: mcp-observatory test <command>");
}

function useColor(): boolean {
  return !process.env["NO_COLOR"] && !process.argv.includes("--no-color");
}

const ANSI = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
} as const;

function c(code: string, text: string): string {
  return useColor() ? `${code}${text}${ANSI.reset}` : text;
}

function formatOutput(
  artifact: Parameters<typeof renderTerminal>[0],
  format: "html" | "json" | "markdown" | "terminal",
): string {
  if (format === "json") return JSON.stringify(artifact, null, 2);
  if (format === "markdown") return renderMarkdown(artifact);
  if (format === "html") return renderHtml(artifact);
  return renderTerminal(artifact);
}

async function writeOutput(content: string, format: string, outputPath?: string): Promise<void> {
  if (outputPath !== undefined) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content + "\n", "utf8");
    process.stdout.write(`Wrote ${format} report to ${outputPath}\n`);
  } else {
    process.stdout.write(`${content}\n`);
  }
}

// ── Invocation detection ─────────────────────────────────────────────────────

/** Returns the command the user actually typed, so tips are copy-pasteable. */
function getBinName(): string {
  const script = process.argv[1] ?? "";
  if (script.includes(".npm/_npx") || script.includes("npx")) {
    return "npx @kryptosai/mcp-observatory";
  }
  return "mcp-observatory";
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const bin = getBinName();

  const program = new Command();
  program
    .name("mcp-observatory")
    .description("Test your MCP servers for breaking changes.")
    .version(TOOL_VERSION)
    .addHelpText("before", useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n` : LOGO + `  v${TOOL_VERSION}\n`)
    .addHelpText("after", [
      "",
      "Examples:",
      `  ${c(ANSI.dim, "$")} ${bin}${" ".repeat(Math.max(1, 48 - bin.length))}Scan all your MCP servers`,
      `  ${c(ANSI.dim, "$")} ${bin} scan deep${" ".repeat(Math.max(1, 38 - bin.length))}Also test that tools actually run`,
      `  ${c(ANSI.dim, "$")} ${bin} test npx server-foo${" ".repeat(Math.max(1, 28 - bin.length))}Test a specific server by command`,
      `  ${c(ANSI.dim, "$")} ${bin} record npx server-foo${" ".repeat(Math.max(1, 26 - bin.length))}Record a session for replay`,
      `  ${c(ANSI.dim, "$")} ${bin} replay cassette.json${" ".repeat(Math.max(1, 27 - bin.length))}Replay offline — no server needed`,
      `  ${c(ANSI.dim, "$")} ${bin} diff run-a.json run-b.json${" ".repeat(Math.max(1, 20 - bin.length))}Compare two runs`,
      "",
    ].join("\n"));

  // ── scan ──────────────────────────────────────────────────────────────

  const scanCmd = program
    .command("scan")
    .description("Check all MCP servers in your Claude configs.")
    .option("--config <path>", "Path to a specific MCP config file.")
    .option("--no-color", "Disable colored output.");

  // `scan` with no subcommand — basic scan
  scanCmd.action(async (options: { config?: string }) => {
    await runScan(bin, options.config, false);
  });

  // `scan deep` — scan + invoke tools
  scanCmd
    .command("deep")
    .description("Scan and also invoke safe tools to verify they execute.")
    .option("--config <path>", "Path to a specific MCP config file.")
    .action(async (options: { config?: string }) => {
      // Inherit parent config option if set
      const parentConfig = scanCmd.opts().config as string | undefined;
      await runScan(bin, options.config ?? parentConfig, true);
    });

  // ── test ──────────────────────────────────────────────────────────────

  program
    .command("test")
    .description("Test a specific server by command.")
    .argument("<command...>", "Server command and arguments to run.")
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[]) => {
      const target = targetFromCommand(commandArgs);
      const artifact = await runTarget(target);
      const outPath = await writeRunArtifact(artifact, defaultRunsDirectory(process.cwd()));
      const summary = renderTerminal(artifact);
      process.stdout.write(`${summary}\nArtifact: ${outPath}\n`);
      if (artifact.gate === "fail") {
        process.exitCode = 1;
      }
    });

  // ── diff ──────────────────────────────────────────────────────────────

  program
    .command("diff")
    .description("Compare two runs and show regressions and schema drift.")
    .argument("<base>", "Base run artifact JSON file.")
    .argument("<head>", "Head run artifact JSON file.")
    .option("--format <format>", "terminal, json, markdown, or html", "terminal")
    .option("--output <file>", "Write to file instead of stdout.")
    .option("--no-color", "Disable colored output.")
    .option("--fail-on-regression", "Exit with code 1 when regressions are present.", false)
    .action(
      async (base: string, head: string, options: {
        failOnRegression?: boolean;
        format: "html" | "json" | "markdown" | "terminal";
        output?: string;
      }) => {
        const baseArtifact = await readArtifact(base);
        const headArtifact = await readArtifact(head);

        if (baseArtifact.artifactType !== "run" || headArtifact.artifactType !== "run") {
          throw new Error("The diff command only accepts run artifacts.");
        }

        const artifact = diffArtifacts(baseArtifact, headArtifact);
        const output = formatOutput(artifact, options.format);
        await writeOutput(output, options.format, options.output);

        if (options.failOnRegression && artifact.gate === "fail") {
          process.exitCode = 1;
        }
      },
    );

  // ── watch ─────────────────────────────────────────────────────────────

  program
    .command("watch")
    .description("Watch a server for changes, alert on regressions.")
    .argument("<config>", "Path to a target config JSON file.")
    .option("--interval <seconds>", "Check interval in seconds.", "30")
    .option("--no-color", "Disable colored output.")
    .action(async (configPath: string, options: { interval: string }) => {
      const target = await readTargetConfig(configPath);
      const outDir = defaultRunsDirectory(process.cwd());
      await runWatchMode(target, outDir, parseInt(options.interval, 10) || 30);
    });

  // ── serve ─────────────────────────────────────────────────────────────

  program
    .command("serve")
    .description("Start as an MCP server for AI agents.")
    .action(async () => {
      const { startServer } = await import("./server.js");
      await startServer();
    });

  // ── record ─────────────────────────────────────────────────────────────

  program
    .command("record")
    .description("Record a server session to a cassette file for replay.")
    .argument("[command...]", "Server command and arguments to run.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { target?: string }) => {
      const target = options.target
        ? await readTargetConfig(options.target)
        : targetFromCommand(commandArgs.length > 0 ? commandArgs : getPassthroughArgs());

      process.stdout.write(`${c(ANSI.dim, "⟳")} Recording session with ${c(ANSI.bold, target.targetId)}...\n`);

      const { artifact, cassetteEntries } = await runTargetRecording(target, { invokeTools: true });

      if (!cassetteEntries || cassetteEntries.length === 0) {
        process.stdout.write(`${c(ANSI.yellow, "⚠")} No traffic recorded.\n`);
        process.exitCode = 1;
        return;
      }

      const cassette: Cassette = {
        version: 1,
        targetId: target.targetId,
        recordedAt: new Date().toISOString(),
        transport: target.adapter === "http" ? "http" : "stdio",
        entries: cassetteEntries,
      };

      const cassettePath = await saveCassette(cassette, defaultCassettesDirectory(process.cwd()));

      const summary = renderTerminal(artifact);
      process.stdout.write(`\n${summary}\n`);
      process.stdout.write(`\n${c(ANSI.green, "✓")} Cassette saved: ${cassettePath}\n`);
      process.stdout.write(`  ${c(ANSI.dim, `${cassetteEntries.length} entries recorded`)}\n`);
      process.stdout.write(`\n  Replay offline:  ${c(ANSI.cyan, `${bin} replay ${cassettePath}`)}\n`);
      process.stdout.write(`  Verify live:     ${c(ANSI.cyan, `${bin} verify ${cassettePath} ${target.adapter === "http" ? `--target <config>` : commandArgs.join(" ")}`)}\n\n`);

      if (artifact.gate === "fail") {
        process.exitCode = 1;
      }
    });

  // ── replay ─────────────────────────────────────────────────────────────

  program
    .command("replay")
    .description("Replay a cassette file offline — no live server needed.")
    .argument("<cassette>", "Path to a cassette JSON file.")
    .option("--no-color", "Disable colored output.")
    .action(async (cassettePath: string) => {
      const cassette = await loadCassette(cassettePath);

      process.stdout.write(`${c(ANSI.dim, "⟳")} Replaying cassette for ${c(ANSI.bold, cassette.targetId)} (${cassette.entries.length} entries)...\n`);

      // Create a target config for the replay
      const replayTarget: TargetConfig = {
        targetId: cassette.targetId,
        adapter: "local-process",
        command: "replay",
        args: [],
      };

      // Build a ReplayTransport and run checks against it
      const transport = new ReplayTransport(cassette.entries);
      const client = new Client(
        { name: "mcp-observatory", version: TOOL_VERSION },
        { capabilities: {} },
      );

      await client.connect(transport);
      const serverCapabilities = client.getServerCapabilities();

      const checkContext = {
        client,
        serverCapabilities,
        target: replayTarget,
        timeoutMs: 10_000,
        stderrLines: [] as string[],
      };

      const toolsCheck = await runToolsCheck(checkContext);
      const promptsCheck = await runPromptsCheck(checkContext);
      const resourcesCheck = await runResourcesCheck(checkContext);
      const invokeCheck = await runToolsInvokeCheck(checkContext);

      await client.close();

      const checks = [
        toolsCheck.result,
        promptsCheck.result,
        resourcesCheck.result,
        invokeCheck.result,
      ];

      const failCount = checks.filter((ch) => ch.status === "fail").length;
      const gate: "pass" | "fail" = failCount > 0 ? "fail" : "pass";
      const artifact = {
        artifactType: "run" as const,
        schemaVersion: SCHEMA_VERSION,
        gate,
        runId: buildRunId(),
        createdAt: new Date().toISOString(),
        toolVersion: TOOL_VERSION,
        target: {
          targetId: cassette.targetId,
          adapter: "local-process" as const,
          command: "replay",
          args: [] as string[],
          metadata: { source: "cassette", cassettePath },
        },
        environment: {
          platform: `${os.platform()} ${os.release()}`,
          nodeVersion: process.version,
        },
        summary: {
          total: checks.length,
          pass: checks.filter((ch) => ch.status === "pass").length,
          fail: failCount,
          partial: checks.filter((ch) => ch.status === "partial").length,
          unsupported: checks.filter((ch) => ch.status === "unsupported").length,
          flaky: checks.filter((ch) => ch.status === "flaky").length,
          skipped: checks.filter((ch) => ch.status === "skipped").length,
          gate,
        },
        checks,
      } satisfies RunArtifact;

      process.stdout.write(`\n${renderTerminal(artifact)}\n`);
      process.stdout.write(`\n${c(ANSI.dim, `Replayed from: ${cassettePath}`)}\n\n`);

      if (artifact.gate === "fail") {
        process.exitCode = 1;
      }
    });

  // ── verify ─────────────────────────────────────────────────────────────

  program
    .command("verify")
    .description("Verify a live server still matches a recorded cassette.")
    .argument("<cassette>", "Path to a cassette JSON file.")
    .argument("[command...]", "Server command and arguments to run.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--no-color", "Disable colored output.")
    .action(async (cassettePath: string, commandArgs: string[], options: { target?: string }) => {
      const cassette = await loadCassette(cassettePath);

      const target = options.target
        ? await readTargetConfig(options.target)
        : targetFromCommand(commandArgs.length > 0 ? commandArgs : getPassthroughArgs());

      process.stdout.write(`${c(ANSI.dim, "⟳")} Verifying ${c(ANSI.bold, target.targetId)} against cassette...\n`);

      const { cassetteEntries } = await runTargetRecording(target, { invokeTools: true });

      if (!cassetteEntries) {
        process.stdout.write(`${c(ANSI.red, "✗")} Failed to record live session for comparison.\n`);
        process.exitCode = 1;
        return;
      }

      const verifyResult = compareResponses(cassette, cassetteEntries);

      process.stdout.write("\n");

      for (const entry of verifyResult.entries) {
        if (entry.status === "pass") {
          process.stdout.write(`  ${c(ANSI.green, "✓")} ${entry.method}\n`);
        } else if (entry.status === "fail") {
          process.stdout.write(`  ${c(ANSI.red, "✗")} ${entry.method}\n`);
          if (entry.diff) {
            for (const line of entry.diff.split("\n")) {
              process.stdout.write(`    ${c(ANSI.dim, line)}\n`);
            }
          }
        } else {
          process.stdout.write(`  ${c(ANSI.yellow, "?")} ${entry.method} ${c(ANSI.dim, "(missing — server did not respond)")}\n`);
        }
      }

      process.stdout.write("\n");
      if (verifyResult.failed === 0 && verifyResult.missing === 0) {
        process.stdout.write(c(ANSI.green, `  ✓ All ${verifyResult.passed} responses match cassette\n`));
      } else {
        process.stdout.write(c(ANSI.red, `  ✗ ${verifyResult.failed} changed, ${verifyResult.missing} missing out of ${verifyResult.totalEntries} responses\n`));
        process.exitCode = 1;
      }
      process.stdout.write("\n");
    });

  // ── Hidden legacy commands ────────────────────────────────────────────

  program
    .command("run", { hidden: true })
    .description("Check one server and save a run artifact.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--out-dir <directory>", "Directory for persisted run artifacts.", defaultRunsDirectory(process.cwd()))
    .option("--watch", "Re-run checks on an interval.", false)
    .option("--interval <seconds>", "Interval in seconds for watch mode.", "30")
    .option("--invoke-tools", "Actually call safe tools to verify they execute.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (options: { outDir: string; target?: string; watch: boolean; interval: string; invokeTools: boolean }) => {
      const target = await resolveTarget(options);
      if (options.watch) {
        await runWatchMode(target, options.outDir, parseInt(options.interval, 10) || 30);
        return;
      }
      const artifact = await runTarget(target, { invokeTools: options.invokeTools });
      const outPath = await writeRunArtifact(artifact, options.outDir);
      const summary = renderTerminal(artifact);
      process.stdout.write(`${summary}\nArtifact: ${outPath}\n`);
      if (artifact.gate === "fail") {
        process.exitCode = 1;
      }
    });

  program
    .command("check", { hidden: true })
    .description("Run a single capability check.")
    .argument("<capability>", "tools, prompts, resources, or tools-invoke.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--no-color", "Disable colored output.")
    .action(async (capability: string, options: { target?: string }) => {
      const validCapabilities = ["tools", "prompts", "resources", "tools-invoke"];
      if (!validCapabilities.includes(capability)) {
        throw new Error(`Invalid capability '${capability}'. Must be one of: ${validCapabilities.join(", ")}`);
      }
      const target = await resolveTarget(options);
      const invokeTools = capability === "tools-invoke";
      const artifact = await runTarget(target, { invokeTools });
      const check = artifact.checks.find((ch) => ch.id === capability);
      if (!check) {
        throw new Error(`Check '${capability}' was not found in the run results.`);
      }
      const statusStr = colorStatus(check.status);
      process.stdout.write(`${c(ANSI.bold, capability)}: ${statusStr}\n`);
      process.stdout.write(`${check.message}\n`);
      if (check.evidence.length > 0) {
        for (const ev of check.evidence) {
          if (ev.identifiers && ev.identifiers.length > 0) {
            process.stdout.write(`Items: ${ev.identifiers.join(", ")}\n`);
          }
          if (ev.diagnostics && ev.diagnostics.length > 0) {
            process.stdout.write(`Diagnostics: ${ev.diagnostics.join("; ")}\n`);
          }
        }
      }
    });

  program
    .command("report", { hidden: true })
    .description("Render a run artifact.")
    .requiredOption("--run <artifact>", "Run artifact JSON.")
    .option("--format <format>", "terminal, markdown, json, or html", "terminal")
    .option("--output <file>", "Write to file instead of stdout.")
    .option("--no-color", "Disable colored output.")
    .action(
      async (options: {
        format: "html" | "json" | "markdown" | "terminal";
        output?: string;
        run: string;
      }) => {
        const artifact = await readArtifact(options.run);
        if (artifact.artifactType !== "run") {
          throw new Error("The report command only accepts run artifacts.");
        }
        const output = formatOutput(artifact, options.format);
        await writeOutput(output, options.format, options.output);
      },
    );

  // Default to scan when invoked with no arguments
  if (process.argv.length === 2) {
    process.argv.push("scan");
  }

  await program.parseAsync(process.argv);
}

// ── Scan implementation ─────────────────────────────────────────────────────

async function runScan(bin: string, configPath: string | undefined, invokeTools: boolean): Promise<void> {
  process.stdout.write(useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n\n` : LOGO + `  v${TOOL_VERSION}\n\n`);

  const targets = await scanForTargets(configPath);

  if (targets.length === 0) {
    process.stdout.write(c(ANSI.yellow, "  No MCP servers found.\n\n"));
    process.stdout.write(c(ANSI.dim, "  Looked in ~/.claude.json, Claude Desktop config, .mcp.json\n\n"));
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
  let passCount = 0;
  let failCount = 0;
  let totalTools = 0;
  let totalPrompts = 0;
  let totalResources = 0;

  for (const t of targets) {
    process.stdout.write(`  ${c(ANSI.dim, "⟳")} Checking ${c(ANSI.bold, t.config.targetId)}...`);
    try {
      const artifact = await runTarget(t.config, { invokeTools });
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

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

// ── Utilities ───────────────────────────────────────────────────────────────

function colorStatus(status: string): string {
  switch (status) {
    case "pass":
      return c(ANSI.green, status);
    case "fail":
      return c(ANSI.red, status);
    case "partial":
    case "flaky":
      return c(ANSI.yellow, status);
    case "unsupported":
    case "skipped":
      return c(ANSI.dim, status);
    default:
      return status;
  }
}

async function runWatchMode(target: TargetConfig, outDir: string, intervalSeconds: number): Promise<void> {
  const { diffArtifacts: diff } = await import("./diff.js");

  process.stdout.write(`Watch mode: checking every ${intervalSeconds}s. Press Ctrl+C to stop.\n\n`);

  let previousArtifact = await runTarget(target);
  await writeRunArtifact(previousArtifact, outDir);
  process.stdout.write(`${renderTerminal(previousArtifact)}\n\n`);

  const loop = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));

    const currentArtifact = await runTarget(target);
    const diffResult = diff(previousArtifact, currentArtifact);

    if (diffResult.summary.regressions > 0 || diffResult.summary.recoveries > 0 || diffResult.summary.added > 0 || diffResult.summary.removed > 0) {
      const outPath = await writeRunArtifact(currentArtifact, outDir);
      process.stdout.write(`\n--- Change detected at ${currentArtifact.createdAt} ---\n`);
      process.stdout.write(`${renderTerminal(diffResult)}\n`);
      process.stdout.write(`Artifact: ${outPath}\n\n`);
    }

    previousArtifact = currentArtifact;
    void loop();
  };

  void loop();

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      process.stdout.write("\nWatch mode stopped.\n");
      resolve();
    });
  });
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
