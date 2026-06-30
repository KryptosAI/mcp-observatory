import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";

import { maybePrintCloudCta } from "../commercial.js";
import { defaultRunsDirectory } from "../storage.js";
import type { CheckResult, RunArtifact } from "../types.js";
import { validateRunArtifact } from "../validate.js";
import { buildEvent, recordEvent } from "../telemetry.js";

export interface EnterpriseReportSummary {
  serverCount: number;
  passCount: number;
  failCount: number;
  securityFindings: number;
  averageHealthScore: number | null;
}

function latestArtifactsByTarget(artifacts: RunArtifact[]): RunArtifact[] {
  const byTarget = new Map<string, RunArtifact>();
  for (const artifact of artifacts) {
    const previous = byTarget.get(artifact.target.targetId);
    if (!previous || artifact.createdAt > previous.createdAt) {
      byTarget.set(artifact.target.targetId, artifact);
    }
  }
  return [...byTarget.values()];
}

function checkCount(artifact: RunArtifact, id: CheckResult["id"]): number {
  return artifact.checks
    .filter((check) => check.id === id)
    .reduce((sum, check) => sum + (check.evidence[0]?.itemCount ?? 0), 0);
}

function securityFindings(artifact: RunArtifact): number {
  const securityChecks = artifact.checks.filter((check) => check.id === "security" || check.id === "security-lite");
  return securityChecks.reduce((sum, check) => {
    const diagnosticCount = check.evidence.reduce((innerSum, evidence) => innerSum + (evidence.diagnostics?.length ?? 0), 0);
    return sum + diagnosticCount + (check.status === "fail" ? 1 : 0);
  }, 0);
}

function summarize(artifacts: RunArtifact[]): EnterpriseReportSummary {
  const scores = artifacts
    .map((artifact) => artifact.healthScore?.overall)
    .filter((score): score is number => typeof score === "number");
  return {
    serverCount: artifacts.length,
    passCount: artifacts.filter((artifact) => artifact.gate === "pass").length,
    failCount: artifacts.filter((artifact) => artifact.gate === "fail").length,
    securityFindings: artifacts.reduce((sum, artifact) => sum + securityFindings(artifact), 0),
    averageHealthScore: scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null,
  };
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

export function buildEnterpriseReport(artifacts: RunArtifact[], account = "MCP team"): string {
  const today = new Date().toISOString().slice(0, 10);
  const fleet = latestArtifactsByTarget(artifacts);
  const summary = summarize(fleet);
  const score = summary.averageHealthScore === null ? "n/a" : `${summary.averageHealthScore}/100`;
  const rows = fleet
    .sort((a, b) => a.target.targetId.localeCompare(b.target.targetId))
    .map((artifact) => {
      const checks = artifact.checks.filter((check) => check.status === "fail" || check.status === "partial");
      const issues = artifact.fatalError
        ? (artifact.fatalError.split("\n")[0] ?? artifact.fatalError)
        : checks.map((check) => `${check.id}: ${check.message}`).slice(0, 3).join("; ") || "No blocking issues";
      const health = artifact.healthScore ? `${artifact.healthScore.grade} (${artifact.healthScore.overall}/100)` : "n/a";
      return [
        `| ${artifact.target.targetId}`,
        artifact.gate,
        health,
        String(checkCount(artifact, "tools")),
        String(checkCount(artifact, "prompts")),
        String(checkCount(artifact, "resources")),
        String(securityFindings(artifact)),
        `${issues.replaceAll("|", "\\|")} |`,
      ].join(" | ");
    });

  return [
    `# MCP Observatory Enterprise Report`,
    "",
    `Account: ${account}`,
    `Generated: ${today}`,
    "",
    "## Executive Summary",
    "",
    `- Servers tested: ${summary.serverCount}`,
    `- Passing servers: ${summary.passCount}`,
    `- Failing servers: ${summary.failCount}`,
    `- Average health score: ${score}`,
    `- Security findings: ${summary.securityFindings}`,
    "",
    "## Production Risk",
    "",
    summary.failCount === 0
      ? "No blocking regressions were detected in the supplied run artifacts."
      : `${summary.failCount} server${summary.failCount === 1 ? " needs" : "s need"} remediation before relying on them in production agent workflows.`,
    "",
    "## Fleet Inventory",
    "",
    "| Server | Gate | Health | Tools | Prompts | Resources | Security Findings | Notes |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...rows,
    "",
    "## Recommended Pilot Scope",
    "",
    "- Hosted CI history for private repositories",
    "- Recurring security reports for production MCP servers",
    "- Fleet visibility across teams, repos, and agent environments",
    "- Support and certification review for servers that agents depend on",
    "",
    "Contact: william@banksey.com",
  ].join("\n");
}

function sampleCheck(id: CheckResult["id"], status: CheckResult["status"], itemCount = 0, message = `${id} ${status}`): CheckResult {
  return {
    id,
    capability: id,
    status,
    durationMs: 40,
    message,
    evidence: [{ endpoint: id, advertised: true, responded: status !== "fail", minimalShapePresent: status !== "fail", itemCount }],
  };
}

function sampleArtifact(targetId: string, gate: RunArtifact["gate"], score: number, grade: NonNullable<RunArtifact["healthScore"]>["grade"], checks: CheckResult[]): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate,
    runId: `sample-${targetId}`,
    createdAt: new Date().toISOString(),
    toolVersion: "0.26.1",
    target: {
      targetId,
      adapter: "local-process",
      command: "npx",
      args: ["-y", targetId],
    },
    environment: { platform: "sample", nodeVersion: "sample" },
    summary: {
      gate,
      total: checks.length,
      pass: checks.filter((check) => check.status === "pass").length,
      fail: checks.filter((check) => check.status === "fail").length,
      partial: checks.filter((check) => check.status === "partial").length,
      unsupported: 0,
      flaky: 0,
      skipped: 0,
    },
    checks,
    healthScore: {
      overall: score,
      grade,
      dimensions: [],
    },
  };
}

