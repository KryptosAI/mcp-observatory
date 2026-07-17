import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { buildEvent, detectCiProvider, normalizeCampaign, recordEvent } from "../telemetry.js";
import { defaultRunsDirectory, findLatestSuccessfulRunArtifact, readArtifact } from "../storage.js";
import type { RunArtifact } from "../types.js";
import { TOOL_VERSION } from "../version.js";
import { quoteShell } from "./helpers.js";

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
  sarif?: boolean;
  schedule?: string | boolean;
  actionRef?: string;
  all?: boolean;
  force?: boolean;
  doctor?: boolean;
  fix?: boolean;
  fromLastRun?: boolean;
  campaign?: string;
  ciProvider?: "github-actions" | "gitlab-ci" | "circleci" | "bitbucket-pipelines" | "azure-pipelines";
}

const CI_FILE_PATHS: Record<string, string> = {
  "github-actions": ".github/workflows/mcp-observatory.yml",
  "gitlab-ci": ".gitlab-ci.yml",
  "circleci": ".circleci/config.yml",
  "bitbucket-pipelines": "bitbucket-pipelines.yml",
  "azure-pipelines": "azure-pipelines.yml",
};

const PROVIDER_LABELS: Record<string, string> = {
  "github-actions": "GitHub Action",
  "gitlab-ci": "GitLab CI",
  "circleci": "CircleCI",
  "bitbucket-pipelines": "Bitbucket Pipelines",
  "azure-pipelines": "Azure Pipelines",
};

function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? "CI Workflow";
}

const DEFAULT_WORKFLOW_PATH = ".github/workflows/mcp-observatory.yml";
const DEFAULT_BADGE_PATH = "docs/mcp-observatory-badge.md";
const DEFAULT_TARGET_CONFIG_PATH = "mcp-observatory.target.json";
const DEFAULT_PR_BODY_PATH = "docs/mcp-observatory-pr-body.md";
const DEFAULT_ISSUE_BODY_PATH = "docs/mcp-observatory-issue.md";
const DEFAULT_SCORE_BADGE_PATH = "docs/mcp-observatory-score-badge.md";
const DEFAULT_ACTION_REF = `v${TOOL_VERSION}`;
const DEFAULT_WEEKLY_CRON = "0 9 * * 1";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeSchedule(schedule: string | boolean | undefined): string | undefined {
  if (schedule === undefined || schedule === false) return undefined;
  if (schedule === true || schedule === "weekly") return DEFAULT_WEEKLY_CRON;
  if (schedule === "daily") return "0 9 * * *";
  const value = schedule.trim();
  return value.length > 0 ? value : DEFAULT_WEEKLY_CRON;
}

function githubActionsYaml(options: InitCiOptions): string {
  const command = options.command?.trim();
  const target = options.target?.trim();
  const commentsEnabled = options.commentOnPr === true;
  const statusEnabled = options.setStatus === true;
  const sarifEnabled = options.sarif === true;
  const schedule = normalizeSchedule(options.schedule);
  const actionRef = options.actionRef?.trim() || DEFAULT_ACTION_REF;
  const lines = [
    "name: MCP Observatory",
    "",
    "on:",
    "  pull_request:",
    "  push:",
    "    branches: [main]",
  ];

  if (schedule) {
    lines.push("  schedule:", `    - cron: ${JSON.stringify(schedule)}`);
  }

  lines.push(
    "",
    "permissions:",
    "  contents: read",
  );

  if (commentsEnabled) lines.push("  pull-requests: write");
  if (statusEnabled) lines.push("  statuses: write");
  if (sarifEnabled) lines.push("  security-events: write");

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
  if (sarifEnabled) lines.push("          upload-sarif: true");
  if (!commentsEnabled && !statusEnabled && !sarifEnabled) {
    lines.push("          # Read-only by default for low-friction external PRs. Maintainers can enable PR comments/statuses later.");
  }
  lines.push("");

  return lines.join("\n");
}

function workflowYaml(options: InitCiOptions): string {
  const provider = options.ciProvider ?? "github-actions";
  switch (provider) {
    case "github-actions": return githubActionsYaml(options);
    case "gitlab-ci": return gitlabCiYaml(options);
    case "circleci": return circleCiYaml(options);
    case "bitbucket-pipelines": return bitbucketYaml(options);
    case "azure-pipelines": return azurePipelinesYaml(options);
    default: return githubActionsYaml(options);
  }
}

