import { Option, type Command } from "commander";
import { auditSource, getFindingSummary, type SourceAuditResult } from "../checks/source-audit.js";

/** Escape untrusted paths as well as keeping all source/literal contents out of output. */
export function renderSourceAudit(result: SourceAuditResult): string {
  const lines = ["Source audit: " + getFindingSummary(result), result.coverage.scope];
  for (const finding of result.findings) {
    lines.push(`${finding.checkId} ${JSON.stringify(finding.file)}:${finding.line} — ${finding.description}`,
      `  ${finding.evidence}`, `  Review: ${finding.remediation}`);
  }
  for (const diagnostic of result.coverage.diagnostics) {
    lines.push(`INCOMPLETE ${JSON.stringify(diagnostic.file)}: ${diagnostic.reason}`);
  }
  return lines.join("\n") + "\n";
}

export function sourceAuditExitCode(result: SourceAuditResult, failOnFindings = false): number {
  return result.status === "incomplete" ? 2 : failOnFindings && result.findings.length > 0 ? 1 : 0;
}

export async function runSourceAudit(sourcePath: string, options: { format?: string; failOnFindings?: boolean } = {}): Promise<void> {
  const result = await auditSource(sourcePath);
  process.stdout.write(options.format === "json" ? JSON.stringify(result, null, 2) + "\n" : renderSourceAudit(result));
  process.exitCode = Math.max(Number(process.exitCode) || 0, sourceAuditExitCode(result, options.failOnFindings));
}

export function registerSourceAuditCommands(program: Command): void {
  program.command("source-audit <path>")
    .description("Review local JS/TS source without executing it. Findings are advisory; incomplete scans exit 2.")
    .addOption(new Option("--format <format>", "Output format.").choices(["terminal", "json"]).default("terminal"))
    .option("--fail-on-findings", "Exit 1 when a complete scan has review findings.", false)
    .action(async (sourcePath: string, options: { format: string; failOnFindings: boolean }) => {
      await runSourceAudit(sourcePath, options);
    });
}
