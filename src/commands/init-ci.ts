import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { buildEvent, recordEvent } from "../telemetry.js";

export interface InitCiOptions {
  command?: string;
  target?: string;
  workflow?: string;
  badgeFile?: string;
  badge?: boolean;
  targetConfig?: string | boolean;
  prBody?: string | boolean;
  issueBody?: string | boolean;
  scoreBadge?: string | boolean;
  commentOnPr?: boolean;
  setStatus?: boolean;
  actionRef?: string;
  all?: boolean;
  force?: boolean;
}

const DEFAULT_WORKFLOW_PATH = ".github/workflows/mcp-observatory.yml";
const DEFAULT_BADGE_PATH = "docs/mcp-observatory-badge.md";
const DEFAULT_TARGET_CONFIG_PATH = "mcp-observatory.target.json";
const DEFAULT_PR_BODY_PATH = "docs/mcp-observatory-pr-body.md";
const DEFAULT_ISSUE_BODY_PATH = "docs/mcp-observatory-issue.md";
const DEFAULT_SCORE_BADGE_PATH = "docs/mcp-observatory-score-badge.md";
const DEFAULT_ACTION_REF = "v0.24.0";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function workflowYaml(options: InitCiOptions): string {
  const command = options.command?.trim();
  const target = options.target?.trim();
  const commentsEnabled = options.commentOnPr === true;
  const statusEnabled = options.setStatus === true;
  const actionRef = options.actionRef?.trim() || DEFAULT_ACTION_REF;
  const lines = [
    "name: MCP Observatory",
    "",
    "on:",
    "  pull_request:",
    "  push:",
    "    branches: [main]",
    "",
    "permissions:",
    "  contents: read",
  ];

  if (commentsEnabled) lines.push("  pull-requests: write");
  if (statusEnabled) lines.push("  statuses: write");

  lines.push(
    "",
    "jobs:",
    "  mcp-observatory:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v6",
    `      - uses: KryptosAI/mcp-observatory/action@${actionRef}`,
    "        with:",
  );

  if (target) {
    lines.push(`          target: ${target}`);
  } else if (shouldWrite(options.targetConfig, options.all)) {
    lines.push(`          target: ${optionPath(options.targetConfig, DEFAULT_TARGET_CONFIG_PATH)}`);
  } else {
    lines.push(`          command: ${command ?? "npx -y <server-package>"}`);
  }

  lines.push(
    "          deep: true",
    "          security: true",
    `          comment-on-pr: ${commentsEnabled ? "true" : "false"}`,
    `          set-status: ${statusEnabled ? "true" : "false"}`,
  );
  if (!commentsEnabled && !statusEnabled) {
    lines.push("          # Read-only by default for low-friction external PRs. Maintainers can enable PR comments/statuses later.");
  }
  lines.push("");

  return lines.join("\n");
}

function badgeMarkdown(): string {
  return [
    "[![MCP Observatory](https://img.shields.io/badge/MCP%20Observatory-enabled-2563eb)](https://github.com/KryptosAI/mcp-observatory)",
    "",
    "This project runs MCP Observatory in CI to check MCP compatibility, schema drift, and common security issues.",
    "",
  ].join("\n");
}

function splitCommand(command: string): string[] {
  return command.match(/"[^"]*"|'[^']*'|\S+/g)?.map((part) => part.replace(/^["']|["']$/g, "")) ?? [];
}

function targetConfigJson(options: InitCiOptions): string {
  const command = options.command?.trim() || "npx -y <server-package>";
  const [bin = "npx", ...args] = splitCommand(command);
  return JSON.stringify({
    targetId: "mcp-server",
    adapter: "local-process",
    command: bin,
    args,
    timeoutMs: 15000,
    metadata: {
      observatory: "generated-by-init-ci",
    },
  }, null, 2) + "\n";
}

