import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";

import {
  auditScore,
  renderAuditMarkdown,
  renderAuditSarif,
  resolveAuditTarget,
  runAudit,
} from "../audit.js";
import { buildMcpReceipt, receiptFormatFromPath, renderReceipt } from "../receipt.js";
import { buildEvent, generateSessionId, recordEvent, recordSessionEnd, recordSessionStart } from "../command-events.js";
import { ANSI, c, isQuiet } from "./helpers.js";

type AuditFormat = "json" | "markdown" | "sarif";

interface AuditOptions {
  profile: string;
  format: AuditFormat;
  output?: string;
  receipt?: string;
  failOnHigh?: boolean;
  failOnCritical?: boolean;
}

function extractTrailingAuditFlags(args: string[], options: AuditOptions): { targetArgs: string[]; options: AuditOptions } {
  const targetArgs: string[] = [];
  const nextOptions: AuditOptions = { ...options };
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
      nextOptions.format = next as AuditFormat;
      i += 1;
    } else if (arg === "--output") {
      const next = args[i + 1];
      if (!next) throw new Error("--output requires a value.");
      nextOptions.output = next;
      i += 1;
    } else if (arg === "--receipt") {
      const next = args[i + 1];
      if (!next) throw new Error("--receipt requires a value.");
      nextOptions.receipt = next;
      i += 1;
    } else if (arg === "--fail-on-high") {
      nextOptions.failOnHigh = true;
    } else if (arg === "--fail-on-critical") {
      nextOptions.failOnCritical = true;
    } else if (arg === "--no-color") {
      // Commander handles color globally; keep it out of the target command.
    } else {
      targetArgs.push(arg);
    }
  }
  return { targetArgs, options: nextOptions };
}

async function writeMaybe(filePath: string | undefined, content: string): Promise<void> {
  if (!filePath) {
    process.stdout.write(`${content}\n`);
    return;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${content}\n`, "utf8");
  process.stdout.write(`Wrote audit ${path.extname(filePath).slice(1) || "report"} to ${filePath}\n`);
}

export function registerAuditCommands(program: Command): void {
  program
    .command("audit")
    .passThroughOptions()
    .description("Run a profile-mapped MCP security audit.")
    .argument("<target...>", "Target directory/config path or server command.")
    .option("--profile <profile>", "Security profile to apply.", "nsa-mcp")
    .option("--format <format>", "markdown, json, or sarif.", "markdown")
    .option("--output <file>", "Write report to a file instead of stdout.")
    .option("--receipt <file>", "Also write a portable MCP receipt (.json or .md).")
    .option("--fail-on-high", "Exit nonzero when high or critical findings are present.", false)
    .option("--fail-on-critical", "Exit nonzero when critical findings are present.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (targetArgs: string[], options: AuditOptions) => {
      const sessionId = generateSessionId();
      recordSessionStart(sessionId);
      const extracted = extractTrailingAuditFlags(targetArgs, options);
      targetArgs = extracted.targetArgs;
      options = extracted.options;
      const startedAt = Date.now();
      const target = await resolveAuditTarget(targetArgs);
      if (options.output) {
        process.stdout.write(`${c(ANSI.dim, "⟳")} Auditing ${c(ANSI.bold, target.targetId)} with profile ${c(ANSI.bold, options.profile)}...\n`);
      }
      const report = await runAudit(target, options.profile);
      const format = options.format;
      if (format === "json") {
        await writeMaybe(options.output, JSON.stringify(report, null, 2));
      } else if (format === "sarif") {
        await writeMaybe(options.output, renderAuditSarif(report, options.output ? path.basename(options.output).replace(/\.sarif$/i, ".json") : "mcp-observatory-audit.json"));
      } else if (format === "markdown") {
        await writeMaybe(options.output, renderAuditMarkdown(report));
      } else {
        throw new Error("Unsupported audit format. Use markdown, json, or sarif.");
      }
      if (options.receipt) {
        const receipt = await buildMcpReceipt(report, target, {
          commandInvoked: `mcp-observatory audit ${targetArgs.join(" ")} --profile ${options.profile} --format ${format}${options.output ? ` --output ${options.output}` : ""} --receipt ${options.receipt}`,
          jsonReportPath: format === "json" ? options.output : undefined,
          markdownReportPath: format === "markdown" ? options.output : undefined,
          sarifPath: format === "sarif" ? options.output : undefined,
        });
        const receiptFormat = receiptFormatFromPath(options.receipt, "json");
        await writeMaybe(options.receipt, renderReceipt(receipt, receiptFormat));
      }

      if (options.output) {
        const score = auditScore(report);
        process.stdout.write(`Trust status: ${score.status} (${score.score}/100), findings: ${score.finding_count}\n`);
      }

      const enforceTargetCmd = target.targetId;
      if (!isQuiet()) {
        process.stdout.write(`\n  ${c(ANSI.bold, "Protect at runtime:")} ${c(ANSI.cyan, `npx @kryptosai/mcp-observatory enforce ${enforceTargetCmd}`)}\n`);
        process.stdout.write(`  ${c(ANSI.dim, "Generates seatbelt policy to block dangerous tool calls at runtime.")}\n\n`);
      }

      recordEvent(buildEvent("command_complete", "audit", "cli", {
        serversScanned: 1,
        gateResult: report.summary.trust_status,
        executionMs: Date.now() - startedAt,
        securityFlag: true,
        securityFindingCount: report.summary.finding_count,
        targetIds: [target.targetId],
        checkStatuses: Object.fromEntries(report.artifact.checks.map((check) => [check.id, check.status])),
        receiptGenerated: Boolean(options.receipt),
        receiptFormat: options.receipt ? receiptFormatFromPath(options.receipt, "json") : undefined,
        receiptProfile: options.profile,
        targetServer: target.targetId,
        auditProfile: options.profile,
        stageOverride: "audit",
      }));

      if (
        (options.failOnCritical === true && report.summary.severity_counts.critical > 0) ||
        (options.failOnHigh === true && (report.summary.severity_counts.critical > 0 || report.summary.severity_counts.high > 0))
      ) {
        process.exitCode = 1;
      }
      recordSessionEnd(sessionId);
    });
}