function gitlabCiYaml(options: InitCiOptions): string {
  const lines = [
    "mcp-observatory:",
    "  image: node:22",
  ];
  if (options.schedule) {
    lines.push("  only:", "    - schedules");
  } else {
    lines.push("  rules:", "    - if: $CI_PIPELINE_SOURCE == 'merge_request_event'", "    - if: $CI_COMMIT_BRANCH == 'main'");
  }
  lines.push("  script:");
  if (options.command) {
    lines.push(`    - npx @kryptosai/mcp-observatory test ${options.command} --deep --security` + (options.sarif !== false ? " --sarif mcp-observatory.sarif" : ""));
  } else if (options.all) {
    lines.push("    - npx @kryptosai/mcp-observatory scan --deep --security" + (options.sarif !== false ? " --sarif mcp-observatory.sarif" : ""));
  } else {
    lines.push(`    - npx @kryptosai/mcp-observatory test --target mcp-observatory.target.json --deep --security`);
  }
  if (options.sarif !== false) {
    lines.push("  artifacts:", "    reports:", "      sast: mcp-observatory.sarif");
  }
  return lines.join("\n");
}

function circleCiYaml(options: InitCiOptions): string {
  const lines = [
    "version: 2.1",
    "",
    "jobs:",
    "  mcp-observatory:",
    "    docker:",
    "      - image: cimg/node:22.0",
    "    steps:",
    "      - checkout",
    `      - run:`,
  ];
  if (options.command) {
    lines.push(`          command: npx @kryptosai/mcp-observatory test ${options.command} --deep --security` + (options.sarif !== false ? " --sarif mcp-observatory.sarif" : ""));
  } else if (options.all) {
    lines.push("          command: npx @kryptosai/mcp-observatory scan --deep --security" + (options.sarif !== false ? " --sarif mcp-observatory.sarif" : ""));
  } else {
    lines.push("          command: npx @kryptosai/mcp-observatory test --target mcp-observatory.target.json --deep --security");
  }
  if (options.sarif !== false) {
    lines.push("      - store_artifacts:", "          path: mcp-observatory.sarif");
  }
  lines.push("",
    "workflows:",
    "  version: 2",
    "  mcp-observatory-workflow:",
    "    jobs:",
    "      - mcp-observatory" + (options.schedule ? ":\n          filters:\n            branches:\n              only: /scheduled-scan/" : ""));
  return lines.join("\n");
}

function bitbucketYaml(options: InitCiOptions): string {
  const lines = [
    "image: node:22",
    "",
    "pipelines:",
  ];
  if (options.schedule) {
    lines.push("  custom:");
    lines.push("    mcp-observatory-scheduled:");
  } else {
    lines.push("  pull-requests:");
    lines.push("    '**':");
  }
  lines.push("      - step:");
  lines.push("          name: MCP Observatory Safety Check");
  lines.push("          script:");
  if (options.command) {
    lines.push(`            - npx @kryptosai/mcp-observatory test ${options.command} --deep --security` + (options.sarif !== false ? " --sarif mcp-observatory.sarif" : ""));
  } else if (options.all) {
    lines.push("            - npx @kryptosai/mcp-observatory scan --deep --security" + (options.sarif !== false ? " --sarif mcp-observatory.sarif" : ""));
  } else {
    lines.push("            - npx @kryptosai/mcp-observatory test --target mcp-observatory.target.json --deep --security");
  }
  if (options.sarif !== false) {
    lines.push("          artifacts:", "            - mcp-observatory.sarif");
  }
  if (!options.schedule && options.command) {
    lines.push("", "  branches:", "    main:", "      - step:", "          name: MCP Observatory Safety Check", "          script:", `            - npx @kryptosai/mcp-observatory test ${options.command} --deep --security` + (options.sarif !== false ? " --sarif mcp-observatory.sarif" : ""));
  }
  return lines.join("\n");
}

function azurePipelinesYaml(options: InitCiOptions): string {
  const lines = [
    "trigger:",
    "  - main",
    "",
  ];
  if (!options.schedule) {
    lines.push("pr:", "  - main", "");
  } else {
    lines.push("schedules:", "  - cron: '0 6 * * *'", "    displayName: Daily MCP safety scan", "    branches:", "      include:", "        - main", "");
  }
  lines.push("pool:", "  vmImage: ubuntu-latest", "",
    "steps:",
    "  - task: NodeTool@0",
    "    inputs:",
    "      versionSpec: '22.x'",
    "    displayName: 'Install Node.js'",
    "",
    "  - script: |");
  if (options.command) {
    lines.push(`      npx @kryptosai/mcp-observatory test ${options.command} --deep --security` + (options.sarif !== false ? " --sarif mcp-observatory.sarif" : ""));
  } else if (options.all) {
    lines.push("      npx @kryptosai/mcp-observatory scan --deep --security" + (options.sarif !== false ? " --sarif mcp-observatory.sarif" : ""));
  } else {
    lines.push("      npx @kryptosai/mcp-observatory test --target mcp-observatory.target.json --deep --security");
  }
  lines.push("    displayName: 'MCP Observatory Safety Check'");
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
    "- can optionally upload normalized findings into GitHub Code Scanning",
    "- publishes a small PR report for maintainers",
    "- adds an optional README trust badge",
    "",
    "This does not require an MCP Observatory account. The generated workflow is read-only by default for low-friction review; maintainers can enable PR comments, commit statuses, or SARIF upload later if they want inline reporting in GitHub.",
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

export interface SetupCiDoctorCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
  fix?: string;
}