function prBodyMarkdown(options: InitCiOptions): string {
  const command = options.command?.trim();
  const target = options.target?.trim() ?? (shouldWrite(options.targetConfig, options.all) ? optionPath(options.targetConfig, DEFAULT_TARGET_CONFIG_PATH) : undefined);
  const setupLine = target
    ? `This PR adds an MCP Observatory GitHub Action that checks \`${target}\` on pull requests and pushes.`
    : `This PR adds an MCP Observatory GitHub Action that checks \`${command ?? "the MCP server"}\` on pull requests and pushes.`;
  return [
    "## Add MCP Observatory CI",
    "",
    setupLine,
    "",
    "Why this helps:",
    "- catches MCP compatibility regressions before release",
    "- surfaces schema drift and common security issues",
    "- publishes a small PR report for maintainers",
    "- adds an optional README trust badge",
    "",
    "This does not require an MCP Observatory account. The generated workflow is read-only by default for low-friction review; maintainers can enable PR comments or commit statuses later if they want inline reporting.",
    "",
    "The action reference is pinned to a release by default. Security-sensitive repos can replace it with a full commit SHA.",
    "",
    "Maintainer note: if this PR is opened on the MCP server's own repository, please update `mcp-observatory.target.json` to run the local build/start command instead of a published package. The generated `npx` command is a portable default, but local CI should validate the code in this PR.",
    "",
    "Generated by:",
    "",
    "```bash",
    "npx @kryptosai/mcp-observatory setup-ci --all --command \"npx -y <server-package>\"",
    "```",
    "",
  ].join("\n");
}

function issueBodyMarkdown(options: InitCiOptions): string {
  const command = options.command?.trim() ?? "npx -y <server-package>";
  return [
    "## Add MCP Observatory compatibility/security checks",
    "",
    "This project appears to expose an MCP server. MCP Observatory can add a lightweight GitHub Action that checks MCP compatibility, schema drift, and common security issues before agents depend on a release.",
    "",
    "Suggested setup:",
    "",
    "```bash",
    `npx @kryptosai/mcp-observatory setup-ci --all --command "${command.replaceAll("\"", "\\\"")}"`,
    "```",
    "",
    "The generated workflow runs on pull requests and pushes, comments a concise report, and can include a README badge if maintainers want a public trust signal.",
    "",
    "If this is the server's own repository, prefer a local build/start command in the generated target config so CI validates the pull request code rather than only the published package.",
    "",
  ].join("\n");
}

function scoreBadgeMarkdown(): string {
  return [
    "# MCP Observatory Score Badge",
    "",
    "Generate a score badge after a successful local check:",
    "",
    "```bash",
    "npx @kryptosai/mcp-observatory badge npx -y <server-package> --output docs/mcp-health.svg",
    "```",
    "",
    "Then add this to your README:",
    "",
    "```markdown",
    "[![MCP Health](docs/mcp-health.svg)](https://github.com/KryptosAI/mcp-observatory)",
    "```",
    "",
  ].join("\n");
}

function shouldWrite(value: string | boolean | undefined, all: boolean | undefined): boolean {
  return all === true || value !== undefined && value !== false;
}

