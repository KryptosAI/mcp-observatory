import { createInterface } from "node:readline";
import { execSync } from "node:child_process";
import type { Command } from "commander";

import {
  runTarget,
  writeRunArtifact,
} from "../index.js";
import { defaultRunsDirectory } from "../storage.js";
import { appendHistory, buildHistoryEntry, getTrend, readHistory } from "../history.js";
import { renderSarif } from "../reporters/sarif.js";
import { buildEvent, normalizeCampaign, recordEvent } from "../telemetry.js";
import { maybePrintCloudCta } from "../commercial.js";
import { renderActionReceipt } from "../action-receipt.js";
import { runEnforce } from "./enforce.js";
import { renderNextActions } from "../reporters/terminal.js";
import { ANSI, c, resolveTarget, targetFromCommand, writeOutput } from "./helpers.js";
import { maybeConvertPassingCheckToCi, type SetupCiConversionFlags } from "./setup-ci-conversion.js";

interface TestCommandFlags extends SetupCiConversionFlags {
  attackSim?: boolean;
  sarif?: string;
  enforce?: boolean;
  autoEnforce?: boolean;
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
    } else if (arg === "--no-ci-sarif") {
      flags.ciSarif = false;
    } else if (arg === "--no-attack-sim") {
      flags.attackSim = false;
    } else if (arg === "--force") {
      flags.force = true;
    } else if (arg === "--sarif") {
      const next = commandArgs[i + 1];
      if (!next) throw new Error("--sarif requires an output file.");
      flags.sarif = next;
      i += 1;
    } else if (arg === "--enforce") {
      flags.enforce = true;
    } else if (arg === "--auto-enforce") {
      flags.autoEnforce = true;
    } else if (arg === "--campaign") {
      const next = commandArgs[i + 1];
      if (!next) throw new Error("--campaign requires a campaign slug.");
      flags.campaign = normalizeCampaign(next);
      i += 1;
    } else {
      targetArgs.push(arg);
    }
  }
  if (flags.campaign) flags.campaign = normalizeCampaign(flags.campaign);
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
    .option("--no-attack-sim", "Skip the default safe attack-readiness simulation.")
    .option("--sarif <file>", "Write a GitHub Code Scanning SARIF report after the run.")
    .option("--campaign <slug>", "Attach a safe campaign/source slug to telemetry for attribution.")
    .option("--setup-ci", "Offer CI conversion after a successful check; use with --yes in non-interactive runs to write files.", false)
    .option("--yes", "Confirm CI conversion without prompting. Only writes when used with --setup-ci.", false)
    .option("--no-setup-ci", "Suppress the post-success CI conversion prompt and hint.")
    .option("--no-ci-sarif", "Generate post-check CI without GitHub Code Scanning SARIF upload.")
    .option("--force", "Overwrite existing generated CI adoption files.", false)
    .option("--enforce", "After testing, generate seatbelt policy and optionally start proxy.", false)
    .option("--auto-enforce", "Skip interactive prompt and always enforce after testing.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { deep?: boolean; invokeTools?: boolean; security?: boolean; target?: string; attackSim?: boolean } & TestCommandFlags) => {
      const extracted = extractTrailingConversionFlags(commandArgs, options);
      commandArgs = extracted.commandArgs;
      const conversionFlags = extracted.flags;
      const t0 = Date.now();
      const target = options.target ? await resolveTarget({ target: options.target }) : targetFromCommand(commandArgs);
      process.stdout.write(`  ${c(ANSI.dim, "⟳")} Checking ${c(ANSI.bold, target.targetId)}...`);
      const attackSim = conversionFlags.attackSim !== false && options.attackSim !== false;
      const artifact = await runTarget(target, {
        invokeTools: options.deep || options.invokeTools,
        securityCheck: options.security,
        attackSimulation: attackSim ? {} : undefined,
      });
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

      process.stdout.write(`    ${c(ANSI.dim, "→")} ${renderActionReceipt(artifact).split("\n")[0]}\n`);

      process.stdout.write(`\n  ${c(ANSI.dim, `Artifact: ${outPath}`)}\n\n`);
      process.stdout.write(renderNextActions(artifact) + "\n");

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
        campaign: conversionFlags.campaign,
        securityFindingCount: artifact.checks.find((check) => check.id === "attack-sim")?.evidence[0]?.itemCount,
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
          ciSarif: conversionFlags.ciSarif,
          force: conversionFlags.force,
          campaign: conversionFlags.campaign,
        });
      }
      const securityFindings = artifact.checks.filter(
        (ch) => (ch.id === "security" || ch.id === "security-lite" || ch.id === "attack-sim") &&
          (ch.status === "fail" || ch.status === "partial")
      );
      const findingCount = securityFindings.reduce((sum, ch) => sum + (ch.evidence[0]?.itemCount ?? 1), 0);

      let shouldEnforce = options.enforce || conversionFlags.enforce || conversionFlags.autoEnforce;

      if (!shouldEnforce && findingCount > 0) {
        let seatbeltAvailable = false;
        try {
          execSync("command -v mcp-seatbelt 2>/dev/null || npx @kryptosai/mcp-seatbelt --version 2>/dev/null", {
            stdio: "pipe",
            timeout: 5_000,
          });
          seatbeltAvailable = true;
        } catch {
          // Keep the default false value when seatbelt is unavailable.
        }

        if (seatbeltAvailable) {
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const answer = await new Promise<string>((resolve) => {
            rl.question(`\n  ${c(ANSI.yellow, `Found ${findingCount} security finding${findingCount === 1 ? "" : "s"}. Generate runtime policy?`)} ${c(ANSI.dim, "[Y/n]: ")}`, (ans) => {
              resolve(ans.trim().toLowerCase());
            });
          });
          rl.close();
          if (answer === "" || answer === "y" || answer === "yes") {
            shouldEnforce = true;
          }
        }
      }

      if (shouldEnforce) {
        await runEnforce(target, commandArgs, {
          security: options.security,
          deep: options.deep || options.invokeTools,
        });
      }
      maybePrintCloudCta(options.security ? "security" : "general");
    });
}
