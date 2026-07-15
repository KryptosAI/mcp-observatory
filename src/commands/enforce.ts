import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import type { Command } from "commander";

import {
  runTarget,
  writeRunArtifact,
} from "../index.js";
import { extractObservatoryFindings, type ObservatoryFinding, type ObservatoryFindingSeverity } from "../findings.js";
import { defaultRunsDirectory } from "../storage.js";
import { buildEvent, generateSessionId, recordEvent, recordSessionEnd, recordSessionStart } from "../telemetry.js";
import type { RunArtifact, TargetConfig } from "../types.js";
import { ANSI, c, isQuiet, resolveTarget, targetFromCommand, useColor } from "./helpers.js";

interface SeatbeltPolicyRule {
  id: string;
  action: "DENY" | "WARN" | "ALLOW";
  tool?: string;
  description: string;
  severity: ObservatoryFindingSeverity;
  finding_id: string;
}

interface SeatbeltPolicy {
  version: string;
  generated_by: string;
  generated_at: string;
  target: string;
  rules: SeatbeltPolicyRule[];
}

function yamlString(value: string): string {
  if (/^[A-Za-z0-9_./@: -]+$/.test(value) && !value.includes(": ")) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function renderYaml(policy: SeatbeltPolicy): string {
  const lines: string[] = [
    `version: "${policy.version}"`,
    `generated_by: "${policy.generated_by}"`,
    `generated_at: "${policy.generated_at}"`,
    `target: "${policy.target}"`,
    "rules:",
  ];
  for (const rule of policy.rules) {
    lines.push(`  - id: ${yamlString(rule.id)}`);
    lines.push(`    action: ${rule.action}`);
    if (rule.tool) {
      lines.push(`    tool: ${yamlString(rule.tool)}`);
    }
    lines.push(`    description: ${yamlString(rule.description)}`);
    lines.push(`    severity: ${rule.severity}`);
    lines.push(`    finding_id: ${yamlString(rule.finding_id)}`);
  }
  return lines.join("\n") + "\n";
}

function severityToAction(severity: ObservatoryFindingSeverity): "DENY" | "WARN" | "ALLOW" {
  switch (severity) {
    case "high":
      return "DENY";
    case "medium":
      return "DENY";
    case "low":
      return "WARN";
    case "info":
      return "ALLOW";
  }
}

function findingToRule(finding: ObservatoryFinding): SeatbeltPolicyRule {
  const tool = finding.subject.type === "tool" ? finding.subject.name : undefined;
  return {
    id: finding.ruleId.replace(/^mcp-observatory\//, "").replaceAll("/", "-").replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
    action: severityToAction(finding.severity),
    tool,
    description: finding.message,
    severity: finding.severity,
    finding_id: finding.id,
  };
}

function findingsToPolicy(artifact: RunArtifact): SeatbeltPolicy {
  const findings = extractObservatoryFindings(artifact);
  const rules = findings
    .filter((f) => f.severity !== "info")
    .map(findingToRule);

  return {
    version: "1.0",
    generated_by: "mcp-observatory enforce",
    generated_at: new Date().toISOString(),
    target: artifact.target.targetId,
    rules,
  };
}

function countBySeverity(findings: ObservatoryFinding[], severity: ObservatoryFindingSeverity): number {
  return findings.filter((f) => f.severity === severity).length;
}

function isSeatbeltInstalled(): boolean {
  try {
    execSync("npx @kryptosai/mcp-seatbelt --version 2>/dev/null || npx mcp-seatbelt --version 2>/dev/null", {
      stdio: "pipe",
      timeout: 10_000,
    });
    return true;
  } catch {
    try {
      execSync("command -v mcp-seatbelt", { stdio: "pipe", timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }
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
  commandArgs: string[],
  options: EnforceOptions,
): Promise<void> {
  const t0 = Date.now();
  const policyPath = options.policy ?? ".mcp-seatbelt/policy.yml";
  const proxyPort = parseInt(options.proxyPort ?? "9420", 10);

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

  const policy = findingsToPolicy(artifact);
  await mkdir(path.dirname(path.resolve(policyPath)), { recursive: true });
  await writeFile(policyPath, renderYaml(policy), "utf8");

  const denyCount = policy.rules.filter((r) => r.action === "DENY").length;
  const warnCount = policy.rules.filter((r) => r.action === "WARN").length;
  const policyRuleCount = denyCount + warnCount;
  const sevCounts = { high: highCount, medium: mediumCount, low: lowCount };

  let summary = `Found ${highCount} HIGH, ${mediumCount} MEDIUM findings → generated ${denyCount} DENY, ${warnCount} WARN rules`;
  if (highCount === 0 && mediumCount === 0) {
    summary = `Found ${lowCount} LOW findings → generated ${denyCount} DENY, ${warnCount} WARN rules`;
  }

  process.stdout.write(`\n  ${c(ANSI.bold, "Policy:")} ${policyPath}\n`);
  process.stdout.write(`  ${c(ANSI.dim, summary)}\n`);

  if (options.noProxy) {
    process.stdout.write(`\n  ${c(ANSI.dim, "Policy generated. No proxy started.")}\n\n`);
  } else {
    const installed = isSeatbeltInstalled();

    if (options.startProxy) {
      const absPolicy = path.resolve(policyPath);
      process.stdout.write(`\n  ${c(ANSI.bold, "Start the proxy:")}\n`);
      process.stdout.write(`  ${c(ANSI.cyan, `npx @kryptosai/mcp-seatbelt proxy --policy ${absPolicy} --port ${proxyPort}`)}\n`);
      process.stdout.write(`  ${c(ANSI.dim, "Block dangerous MCP tool calls at runtime.")}\n\n`);
    } else {
      if (installed) {
        process.stdout.write(`\n  ${c(ANSI.dim, "Proxy ready to start:")} ${c(ANSI.cyan, `npx @kryptosai/mcp-seatbelt proxy --policy ${policyPath}`)}\n\n`);
      } else {
        process.stdout.write(`\n  ${c(ANSI.dim, `Run: npx @kryptosai/mcp-seatbelt proxy --policy ${policyPath}`)}\n\n`);
      }
    }
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
    .description("Test a server, generate seatbelt policy, and optionally start a security proxy.")
    .argument("[command...]", "Server command and arguments to run.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--deep", "Also invoke safe tools to verify they execute.")
    .option("--security", "Run deep security scan. Always enabled by default for enforce.")
    .option("--policy <path>", "Output policy file path.", ".mcp-seatbelt/policy.yml")
    .option("--start-proxy", "Auto-start the proxy after generating policy.", false)
    .option("--proxy-port <port>", "Proxy port.", "9420")
    .option("--no-proxy", "Just generate policy, don't mention proxy.", false)
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
