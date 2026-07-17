import readline from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

import type { RunArtifact, TargetConfig } from "../types.js";
import { buildEvent, detectCiProvider, recordEvent } from "../telemetry.js";
import { initCi, type InitCiOptions, type InitCiResult } from "./init-ci.js";
import { ANSI, c, quoteShell, setupCiHint } from "./helpers.js";

export interface SetupCiConversionFlags {
  setupCi?: boolean;
  yes?: boolean;
  noSetupCi?: boolean;
  ciSarif?: boolean;
  force?: boolean;
  campaign?: string;
}

export interface SetupCiConversionOptions extends SetupCiConversionFlags {
  artifact: RunArtifact;
  bin?: string;
  target?: TargetConfig;
  targetPath?: string;
  input?: NodeJS.ReadStream | Readable;
  output?: NodeJS.WriteStream | Writable;
  isInteractive?: boolean;
}

export interface SetupCiConversionResult {
  status: "not-eligible" | "suppressed" | "hinted" | "skipped" | "written";
  command?: string;
  initResult?: InitCiResult;
}

function artifactTargetCommand(artifact: RunArtifact): string | undefined {
  if (artifact.target.adapter !== "local-process") return undefined;
  return [artifact.target.command, ...artifact.target.args].map(quoteShell).join(" ");
}

function targetCommand(target: TargetConfig | undefined): string | undefined {
  if (target?.adapter !== "local-process") return undefined;
  return [target.command, ...target.args].map(quoteShell).join(" ");
}

function conversionCommand(options: SetupCiConversionOptions): string | undefined {
  const bin = options.bin ?? "npx @kryptosai/mcp-observatory";
  const sarif = options.ciSarif === false ? "" : " --sarif";
  const schedule = " --schedule weekly";
  if (options.targetPath) return `${setupCiHint(undefined, options.targetPath, bin)}${sarif}${schedule}`;
  const command = targetCommand(options.target) ?? artifactTargetCommand(options.artifact);
  if (command) return `${bin} setup-ci --all --command ${quoteShell(command)}${sarif}${schedule}`;
  return undefined;
}

export function initCiOptionsFromRunArtifact(
  artifact: RunArtifact,
  options: Pick<SetupCiConversionOptions, "ciSarif" | "force" | "target" | "targetPath"> = {},
): InitCiOptions | undefined {
  if (options.targetPath) {
    return { all: true, target: options.targetPath, force: options.force, sarif: options.ciSarif !== false, schedule: "weekly", ciProvider: (detectCiProvider() ?? "github-actions") as InitCiOptions["ciProvider"] };
  }
  const command = targetCommand(options.target) ?? artifactTargetCommand(artifact);
  if (!command) return undefined;
  return { all: true, command, force: options.force, sarif: options.ciSarif !== false, schedule: "weekly", ciProvider: (detectCiProvider() ?? "github-actions") as InitCiOptions["ciProvider"] };
}

function shouldPrompt(options: SetupCiConversionOptions): boolean {
  if (options.isInteractive !== undefined) return options.isInteractive;
  return process.stdin.isTTY === true && process.stdout.isTTY === true && process.env["CI"] !== "true";
}

async function promptForConversion(options: SetupCiConversionOptions): Promise<boolean> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question("Convert this passing MCP check into CI + Code Scanning? [Y/n] ")).trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

function printInitCiResult(result: InitCiResult, output: NodeJS.WriteStream | Writable, sarifRequested: boolean): void {
  output.write(`${result.workflowStatus}: ${result.workflowPath}\n`);
  if (result.badgePath && result.badgeStatus) output.write(`${result.badgeStatus}: ${result.badgePath}\n`);
  if (result.targetConfigPath && result.targetConfigStatus) output.write(`${result.targetConfigStatus}: ${result.targetConfigPath}\n`);
  if (result.prBodyPath && result.prBodyStatus) output.write(`${result.prBodyStatus}: ${result.prBodyPath}\n`);
  if (result.issueBodyPath && result.issueBodyStatus) output.write(`${result.issueBodyStatus}: ${result.issueBodyPath}\n`);
  if (result.scoreBadgePath && result.scoreBadgeStatus) output.write(`${result.scoreBadgeStatus}: ${result.scoreBadgePath}\n`);
  if (result.workflowStatus === "skipped") output.write("Use --force to overwrite existing files.\n");
  output.write("Next: commit the workflow, open a PR, and paste the generated PR body if present.\n");
  if (sarifRequested) {
    output.write(
      result.workflowStatus === "skipped"
        ? "Code Scanning: SARIF upload was requested, but the existing workflow was unchanged.\n"
        : "Code Scanning: SARIF upload is enabled in the generated workflow.\n",
    );
  } else {
    output.write("Code Scanning: SARIF upload is not enabled; rerun without --no-ci-sarif to include it.\n");
  }
  output.write(
    result.workflowStatus === "skipped"
      ? "Automation: weekly scheduled checks were requested, but the existing workflow was unchanged.\n"
      : "Automation: weekly scheduled checks are enabled in the generated workflow.\n",
  );
  output.write("Verify: npx @kryptosai/mcp-observatory setup-ci --doctor\n");
}

