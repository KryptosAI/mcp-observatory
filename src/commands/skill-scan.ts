import { access } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import type { Command } from "commander";

import {
  computeSkillHealthScore,
  renderSkillScanJson,
  renderSkillScanMarkdown,
  renderSkillScanSarif,
  renderSkillScanTerminal,
  scanPath,
  summarizeScan,
  type SkillScanResult,
} from "../checks/skill-scan.js";
import { ANSI, c, LOGO, isQuiet, useColor } from "./helpers.js";
import { TOOL_VERSION } from "../version.js";

export async function runSkillScan(
  inputPath: string,
  options: {
    format?: string;
    output?: string;
  },
): Promise<void> {
  try {
    await access(inputPath);
  } catch {
    process.stderr.write(`  ${c(ANSI.red, `✗ Path not found: ${inputPath}`)}\n`);
    process.exitCode = 1;
    return;
  }

  if (!isQuiet()) {
    process.stdout.write(useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n\n` : LOGO + `  v${TOOL_VERSION}\n\n`);
    process.stdout.write(c(ANSI.bold, `  Scanning skills at: ${inputPath}\n\n`));
  }

  const results: SkillScanResult[] = await scanPath(inputPath);
  const healthScore = computeSkillHealthScore(results);
  const format = options.format ?? "terminal";

  const allFindings = results.flatMap((r) => r.findings);
  const highCount = allFindings.filter((f) => f.severity === "high").length;

  let output: string;
  switch (format) {
    case "markdown":
      output = renderSkillScanMarkdown(results, healthScore);
      break;
    case "json":
      output = renderSkillScanJson(summarizeScan(results));
      break;
    case "sarif":
      output = renderSkillScanSarif(results, healthScore);
      break;
    default:
      output = renderSkillScanTerminal(results, healthScore);
      break;
  }

  if (options.output) {
    await writeFile(options.output, output + "\n", "utf8");
    process.stdout.write(c(ANSI.green, `  Report written to ${options.output}\n\n`));
  } else {
    process.stdout.write(output + "\n");
  }

  process.stdout.write(`  ${c(ANSI.dim, "—")} ${c(ANSI.bold, `${results.length} file${results.length === 1 ? "" : "s"} scanned`)}`);
  process.stdout.write(c(ANSI.dim, `, ${allFindings.length} finding${allFindings.length === 1 ? "" : "s"}`));
  process.stdout.write(c(ANSI.dim, `, health score: ${healthScore}/100\n`));

  if (highCount > 0) {
    process.exitCode = 1;
  }
}

export function registerSkillScanCommands(program: Command): void {
  program
    .command("skill-scan")
    .description("Scan skill files for security risks (credential patterns, exfiltration, hidden instructions, remote exec, etc.).")
    .argument("<path>", "Path to a skill file or directory of skill files.")
    .option("--format <format>", "Output format: terminal, markdown, json, or sarif.", "terminal")
    .option("--output <path>", "Write report to file instead of stdout.")
    .action(async (inputPath: string, options: { format?: string; output?: string }) => {
      await runSkillScan(inputPath, options);
    });
}
