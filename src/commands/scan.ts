import { access } from "node:fs/promises";
import type { Command } from "commander";

import { discoverSkillPaths, scanForTargets } from "../discovery.js";
import {
  runTarget,
} from "../index.js";
import { appendHistory, buildHistoryEntry } from "../history.js";
import { buildEvent, generateSessionId, normalizeCampaign, recordEvent, recordSessionEnd, recordSessionStart } from "../command-events.js";
import type { RunArtifact } from "../types.js";
import { TOOL_VERSION } from "../version.js";
import { maybePrintCloudCta } from "../commercial.js";
import { renderActionReceipt } from "../action-receipt.js";
import { ANSI, LOGO, c, isQuiet, setupCiHint, suggestFix, useColor } from "./helpers.js";
import { firstNextStep } from "../utils/failure-diagnosis.js";
import { maybeConvertPassingCheckToCi, type SetupCiConversionFlags } from "./setup-ci-conversion.js";
// ── Scan implementation ─────────────────────────────────────────────────────

type SkillScanOption = string | boolean | undefined;

export type ScanServerCategory = "passed" | "failed" | "warning";

/**
 * Categorizes a single server's scan result by its worst outcome:
 * any failing check → "failed"; no failures but a partial/flaky check →
 * "warning"; everything passed → "passed".
 */
export function categorizeServerResult(artifact: RunArtifact): ScanServerCategory {
  if (artifact.gate === "fail") return "failed";
  if (artifact.summary.partial > 0 || artifact.summary.flaky > 0) return "warning";
  return "passed";
}

/** "3 servers scanned: 1 passed, 1 failed, 1 warnings" */
export function formatScanSummaryLine(counts: {
  passed: number;
  failed: number;
  warning: number;
}): string {
  const total = counts.passed + counts.failed + counts.warning;
  return `${total} server${total === 1 ? "" : "s"} scanned: ${counts.passed} passed, ${counts.failed} failed, ${counts.warning} warnings`;
}