function recordConversion(status: SetupCiConversionResult["status"], options: SetupCiConversionOptions): void {
  if (status === "not-eligible" || status === "suppressed") return;
  recordEvent(buildEvent("command_complete", "setup-ci", "cli", {
    ciProvider: detectCiProvider() ?? "github-actions",
    commitStatusSet: status === "written",
    setupCiConversionStatus: status,
    setupCiPromptShown: shouldPrompt(options),
    setupCiAutoRequested: options.setupCi === true && options.yes === true,
    setupCiSarif: options.ciSarif !== false,
    campaign: options.campaign,
    targetIds: [options.target?.targetId ?? options.artifact.target.targetId],
  }));
}

export async function maybeConvertPassingCheckToCi(options: SetupCiConversionOptions): Promise<SetupCiConversionResult> {
  const output = options.output ?? process.stdout;
  if (options.artifact.gate !== "pass" || options.artifact.fatalError) {
    return { status: "not-eligible" };
  }
  if (options.noSetupCi === true) {
    return { status: "suppressed" };
  }

  const initOptions = initCiOptionsFromRunArtifact(options.artifact, options);
  const command = conversionCommand(options);
  if (!initOptions || !command) {
    return { status: "not-eligible" };
  }

  if (options.setupCi === true && options.yes === true) {
    const initResult = await initCi(initOptions);
    output.write("\n");
    printInitCiResult(initResult, output, initOptions.sarif === true);
    recordConversion("written", options);
    return { status: "written", command, initResult };
  }

  if (shouldPrompt(options)) {
    output.write("\n");
    output.write(`${c(ANSI.bold, "┌─ Add to CI ─────────────────────────────────────")}\n`);
    output.write(`${c(ANSI.bold, "│")} ${c(ANSI.dim, "Creates .github/workflows/mcp-observatory.yml")}\n`);
    output.write(`${c(ANSI.bold, "│")} ${c(ANSI.dim, "Weekly scans + SARIF Code Scanning on every push")}\n`);
    output.write(`${c(ANSI.bold, "└──────────────────────────────────────────────────")}\n`);
    const accepted = await promptForConversion(options);
    if (accepted) {
      const initResult = await initCi(initOptions);
      printInitCiResult(initResult, output, initOptions.sarif === true);
      recordConversion("written", options);
      return { status: "written", command, initResult };
    }
    output.write(`Skipped. Convert later with:\n  ${c(ANSI.cyan, command)}\n`);
    recordConversion("skipped", options);
    return { status: "skipped", command };
  }

  output.write(`\n${c(ANSI.bold, "┌─ Add to CI ─────────────────────────────────────")}\n`);
  output.write(`${c(ANSI.bold, "│")} ${c(ANSI.dim, "One command adds weekly security scanning to your pipeline:")}\n`);
  output.write(`${c(ANSI.bold, "│")}\n`);
  output.write(`${c(ANSI.bold, "│")}   ${c(ANSI.cyan, command)}\n`);
  output.write(`${c(ANSI.bold, "│")}\n`);
  output.write(`${c(ANSI.bold, "│")} ${c(ANSI.dim, "Rerun with")} --setup-ci --yes ${c(ANSI.dim, "to create the files automatically.")}\n`);
  output.write(`${c(ANSI.bold, "└──────────────────────────────────────────────────")}\n`);
  if (options.setupCi === true) {
    output.write("Non-interactive mode will only write files when --setup-ci --yes is present.\n");
  }
  recordConversion("hinted", options);
  return { status: "hinted", command };
}
