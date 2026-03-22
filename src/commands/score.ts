import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";

import { generateBadgeSvg } from "../badge.js";
import {
  runTarget,
  writeRunArtifact,
} from "../index.js";
import { defaultRunsDirectory } from "../storage.js";
import { buildEvent, recordEvent } from "../telemetry.js";
import { ANSI, c, formatOutput, targetFromCommand, writeOutput } from "./helpers.js";

export function registerScoreCommands(program: Command): void {
  // ── score ────────────────────────────────────────────────────────────

  program
    .command("score")
    .passThroughOptions()
    .description("Score an MCP server's health (0-100).")
    .argument("<command...>", "Server command and arguments to run.")
    .option("--format <format>", "terminal, json, junit, markdown, html, or sarif", "terminal")
    .option("--output <file>", "Write to file instead of stdout.")
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { format: string; output?: string }) => {
      const t0 = Date.now();
      const target = targetFromCommand(commandArgs);
      process.stdout.write(`${c(ANSI.dim, "⟳")} Scoring ${c(ANSI.bold, target.targetId)}...\n\n`);
      const artifact = await runTarget(target, { invokeTools: true, securityCheck: true });
      await writeRunArtifact(artifact, defaultRunsDirectory(process.cwd()));

      const toolsCheck = artifact.checks.find(ch => ch.id === "tools");
      recordEvent(buildEvent("command_complete", "score", "cli", {
        serversScanned: 1,
        toolsFound: toolsCheck?.evidence[0]?.itemCount ?? 0,
        gateResult: artifact.gate,
        executionMs: Date.now() - t0,
        securityFlag: true,
        targetIds: [target.targetId],
      }));

      if (options.format !== "terminal") {
        const output = formatOutput(artifact, options.format as "json" | "junit" | "sarif" | "markdown" | "html" | "terminal");
        await writeOutput(output, options.format, options.output);
        return;
      }

      const score = artifact.healthScore;
      if (!score) {
        process.stdout.write(`  ${c(ANSI.red, "✗")} Could not compute health score.\n`);
        if (artifact.fatalError) {
          process.stdout.write(`    Fatal: ${artifact.fatalError.split("\n")[0]}\n`);
        }
        const passed = artifact.checks.filter(ch => ch.status === "pass").length;
        const failed = artifact.checks.filter(ch => ch.status === "fail").length;
        const skipped = artifact.checks.filter(ch => ch.status === "skipped").length;
        if (artifact.checks.length > 0) {
          process.stdout.write(`    Checks: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
        }
        process.stdout.write("\n");
        return;
      }

      const gradeColor = score.grade === "A" || score.grade === "B" ? ANSI.green
        : score.grade === "C" ? ANSI.yellow
        : ANSI.red;

      process.stdout.write(c(ANSI.bold, `  MCP Health Score: ${c(gradeColor, `${score.overall}/100`)} (${c(gradeColor, score.grade)})\n\n`));

      for (const dim of score.dimensions) {
        const filled = Math.round(dim.score / 5);
        const empty = 20 - filled;
        const bar = "█".repeat(filled) + "░".repeat(empty);
        const dimColor = dim.score >= 80 ? ANSI.green : dim.score >= 60 ? ANSI.yellow : ANSI.red;
        const weightPct = Math.round(dim.weight * 100);
        process.stdout.write(`  ${dim.name.padEnd(22)} ${c(dimColor, bar)} ${String(dim.score).padStart(3)}  ${c(ANSI.dim, `(weight: ${weightPct}%)`)}\n`);
      }
      process.stdout.write("\n");

      // Show details for dimensions that aren't perfect
      for (const dim of score.dimensions) {
        if (dim.score < 100 && dim.details.length > 0) {
          process.stdout.write(`  ${c(ANSI.dim, dim.name + ":")}\n`);
          for (const detail of dim.details) {
            process.stdout.write(`    ${c(ANSI.dim, "→")} ${detail}\n`);
          }
        }
      }
      process.stdout.write("\n");

      if (artifact.gate === "fail") {
        process.exitCode = 1;
      }
    });

  // ── badge ───────────────────────────────────────────────────────────

  program
    .command("badge")
    .passThroughOptions()
    .description("Generate an SVG health score badge for your README.")
    .argument("<command...>", "Server command and arguments to run.")
    .option("--output <file>", "Write SVG to file (default: stdout).")
    .option("--label <text>", "Badge label text.", "MCP Health")
    .action(async (commandArgs: string[], options: { output?: string; label: string }) => {
      const target = targetFromCommand(commandArgs);
      process.stderr.write(`${c(ANSI.dim, "⟳")} Scoring ${c(ANSI.bold, target.targetId)}...\n`);
      const artifact = await runTarget(target, { invokeTools: true, securityCheck: true });

      const score = artifact.healthScore;
      if (!score) {
        process.stderr.write(`  ${c(ANSI.red, "✗")} Could not compute health score.\n`);
        if (artifact.fatalError) {
          process.stderr.write(`    Fatal: ${artifact.fatalError.split("\n")[0]}\n`);
        }
        const passed = artifact.checks.filter(ch => ch.status === "pass").length;
        const failed = artifact.checks.filter(ch => ch.status === "fail").length;
        const skipped = artifact.checks.filter(ch => ch.status === "skipped").length;
        if (artifact.checks.length > 0) {
          process.stderr.write(`    Checks: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
        }
        process.exitCode = 1;
        return;
      }

      const svg = generateBadgeSvg({ score: score.overall, grade: score.grade, label: options.label });

      if (options.output) {
        await mkdir(path.dirname(options.output), { recursive: true });
        await writeFile(options.output, svg, "utf8");
        process.stderr.write(`  Badge written to ${options.output}\n`);
      } else {
        process.stdout.write(svg);
      }
    });
}
