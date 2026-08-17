#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { Command } from "commander";

import { isCI } from "./ci.js";
import { ANSI, LOGO, c, getBinName, isQuiet, setNoColor, setQuiet, useColor } from "./commands/helpers.js";
import { registerDemoCommands } from "./commands/demo.js";
import { registerDiffCommands } from "./commands/diff.js";
import { registerLegacyCommands } from "./commands/legacy.js";
import { registerRecordReplayCommands } from "./commands/record-replay.js";
import { registerScanCommands } from "./commands/scan.js";
import { registerScoreCommands } from "./commands/score.js";
import { registerServeCommands } from "./commands/serve.js";
import { registerSuggestCommands } from "./commands/suggest.js";
import { registerTestCommands } from "./commands/test.js";
import { registerWatchCommands } from "./commands/watch.js";
import { registerHistoryCommands } from "./commands/history.js";
import { registerCiReportCommands } from "./commands/ci-report.js";
import { registerEnterpriseReportCommands } from "./commands/enterprise-report.js";
import { registerInitCiCommands } from "./commands/init-ci.js";
import { registerLockCommands } from "./commands/lock.js";
import { registerAttackSimCommands } from "./commands/attack-sim.js";
import { registerAuditCommands } from "./commands/audit.js";
import { registerEnforceCommands } from "./commands/enforce.js";
import { registerReceiptCommands } from "./commands/receipt.js";
import { registerRiskGraphCommands } from "./commands/risk-graph.js";
import { registerSkillScanCommands } from "./commands/skill-scan.js";
import { getCloudUploadEndpoint, getCloudBaseUrl, printCloudInfo, getCloudAccessToken, cloudWhoami } from "./commercial.js";
import { runTarget } from "./index.js";
import type { RunArtifact, TargetConfig } from "./types.js";
import { recordEvent, buildEvent } from "./command-events.js";
import { requireHttpUrl } from "./utils/url.js";
import { validateRunArtifact } from "./validate.js";
import { TOOL_VERSION } from "./version.js";

// ── Interactive Menu ─────────────────────────────────────────────────────────

interface MenuItem {
  command: string[];
  label: string;
  outcome: string;
  recommended?: boolean;
}

interface MenuGroup {
  heading: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    heading: "",
    items: [
      { command: ["test"],         label: "test <cmd>", outcome: "Test a specific MCP server",                        recommended: true },
      { command: ["scan"],         label: "scan",       outcome: "Check all your configured MCP servers" },
      { command: ["scan", "deep"], label: "scan deep",  outcome: "^ plus invoke tools to verify they work" },
      { command: ["skill-scan"],   label: "skill-scan <path>", outcome: "Scan skill files for security risks" },
    ],
  },
  {
    heading: "CI / Regression Testing",
    items: [
      { command: ["watch"],          label: "watch",        outcome: "Run check, diff against previous, alert regressions" },
      { command: ["lock"],           label: "lock",         outcome: "Snapshot MCP server schemas into a lock file" },
      { command: ["lock", "verify"], label: "lock verify",  outcome: "Verify servers match the lock file" },
      { command: ["diff"],           label: "diff",         outcome: "Compare two run artifacts for regressions" },
      { command: ["history"],        label: "history",      outcome: "Show health score trends over time" },
      { command: ["setup-ci"],       label: "setup-ci",     outcome: "Create GitHub Action and badge snippets" },
      { command: ["audit"],          label: "audit <target>", outcome: "Profile-mapped security audit report + SARIF" },
      { command: ["receipt"],        label: "receipt <target>", outcome: "Portable MCP trust receipt" },
      { command: ["risk-graph"],     label: "risk-graph",   outcome: "Map MCP receipts and artifacts into an agent toolchain graph" },
      { command: ["attack-sim"],     label: "attack-sim",   outcome: "Safely simulate MCP attack-readiness" },
      { command: ["enterprise-report"], label: "enterprise-report", outcome: "Generate a production/security report" },
    ],
  },
  {
    heading: "Scoring & Badges",
    items: [
      { command: ["score"],  label: "score",  outcome: "Health score (0-100) for a specific server" },
      { command: ["badge"],  label: "badge",  outcome: "Generate an SVG health badge for README" },
    ],
  },
  {
    heading: "Agent Server",
    items: [
      { command: ["serve"], label: "serve", outcome: "Start Observatory as an MCP server over stdio" },
    ],
  },
];