export interface SetupCiDoctorResult {
  ready: boolean;
  checks: SetupCiDoctorCheck[];
  nextCommand: string;
}

async function readOptional(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function checkFile(id: string, label: string, filePath: string, content: string | undefined, expectedText?: string): SetupCiDoctorCheck {
  if (content === undefined) {
    return {
      id,
      label,
      status: "warn",
      message: `${filePath} is missing.`,
      fix: `Run setup-ci --all to generate ${filePath}.`,
    };
  }
  if (expectedText && !content.includes(expectedText)) {
    return {
      id,
      label,
      status: "warn",
      message: `${filePath} exists but does not look like a generated MCP Observatory asset.`,
      fix: `Regenerate with setup-ci --all --force if this file should be managed by Observatory.`,
    };
  }
  return {
    id,
    label,
    status: "pass",
    message: `${filePath} exists.`,
  };
}

function setupCommand(options: InitCiOptions): string {
  const sarif = options.sarif ? " --sarif" : "";
  const schedule = normalizeSchedule(options.schedule)
    ? ` --schedule ${quoteShell(String(options.schedule === true ? "weekly" : options.schedule))}`
    : "";
  if (options.target) return `npx @kryptosai/mcp-observatory setup-ci --all --target ${options.target}${sarif}${schedule}`;
  if (options.command) return `npx @kryptosai/mcp-observatory setup-ci --all --command "${options.command.replaceAll("\"", "\\\"")}"${sarif}${schedule}`;
  return `npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"${sarif}${schedule}`;
}

function initCiOptionsFromLastRunArtifact(
  artifact: RunArtifact,
  force: boolean | undefined,
  sarif: boolean | undefined,
  schedule: string | boolean | undefined,
): InitCiOptions | undefined {
  if (artifact.target.adapter !== "local-process") return undefined;
  const command = [artifact.target.command, ...artifact.target.args].map(quoteShell).join(" ");
  return { all: true, command, force, sarif, schedule };
}

function inferWorkflowTargetOptions(workflow: string | undefined): Pick<InitCiOptions, "command" | "target"> {
  const target = workflow?.match(/(^|\n)\s+target:\s+(.+)/)?.[2]?.trim();
  if (target) return { target };
  const command = workflow?.match(/(^|\n)\s+command:\s+(.+)/)?.[2]?.trim();
  if (command) return { command };
  return {};
}

function doctorFixOptions(options: InitCiOptions, workflow: string | undefined): InitCiOptions {
  const inferred = options.command || options.target ? {} : inferWorkflowTargetOptions(workflow);
  return {
    ...options,
    ...inferred,
    all: true,
    force: true,
    sarif: true,
    schedule: options.schedule ?? "weekly",
    doctor: false,
    fix: false,
  };
}

export async function doctorSetupCi(options: InitCiOptions = {}): Promise<SetupCiDoctorResult> {
  const detectedProvider = options.ciProvider ?? detectCiProvider() ?? "github-actions";
  const defaultPath = CI_FILE_PATHS[detectedProvider] ?? DEFAULT_WORKFLOW_PATH;
  const workflowPath = options.workflow ?? defaultPath;
  const badgePath = options.badgeFile ?? DEFAULT_BADGE_PATH;
  const targetConfigPath = optionPath(options.targetConfig, DEFAULT_TARGET_CONFIG_PATH);
  const prBodyPath = optionPath(options.prBody, DEFAULT_PR_BODY_PATH);
  const issueBodyPath = optionPath(options.issueBody, DEFAULT_ISSUE_BODY_PATH);
  const scoreBadgePath = optionPath(options.scoreBadge, DEFAULT_SCORE_BADGE_PATH);
  const ciLabel = providerLabel(detectedProvider);

  const workflow = await readOptional(workflowPath);
  const checks: SetupCiDoctorCheck[] = [];
  if (workflow === undefined) {
    checks.push({
      id: "workflow",
      label: ciLabel,
      status: "fail",
      message: `${workflowPath} is missing.`,
      fix: setupCommand(options),
    });
  } else {
    checks.push({
      id: "workflow",
      label: ciLabel,
      status: "pass",
      message: `${workflowPath} exists.`,
    });

    const actionRef = workflow.match(/KryptosAI\/mcp-observatory\/action@([^\s]+)/)?.[1];
    if (!actionRef) {
      checks.push({
        id: "action-ref",
        label: "Pinned Action",
        status: "fail",
        message: "Workflow does not use KryptosAI/mcp-observatory/action.",
        fix: setupCommand(options),
      });
    } else if (actionRef === "main") {
      checks.push({
        id: "action-ref",
        label: "Pinned Action",
        status: "warn",
        message: "Workflow uses action@main.",
        fix: "Pin the action to a release tag or full commit SHA.",
      });
    } else {
      checks.push({
        id: "action-ref",
        label: "Pinned Action",
        status: "pass",
        message: `Workflow uses action@${actionRef}.`,
      });
    }

    const hasTarget = /(^|\n)\s+target:\s+\S+/.test(workflow);
    const hasCommand = /(^|\n)\s+command:\s+\S+/.test(workflow);
    checks.push({
      id: "target",
      label: "Target",
      status: hasTarget || hasCommand ? "pass" : "fail",
      message: hasTarget || hasCommand ? "Workflow has an MCP target." : "Workflow does not define command or target.",
      fix: hasTarget || hasCommand ? undefined : setupCommand(options),
    });

    const hasDeep = /(^|\n)\s+deep:\s+true/.test(workflow);
    const hasSecurity = /(^|\n)\s+security:\s+true/.test(workflow);
    checks.push({
      id: "coverage",
      label: "Coverage",
      status: hasDeep && hasSecurity ? "pass" : "warn",
      message: hasDeep && hasSecurity ? "Workflow enables deep and security checks." : "Workflow should enable deep and security checks.",
      fix: hasDeep && hasSecurity ? undefined : "Set deep: true and security: true in the action inputs.",
    });

    const writesPr = /(^|\n)\s+pull-requests:\s+write/.test(workflow);
    const writesStatus = /(^|\n)\s+statuses:\s+write/.test(workflow);
    const writesSarif = /(^|\n)\s+security-events:\s+write/.test(workflow);
    checks.push({
      id: "permissions",
      label: "Permissions",
      status: writesPr || writesStatus || writesSarif ? "warn" : "pass",
      message: writesPr || writesStatus || writesSarif ? "Workflow can write PR comments, statuses, or code scanning results." : "Workflow is read-only by default.",
      fix: writesPr || writesStatus || writesSarif ? "Keep write permissions only when maintainers intentionally want PR comments, commit statuses, or SARIF upload." : undefined,
    });
  }

  checks.push(checkFile("badge", "README Badge", badgePath, await readOptional(badgePath), "MCP Observatory"));
  checks.push(checkFile("target-config", "Target Config", targetConfigPath, await readOptional(targetConfigPath), "targetId"));
  checks.push(checkFile("pr-body", "Maintainer PR Body", prBodyPath, await readOptional(prBodyPath), "Add MCP Observatory CI"));
  checks.push(checkFile("issue-body", "Issue Fallback", issueBodyPath, await readOptional(issueBodyPath), "compatibility/security"));
  checks.push(checkFile("score-badge", "Score Badge Notes", scoreBadgePath, await readOptional(scoreBadgePath), "mcp-observatory badge"));

  return {
    ready: checks.every((check) => check.status !== "fail"),
    checks,
    nextCommand: setupCommand(options),
  };
}

export async function initCi(options: InitCiOptions): Promise<InitCiResult> {
  if (options.command && options.target) {
    throw new Error("Use either --command or --target, not both.");
  }
  if (options.target && shouldWrite(options.targetConfig, options.all)) {
    throw new Error("Use either --target or --target-config, not both.");
  }

  const detectedProvider = options.ciProvider ?? detectCiProvider() ?? "github-actions";
  const defaultPath = CI_FILE_PATHS[detectedProvider] ?? DEFAULT_WORKFLOW_PATH;
  const workflowPath = options.workflow ?? defaultPath;
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
    .option("--sarif", "Upload normalized findings to GitHub Code Scanning. This adds security-events: write permission.", false)
    .option("--schedule [cadence]", "Also run the workflow on a schedule: weekly, daily, or a cron expression.")
    .option("--action-ref <ref>", "Git ref for KryptosAI/mcp-observatory/action. Use a full commit SHA for strict third-party action pinning.", DEFAULT_ACTION_REF)
    .option("--all", "Write the full adoption kit: workflow, badge, target config, PR body, issue body, and score badge instructions.", false)
    .option("--force", "Overwrite existing files.", false)
    .option("--doctor", "Inspect the current repository's MCP Observatory CI adoption state.", false)
    .option("--fix", "With --doctor, repair the adoption kit with deep, security, SARIF, and weekly scheduled checks.", false)
    .option("--from-last-run", "Generate the adoption kit from the latest successful local run artifact.", false)
    .option("--campaign <slug>", "Attach a safe campaign/source slug to telemetry for attribution.")
    .option("--identify <email>", "Opt-in: share your email to help us understand who uses Observatory. Never shared, never spammed.");
}

function initCiAction(commandName: "init-ci" | "setup-ci"): (options: InitCiOptions & { identify?: string }) => Promise<void> {
  return async (options: InitCiOptions & { identify?: string }) => {
    if (options.campaign) options.campaign = normalizeCampaign(options.campaign);
    if (options.doctor) {
      const result = await doctorSetupCi(options);
      process.stdout.write("MCP Observatory CI doctor\n\n");
      for (const check of result.checks) {
        const marker = check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗";
        process.stdout.write(`${marker} ${check.label}: ${check.message}\n`);
        if (check.fix) process.stdout.write(`  fix: ${check.fix}\n`);
      }
      process.stdout.write(`\nNext best action:\n  ${result.nextCommand}\n`);
      if (options.fix) {
        const defaultPath = CI_FILE_PATHS[options.ciProvider ?? detectCiProvider() ?? "github-actions"] ?? DEFAULT_WORKFLOW_PATH;
        const workflow = await readOptional(options.workflow ?? defaultPath);
        const fixed = await initCi(doctorFixOptions(options, workflow));
        process.stdout.write("\nApplied repair:\n");
        process.stdout.write(`${fixed.workflowStatus}: ${fixed.workflowPath}\n`);
        if (fixed.badgePath && fixed.badgeStatus) process.stdout.write(`${fixed.badgeStatus}: ${fixed.badgePath}\n`);
        if (fixed.targetConfigPath && fixed.targetConfigStatus) process.stdout.write(`${fixed.targetConfigStatus}: ${fixed.targetConfigPath}\n`);
        if (fixed.prBodyPath && fixed.prBodyStatus) process.stdout.write(`${fixed.prBodyStatus}: ${fixed.prBodyPath}\n`);
        if (fixed.issueBodyPath && fixed.issueBodyStatus) process.stdout.write(`${fixed.issueBodyStatus}: ${fixed.issueBodyPath}\n`);
        if (fixed.scoreBadgePath && fixed.scoreBadgeStatus) process.stdout.write(`${fixed.scoreBadgeStatus}: ${fixed.scoreBadgePath}\n`);
        process.stdout.write("\nAutomated checks: pull requests, pushes to main, and weekly scheduled runs.\n");
      } else if (!result.ready) {
        process.exitCode = 1;
      }
      recordEvent(buildEvent("command_complete", commandName, "cli", {
        ciProvider: options.ciProvider ?? detectCiProvider() ?? "github-actions",
        setupCiDoctor: true,
        setupCiReady: result.ready,
        setupCiFailCount: result.checks.filter((check) => check.status === "fail").length,
        setupCiWarnCount: result.checks.filter((check) => check.status === "warn").length,
        setupCiFixApplied: options.fix === true,
        campaign: options.campaign,
      }));
      return;
    }

    if (options.fromLastRun) {
      if (options.command || options.target) {
        throw new Error("Use --from-last-run by itself, without --command or --target.");
      }
      const latestPath = await findLatestSuccessfulRunArtifact(defaultRunsDirectory(process.cwd()));
      if (!latestPath) {
        throw new Error("No successful run artifact found. Run a passing MCP check first.");
      }
      const artifact = await readArtifact(latestPath);
      if (artifact.artifactType !== "run") {
        throw new Error(`Latest artifact is not a run artifact: ${latestPath}`);
      }
      const fromRunOptions = initCiOptionsFromLastRunArtifact(artifact, options.force, options.sarif, options.schedule);
      if (!fromRunOptions) {
        throw new Error(`Latest successful run does not contain enough target information for setup-ci: ${latestPath}`);
      }
      options = {
        ...options,
        ...fromRunOptions,
        all: true,
      };
      process.stdout.write(`Using latest successful run: ${latestPath}\n`);
    }

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
      ciProvider: options.ciProvider ?? detectCiProvider() ?? "github-actions",
      commitStatusSet: !skipped,
      campaign: options.campaign,
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
