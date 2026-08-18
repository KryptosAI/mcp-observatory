import { mkdir, writeFile } from "node:fs/promises";
import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import path from "node:path";
import type { Command } from "commander";

import {
  runTarget,
  writeRunArtifact,
} from "../index.js";
import { extractObservatoryFindings, type ObservatoryFinding, type ObservatoryFindingSeverity } from "../findings.js";
import { buildSeatbeltPolicy, renderSeatbeltPolicy } from "../seatbelt-policy.js";
import { defaultRunsDirectory } from "../storage.js";
import { buildEvent, generateSessionId, recordEvent, recordSessionEnd, recordSessionStart } from "../command-events.js";
import type { TargetConfig } from "../types.js";
import { ANSI, c, isQuiet, resolveTarget, targetFromCommand, useColor } from "./helpers.js";

const SEATBELT_PACKAGE = "@kryptosai/mcp-seatbelt";

export function seatbeltProxyCommand(policyPath: string, port: number): string[] {
  return ["npx", "-y", SEATBELT_PACKAGE, "proxy", "--config", policyPath, "--port", String(port)];
}

export async function startSeatbeltProxy(
  policyPath: string,
  port: number,
  spawnImpl: (command: string, args: string[], options: SpawnOptions) => ChildProcess = spawn,
): Promise<number> {
  const argv = seatbeltProxyCommand(policyPath, port);
  const child = spawnImpl(argv[0]!, argv.slice(1), { stdio: "inherit" });
  return await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function countBySeverity(findings: ObservatoryFinding[], severity: ObservatoryFindingSeverity): number {
  return findings.filter((f) => f.severity === severity).length;
}

export interface EnforceOptions {
  policy?: string;
  startProxy?: boolean;
  proxyPort?: string;
  noProxy?: boolean;
  security?: boolean;
  deep?: boolean;
}

export async function runEnforce(
  target: TargetConfig,
  _commandArgs: string[],
  options: EnforceOptions,
): Promise<void> {
  const t0 = Date.now();
  const policyPath = options.policy ?? ".mcp-seatbelt/policy.yml";
  const proxyPort = parseInt(options.proxyPort ?? "9420", 10);

  recordSessionStart(generateSessionId());

  process.stdout.write(`  ${c(ANSI.dim, "⟳")} Checking ${c(ANSI.bold, target.targetId)}...`);

  const artifact = await runTarget(target, {
    invokeTools: options.deep,
    securityCheck: options.security ?? true,
    attackSimulation: {},
  });

  await writeRunArtifact(artifact, defaultRunsDirectory(process.cwd()));

  const toolsCheck = artifact.checks.find((ch) => ch.id === "tools");
  const toolCount = toolsCheck?.evidence[0]?.itemCount ?? 0;

  const gateIcon = artifact.gate === "pass" ? c(ANSI.green, "✓") : c(ANSI.red, "✗");
  process.stdout.write(`\r  ${gateIcon} ${c(ANSI.bold, target.targetId)}${" ".repeat(Math.max(1, 40 - target.targetId.length))}`);
  process.stdout.write(`${c(ANSI.dim, `${toolCount} tools`)}\n`);

  const findings = extractObservatoryFindings(artifact);

  const highCount = countBySeverity(findings, "high");
  const mediumCount = countBySeverity(findings, "medium");
  const lowCount = countBySeverity(findings, "low");

  const policy = buildSeatbeltPolicy(artifact);
  const absPolicy = path.resolve(policyPath);
  await mkdir(path.dirname(absPolicy), { recursive: true });
  await writeFile(absPolicy, renderSeatbeltPolicy(policy), "utf8");

  const denyCount = policy.rules.filter((r) => r.action === "deny").length;
  const warnCount = policy.rules.filter((r) => r.action === "warn").length;
  const policyRuleCount = policy.rules.length;
  const sevCounts = { high: highCount, medium: mediumCount, low: lowCount };
  const proxyCmd = seatbeltProxyCommand(absPolicy, proxyPort).join(" ");

  process.stdout.write(`\n  ${c(ANSI.bold, "Policy:")} ${policyPath}\n`);
  process.stdout.write(`  ${c(ANSI.dim, `mode=${policy.mode} defaultAction=${policy.defaultAction} → ${denyCount} deny, ${warnCount} warn (${policyRuleCount} rules)`)}\n`);

  if (!options.noProxy) {
    if (options.startProxy) {
      process.stdout.write(`\n  ${c(ANSI.bold, "Starting proxy:")} ${c(ANSI.cyan, proxyCmd)}\n\n`);
      try {
        const code = await startSeatbeltProxy(absPolicy, proxyPort);
        if (code !== 0) process.exitCode = code;
      } catch (error) {
        process.stderr.write(`  ${c(ANSI.red, "Failed to start mcp-seatbelt.")} ${error instanceof Error ? error.message : String(error)}\n`);
        process.stderr.write(`  ${c(ANSI.dim, `Run: ${proxyCmd}`)}\n`);
        process.exitCode = 1;
      }
    } else {
      process.stdout.write(`\n  ${c(ANSI.dim, "Start the proxy:")} ${c(ANSI.cyan, proxyCmd)}\n\n`);
    }
  } else {
    process.stdout.write(`\n  ${c(ANSI.dim, "Policy generated. No proxy started.")}\n\n`);
  }

  recordEvent(buildEvent("command_complete", "enforce", "cli", {
    serversScanned: 1,
    toolsFound: toolCount,
    gateResult: artifact.gate,
    executionMs: Date.now() - t0,
    securityFlag: options.security,
    targetIds: [target.targetId],
    securityFindingCount: highCount + mediumCount + lowCount,
    targetServer: target.targetId,
    findingSeverityCounts: JSON.stringify(sevCounts),
    policyRuleCount,
    stageOverride: "protection",
    featureChainOverride: ["scan", "enforce", "protect"],
  }));
}

export function registerEnforceCommands(program: Command): void {
  program
    .command("enforce")
    .passThroughOptions()
    .description("Test a server, generate a Seatbelt policy, and optionally start the security proxy.")
    .argument("[command...]", "Server command and arguments to run.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--deep", "Also invoke safe tools to verify they execute.")
    .option("--security", "Run deep security scan. Always enabled by default for enforce.")
    .option("--policy <path>", "Output policy file path.", ".mcp-seatbelt/policy.yml")
    .option("--start-proxy", "Start mcp-seatbelt proxy after writing the policy.", false)
    .option("--proxy-port <port>", "Proxy port.", "9420")
    .option("--no-proxy", "Just generate policy, don't start or print the proxy command.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { target?: string; deep?: boolean; security?: boolean; policy?: string; startProxy?: boolean; proxyPort?: string; noProxy?: boolean }) => {
      const sessionId = generateSessionId();
      recordSessionStart(sessionId);
      if (!isQuiet() && useColor()) {
        const { LOGO } = await import("./helpers.js");
        process.stdout.write(`${c(ANSI.cyan, LOGO)}  ${c(ANSI.dim, `enforce mode`)}\n\n`);
      }

      const target = options.target
        ? await resolveTarget({ target: options.target })
        : targetFromCommand(commandArgs);

      await runEnforce(target, commandArgs, {
        policy: options.policy,
        startProxy: options.startProxy,
        proxyPort: options.proxyPort,
        noProxy: options.noProxy,
        security: options.security,
        deep: options.deep,
      });
      recordSessionEnd(sessionId);
    });
}
