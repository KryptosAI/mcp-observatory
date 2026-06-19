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
  force?: boolean;
}

const DEFAULT_WORKFLOW_PATH = ".github/workflows/mcp-observatory.yml";
const DEFAULT_BADGE_PATH = "docs/mcp-observatory-badge.md";

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
  const lines = [
    "name: MCP Observatory",
    "",
    "on:",
    "  pull_request:",
    "  push:",
    "    branches: [main]",
    "",
    "jobs:",
    "  mcp-observatory:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v6",
    "      - uses: KryptosAI/mcp-observatory/action@main",
    "        with:",
  ];

  if (target) {
    lines.push(`          target: ${target}`);
  } else {
    lines.push(`          command: ${command ?? "npx -y <server-package>"}`);
  }

  lines.push(
    "          deep: true",
    "          security: true",
    "          comment-on-pr: true",
    "",
  );

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

async function writeFileOnce(filePath: string, content: string, force: boolean): Promise<"created" | "overwritten" | "skipped"> {
  const alreadyExists = await exists(filePath);
  if (alreadyExists && !force) return "skipped";
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return alreadyExists ? "overwritten" : "created";
}

export async function initCi(options: InitCiOptions): Promise<{ workflowStatus: string; badgeStatus?: string; workflowPath: string; badgePath?: string }> {
  if (options.command && options.target) {
    throw new Error("Use either --command or --target, not both.");
  }

  const workflowPath = options.workflow ?? DEFAULT_WORKFLOW_PATH;
  const badgePath = options.badgeFile ?? DEFAULT_BADGE_PATH;
  const workflowStatus = await writeFileOnce(workflowPath, workflowYaml(options), options.force === true);
  const result: { workflowStatus: string; badgeStatus?: string; workflowPath: string; badgePath?: string } = {
    workflowStatus,
    workflowPath,
  };

  if (options.badge) {
    result.badgeStatus = await writeFileOnce(badgePath, badgeMarkdown(), options.force === true);
    result.badgePath = badgePath;
  }

  return result;
}

export function registerInitCiCommands(program: Command): void {
  program
    .command("init-ci")
    .description("Create a GitHub Action and optional badge snippet for MCP Observatory checks.")
    .option("--command <command>", "MCP server command to test, for example: 'npx -y my-mcp-server'")
    .option("--target <file>", "Target config JSON path to use instead of a command.")
    .option("--workflow <file>", "Workflow output path.", DEFAULT_WORKFLOW_PATH)
    .option("--badge", "Also write a README badge snippet.", false)
    .option("--badge-file <file>", "Badge snippet output path.", DEFAULT_BADGE_PATH)
    .option("--force", "Overwrite existing files.", false)
    .action(async (options: InitCiOptions) => {
      const result = await initCi(options);
      const skipped = result.workflowStatus === "skipped";
      process.stdout.write(`${result.workflowStatus}: ${result.workflowPath}\n`);
      if (result.badgePath && result.badgeStatus) {
        process.stdout.write(`${result.badgeStatus}: ${result.badgePath}\n`);
      }
      if (skipped) {
        process.stdout.write("Use --force to overwrite existing files.\n");
      }
      process.stdout.write("Next: commit the workflow, open a PR, and add the badge snippet to the README if desired.\n");

      recordEvent(buildEvent("command_complete", "init-ci", "cli", {
        ciProvider: "github-actions",
        commitStatusSet: !skipped,
      }));
    });
}

export async function readGeneratedWorkflow(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}
