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

async function readTargetConfig(filePath: string): Promise<TargetConfig> {
  const content = await readFile(filePath, "utf8");
  return validateTargetConfig(JSON.parse(content));
}

function useColor(): boolean {
  return !process.env["NO_COLOR"] && !process.argv.includes("--no-color");
}

const ANSI = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
} as const;

function c(code: string, text: string): string {
  return useColor() ? `${code}${text}${ANSI.reset}` : text;
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("mcp-observatory")
    .description(
      "Regression intelligence for MCP targets: detect, diff, and explain interoperability drift over time.",
    )
    .version(TOOL_VERSION);

  program
    .command("run")
    .requiredOption("--target <config>", "Path to a target config JSON file.")
    .option(
      "--out-dir <directory>",
      "Directory for persisted run artifacts.",
      defaultRunsDirectory(process.cwd()),
    )
    .option("--watch", "Re-run checks on an interval and diff against the previous run.", false)
    .option("--interval <seconds>", "Interval in seconds for watch mode.", "30")
    .option("--invoke-tools", "Invoke safe tools (no required params) to verify they execute.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (options: { outDir: string; target: string; watch: boolean; interval: string; invokeTools: boolean }) => {
      const target = await readTargetConfig(options.target);

      if (options.watch) {
        await runWatchMode(target, options.outDir, parseInt(options.interval, 10) || 30);
        return;
      }

      const artifact = await runTarget(target, { invokeTools: options.invokeTools });
      const outPath = await writeRunArtifact(artifact, options.outDir);
      const summary = renderTerminal(artifact);
      process.stdout.write(`${summary}\nArtifact: ${outPath}\n`);
    });

  program
    .command("diff")
    .requiredOption("--base <artifact>", "Base run artifact JSON.")
    .requiredOption("--head <artifact>", "Head run artifact JSON.")
    .option("--format <format>", "terminal, json, markdown, or html", "terminal")
    .option("--output <file>", "Optional output file path (useful for html format).")
    .option("--no-color", "Disable colored output.")
    .option(
      "--fail-on-regression",
      "Exit with code 1 when regressions are present.",
      false,
    )
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
        const output =
          options.format === "json"
            ? JSON.stringify(artifact, null, 2)
            : options.format === "markdown"
              ? renderMarkdown(artifact)
              : options.format === "html"
                ? renderHtml(artifact)
                : renderTerminal(artifact);

        if (options.output !== undefined) {
          await mkdir(path.dirname(options.output), { recursive: true });
          await writeFile(options.output, output + "\n", "utf8");
          process.stdout.write(`Wrote ${options.format} report to ${options.output}\n`);
        } else {
          process.stdout.write(`${output}\n`);
        }

        if (options.failOnRegression && artifact.gate === "fail") {
          process.exitCode = 1;
        }
      },
    );

  program
    .command("report")
    .requiredOption("--run <artifact>", "Run artifact JSON.")
    .option("--format <format>", "terminal, markdown, json, or html", "terminal")
    .option("--output <file>", "Optional output file path (useful for html format).")
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
        const output =
          options.format === "json"
            ? JSON.stringify(artifact, null, 2)
            : options.format === "markdown"
              ? renderMarkdown(artifact)
              : options.format === "html"
                ? renderHtml(artifact)
                : renderTerminal(artifact);

        if (options.output !== undefined) {
          await mkdir(path.dirname(options.output), { recursive: true });
          await writeFile(options.output, output + "\n", "utf8");
          process.stdout.write(`Wrote ${options.format} report to ${options.output}\n`);
          return;
        }

        process.stdout.write(`${output}\n`);
      },
    );

  program
    .command("scan")
    .description("Auto-discover MCP server configs and run checks against each discovered server.")
    .option("--config <path>", "Path to a specific MCP config file.")
    .option("--invoke-tools", "Invoke safe tools (no required params) to verify they execute.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (options: { config?: string; invokeTools: boolean }) => {
      const targets = await scanForTargets(options.config);

      if (targets.length === 0) {
        process.stdout.write("No MCP server configs found.\n");
        return;
      }

      process.stdout.write(c(ANSI.bold, `Discovered ${targets.length} MCP server(s):\n`));
      for (const t of targets) {
        process.stdout.write(`  ${t.config.targetId} (from ${t.source})\n`);
      }
      process.stdout.write("\n");

      const results: { targetId: string; gate: string; tools: string; prompts: string; resources: string; invoke?: string }[] = [];

      for (const t of targets) {
        process.stdout.write(`Running checks for ${c(ANSI.bold, t.config.targetId)}...\n`);
        try {
          const artifact = await runTarget(t.config, { invokeTools: options.invokeTools });
          const toolsStatus = artifact.checks.find((ch) => ch.id === "tools")?.status ?? "skipped";
          const promptsStatus = artifact.checks.find((ch) => ch.id === "prompts")?.status ?? "skipped";
          const resourcesStatus = artifact.checks.find((ch) => ch.id === "resources")?.status ?? "skipped";
          const invokeStatus = artifact.checks.find((ch) => ch.id === "tools-invoke")?.status;
          results.push({
            targetId: t.config.targetId,
            gate: artifact.gate,
            tools: toolsStatus,
            prompts: promptsStatus,
            resources: resourcesStatus,
            invoke: invokeStatus,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          results.push({
            targetId: t.config.targetId,
            gate: "fail",
            tools: "skipped",
            prompts: "skipped",
            resources: "skipped",
          });
          process.stderr.write(`  Error: ${msg}\n`);
        }
      }

      const showInvoke = options.invokeTools;
      process.stdout.write("\n" + c(ANSI.bold, "Scan Results:\n"));
      let header = `${"Target".padEnd(30)} ${"Gate".padEnd(6)} ${"Tools".padEnd(14)} ${"Prompts".padEnd(14)} ${"Resources".padEnd(14)}`;
      let separator = `${"─".repeat(30)} ${"─".repeat(6)} ${"─".repeat(14)} ${"─".repeat(14)} ${"─".repeat(14)}`;
      if (showInvoke) {
        header += ` ${"Invoke".padEnd(14)}`;
        separator += ` ${"─".repeat(14)}`;
      }
      process.stdout.write(`${header}\n${separator}\n`);

      for (const r of results) {
        const gateStr = r.gate === "pass" ? c(ANSI.green, "pass") : c(ANSI.red, "fail");
        const pad = useColor() ? 9 : 0;
        let line = `${r.targetId.padEnd(30)} ${gateStr.padEnd(6 + pad)} ${colorStatus(r.tools).padEnd(14 + pad)} ${colorStatus(r.prompts).padEnd(14 + pad)} ${colorStatus(r.resources).padEnd(14 + pad)}`;
        if (showInvoke) {
          line += ` ${colorStatus(r.invoke ?? "skipped")}`;
        }
        process.stdout.write(`${line}\n`);
      }
    });

  program
    .command("check")
    .description("Run a single capability check against a target.")
    .argument("<capability>", "Capability to check: tools, prompts, resources, or tools-invoke.")
    .requiredOption("--target <config>", "Path to a target config JSON file.")
    .option("--no-color", "Disable colored output.")
    .action(async (capability: string, options: { target: string }) => {
      const validCapabilities = ["tools", "prompts", "resources", "tools-invoke"];
      if (!validCapabilities.includes(capability)) {
        throw new Error(`Invalid capability '${capability}'. Must be one of: ${validCapabilities.join(", ")}`);
      }

      const target = await readTargetConfig(options.target);
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

  // Keep the process alive until Ctrl+C
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      process.stdout.write("\nWatch mode stopped.\n");
      resolve();
    });
  });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
