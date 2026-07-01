import type { Command } from "commander";

import {
  readArtifact,
  renderTerminal,
  runTarget,
  writeRunArtifact,
} from "../index.js";
import { appendHistory, buildHistoryEntry } from "../history.js";
import { defaultRunsDirectory } from "../storage.js";
import { buildEvent, recordEvent } from "../telemetry.js";
import { ANSI, c, colorStatus, formatOutput, resolveTarget, writeOutput } from "./helpers.js";
import { maybeConvertPassingCheckToCi, type SetupCiConversionFlags } from "./setup-ci-conversion.js";
import { runWatchMode } from "./watch.js";

export function registerLegacyCommands(program: Command): void {
  program
    .command("run", { hidden: true })
    .description("Check one server and save a run artifact.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--out-dir <directory>", "Directory for persisted run artifacts.", defaultRunsDirectory(process.cwd()))
    .option("--watch", "Re-run checks on an interval.", false)
    .option("--interval <seconds>", "Interval in seconds for watch mode.", "30")
    .option("--invoke-tools", "Actually call safe tools to verify they execute.", false)
    .option("--setup-ci", "Offer CI conversion after a successful check; use with --yes in non-interactive runs to write files.", false)
    .option("--yes", "Confirm CI conversion without prompting. Only writes when used with --setup-ci.", false)
    .option("--no-setup-ci", "Suppress the post-success CI conversion prompt and hint.")
    .option("--force", "Overwrite existing generated CI adoption files.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (options: { outDir: string; target?: string; watch: boolean; interval: string; invokeTools: boolean } & SetupCiConversionFlags) => {
      const target = await resolveTarget(options);
      if (options.watch) {
        await runWatchMode(target, options.outDir, parseInt(options.interval, 10) || 30);
        return;
      }
      const t0 = Date.now();
      const artifact = await runTarget(target, { invokeTools: options.invokeTools });
      const outPath = await writeRunArtifact(artifact, options.outDir);
      const summary = renderTerminal(artifact);
      process.stdout.write(`${summary}\nArtifact: ${outPath}\n`);

      // Track history + telemetry
      await appendHistory(buildHistoryEntry(artifact)).catch(() => {});
      const toolCount = artifact.checks.find(ch => ch.id === "tools")?.evidence[0]?.itemCount ?? 0;
      const promptCount = artifact.checks.find(ch => ch.id === "prompts")?.evidence[0]?.itemCount ?? 0;
      const resourceCount = artifact.checks.find(ch => ch.id === "resources")?.evidence[0]?.itemCount ?? 0;
      const checkStatuses: Record<string, string> = {};
      for (const ch of artifact.checks) checkStatuses[ch.id] = ch.status;
      recordEvent(buildEvent("command_complete", "run", "cli", {
        serversScanned: 1,
        toolsFound: toolCount,
        promptsFound: promptCount,
        resourcesFound: resourceCount,
        gateResult: artifact.gate,
        executionMs: Date.now() - t0,
        targetIds: [target.targetId],
        healthScore: artifact.healthScore?.overall,
        healthGrade: artifact.healthScore?.grade,
        connectMs: artifact.performanceMetrics?.connectMs,
        checkStatuses,
        fatalError: artifact.fatalError?.split("\n")[0],
      }));

      if (artifact.gate === "fail") {
        process.exitCode = 1;
      } else {
        await maybeConvertPassingCheckToCi({
          artifact,
          target,
          targetPath: options.target,
          setupCi: options.setupCi,
          yes: options.yes,
          noSetupCi: options.noSetupCi,
          force: options.force,
        });
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
    .option("--format <format>", "terminal, markdown, pr-comment, json, or html", "terminal")
    .option("--output <file>", "Write to file instead of stdout.")
    .option("--no-color", "Disable colored output.")
    .action(
      async (options: {
        format: "html" | "json" | "junit" | "markdown" | "pr-comment" | "sarif" | "terminal";
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
}