function getAllMenuItems(): MenuItem[] {
  return MENU_GROUPS.flatMap((g) => g.items);
}

async function showInteractiveMenu(): Promise<string[] | null> {
  // Non-interactive (piped stdin) — fall back to scan
  if (!process.stdin.isTTY) {
    return ["scan"];
  }

  const allItems = getAllMenuItems();
  let cursor = 0; // start on "scan" (recommended)

  const write = (s: string) => process.stdout.write(s);

  // Render the menu with the current cursor position.
  // Returns lines WITHOUT a trailing newline so line count is exact.
  function render(): string {
    const lines: string[] = [];
    let idx = 0;
    for (const group of MENU_GROUPS) {
      if (group.heading) {
        lines.push("");
        lines.push(`  ${c(ANSI.dim, group.heading)}`);
      }
      for (const item of group.items) {
        const selected = idx === cursor;
        const pointer = selected ? c(ANSI.cyan, "❯") : " ";
        const label = selected ? c(ANSI.cyan, c(ANSI.bold, item.label)) : `  ${item.label}`;
        const pad = " ".repeat(Math.max(1, 13 - item.label.length));
        const outcome = selected ? item.outcome : c(ANSI.dim, item.outcome);
        const tag = item.recommended && !selected ? ` ${c(ANSI.dim, "← start here")}` : "";
        lines.push(`  ${pointer} ${label}${pad}${outcome}${tag}`);
        idx++;
      }
    }
    lines.push("");
    lines.push(`  ${c(ANSI.dim, "↑↓/jk navigate  enter select  q/esc quit")}`);
    return lines.join("\n");
  }

  // Print header + initial render
  write(useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n\n` : LOGO + `  v${TOOL_VERSION}\n\n`);
  write(`  ${c(ANSI.bold, "What would you like to do?")}\n`);

  const rendered = render();
  // Exact number of lines in the menu (used for cursor repositioning)
  const menuLineCount = rendered.split("\n").length;
  write(rendered + "\n");

  // Use readline keypress events for reliable key detection on macOS/Linux
  const { emitKeypressEvents } = await import("node:readline");
  const stdin = process.stdin;
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  // Arrow-key selection loop
  return new Promise<string[] | null>((resolve) => {

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("keypress", onKeypress);
    };

    const redraw = () => {
      // Move cursor up to start of menu, clear to end of screen, re-render
      write(`\x1b[${menuLineCount}A\x1b[0J`);
      write(render() + "\n");
    };

    const onKeypress = (_ch: string | undefined, key: { name?: string; ctrl?: boolean; sequence?: string } | undefined) => {
      if (!key) return;

      // Ctrl+C
      if (key.ctrl && key.name === "c") {
        cleanup();
        write("\n");
        process.exit(0);
      }

      // q or Q or Escape
      if (key.name === "q" || key.name === "escape") {
        cleanup();
        write("\n");
        resolve(null);
        return;
      }

      // Enter / Return
      if (key.name === "return") {
        cleanup();
        const item = allItems[cursor]!;
        // Clear menu and show what was picked
        write(`\x1b[${menuLineCount}A\x1b[0J`);
        write(`  ${c(ANSI.cyan, "❯")} ${c(ANSI.bold, item.label)}\n\n`);
        resolve(item.command);
        return;
      }

      // Arrow up / k
      if (key.name === "up" || key.name === "k") {
        if (cursor > 0) {
          cursor--;
          redraw();
        }
      }

      // Arrow down / j
      if (key.name === "down" || key.name === "j") {
        if (cursor < allItems.length - 1) {
          cursor++;
          redraw();
        }
      }
    };

    stdin.on("keypress", onKeypress);
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Capture --no-color before Commander strips it from process.argv
  if (process.argv.includes("--no-color")) {
    setNoColor(true);
  }
  // Capture --quiet the same way -- subcommands print their own logo/CTAs
  // before their own local options are parsed, so this needs to be read
  // from argv up front, same as --no-color above.
  if (process.argv.includes("--quiet")) {
    setQuiet(true);
  }

  const bin = getBinName();

  // Update check (CLI only, not MCP server mode)
  if (process.argv[2] !== "serve") {
    try {
      const { default: updateNotifier } = await import("update-notifier");
      const notifier = updateNotifier({
        pkg: { name: "@kryptosai/mcp-observatory", version: TOOL_VERSION },
        updateCheckInterval: 1000 * 60 * 60, // check every hour
      });
      notifier.notify({
        isGlobal: true,
        message: "MCP Observatory update available: {currentVersion} → {latestVersion}\nRun latest receipts + CI: npx @kryptosai/mcp-observatory@latest attack-sim <cmd>\nUpgrade command: npx @kryptosai/mcp-observatory@latest",
      });
    } catch {
      // update-notifier not available — skip silently
    }
  }

  const program = new Command();
  program
    .name(bin)
    .enablePositionalOptions()
    .description("Test your MCP servers for breaking changes.")
    .version(TOOL_VERSION)
    .addHelpText("before", (() => {
      if (isQuiet()) return "";
      return useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n` : LOGO + `  v${TOOL_VERSION}\n`;
    })())
    .option("--quiet", "Suppress logo and informational output.", false)
    .addHelpText("after", (() => {
      const lines = [
        "",
        `  ${c(ANSI.bold, "Quick Start")}`,
        "",
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} demo`)}               Interactive demo — scan your servers and get a grade`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} test`)} ${c(ANSI.dim, "<cmd>")}         Test a specific MCP server`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} test --target`)} ${c(ANSI.dim, "<file>")} Test an HTTP or local target config`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} scan`)}               Check all your configured servers`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} scan deep`)}          ^ plus invoke tools to verify they work`,
        "",
        `  ${c(ANSI.bold, "CI / Regression Testing")}`,
        "",
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} watch`)} ${c(ANSI.dim, "<cmd>")}        Diff against previous run, alert regressions`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} lock`)}               Snapshot server schemas (like package-lock)`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} lock verify`)}        Verify no schema drift since last lock`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} diff`)} ${c(ANSI.dim, "<a> <b>")}       Compare two runs for regressions`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} setup-ci`)}           Add GitHub Action and badge snippets`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} audit`)} ${c(ANSI.dim, "<target>")}     Profile-mapped security audit + SARIF`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} risk-graph`)}         Map receipts into an MCP risk graph`,
        `  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} attack-sim`)} ${c(ANSI.dim, "<cmd>")}  Safely simulate MCP attack-readiness`,
        "",
        `  ${c(ANSI.dim, `Run ${bin} <command> --help for details on any command.`)}`,
        "",
      ];
      return lines.join("\n");
    })());

  // Register all command modules
  registerScanCommands(program, bin);
  registerTestCommands(program);
  registerDemoCommands(program);
  registerDiffCommands(program);
  registerRecordReplayCommands(program, bin);
  registerWatchCommands(program);
  registerServeCommands(program);
  registerSuggestCommands(program);
  registerScoreCommands(program);
  registerLegacyCommands(program);
  registerHistoryCommands(program);
  registerCiReportCommands(program);
  registerEnterpriseReportCommands(program);
  registerInitCiCommands(program);
  registerLockCommands(program);
  registerAuditCommands(program);
  registerEnforceCommands(program);
  registerReceiptCommands(program);
  registerRiskGraphCommands(program);
  registerAttackSimCommands(program);
  registerSkillScanCommands(program);

  const cloudCmd = program
    .command("cloud")
    .description("Show hosted reporting, security review, and enterprise pilot options.")
    .action(() => {
      printCloudInfo();
    });

  cloudCmd
    .command("upload")
    .description("Upload a run artifact to MCP Observatory Cloud for a hosted pilot report.")
    .argument("<artifact>", "Path to a run artifact JSON file.")
    .option("--org <org>", "Customer or organization slug. Defaults to MCP_OBSERVATORY_ORG.")
    .option("--endpoint <url>", "Hosted upload endpoint.", getCloudUploadEndpoint())
    .action(async (artifactPath: string, options: { org?: string; endpoint: string }) => {
      const token = await getCloudAccessToken();
      if (!token) {
        throw new Error("Authentication required. Set MCP_OBSERVATORY_CLOUD_TOKEN or run: mcp-observatory cloud login");
      }
      const org = options.org ?? process.env["MCP_OBSERVATORY_ORG"];
      const artifact = validateRunArtifact(JSON.parse(await readFile(artifactPath, "utf8")));
      const endpoint = requireHttpUrl(options.endpoint, "Cloud upload endpoint");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(org ? { "X-MCP-Observatory-Org": org } : {}),
        },
        // lgtm[js/file-data-in-network-request] This command explicitly uploads the user-provided artifact to a validated HTTPS endpoint.
        body: JSON.stringify(artifact),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Cloud upload failed (${response.status}): ${text}`);
      }
      process.stdout.write(`${text}\n`);
      process.stdout.write(`Hosted dashboard: ${getCloudBaseUrl()}/dashboard\n`);
      process.stdout.write(`Next: ${getBinName()} setup-ci --all --cloud --command "npx -y my-mcp-server"\n`);
      recordEvent(buildEvent("command_complete", "cloud-upload", "cli", {
        cloudUpload: true,
        org,
      }));
    });

  cloudCmd
    .command("login")
    .description("Sign in to MCP Observatory Cloud via your identity provider.")
    .option("--issuer <url>", "OIDC issuer URL. Defaults to MCP_OBSERVATORY_OIDC_ISSUER env var.")
    .option("--client-id <id>", "OIDC client ID. Defaults to MCP_OBSERVATORY_OIDC_CLIENT_ID env var.")
    .action(async (options: { issuer?: string; clientId?: string }) => {
      const issuer = options.issuer ?? process.env["MCP_OBSERVATORY_OIDC_ISSUER"];
      const clientId = options.clientId ?? process.env["MCP_OBSERVATORY_OIDC_CLIENT_ID"];
      const { performDeviceFlow, performCloudDeviceFlow } = await import("./auth.js");
      const token = issuer && clientId
        ? await performDeviceFlow(issuer, clientId)
        : await performCloudDeviceFlow(getCloudBaseUrl());
      process.stdout.write(`  ${c(ANSI.green, "✓")} Signed in as ${c(ANSI.bold, token.email ?? token.sub ?? "unknown")}\n`);
      if (token.org) {
        process.stdout.write(`    Organization: ${c(ANSI.bold, token.org)}\n`);
      }
      process.stdout.write(`    Dashboard: ${getCloudBaseUrl()}/dashboard\n`);
      process.stdout.write(`    Upload: ${getBinName()} cloud upload .mcp-observatory/runs/<run>.json\n`);
    });

  cloudCmd
    .command("logout")
    .description("Sign out of MCP Observatory Cloud and remove stored credentials.")
    .action(async () => {
      const { clearToken } = await import("./auth.js");
      await clearToken();
      process.stdout.write(`  ${c(ANSI.green, "✓")} Signed out. Local credentials removed.\n`);
    });

  cloudCmd
    .command("whoami")
    .description("Show the currently authenticated user and organization.")
    .action(async () => {
      const info = await cloudWhoami();
      if (!info.authenticated) {
        process.stdout.write(`  ${c(ANSI.yellow, "Not signed in.")} Run ${c(ANSI.cyan, `${bin} cloud login`)} to sign in.\n`);
      } else {
        process.stdout.write(`  ${c(ANSI.green, "✓")} Signed in\n`);
        if (info.email) process.stdout.write(`    Email:  ${c(ANSI.bold, info.email)}\n`);
        if (info.org) process.stdout.write(`    Org:    ${c(ANSI.bold, info.org)}\n`);
      }
    });

  // ── smithery ─────────────────────────────────────────────────────────

  const smitheryCmd = program
    .command("smithery")
    .description("Smithery registry integration — scan, report, and batch-check servers.");

  smitheryCmd
    .command("scan")
    .description("Resolve a Smithery server, run checks, and output a report.")
    .argument("<qualified-name>", "Smithery qualified name (e.g. @anthropic/mcp-server-fetch)")
    .option("--security", "Run security analysis on tool schemas.")
    .option("--api-key <key>", "Smithery API key.")
    .option("--base-url <url>", "Override Smithery API base URL.")
    .action(async (qualifiedName: string, options: { security?: boolean; apiKey?: string; baseUrl?: string }) => {
      const smithery = await import("./integrations/smithery.js");
      const smitheryConfig = { apiKey: options.apiKey, baseUrl: options.baseUrl };

      process.stdout.write(`  Resolving ${qualifiedName} from Smithery...\n`);
      const target = await smithery.resolveSmitheryTarget(qualifiedName, smitheryConfig);

      process.stdout.write(`  Running checks against ${target.targetId}...\n`);
      const artifact = await runTarget(target, { securityCheck: options.security });

      const submission = smithery.generateSubmission(qualifiedName, artifact);
      const md = smithery.renderSubmissionMarkdown(submission);

      process.stdout.write(`\n${md}\n`);
    });

  smitheryCmd
    .command("report")
    .description("Generate a formatted markdown report suitable for submitting to Smithery.")
    .argument("<qualified-name>", "Smithery qualified name")
    .option("--output <path>", "Write report to file instead of stdout.")
    .option("--security", "Run security analysis on tool schemas.")
    .option("--api-key <key>", "Smithery API key.")
    .option("--base-url <url>", "Override Smithery API base URL.")
    .action(async (qualifiedName: string, options: { output?: string; security?: boolean; apiKey?: string; baseUrl?: string }) => {
      const smithery = await import("./integrations/smithery.js");
      const smitheryConfig = { apiKey: options.apiKey, baseUrl: options.baseUrl };

      process.stdout.write(`  Resolving ${qualifiedName} from Smithery...\n`);
      const target = await smithery.resolveSmitheryTarget(qualifiedName, smitheryConfig);

      process.stdout.write(`  Running checks against ${target.targetId}...\n`);
      const artifact = await runTarget(target, { securityCheck: options.security });

      const submission = smithery.generateSubmission(qualifiedName, artifact);
      const md = smithery.renderSubmissionMarkdown(submission);

      if (options.output) {
        await writeFile(options.output, md, "utf8");
        process.stdout.write(`  Report written to ${options.output}\n`);
      } else {
        process.stdout.write(`\n${md}\n`);
      }
    });

  smitheryCmd
    .command("batch")
    .description("Scan top N servers from the Smithery registry and generate a comparative report.")
    .option("--top <n>", "Number of servers to scan.", "10")
    .option("--output <path>", "Write report to file instead of stdout.")
    .option("--api-key <key>", "Smithery API key.")
    .option("--base-url <url>", "Override Smithery API base URL.")
    .action(async (options: { top: string; output?: string; apiKey?: string; baseUrl?: string }) => {
      const smithery = await import("./integrations/smithery.js");
      const smitheryConfig = { apiKey: options.apiKey, baseUrl: options.baseUrl };
      const top = parseInt(options.top, 10) || 10;

      process.stdout.write(`  Scanning top ${top} servers from Smithery registry...\n`);

      const results = await smithery.batchScanServers(
        (target: TargetConfig): Promise<RunArtifact> => runTarget(target, {}),
        smitheryConfig,
        { top },
      );

      const md = smithery.renderBatchReportMarkdown(results);

      if (options.output) {
        await writeFile(options.output, md, "utf8");
        process.stdout.write(`  Batch report written to ${options.output}\n`);
      } else {
        process.stdout.write(`\n${md}\n`);
      }
    });

  // Interactive menu when invoked with no arguments
  if (process.argv.length === 2 && !isCI) {
    const choice = await showInteractiveMenu();
    if (!choice) return;
    process.argv.push(...choice);
  }

  const commandName = process.argv[2] ?? "interactive";
  recordEvent(buildEvent("command_run", commandName, "cli"));

  await program.parseAsync(process.argv);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  let friendly = message;
  if (message.includes("Unexpected end of JSON") || message.includes("Unexpected token")) {
    friendly = "Invalid config file — expected valid JSON. Check the file path and contents.";
  } else if (message.includes("ENOENT")) {
    friendly = `File not found: ${message.replace(/.*ENOENT[^']*'([^']*)'.*/, "$1")}`;
  }
  process.stderr.write(`\n  ${useColor() ? `\x1b[31m✗\x1b[0m` : "✗"} ${friendly}\n\n`);
  process.exitCode = 1;
});
