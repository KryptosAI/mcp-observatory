#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import { scanForTargets } from "./discovery.js";
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
import { defaultRunsDirectory } from "./storage.js";
import { validateTargetConfig } from "./validate.js";
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
    throw new Error("No command provided. Pass a target config file with --target or an inline command after --.");
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
  throw new Error("Provide --target <config.json> or pass a command after --, e.g.: mcp-observatory run -- npx -y @modelcontextprotocol/server-filesystem .");
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

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("mcp-observatory")
    .description("Test your MCP servers for breaking changes.")
    .version(TOOL_VERSION)
    .addHelpText("before", useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n` : LOGO + `  v${TOOL_VERSION}\n`);

  // ── Core Commands ───────────────────────────────────────────────────────

  program
    .command("scan")
    .description("Check all MCP servers found in your Claude configs.")
    .option("--config <path>", "Path to a specific MCP config file.")
    .option("--invoke-tools", "Actually call safe tools to verify they execute.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (options: { config?: string; invokeTools: boolean }) => {
      process.stdout.write(useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n\n` : LOGO + `  v${TOOL_VERSION}\n\n`);

      const targets = await scanForTargets(options.config);

      if (targets.length === 0) {
        process.stdout.write(c(ANSI.yellow, "  No MCP servers found.\n\n"));
        process.stdout.write("  Looked in:\n");
        process.stdout.write(c(ANSI.dim, "    ~/.claude.json\n"));
        process.stdout.write(c(ANSI.dim, "    ~/Library/Application Support/Claude/claude_desktop_config.json\n"));
        process.stdout.write(c(ANSI.dim, "    ./.claude.json, ./.mcp.json\n\n"));
        process.stdout.write("  To check a specific server:\n");
        process.stdout.write(`  ${c(ANSI.cyan, "mcp-observatory run -- npx -y @modelcontextprotocol/server-filesystem .")}\n\n`);
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
        tools: string;
        toolCount: number;
        prompts: string;
        promptCount: number;
        resources: string;
        resourceCount: number;
        invoke?: string;
        invokeMsg?: string;
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
          const artifact = await runTarget(t.config, { invokeTools: options.invokeTools });
          const toolsCheck = artifact.checks.find((ch) => ch.id === "tools");
          const promptsCheck = artifact.checks.find((ch) => ch.id === "prompts");
          const resourcesCheck = artifact.checks.find((ch) => ch.id === "resources");
          const invokeCheck = artifact.checks.find((ch) => ch.id === "tools-invoke");

          const toolCount = toolsCheck?.evidence[0]?.itemCount ?? 0;
          const promptCount = promptsCheck?.evidence[0]?.itemCount ?? 0;
          const resourceCount = resourcesCheck?.evidence[0]?.itemCount ?? 0;

          totalTools += toolCount;
          totalPrompts += promptCount;
          totalResources += resourceCount;

          const diagnostics: string[] = [];
          for (const check of artifact.checks) {
            if (check.status === "fail") {
              diagnostics.push(`${check.id}: ${check.message}`);
            } else if (check.status === "partial") {
              diagnostics.push(`${check.id}: ${check.message}`);
            }
          }

          const gateIcon = artifact.gate === "pass" ? c(ANSI.green, " ✓") : c(ANSI.red, " ✗");
          process.stdout.write(`\r  ${gateIcon} ${c(ANSI.bold, t.config.targetId)}${" ".repeat(Math.max(1, 40 - t.config.targetId.length))}`);
          process.stdout.write(`${c(ANSI.dim, `${toolCount} tools, ${promptCount} prompts, ${resourceCount} resources`)}\n`);

          results.push({
            targetId: t.config.targetId,
            gate: artifact.gate,
            tools: toolsCheck?.status ?? "skipped",
            toolCount,
            prompts: promptsCheck?.status ?? "skipped",
            promptCount,
            resources: resourcesCheck?.status ?? "skipped",
            resourceCount,
            invoke: invokeCheck?.status,
            invokeMsg: invokeCheck?.message,
            diagnostics,
          });
          if (artifact.gate === "pass") passCount++; else failCount++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          // Provide a friendlier error message
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

          results.push({
            targetId: t.config.targetId,
            gate: "fail",
            tools: "skipped",
            toolCount: 0,
            prompts: "skipped",
            promptCount: 0,
            resources: "skipped",
            resourceCount: 0,
            error: friendlyMsg,
            diagnostics: [],
          });
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
      const issues = results.filter((r) => r.gate === "fail" || r.diagnostics.some((d) => d.startsWith("tools:") || d.startsWith("prompts:") || d.startsWith("resources:")));
      const invokeIssues = options.invokeTools ? results.filter((r) => r.diagnostics.some((d) => d.startsWith("tools-invoke:"))) : [];
      const allIssues = [...issues, ...invokeIssues.filter((r) => !issues.includes(r))];
      if (allIssues.length > 0) {
        process.stdout.write("\n");
        for (const r of allIssues) {
          if (r.error) continue; // Already printed inline
          if (r.diagnostics.length > 0) {
            process.stdout.write(`  ${c(ANSI.yellow, r.targetId)}:\n`);
            for (const d of r.diagnostics.slice(0, 3)) {
              process.stdout.write(`    ${c(ANSI.dim, "→")} ${d}\n`);
            }
          }
        }
      }

      // ── Next steps ───────────────────────────────────────────────────────
      process.stdout.write("\n");
      if (!options.invokeTools && totalTools > 0) {
        process.stdout.write(c(ANSI.dim, `  Tip: ${c(ANSI.cyan, "mcp-observatory scan --invoke-tools")} to verify tools actually execute\n`));
      }
      if (passCount > 0) {
        process.stdout.write(c(ANSI.dim, `  Tip: ${c(ANSI.cyan, "mcp-observatory run --target <config> --watch")} to monitor for changes\n`));
      }
      process.stdout.write(c(ANSI.dim, `  Tip: ${c(ANSI.cyan, "mcp-observatory run -- <command>")} to check any MCP server by command\n`));
      process.stdout.write("\n");

      if (failCount > 0) {
        process.exitCode = 1;
      }
    });

  program
    .command("run")
    .description("Check one server and save a run artifact.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option(
      "--out-dir <directory>",
      "Directory for persisted run artifacts.",
      defaultRunsDirectory(process.cwd()),
    )
    .option("--watch", "Re-run checks on an interval and diff against the previous run.", false)
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
    .command("check")
    .description("Run a single capability check (tools, prompts, resources, tools-invoke).")
    .argument("<capability>", "Capability to check: tools, prompts, resources, or tools-invoke.")
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

  // ── Analysis Commands ─────────────────────────────────────────────────

  program
    .command("diff")
    .description("Compare two runs and show regressions, recoveries, and schema drift.")
    .requiredOption("--base <artifact>", "Base run artifact JSON.")
    .requiredOption("--head <artifact>", "Head run artifact JSON.")
    .option("--format <format>", "terminal, json, markdown, or html", "terminal")
    .option("--output <file>", "Write to file instead of stdout.")
    .option("--no-color", "Disable colored output.")
    .option("--fail-on-regression", "Exit with code 1 when regressions are present.", false)
    .action(
      async (options: {
        base: string;
        failOnRegression?: boolean;
        format: "html" | "json" | "markdown" | "terminal";
        head: string;
        output?: string;
      }) => {
        const baseArtifact = await readArtifact(options.base);
        const headArtifact = await readArtifact(options.head);

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

  program
    .command("report")
    .description("Render a run artifact as terminal, markdown, json, or html.")
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

  // ── Server Mode ───────────────────────────────────────────────────────

  program
    .command("serve")
    .description("Run as an MCP server. Exposes scan, check, diff, suggest as tools for AI agents.")
    .action(async () => {
      const { startServer } = await import("./server.js");
      await startServer();
    });

  // Default to scan when invoked with no arguments
  if (process.argv.length === 2) {
    process.argv.push("scan");
  }

  await program.parseAsync(process.argv);
}

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
  // Make common errors friendlier
  let friendly = message;
  if (message.includes("Unexpected end of JSON") || message.includes("Unexpected token")) {
    friendly = "Invalid config file — expected valid JSON. Check the file path and contents.";
  } else if (message.includes("ENOENT")) {
    friendly = `File not found: ${message.replace(/.*ENOENT[^']*'([^']*)'.*/, "$1")}`;
  }
  process.stderr.write(`\n  ${useColor() ? `\x1b[31m✗\x1b[0m` : "✗"} ${friendly}\n\n`);
  process.exitCode = 1;
});
