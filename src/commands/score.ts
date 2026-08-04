import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";

import { generateBadgeSvg } from "../badge.js";
import { auditScore, resolveAuditTarget, runAudit } from "../audit.js";
import {
  runTarget,
  writeRunArtifact,
} from "../index.js";
import { defaultRunsDirectory } from "../storage.js";
import { buildEvent, generateSessionId, recordEvent, recordSessionEnd, recordSessionStart } from "../telemetry.js";
import { maybePrintCloudCta } from "../commercial.js";
import { extractObservatoryFindings } from "../findings.js";
import { ANSI, c, formatOutput, isQuiet, printCiConversionCta, targetFromCommand, writeOutput } from "./helpers.js";

function extractTrailingProfileScoreFlags(
  args: string[],
  options: { profile?: string; format: string; output?: string },
): { commandArgs: string[]; options: { profile?: string; format: string; output?: string } } {
  const commandArgs: string[] = [];
  const nextOptions = { ...options };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "--profile") {
      const next = args[i + 1];
      if (!next) throw new Error("--profile requires a value.");
      nextOptions.profile = next;
      i += 1;
    } else if (arg === "--format") {
      const next = args[i + 1];
      if (!next) throw new Error("--format requires a value.");
      nextOptions.format = next;
      i += 1;
    } else if (arg === "--output") {
      const next = args[i + 1];
      if (!next) throw new Error("--output requires a value.");
      nextOptions.output = next;
      i += 1;
    } else if (arg === "--no-color") {
      // Commander handles color globally; keep it out of the server command.
    } else {
      commandArgs.push(arg);
    }
  }
  return { commandArgs, options: nextOptions };
}

export function registerScoreCommands(program: Command): void {
  // ── score ────────────────────────────────────────────────────────────

  program
    .command("score")
    .passThroughOptions()
    .description("Score an MCP server's health (0-100).")
    .argument("<command...>", "Server command and arguments to run.")
    .option("--profile <profile>", "Return profile trust score output, for example nsa-mcp.")
    .option("--format <format>", "terminal, json, junit, markdown, html, or sarif", "terminal")
    .option("--output <file>", "Write to file instead of stdout.")
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { profile?: string; format: string; output?: string }) => {
      const sessionId = generateSessionId();
      recordSessionStart(sessionId);
      const extracted = extractTrailingProfileScoreFlags(commandArgs, options);
      commandArgs = extracted.commandArgs;
      options = extracted.options;
      const t0 = Date.now();
      if (options.profile) {
        const target = await resolveAuditTarget(commandArgs);
        const report = await runAudit(target, options.profile);
        const score = auditScore(report);
        const output = options.format === "json" || options.format === "terminal"
          ? JSON.stringify(score, null, options.format === "json" ? 2 : 0)
          : JSON.stringify(score, null, 2);
        if (options.output) {
          await writeOutput(output, "json", options.output);
        } else {
          process.stdout.write(`${output}\n`);
        }
        recordEvent(buildEvent("command_complete", "score", "cli", {
          serversScanned: 1,
          gateResult: score.status,
          executionMs: Date.now() - t0,
          securityFlag: true,
          securityFindingCount: score.finding_count,
          targetIds: [target.targetId],
          targetServer: target.targetId,
          stageOverride: "assessment",
        }));
        recordSessionEnd(sessionId);
        return;
      }
      const target = targetFromCommand(commandArgs);
      process.stdout.write(`${c(ANSI.dim, "⟳")} Scoring ${c(ANSI.bold, target.targetId)}...\n\n`);
      recordSessionStart(generateSessionId());
      const artifact = await runTarget(target, { invokeTools: true, securityCheck: true });
      await writeRunArtifact(artifact, defaultRunsDirectory(process.cwd()));

      const toolsCheck = artifact.checks.find(ch => ch.id === "tools");
      const promptsCheck = artifact.checks.find(ch => ch.id === "prompts");
      const resourcesCheck = artifact.checks.find(ch => ch.id === "resources");
      const scoreCheckStatuses: Record<string, string> = {};
      for (const ch of artifact.checks) scoreCheckStatuses[ch.id] = ch.status;
      const allFindings = extractObservatoryFindings(artifact);
      const severityCounts = { high: 0, medium: 0, low: 0 };
      for (const f of allFindings) {
        if (f.severity === "high") severityCounts.high++;
        else if (f.severity === "medium") severityCounts.medium++;
        else if (f.severity === "low") severityCounts.low++;
      }
      recordEvent(buildEvent("command_complete", "score", "cli", {
        serversScanned: 1,
        toolsFound: toolsCheck?.evidence[0]?.itemCount ?? 0,
        promptsFound: promptsCheck?.evidence[0]?.itemCount ?? 0,
        resourcesFound: resourcesCheck?.evidence[0]?.itemCount ?? 0,
        gateResult: artifact.gate,
        executionMs: Date.now() - t0,
        securityFlag: true,
        targetIds: [target.targetId],
        serverCommands: [commandArgs.join(" ")],
        healthScore: artifact.healthScore?.overall,
        healthGrade: artifact.healthScore?.grade,
        connectMs: artifact.performanceMetrics?.connectMs,
        checkStatuses: scoreCheckStatuses,
        fatalError: artifact.fatalError?.split("\n")[0],
        targetServer: target.targetId,
        findingSeverityCounts: JSON.stringify(severityCounts),
        stageOverride: "assessment",
      }));

      if (options.format !== "terminal") {
        const output = formatOutput(artifact, options.format);
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

      const enforceTargetCmd = target.adapter === "local-process"
        ? `${target.command} ${(target.args ?? []).join(" ")}`
        : target.targetId;

      const boxWidth = 40;
      const scoreLine = `Score: ${score.grade} (${score.overall}/100)`;
      const protectLine = "Protect this server at runtime:";
      const enforceLine = `npx @kryptosai/mcp-observatory enforce ${enforceTargetCmd}`;
      const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));
      if (!isQuiet()) {
        process.stdout.write(`  ${c(ANSI.bold, "╔")}${"═".repeat(boxWidth)}${c(ANSI.bold, "╗")}\n`);
        process.stdout.write(`  ${c(ANSI.bold, "║")}  ${pad(scoreLine, boxWidth - 2)}${c(ANSI.bold, "║")}\n`);
        process.stdout.write(`  ${c(ANSI.bold, "║")}  ${pad(protectLine, boxWidth - 2)}${c(ANSI.bold, "║")}\n`);
        process.stdout.write(`  ${c(ANSI.bold, "║")}  ${pad(enforceLine, boxWidth - 2)}${c(ANSI.bold, "║")}\n`);
        process.stdout.write(`  ${c(ANSI.bold, "╚")}${"═".repeat(boxWidth)}${c(ANSI.bold, "╝")}\n`);
        process.stdout.write("\n");
      }

      if (artifact.gate !== "fail") {
        printCiConversionCta({
          context: "turn this score into a public trust signal:",
          target,
        });
      }
      maybePrintCloudCta("security");

      if (artifact.gate === "fail") {
        process.exitCode = 1;
      }
      recordSessionEnd(sessionId);
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
