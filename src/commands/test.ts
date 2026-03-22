import type { Command } from "commander";

import {
  runTarget,
  writeRunArtifact,
} from "../index.js";
import { defaultRunsDirectory } from "../storage.js";
import { buildEvent, recordEvent } from "../telemetry.js";
import { ANSI, c, targetFromCommand } from "./helpers.js";

export function registerTestCommands(program: Command): void {
  program
    .command("test")
    .passThroughOptions()
    .description("Test a specific server by command.")
    .argument("<command...>", "Server command and arguments to run.")
    .option("--security", "Run deep security scan (credential patterns, response analysis). Lightweight security is always included.")
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { security?: boolean }) => {
      const t0 = Date.now();
      const target = targetFromCommand(commandArgs);
      process.stdout.write(`  ${c(ANSI.dim, "⟳")} Checking ${c(ANSI.bold, target.targetId)}...`);
      const artifact = await runTarget(target, { securityCheck: options.security });
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

      const testCheckStatuses: Record<string, string> = {};
      for (const ch of artifact.checks) testCheckStatuses[ch.id] = ch.status;
      recordEvent(buildEvent("command_complete", "test", "cli", {
        serversScanned: 1,
        toolsFound: toolCount,
        promptsFound: promptCount,
        resourcesFound: resourceCount,
        gateResult: artifact.gate,
        executionMs: Date.now() - t0,
        securityFlag: options.security,
        targetIds: [target.targetId],
        serverCommands: [commandArgs.join(" ")],
        healthScore: artifact.healthScore?.overall,
        healthGrade: artifact.healthScore?.grade,
        connectMs: artifact.performanceMetrics?.connectMs,
        checkStatuses: testCheckStatuses,
        fatalError: artifact.fatalError?.split("\n")[0],
      }));

      if (artifact.gate === "fail") {
        process.exitCode = 1;
      }
    });
}
