import type { Command } from "commander";

import {
  runTarget,
  writeRunArtifact,
} from "../index.js";
import { defaultRunsDirectory } from "../storage.js";
import { appendHistory, buildHistoryEntry, getTrend, readHistory } from "../history.js";
import { renderSarif } from "../reporters/sarif.js";
import { buildEvent, recordEvent } from "../telemetry.js";
import { maybePrintCloudCta } from "../commercial.js";
import { ANSI, c, resolveTarget, targetFromCommand, writeOutput } from "./helpers.js";
import { maybeConvertPassingCheckToCi, type SetupCiConversionFlags } from "./setup-ci-conversion.js";

interface TestCommandFlags extends SetupCiConversionFlags {
  sarif?: string;
}

function extractTrailingConversionFlags(
  commandArgs: string[],
  options: TestCommandFlags,
): { commandArgs: string[]; flags: TestCommandFlags } {
  const flags: TestCommandFlags = { ...options };
  const targetArgs: string[] = [];
  for (let i = 0; i < commandArgs.length; i += 1) {
    const arg = commandArgs[i]!;
    if (arg === "--setup-ci") {
      flags.setupCi = true;
    } else if (arg === "--yes") {
      flags.yes = true;
    } else if (arg === "--no-setup-ci") {
      flags.noSetupCi = true;
    } else if (arg === "--force") {
      flags.force = true;
    } else if (arg === "--sarif") {
      const next = commandArgs[i + 1];
      if (!next) throw new Error("--sarif requires an output file.");
      flags.sarif = next;
      i += 1;
    } else {
      targetArgs.push(arg);
    }
  }
  return { commandArgs: targetArgs, flags };
}

export function registerTestCommands(program: Command): void {
  program
    .command("test")
    .passThroughOptions()
    .description("Test a specific server by command.")
    .argument("[command...]", "Server command and arguments to run.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--deep", "Also invoke safe tools to verify they execute.")
    .option("--invoke-tools", "Alias for --deep.")
    .option("--security", "Run deep security scan (credential patterns, response analysis). Lightweight security is always included.")
    .option("--sarif <file>", "Write a GitHub Code Scanning SARIF report after the run.")
    .option("--setup-ci", "Offer CI conversion after a successful check; use with --yes in non-interactive runs to write files.", false)
    .option("--yes", "Confirm CI conversion without prompting. Only writes when used with --setup-ci.", false)
    .option("--no-setup-ci", "Suppress the post-success CI conversion prompt and hint.")
    .option("--force", "Overwrite existing generated CI adoption files.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { deep?: boolean; invokeTools?: boolean; security?: boolean; target?: string } & TestCommandFlags) => {
      const extracted = extractTrailingConversionFlags(commandArgs, options);
      commandArgs = extracted.commandArgs;
      const conversionFlags = extracted.flags;
      const t0 = Date.now();
      const target = options.target ? await resolveTarget({ target: options.target }) : targetFromCommand(commandArgs);
      process.stdout.write(`  ${c(ANSI.dim, "⟳")} Checking ${c(ANSI.bold, target.targetId)}...`);
      const artifact = await runTarget(target, { invokeTools: options.deep || options.invokeTools, securityCheck: options.security });
      const outPath = await writeRunArtifact(artifact, defaultRunsDirectory(process.cwd()));
      if (conversionFlags.sarif) {
        await writeOutput(renderSarif(artifact, { artifactUri: outPath }), "sarif", conversionFlags.sarif);
      }

      const toolsEvidence = artifact.checks.find(ch => ch.id === "tools");
      const promptsEvidence = artifact.checks.find(ch => ch.id === "prompts");
      const resourcesEvidence = artifact.checks.find(ch => ch.id === "resources");
      const toolCount = toolsEvidence?.evidence[0]?.itemCount ?? 0;
      const promptCount = promptsEvidence?.evidence[0]?.itemCount ?? 0;
      const resourceCount = resourcesEvidence?.evidence[0]?.itemCount ?? 0;

      const gateIcon = artifact.gate === "pass" ? c(ANSI.green, "✓") : c(ANSI.red, "✗");
      process.stdout.write(`\r  ${gateIcon} ${c(ANSI.bold, target.targetId)}${" ".repeat(Math.max(1, 40 - target.targetId.length))}`);
      process.stdout.write(`${c(ANSI.dim, `${toolCount} tools, ${promptCount} prompts, ${resourceCount} resources`)}\n`);

      for (const check of artifact.checks) {
        if (check.status === "fail" || check.status === "partial") {
          process.stdout.write(`    ${c(ANSI.dim, "→")} ${check.id}: ${check.message}\n`);
        }
      }

      process.stdout.write(`\n  ${c(ANSI.dim, `Artifact: ${outPath}`)}\n\n`);

      // Track history
      const historyEntry = buildHistoryEntry(artifact);
      await appendHistory(historyEntry).catch(() => {});
      const history = await readHistory().catch(() => ({ version: 1 as const, entries: [] }));
      const trend = getTrend(target.targetId, history);

      const testCheckStatuses: Record<string, string> = {};
      for (const ch of artifact.checks) testCheckStatuses[ch.id] = ch.status;
      recordEvent(buildEvent("command_complete", "test", "cli", {
        historyEntryCount: history.entries.length,
        trendDirection: trend?.direction,
        previousGrade: trend?.previous?.grade,
        serversScanned: 1,
        toolsFound: toolCount,
        promptsFound: promptCount,
        resourcesFound: resourceCount,
        gateResult: artifact.gate,
        executionMs: Date.now() - t0,
        deepFlag: options.deep || options.invokeTools,
        securityFlag: options.security,
        targetIds: [target.targetId],
        serverCommands: [target.adapter === "http" ? target.url : `${target.command} ${target.args.join(" ")}`],
        healthScore: artifact.healthScore?.overall,
        healthGrade: artifact.healthScore?.grade,
        connectMs: artifact.performanceMetrics?.connectMs,
        checkStatuses: testCheckStatuses,
        fatalError: artifact.fatalError?.split("\n")[0],
      }));

      if (artifact.gate === "fail") {
        process.exitCode = 1;
      } else {
        await maybeConvertPassingCheckToCi({
          artifact,
          target,
          targetPath: options.target,
          setupCi: conversionFlags.setupCi,
          yes: conversionFlags.yes,
          noSetupCi: conversionFlags.noSetupCi,
          force: conversionFlags.force,
        });
      }
      maybePrintCloudCta(options.security ? "security" : "general");
    });
}
