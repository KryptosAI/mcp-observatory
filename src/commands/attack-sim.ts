import { readFile } from "node:fs/promises";
import type { Command } from "commander";

import { extractObservatoryFindings } from "../findings.js";
import { runTarget } from "../index.js";
import { renderAttackSimulationMarkdown } from "../reporters/attack-sim.js";
import { renderSarif } from "../reporters/sarif.js";
import { buildEvent, recordEvent } from "../telemetry.js";
import type { RunArtifact } from "../types.js";
import { validateRunArtifact } from "../validate.js";
import { ANSI, c, quoteShell, resolveTarget, targetFromCommand, writeOutput } from "./helpers.js";

interface AttackSimOptions {
  baseline?: string;
  failOnHigh?: boolean;
  json?: string;
  mode?: string;
  output?: string;
  sarif?: string;
  target?: string;
}

function extractTrailingAttackFlags(
  commandArgs: string[],
  options: AttackSimOptions,
): { commandArgs: string[]; flags: AttackSimOptions } {
  const flags: AttackSimOptions = { ...options };
  const targetArgs: string[] = [];
  for (let i = 0; i < commandArgs.length; i += 1) {
    const arg = commandArgs[i]!;
    const assign = arg.match(/^(--baseline|--json|--mode|--output|--sarif)=(.+)$/);
    if (arg === "--") {
      targetArgs.push(...commandArgs.slice(i + 1));
      break;
    } else if (assign) {
      const [, name, value] = assign;
      if (name === "--baseline") flags.baseline = value;
      if (name === "--json") flags.json = value;
      if (name === "--mode") flags.mode = value;
      if (name === "--output") flags.output = value;
      if (name === "--sarif") flags.sarif = value;
    } else if (arg === "--baseline") {
      const next = commandArgs[i + 1];
      if (!next) throw new Error("--baseline requires a run artifact path.");
      flags.baseline = next;
      i += 1;
    } else if (arg === "--fail-on-high") {
      flags.failOnHigh = true;
    } else if (arg === "--no-color") {
      // Commander handles the color option; keep it out of the server command.
    } else if (arg === "--json") {
      const next = commandArgs[i + 1];
      if (!next) throw new Error("--json requires an output file.");
      flags.json = next;
      i += 1;
    } else if (arg === "--mode") {
      const next = commandArgs[i + 1];
      if (!next) throw new Error("--mode requires a value.");
      flags.mode = next;
      i += 1;
    } else if (arg === "--output") {
      const next = commandArgs[i + 1];
      if (!next) throw new Error("--output requires an output file.");
      flags.output = next;
      i += 1;
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

async function readBaseline(path: string | undefined): Promise<RunArtifact | undefined> {
  if (!path) return undefined;
  return validateRunArtifact(JSON.parse(await readFile(path, "utf8")));
}

function reproductionCommand(options: AttackSimOptions, commandArgs: string[]): string {
  const parts = ["npx @kryptosai/mcp-observatory", "attack-sim"];
  if (options.target) parts.push("--target", quoteShell(options.target));
  if (options.baseline) parts.push("--baseline", quoteShell(options.baseline));
  if (!options.target && commandArgs.length > 0) parts.push(...commandArgs.map(quoteShell));
  return parts.join(" ");
}

function topAttackFindings(artifact: RunArtifact) {
  const severityRank = { high: 3, medium: 2, low: 1, info: 0 };
  return extractObservatoryFindings(artifact)
    .filter((finding) => finding.checkId === "attack-sim")
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
    .slice(0, 3);
}

export function registerAttackSimCommands(program: Command): void {
  program
    .command("attack-sim")
    .passThroughOptions()
    .description("Run safe MCP attack-readiness simulations for Safety Index evidence.")
    .argument("[command...]", "Server command and arguments to run.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--baseline <artifact>", "Baseline run artifact for contract drift simulation.")
    .option("--output <file>", "Write the attack simulation Markdown report.")
    .option("--json <file>", "Write the run artifact with attack-sim evidence.")
    .option("--sarif <file>", "Write attack-sim findings as SARIF for GitHub Code Scanning.")
    .option("--mode <mode>", "Simulation mode. Only 'safe' is supported.", "safe")
    .option("--fail-on-high", "Exit nonzero when high-risk attack findings exist.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: AttackSimOptions) => {
      const extracted = extractTrailingAttackFlags(commandArgs, options);
      commandArgs = extracted.commandArgs;
      options = extracted.flags;
      if (options.mode !== "safe") {
        throw new Error("attack-sim supports only --mode safe.");
      }
      const startedAt = Date.now();
      if (!options.target && commandArgs.length === 0) {
        throw new Error("Provide --target <config.json> or use: mcp-observatory attack-sim <command> [args...]");
      }
      const target = options.target ? await resolveTarget({ target: options.target }) : targetFromCommand(commandArgs);
      const baseline = await readBaseline(options.baseline);
      process.stdout.write(`  ${c(ANSI.dim, "⟳")} Running safe attack simulation for ${c(ANSI.bold, target.targetId)}...`);
      const artifact = await runTarget(target, {
        attackSimulation: { baseline },
        securityCheck: true,
      });
      const repro = reproductionCommand(options, commandArgs);
      const attackCheck = artifact.checks.find((check) => check.id === "attack-sim");
      const findings = topAttackFindings(artifact);
      const highCount = extractObservatoryFindings(artifact)
        .filter((finding) => finding.checkId === "attack-sim" && finding.severity === "high").length;
      const icon = attackCheck?.status === "fail" ? c(ANSI.red, "✗") : attackCheck?.status === "partial" ? c(ANSI.yellow, "!") : c(ANSI.green, "✓");
      process.stdout.write(`\r  ${icon} ${c(ANSI.bold, target.targetId)} attack-sim: ${attackCheck?.status ?? "skipped"}${" ".repeat(12)}\n`);
      if (attackCheck) {
        process.stdout.write(`    ${attackCheck.message}\n`);
      }
      for (const finding of findings) {
        process.stdout.write(`    ${c(ANSI.dim, "→")} [${finding.severity}] ${finding.message}\n`);
      }
      process.stdout.write(`\n  ${c(ANSI.bold, "Reproduce:")} ${c(ANSI.cyan, repro)}\n\n`);

      if (options.json) {
        await writeOutput(JSON.stringify(artifact, null, 2), "json", options.json);
      }
      if (options.output) {
        await writeOutput(renderAttackSimulationMarkdown(artifact, repro), "markdown", options.output);
      }
      if (options.sarif) {
        await writeOutput(renderSarif(artifact, { artifactUri: options.json }), "sarif", options.sarif);
      }

      recordEvent(buildEvent("command_complete", "attack-sim", "cli", {
        targetIds: [target.targetId],
        gateResult: attackCheck?.status ?? "skipped",
        securityFindingCount: attackCheck?.evidence[0]?.itemCount ?? 0,
        checkStatuses: attackCheck ? { "attack-sim": attackCheck.status } : undefined,
        executionMs: Date.now() - startedAt,
      }));

      if (options.failOnHigh && highCount > 0) {
        process.exitCode = 1;
      }
    });
}
