import type { Command } from "commander";

import {
  runTarget,
  writeRunArtifact,
} from "../index.js";
import { defaultRunsDirectory } from "../storage.js";
import { appendHistory, buildHistoryEntry, getTrend, readHistory } from "../history.js";
import { buildEvent, recordEvent } from "../telemetry.js";
import { maybePrintCloudCta } from "../commercial.js";
import { ANSI, c, printCiConversionCta, resolveTarget, targetFromCommand } from "./helpers.js";

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
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { deep?: boolean; invokeTools?: boolean; security?: boolean; target?: string }) => {
      const t0 = Date.now();
      const target = options.target ? await resolveTarget({ target: options.target }) : targetFromCommand(commandArgs);
      process.stdout.write(`  ${c(ANSI.dim, "⟳")} Checking ${c(ANSI.bold, target.targetId)}...`);
      const artifact = await runTarget(target, { invokeTools: options.deep || options.invokeTools, securityCheck: options.security });
      const outPath = await writeRunArtifact(artifact, defaultRunsDirectory(process.cwd()));

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
        printCiConversionCta({
          context: "keep this passing in CI:",
          target,
          targetPath: options.target,
        });
      }
      maybePrintCloudCta(options.security ? "security" : "general");
    });
}
