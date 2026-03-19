#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import {
  diffArtifacts,
  readArtifact,
  renderJson,
  renderMarkdown,
  renderTerminal,
  runTarget,
  writeRunArtifact,
  type TargetConfig
} from "./index.js";
import { defaultRunsDirectory } from "./storage/filesystem.js";
import { TOOL_VERSION } from "./version.js";

async function readTargetConfig(filePath: string): Promise<TargetConfig> {
  const artifact = await readArtifact(filePath);
  return artifact as unknown as TargetConfig;
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
    .action(async (options: { outDir: string; target: string }) => {
      const target = await readTargetConfig(options.target);
      const artifact = await runTarget(target);
      const outPath = await writeRunArtifact(artifact, options.outDir);
      const summary = renderTerminal(artifact);
      process.stdout.write(`${summary}\nArtifact: ${outPath}\n`);
    });

  program
    .command("diff")
    .requiredOption("--base <artifact>", "Base run artifact JSON.")
    .requiredOption("--head <artifact>", "Head run artifact JSON.")
    .option("--format <format>", "terminal, json, or markdown", "terminal")
    .option(
      "--fail-on-regression",
      "Exit with code 1 when regressions are present.",
      false,
    )
    .action(
      async (options: {
        base: string;
        failOnRegression?: boolean;
        format: "json" | "markdown" | "terminal";
        head: string;
      }) => {
        const baseArtifact = await readArtifact(options.base);
        const headArtifact = await readArtifact(options.head);

        if (baseArtifact.artifactType !== "run" || headArtifact.artifactType !== "run") {
          throw new Error("The diff command only accepts run artifacts.");
        }

        const artifact = diffArtifacts(baseArtifact, headArtifact);
        const output =
          options.format === "json"
            ? renderJson(artifact)
            : options.format === "markdown"
              ? renderMarkdown(artifact)
              : renderTerminal(artifact);
        process.stdout.write(`${output}\n`);
        if (options.failOnRegression && artifact.gate === "fail") {
          process.exitCode = 1;
        }
      },
    );

  program
    .command("report")
    .requiredOption("--run <artifact>", "Run artifact JSON.")
    .option("--format <format>", "terminal, markdown, or json", "terminal")
    .option("--output <file>", "Optional output file path.")
    .action(
      async (options: {
        format: "json" | "markdown" | "terminal";
        output?: string;
        run: string;
      }) => {
        const artifact = await readArtifact(options.run);
        if (artifact.artifactType !== "run") {
          throw new Error("The report command only accepts run artifacts.");
        }
        const output =
          options.format === "json"
            ? renderJson(artifact)
            : options.format === "markdown"
              ? renderMarkdown(artifact)
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

  await program.parseAsync(process.argv);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