async function runScan(
  bin: string,
  configPath: string | undefined,
  invokeTools: boolean,
  securityCheck?: boolean,
  format?: string,
  attackSim = true,
  conversionFlags: SetupCiConversionFlags = {},
  skillScanOption?: SkillScanOption,
): Promise<void> {
  const sessionId = generateSessionId();
  recordSessionStart(sessionId);
  if (conversionFlags.campaign) conversionFlags.campaign = normalizeCampaign(conversionFlags.campaign);
  const t0 = Date.now();
  recordSessionStart(generateSessionId());
  if (!isQuiet()) {
    process.stdout.write(useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n\n` : LOGO + `  v${TOOL_VERSION}\n\n`);
  }

  if (configPath) {
    try {
      await access(configPath);
    } catch {
      process.stdout.write(c(ANSI.red, `  ✗ Config file not found: ${configPath}\n\n`));
      process.exitCode = 1;
      recordSessionEnd(sessionId);
      return;
    }
  }

  const targets = await scanForTargets(configPath);

  if (targets.length === 0) {
    process.stdout.write(c(ANSI.yellow, "  No MCP servers found.\n\n"));
    process.stdout.write(c(ANSI.dim, "  Looked in ~/.claude.json, Claude Desktop, Cursor, Windsurf, VS Code, OpenCode, Codex, Gemini CLI, Kiro, Antigravity, Amazon Q, and project-level .mcp.json\n\n"));
    process.stdout.write("  Test a specific server:\n");
    process.stdout.write(`    ${c(ANSI.dim, "$")} ${c(ANSI.cyan, `${bin} test npx -y @modelcontextprotocol/server-filesystem .`)}\n\n`);
    recordSessionEnd(sessionId);
    return;
  }

  process.stdout.write(c(ANSI.bold, `  Found ${targets.length} MCP server${targets.length === 1 ? "" : "s"}:\n`));
  for (const t of targets) {
    process.stdout.write(`  ${c(ANSI.cyan, "●")} ${c(ANSI.bold, t.config.targetId)} ${c(ANSI.dim, `← ${t.source}`)}\n`);
  }
  process.stdout.write("\n");

  interface ScanRow {
    targetId: string;
    gate: string;
    toolCount: number;
    promptCount: number;
    resourceCount: number;
    error?: string;
    diagnostics: string[];
  }

  const results: ScanRow[] = [];
  const artifacts: RunArtifact[] = [];
  const checkStatusMap: Record<string, string> = {};
  let passCount = 0;
  let failCount = 0;
  let totalTools = 0;
  let totalPrompts = 0;
  let totalResources = 0;
  const categoryCounts: Record<ScanServerCategory, number> = { passed: 0, failed: 0, warning: 0 };

  for (const t of targets) {
    process.stdout.write(`  ${c(ANSI.dim, "⟳")} Checking ${c(ANSI.bold, t.config.targetId)}...`);
    try {
      const artifact = await runTarget(t.config, {
        invokeTools,
        securityCheck,
        attackSimulation: attackSim ? {} : undefined,
      });
      artifacts.push(artifact);
      const toolsCheck = artifact.checks.find((ch) => ch.id === "tools");
      const promptsCheck = artifact.checks.find((ch) => ch.id === "prompts");
      const resourcesCheck = artifact.checks.find((ch) => ch.id === "resources");

      const toolCount = toolsCheck?.evidence[0]?.itemCount ?? 0;
      const promptCount = promptsCheck?.evidence[0]?.itemCount ?? 0;
      const resourceCount = resourcesCheck?.evidence[0]?.itemCount ?? 0;

      totalTools += toolCount;
      totalPrompts += promptCount;
      totalResources += resourceCount;

      const diagnostics: string[] = [];
      for (const check of artifact.checks) {
        if (check.status === "fail" || check.status === "partial") {
          diagnostics.push(`${check.id}: ${check.message}`);
        }
      }

      const gateIcon = artifact.gate === "pass" ? c(ANSI.green, " ✓") : c(ANSI.red, " ✗");
      process.stdout.write(`\r  ${gateIcon} ${c(ANSI.bold, t.config.targetId)}${" ".repeat(Math.max(1, 40 - t.config.targetId.length))}`);
      process.stdout.write(`${c(ANSI.dim, `${toolCount} tools, ${promptCount} prompts, ${resourceCount} resources`)}\n`);

      if (artifact.fatalError) {
        process.stdout.write(`    ${c(ANSI.red, "→")} ${artifact.fatalError.split("\n")[0]}\n`);
        const fixHint = firstNextStep(artifact.fatalError) ?? suggestFix(artifact.fatalError);
        if (fixHint) {
          process.stdout.write(`    ${c(ANSI.dim, `→ ${fixHint}`)}\n`);
        }
      } else if (artifact.gate === "fail" && diagnostics.length > 0) {
        process.stdout.write(`    ${c(ANSI.dim, "→")} ${diagnostics[0]}\n`);
      }

      for (const check of artifact.checks) {
        checkStatusMap[`${t.config.targetId}:${check.id}`] = check.status;
      }

      const receipt = renderActionReceipt(artifact).split("\n");
      process.stdout.write(`    ${c(ANSI.dim, "→")} ${receipt[0]}\n`);

      // Track history
      await appendHistory(buildHistoryEntry(artifact)).catch(() => {});

      results.push({ targetId: t.config.targetId, gate: artifact.gate, toolCount, promptCount, resourceCount, diagnostics });
      if (artifact.gate === "pass") passCount++; else failCount++;
      categoryCounts[categorizeServerResult(artifact)]++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      let friendlyMsg = msg;
      if (msg.includes("ENOENT") || msg.includes("not found")) {
        const cmd = t.config.adapter === "http" ? (t.config as { url: string }).url : (t.config as { command: string }).command;
        friendlyMsg = `Could not start server — "${cmd}" not found. Is it installed?`;
      } else if (msg.includes("ECONNREFUSED")) {
        friendlyMsg = `Server is not running or refused the connection.`;
      } else if (msg.includes("timed out") || msg.includes("timeout")) {
        friendlyMsg = `Server took too long to respond.`;
      }

      process.stdout.write(`\r  ${c(ANSI.red, "✗")} ${c(ANSI.bold, t.config.targetId)}\n`);
      process.stdout.write(`    ${c(ANSI.red, friendlyMsg)}\n`);

      const fixHint = suggestFix(msg);
      if (fixHint) {
        process.stdout.write(`    ${c(ANSI.dim, `→ ${fixHint}`)}\n`);
      }

      // Docker-specific hint
      const serverCmd = t.config.adapter === "local-process" ? (t.config as { command: string }).command : "";
      if (serverCmd === "docker" || serverCmd.startsWith("docker ")) {
        process.stdout.write(`    ${c(ANSI.dim, "Tip: Docker servers need the Docker daemon running and env vars configured.")}\n`);
      }

      results.push({ targetId: t.config.targetId, gate: "fail", toolCount: 0, promptCount: 0, resourceCount: 0, error: friendlyMsg, diagnostics: [] });
      failCount++;
      categoryCounts.failed++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────
  process.stdout.write("\n");

  if (failCount === 0) {
    process.stdout.write(c(ANSI.green, `  ✓ All ${passCount} server${passCount === 1 ? "" : "s"} healthy`));
    process.stdout.write(c(ANSI.dim, ` — ${totalTools} tools, ${totalPrompts} prompts, ${totalResources} resources\n`));
  } else {
    process.stdout.write(c(ANSI.red, `  ✗ ${failCount} of ${passCount + failCount} server${passCount + failCount === 1 ? "" : "s"} failing`));
    if (totalTools > 0 || totalPrompts > 0 || totalResources > 0) {
      process.stdout.write(c(ANSI.dim, ` — ${totalTools} tools, ${totalPrompts} prompts, ${totalResources} resources found\n`));
    } else {
      process.stdout.write("\n");
    }
  }

  const scanTotal = categoryCounts.passed + categoryCounts.failed + categoryCounts.warning;
  process.stdout.write(c(ANSI.dim, "  ─────────────────────────────\n"));
  process.stdout.write(
    `  ${scanTotal} server${scanTotal === 1 ? "" : "s"} scanned: ` +
      `${c(ANSI.green, `${categoryCounts.passed} passed`)}, ` +
      `${c(ANSI.red, `${categoryCounts.failed} failed`)}, ` +
      `${c(ANSI.yellow, `${categoryCounts.warning} warnings`)}\n`,
  );

  // Show diagnostics for failures or notable partials
  const issues = results.filter((r) => r.diagnostics.length > 0 && !r.error);
  if (issues.length > 0) {
    process.stdout.write("\n");
    for (const r of issues) {
      process.stdout.write(`  ${c(ANSI.yellow, r.targetId)}:\n`);
      for (const d of r.diagnostics.slice(0, 3)) {
        process.stdout.write(`    ${c(ANSI.dim, "→")} ${d}\n`);
      }
    }
  }

  // ── Enforce CTA ─────────────────────────────────────────────────────
  if (targets.length > 0 && targets[0]) {
    const firstTarget = targets[0].config;
    const firstServerCmd = firstTarget.adapter === "local-process"
      ? `${firstTarget.command} ${(firstTarget.args ?? []).join(" ")}`
      : firstTarget.targetId;
    if (!isQuiet()) {
      process.stdout.write(`\n  ${c(ANSI.bold, "Protect at runtime:")} ${c(ANSI.cyan, `npx @kryptosai/mcp-observatory enforce ${firstServerCmd}`)}\n`);
    }
  }

  // ── Next step ────────────────────────────────────────────────────────
  if (!isQuiet()) {
    process.stdout.write("\n");
    if (!invokeTools && totalTools > 0) {
      process.stdout.write(c(ANSI.dim, `  Next: ${c(ANSI.cyan, `${bin} scan deep`)} to also test that tools run\n`));
    } else {
      process.stdout.write(c(ANSI.dim, `  Run ${c(ANSI.cyan, `${bin} --help`)} for more commands\n`));
    }
    process.stdout.write("\n");
  }

  if (failCount === 0) {
    if (artifacts.length === 1 && targets[0]) {
      await maybeConvertPassingCheckToCi({
        artifact: artifacts[0]!,
        bin,
        target: targets[0].config,
        setupCi: conversionFlags.setupCi,
        yes: conversionFlags.yes,
        noSetupCi: conversionFlags.noSetupCi,
        ciSarif: conversionFlags.ciSarif,
        force: conversionFlags.force,
        campaign: conversionFlags.campaign,
      });
    } else if (conversionFlags.noSetupCi !== true) {
      if (!isQuiet()) {
        const sarif = conversionFlags.ciSarif === false ? "" : " --sarif";
        process.stdout.write(`CI conversion available for a specific target:\n  ${setupCiHint(undefined, undefined, bin)}${sarif} --schedule weekly\n`);
        if (conversionFlags.setupCi === true) {
          process.stdout.write("Non-interactive mode will only write files when --setup-ci --yes is present, and multi-target scans need a single target config.\n");
        }
      }
    }
  }

  if (format === "pr-comment-matrix" && artifacts.length > 0) {
    const { renderMatrixComment } = await import("../reporters/pr-comment-matrix.js");
    const rows = artifacts.map(a => ({ artifact: a }));
    process.stdout.write(renderMatrixComment(rows) + "\n");
  }

  if (format === "terminal") {
    maybePrintCloudCta(results.length > 1 ? "fleet" : securityCheck ? "security" : "general");
  }

  recordEvent(buildEvent("command_complete", "scan", "cli", {
    serversScanned: results.length,
    toolsFound: totalTools,
    promptsFound: totalPrompts,
    resourcesFound: totalResources,
    gateResult: failCount === 0 ? "pass" : "fail",
    executionMs: Date.now() - t0,
    securityFlag: securityCheck,
    targetIds: results.map((r) => r.targetId),
    installedServers: targets.map((t) => t.config.targetId),
    serverCommands: targets.map((t) =>
      t.config.adapter === "http" ? (t.config as { url: string }).url : `${(t.config as { command: string }).command} ${t.config.args.join(" ")}`,
    ),
    checkStatuses: checkStatusMap,
    matrixServerCount: results.length,
    matrixPassCount: passCount,
    matrixFailCount: failCount,
    campaign: conversionFlags.campaign,
    securityFindingCount: artifacts.reduce((sum, artifact) => {
      const attack = artifact.checks.find((check) => check.id === "attack-sim");
      return sum + (attack?.evidence[0]?.itemCount ?? 0);
    }, 0),
    targetServer: targets.length === 1 ? targets[0]!.config.targetId : `${targets.length} servers`,
    scanCount: targets.length,
    stageOverride: "discovery",
  }));

  if (failCount > 0) {
    process.exitCode = 1;
  }

  if (skillScanOption !== undefined) {
    const { runSkillScan } = await import("./skill-scan.js");
    const explicitPath = typeof skillScanOption === "string" ? skillScanOption : undefined;
    const skillPaths = await discoverSkillPaths(explicitPath);

    if (skillPaths.length === 0) {
      process.stdout.write(`\n  ${c(ANSI.yellow, "No skill directories found to scan.")}\n`);
      if (explicitPath) {
        process.stdout.write(c(ANSI.dim, `  Path not found: ${explicitPath}\n`));
      }
    } else {
      for (const skillPath of skillPaths) {
        process.stdout.write(`\n  ${c(ANSI.bold, "Skill Scan:")} ${c(ANSI.dim, skillPath)}\n`);
        await runSkillScan(skillPath, { format: format === "terminal" ? "terminal" : "markdown" });
      }
    }
  }
  recordSessionEnd(sessionId);
}

// ── Register ────────────────────────────────────────────────────────────────

export function registerScanCommands(program: Command, bin: string): void {
  const scanCmd = program
    .command("scan")
    .description("Check all MCP servers in your agent configs (Claude, Cursor, Windsurf, VS Code, OpenCode, Codex, Gemini, Kiro, Antigravity, Amazon Q).")
    .option("--config <path>", "Path to a specific MCP config file.")
    .option("--security", "Run deep security scan (credential patterns, response analysis). Lightweight security is always included.")
    .option("--no-attack-sim", "Skip the default safe attack-readiness simulation.")
    .option("--format <format>", "Output format: terminal or pr-comment-matrix.", "terminal")
    .option("--campaign <slug>", "Attach a safe campaign/source slug for attribution.")
    .option("--setup-ci", "Offer CI conversion after a successful one-target scan; use with --yes in non-interactive runs to write files.", false)
    .option("--yes", "Confirm CI conversion without prompting. Only writes when used with --setup-ci.", false)
    .option("--no-setup-ci", "Suppress the post-success CI conversion prompt and hint.")
    .option("--no-ci-sarif", "Generate post-scan CI without GitHub Code Scanning SARIF upload.")
    .option("--force", "Overwrite existing generated CI adoption files.", false)
    .option("--no-color", "Disable colored output.")
    .option("--quiet", "Suppress logo and informational output.", false)
    .option("--skill-scan [path]", "Also scan skill directories for security risks. Auto-discovers from agent skill paths when no path given.")
    .option("--enforce", "After scan, show the enforce command for the first target.");

  // `scan` with no subcommand — basic scan
  scanCmd.action(async (options: { config?: string; security?: boolean; attackSim?: boolean; format: string; skillScan?: SkillScanOption; enforce?: boolean } & SetupCiConversionFlags) => {
    await runScan(bin, options.config, false, options.security, options.format, options.attackSim !== false, options, options.skillScan);
    if (options.enforce && !isQuiet()) {
      process.stdout.write(`\n  ${c(ANSI.bold, "Next:")} ${c(ANSI.cyan, `npx @kryptosai/mcp-observatory enforce --deep npx -y <your-server>`)}\n`);
      process.stdout.write(`  ${c(ANSI.dim, "Enforce mode runs a scan AND auto-generates seatbelt policy for runtime protection.")}\n\n`);
    }
  });

  // `scan deep` — scan + invoke tools
  scanCmd
    .command("deep")
    .description("Scan and also invoke safe tools to verify they execute.")
    .option("--config <path>", "Path to a specific MCP config file.")
    .option("--security", "Run deep security scan (credential patterns, response analysis). Lightweight security is always included.")
    .option("--no-attack-sim", "Skip the default safe attack-readiness simulation.")
    .option("--format <format>", "Output format: terminal or pr-comment-matrix.", "terminal")
    .option("--campaign <slug>", "Attach a safe campaign/source slug for attribution.")
    .option("--setup-ci", "Offer CI conversion after a successful one-target scan; use with --yes in non-interactive runs to write files.", false)
    .option("--yes", "Confirm CI conversion without prompting. Only writes when used with --setup-ci.", false)
    .option("--no-setup-ci", "Suppress the post-success CI conversion prompt and hint.")
    .option("--no-ci-sarif", "Generate post-scan CI without GitHub Code Scanning SARIF upload.")
    .option("--force", "Overwrite existing generated CI adoption files.", false)
    .option("--quiet", "Suppress logo and informational output.", false)
    .action(async (options: { config?: string; security?: boolean; attackSim?: boolean; format: string; skillScan?: SkillScanOption; enforce?: boolean } & SetupCiConversionFlags) => {
      const parentConfig = scanCmd.opts().config as string | undefined;
      const parentSecurity = scanCmd.opts().security as boolean | undefined;
      const parentFormat = scanCmd.opts().format as string;
      const parentAttackSim = scanCmd.opts().attackSim as boolean | undefined;
      const parentSkillScan = scanCmd.opts().skillScan as SkillScanOption;
      const resolvedSkillScan = options.skillScan !== undefined ? options.skillScan : parentSkillScan;
      await runScan(bin, options.config ?? parentConfig, true, options.security ?? parentSecurity ?? true, options.format ?? parentFormat, options.attackSim !== false && parentAttackSim !== false, options, resolvedSkillScan);
      if (options.enforce && !isQuiet()) {
        process.stdout.write(`\n  ${c(ANSI.bold, "Next:")} ${c(ANSI.cyan, `npx @kryptosai/mcp-observatory enforce --deep npx -y <your-server>`)}\n`);
        process.stdout.write(`  ${c(ANSI.dim, "Enforce mode runs a scan AND auto-generates seatbelt policy for runtime protection.")}\n\n`);
      }
  });
}