export function buildSampleEnterpriseArtifacts(): RunArtifact[] {
  return [
    sampleArtifact("payments-mcp", "pass", 91, "A", [
      sampleCheck("tools", "pass", 18),
      sampleCheck("prompts", "pass", 2),
      sampleCheck("resources", "pass", 1),
      sampleCheck("security-lite", "pass", 0),
    ]),
    sampleArtifact("internal-docs-mcp", "pass", 74, "C", [
      sampleCheck("tools", "pass", 9),
      sampleCheck("prompts", "pass", 0),
      sampleCheck("resources", "pass", 3),
      sampleCheck("schema-quality", "partial", 0, "Two tool input properties are missing descriptions."),
      sampleCheck("security-lite", "partial", 0, "Review URL and token-adjacent inputs before production use."),
    ]),
    sampleArtifact("customer-support-mcp", "fail", 58, "D", [
      sampleCheck("tools", "fail", 0, "Server did not respond to tools/list during startup window."),
      sampleCheck("security", "partial", 0, "Authentication metadata was not explicit in the target config."),
    ]),
  ];
}

export function renderEnterpriseReportHtml(markdown: string): string {
  const body = markdown
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${esc(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) return `<h2>${esc(line.slice(3))}</h2>`;
      if (line.startsWith("- ")) return `<li>${esc(line.slice(2))}</li>`;
      if (line.startsWith("|")) return `<pre>${esc(line)}</pre>`;
      if (!line.trim()) return "";
      return `<p>${esc(line)}</p>`;
    })
    .join("\n");
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>MCP Observatory Enterprise Report</title>",
    "<style>body{font-family:Inter,Arial,sans-serif;margin:40px;line-height:1.5;color:#18202a}h1,h2{line-height:1.15}pre{padding:8px 0;border-bottom:1px solid #dde3ea;white-space:pre-wrap}li{margin:4px 0}</style>",
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>",
  ].join("\n");
}

export function registerEnterpriseReportCommands(program: Command): void {
  program
    .command("enterprise-report")
    .description("Generate a static production/security report from run artifacts.")
    .option("--artifacts-dir <path>", "Directory containing run artifacts.", defaultRunsDirectory(process.cwd()))
    .option("--account <name>", "Account, team, or company name for the report.", "MCP team")
    .option("--format <format>", "Output format: markdown or html.", "markdown")
    .option("--output <path>", "Write report to file instead of stdout.")
    .option("--sample", "Use sanitized sample artifacts to demonstrate the paid pilot report.", false)
    .action(async (options: { artifactsDir: string; account: string; format: string; output?: string; sample?: boolean }) => {
      const artifacts = options.sample ? buildSampleEnterpriseArtifacts() : await loadArtifactsFromDir(options.artifactsDir);
      const markdown = buildEnterpriseReport(artifacts, options.account);
      const output = options.format === "html" ? renderEnterpriseReportHtml(markdown) : markdown;

      if (options.output) {
        await writeFile(options.output, output, "utf8");
        process.stdout.write(`  Enterprise report written to ${options.output}\n\n`);
      } else {
        process.stdout.write(`${output}\n`);
      }

      recordEvent(buildEvent("command_complete", "enterprise-report", "cli", {
        matrixServerCount: artifacts.length,
        matrixPassCount: artifacts.filter((artifact) => artifact.gate === "pass").length,
        matrixFailCount: artifacts.filter((artifact) => artifact.gate === "fail").length,
        securityFindingCount: artifacts.reduce((sum, artifact) => sum + securityFindings(artifact), 0),
        sampleReport: options.sample === true,
      }));
      if (options.output) {
        maybePrintCloudCta("ci");
      }
    });
}

async function loadArtifactsFromDir(dir: string): Promise<RunArtifact[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const artifacts: RunArtifact[] = [];
  for (const file of entries.filter((entry) => entry.endsWith(".json")).sort()) {
    try {
      const data = JSON.parse(await readFile(path.join(dir, file), "utf8")) as unknown;
      artifacts.push(validateRunArtifact(data));
    } catch {
      // Ignore invalid artifacts so one bad file does not block the report.
    }
  }
  return artifacts;
}
