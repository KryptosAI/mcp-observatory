import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import type { RunArtifact } from "../types.js";
import { validateRunArtifact } from "../validate.js";
import { defaultRunsDirectory } from "../storage.js";

// ── Report shape ─────────────────────────────────────────────────────────────

export interface CiReport {
  title: string;
  body: string;
  labels: string[];
  hasRegressions: boolean;
  serverCount: number;
  failCount: number;
}

// ── Build report from artifacts ──────────────────────────────────────────────

export function buildCiReport(artifacts: RunArtifact[]): CiReport {
  const today = new Date().toISOString().slice(0, 10);
  const failing = artifacts.filter((a) => a.gate === "fail");
  const failCount = failing.length;
  const hasRegressions = failCount > 0;

  const title = hasRegressions
    ? `MCP Observatory: ${failCount} regression${failCount === 1 ? "" : "s"} detected (${today})`
    : `MCP Observatory: all clear (${today})`;

  let body: string;
  if (!hasRegressions) {
    body =
      artifacts.length === 0
        ? "No run artifacts found. Nothing to report."
        : `All ${artifacts.length} server${artifacts.length === 1 ? "" : "s"} passed on ${today}.`;
  } else {
    const sections: string[] = [];
    for (const artifact of failing) {
      const targetId = artifact.target.targetId;
      const lines: string[] = [`## ${targetId}`];

      if (artifact.fatalError) {
        lines.push("", `> **Fatal error:** ${artifact.fatalError.split("\n")[0]}`);
      }

      const failingChecks = artifact.checks.filter(
        (ch) => ch.status === "fail" || ch.status === "partial",
      );
      for (const check of failingChecks) {
        lines.push(`> **${check.id}:** ${check.message}`);
      }

      if (failingChecks.length === 0 && !artifact.fatalError) {
        lines.push("> Gate failed (no specific check failures recorded).");
      }

      sections.push(lines.join("\n"));
    }
    body = sections.join("\n\n");
  }

  return {
    title,
    body,
    labels: ["mcp-observatory"],
    hasRegressions,
    serverCount: artifacts.length,
    failCount,
  };
}

// ── CLI command ──────────────────────────────────────────────────────────────

export function registerCiReportCommands(program: Command): void {
  program
    .command("ci-report")
    .description(
      "Generate a CI report from run artifacts for GitHub issue creation.",
    )
    .option(
      "--artifacts-dir <path>",
      "Directory containing run artifacts.",
      defaultRunsDirectory(process.cwd()),
    )
    .option("--format <format>", "Output format: json or markdown.", "json")
    .option("--no-color", "Disable colored output.")
    .action(
      async (options: { artifactsDir: string; format: string }) => {
        const artifacts = await loadArtifactsFromDir(options.artifactsDir);
        const report = buildCiReport(artifacts);

        if (options.format === "markdown") {
          process.stdout.write(report.body + "\n");
        } else {
          process.stdout.write(JSON.stringify(report, null, 2) + "\n");
        }

        if (report.hasRegressions) {
          process.exitCode = 1;
        }
      },
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadArtifactsFromDir(dir: string): Promise<RunArtifact[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const jsonFiles = entries.filter((f) => f.endsWith(".json")).sort();
  const artifacts: RunArtifact[] = [];

  for (const file of jsonFiles) {
    try {
      const content = await readFile(path.join(dir, file), "utf8");
      const data: unknown = JSON.parse(content);
      const artifact = validateRunArtifact(data);
      artifacts.push(artifact);
    } catch {
      // Skip invalid files silently
    }
  }

  return artifacts;
}