function optionPath(value: string | boolean | undefined, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

async function writeFileOnce(filePath: string, content: string, force: boolean): Promise<"created" | "overwritten" | "skipped"> {
  const alreadyExists = await exists(filePath);
  if (alreadyExists && !force) return "skipped";
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return alreadyExists ? "overwritten" : "created";
}

export interface InitCiResult {
  workflowStatus: string;
  badgeStatus?: string;
  targetConfigStatus?: string;
  prBodyStatus?: string;
  issueBodyStatus?: string;
  scoreBadgeStatus?: string;
  workflowPath: string;
  badgePath?: string;
  targetConfigPath?: string;
  prBodyPath?: string;
  issueBodyPath?: string;
  scoreBadgePath?: string;
}

export async function initCi(options: InitCiOptions): Promise<InitCiResult> {
  if (options.command && options.target) {
    throw new Error("Use either --command or --target, not both.");
  }
  if (options.target && shouldWrite(options.targetConfig, options.all)) {
    throw new Error("Use either --target or --target-config, not both.");
  }

  const workflowPath = options.workflow ?? DEFAULT_WORKFLOW_PATH;
  const badgePath = options.badgeFile ?? DEFAULT_BADGE_PATH;
  const workflowStatus = await writeFileOnce(workflowPath, workflowYaml(options), options.force === true);
  const result: InitCiResult = {
    workflowStatus,
    workflowPath,
  };

  if (options.badge || options.all) {
    result.badgeStatus = await writeFileOnce(badgePath, badgeMarkdown(), options.force === true);
    result.badgePath = badgePath;
  }
  if (shouldWrite(options.targetConfig, options.all)) {
    const targetConfigPath = optionPath(options.targetConfig, DEFAULT_TARGET_CONFIG_PATH);
    result.targetConfigStatus = await writeFileOnce(targetConfigPath, targetConfigJson(options), options.force === true);
    result.targetConfigPath = targetConfigPath;
  }
  if (shouldWrite(options.prBody, options.all)) {
    const prBodyPath = optionPath(options.prBody, DEFAULT_PR_BODY_PATH);
    result.prBodyStatus = await writeFileOnce(prBodyPath, prBodyMarkdown(options), options.force === true);
    result.prBodyPath = prBodyPath;
  }
  if (shouldWrite(options.issueBody, options.all)) {
    const issueBodyPath = optionPath(options.issueBody, DEFAULT_ISSUE_BODY_PATH);
    result.issueBodyStatus = await writeFileOnce(issueBodyPath, issueBodyMarkdown(options), options.force === true);
    result.issueBodyPath = issueBodyPath;
  }
  if (shouldWrite(options.scoreBadge, options.all)) {
    const scoreBadgePath = optionPath(options.scoreBadge, DEFAULT_SCORE_BADGE_PATH);
    result.scoreBadgeStatus = await writeFileOnce(scoreBadgePath, scoreBadgeMarkdown(), options.force === true);
    result.scoreBadgePath = scoreBadgePath;
  }

  return result;
}

function addInitCiOptions(command: Command): Command {
  return command
    .option("--command <command>", "MCP server command to test, for example: 'npx -y my-mcp-server'")
    .option("--target <file>", "Target config JSON path to use instead of a command.")
    .option("--workflow <file>", "Workflow output path.", DEFAULT_WORKFLOW_PATH)
    .option("--badge", "Also write a README badge snippet.", false)
    .option("--badge-file <file>", "Badge snippet output path.", DEFAULT_BADGE_PATH)
    .option("--target-config [file]", "Also write an example target config and point the workflow at it.")
    .option("--pr-body [file]", "Also write a maintainer PR body.")
    .option("--issue-body [file]", "Also write an issue-only fallback body.")
    .option("--score-badge [file]", "Also write score badge generation instructions.")
    .option("--comment-on-pr", "Allow the generated workflow to post PR comments. This adds pull-requests: write permission.", false)
    .option("--set-status", "Allow the generated workflow to set commit statuses. This adds statuses: write permission.", false)
    .option("--action-ref <ref>", "Git ref for KryptosAI/mcp-observatory/action. Use a full commit SHA for strict third-party action pinning.", DEFAULT_ACTION_REF)
    .option("--all", "Write the full adoption kit: workflow, badge, target config, PR body, issue body, and score badge instructions.", false)
    .option("--force", "Overwrite existing files.", false);
}

function initCiAction(commandName: "init-ci" | "setup-ci"): (options: InitCiOptions) => Promise<void> {
  return async (options: InitCiOptions) => {
    const result = await initCi(options);
    const skipped = result.workflowStatus === "skipped";
    process.stdout.write(`${result.workflowStatus}: ${result.workflowPath}\n`);
    if (result.badgePath && result.badgeStatus) {
      process.stdout.write(`${result.badgeStatus}: ${result.badgePath}\n`);
    }
    if (result.targetConfigPath && result.targetConfigStatus) {
      process.stdout.write(`${result.targetConfigStatus}: ${result.targetConfigPath}\n`);
    }
    if (result.prBodyPath && result.prBodyStatus) {
      process.stdout.write(`${result.prBodyStatus}: ${result.prBodyPath}\n`);
    }
    if (result.issueBodyPath && result.issueBodyStatus) {
      process.stdout.write(`${result.issueBodyStatus}: ${result.issueBodyPath}\n`);
    }
    if (result.scoreBadgePath && result.scoreBadgeStatus) {
      process.stdout.write(`${result.scoreBadgeStatus}: ${result.scoreBadgePath}\n`);
    }
    if (skipped) {
      process.stdout.write("Use --force to overwrite existing files.\n");
    }
    process.stdout.write("Next: commit the workflow, open a PR, and paste the generated PR body if present.\n");

    recordEvent(buildEvent("command_complete", commandName, "cli", {
      ciProvider: "github-actions",
      commitStatusSet: !skipped,
    }));
  };
}

export function registerInitCiCommands(program: Command): void {
  addInitCiOptions(
    program
      .command("init-ci")
      .description("Create a GitHub Action and optional badge snippet for MCP Observatory checks."),
  ).action(initCiAction("init-ci"));

  addInitCiOptions(
    program
      .command("setup-ci")
      .description("Friendly alias for init-ci. Create a GitHub Action and adoption kit for MCP checks."),
  ).action(initCiAction("setup-ci"));
}

export async function readGeneratedWorkflow(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}
