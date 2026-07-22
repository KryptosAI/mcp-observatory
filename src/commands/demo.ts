import type { Command } from "commander";

import { runTarget } from "../index.js";
import type { TargetConfig } from "../types.js";
import { scanForTargets } from "../discovery.js";
import { buildEvent, generateSessionId, recordEvent, recordSessionEnd, recordSessionStart } from "../telemetry.js";
import { maybePrintCloudCta } from "../commercial.js";
import {
  ANSI,
  c,
  colorStatus,
  getBinName,
  isQuiet,
  LOGO,
  printCiConversionCta,
} from "./helpers.js";

const DEMO_SERVERS: { name: string; targetId: string; command: string; args: string[]; desc: string }[] = [
  {
    name: "fetch",
    targetId: "@modelcontextprotocol/server-fetch",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    desc: "Fetch and convert web pages — safe, always available",
  },
  {
    name: "filesystem",
    targetId: "@modelcontextprotocol/server-filesystem",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    desc: "Read/write local files — shows capability discovery",
  },
  {
    name: "memory",
    targetId: "@modelcontextprotocol/server-memory",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    desc: "Persistent knowledge graph — shows resource handling",
  },
  {
    name: "github",
    targetId: "@modelcontextprotocol/server-github",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    desc: "GitHub API — needs GITHUB_PERSONAL_ACCESS_TOKEN",
  },
];

function gradeBar(score: number): string {
  const width = 20;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  if (score >= 90) return c(ANSI.green, "█".repeat(filled)) + c(ANSI.dim, "░".repeat(empty));
  if (score >= 70) return c(ANSI.yellow, "█".repeat(filled)) + c(ANSI.dim, "░".repeat(empty));
  if (score >= 60) return c(ANSI.yellow, "█".repeat(filled)) + c(ANSI.dim, "░".repeat(empty));
  return c(ANSI.red, "█".repeat(filled)) + c(ANSI.dim, "░".repeat(empty));
}

function gradeColor(grade: string): string {
  if (grade === "A") return c(ANSI.green, grade);
  if (grade === "B") return c(ANSI.green, grade);
  if (grade === "C") return c(ANSI.yellow, grade);
  if (grade === "D") return c(ANSI.yellow, grade);
  return c(ANSI.red, grade);
}

function dimBar(score: number): string {
  const width = 20;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return c(ANSI.dim, "▐".repeat(filled)) + c(ANSI.dim, "░".repeat(empty));
}

export function registerDemoCommands(program: Command): void {
  program
    .command("demo")
    .description("Quick interactive demo — scan your MCP servers and see your safety grade")
    .option("--server <name>", `Demo with a built-in server: ${DEMO_SERVERS.map(s => s.name).join(", ")}`)
    .option("--timeout <ms>", "Timeout in milliseconds", "15000")
    .option("--deep", "Run full tool invocation and security checks (takes longer)", false)
    .option("--no-color", "Disable colored output")
    .action(async (options: { server?: string; deep?: boolean; timeout?: string }) => {
      const sessionId = generateSessionId();
      recordSessionStart(sessionId);
      const t0 = Date.now();
      const bin = getBinName();

      const timeoutMs = parseInt(options.timeout ?? "15000", 10);
      if (isNaN(timeoutMs) || timeoutMs <= 0 || String(timeoutMs) !== (options.timeout ?? "15000")) {
        process.stderr.write(`\n  ${c(ANSI.red, "✗")} Invalid timeout value: must be a positive integer number.\n\n`);
        process.exitCode = 1;
        recordSessionEnd(sessionId);
        return;
      }

      if (!isQuiet()) {
        process.stdout.write(LOGO + "\n");
      }

      process.stdout.write(c(ANSI.bold, "  MCP Observatory — Interactive Demo\n"));
      process.stdout.write(`  ${c(ANSI.dim, "Scan your MCP servers. Get a safety grade. Ship with confidence.")}\n\n`);

      // ── Step 1: Select target ──────────────────────────────────────────

      process.stdout.write(`  ${c(ANSI.dim, "⟳")} Discovering your MCP servers...`);
      const targets = await scanForTargets();

      let targetConfig: TargetConfig;
      let targetSource: string;

      if (options.server) {
        const serverName = options.server.toLowerCase();
        const demo = DEMO_SERVERS.find(s => s.name === serverName);
        if (!demo) {
          process.stdout.write(
            `\r  ${c(ANSI.red, "✗")} Unknown demo server "${options.server}".\n`,
          );
          process.stdout.write(
            `    ${c(ANSI.dim, `Available: ${DEMO_SERVERS.map(s => s.name).join(", ")}`)}\n`,
          );
          process.exitCode = 1;
          recordSessionEnd(sessionId);
          return;
        }
        targetConfig = {
          targetId: demo.targetId,
          adapter: "local-process",
          command: demo.command,
          args: demo.args,
          timeoutMs: 15_000,
        };
        targetSource = `built-in demo (${demo.desc})`;
        process.stdout.write(
          `\r  ${c(ANSI.green, "✓")} Using ${c(ANSI.bold, demo.name)} ${c(ANSI.dim, `— ${demo.desc}`)}\n`,
        );
      } else if (targets.length > 0) {
        process.stdout.write(`\r  ${c(ANSI.green, "✓")} Found ${targets.length} server${targets.length > 1 ? "s" : ""}\n`);
        for (const t of targets.slice(0, 5)) {
          process.stdout.write(
            `    ${c(ANSI.cyan, "●")} ${c(ANSI.bold, t.config.targetId)} ${c(ANSI.dim, `← ${t.source}`)}\n`,
          );
        }
        if (targets.length > 5) {
          process.stdout.write(`    ${c(ANSI.dim, `... and ${targets.length - 5} more`)}\n`);
        }
        targetConfig = targets[0]!.config;
        targetSource = targets[0]!.source;
        process.stdout.write(`\n  ${c(ANSI.dim, "Scanning first server...")}\n`);
      } else {
        const demo = DEMO_SERVERS[0]!;
        targetConfig = {
          targetId: demo.targetId,
          adapter: "local-process",
          command: demo.command,
          args: demo.args,
          timeoutMs: 15_000,
        };
        targetSource = `built-in demo (${demo.desc})`;
        process.stdout.write(
          `\r  ${c(ANSI.yellow, "!")} No MCP servers configured.\n`,
        );
        process.stdout.write(
          `    ${c(ANSI.dim, "Running built-in demo with")} ${c(ANSI.bold, demo.targetId)}\n`,
        );
        process.stdout.write(
          `    ${c(ANSI.dim, `Tip: ${bin} suggest  → discover servers for your stack`)}\n`,
        );
      }

      targetConfig.timeoutMs = timeoutMs;

      process.stdout.write("\n");

      // ── Step 2: Run scan ───────────────────────────────────────────────

      process.stdout.write(`  ${c(ANSI.dim, "⟳")} Scanning ${c(ANSI.bold, targetConfig.targetId)}...`);
      let artifact;
      try {
        artifact = await runTarget(targetConfig, {
          invokeTools: options.deep,
          securityCheck: options.deep,
        });
      } catch (err) {
        process.stdout.write(
          `\r  ${c(ANSI.red, "✗")} Scan failed: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exitCode = 1;
        recordEvent(buildEvent("command_complete", "demo", "cli", {
          fatalError: err instanceof Error ? err.message : String(err),
          stageOverride: "scan",
          executionMs: Date.now() - t0,
        }));
        recordSessionEnd(sessionId);
        return;
      }

      const scanMs = Date.now() - t0;

      if (artifact.fatalError) {
        process.stdout.write(
          `\r  ${c(ANSI.red, "✗")} ${c(ANSI.bold, targetConfig.targetId)} could not be reached\n`,
        );
        process.stdout.write(`    ${c(ANSI.dim, artifact.fatalError.split("\n")[0]!)}\n`);
        process.stdout.write("\n");
        process.stdout.write(`  ${c(ANSI.dim, "Try another:")} ${bin} demo --server <name>\n`);
        process.stdout.write(
          `  ${c(ANSI.dim, `Built-in demos: ${DEMO_SERVERS.map(s => s.name).join(", ")}`)}\n\n`,
        );
        process.exitCode = 1;
        recordEvent(buildEvent("command_complete", "demo", "cli", {
          targetServer: targetConfig.targetId,
          fatalError: artifact.fatalError.split("\n")[0],
          executionMs: scanMs,
        }));
        recordSessionEnd(sessionId);
        return;
      }

      const gateIcon = artifact.gate === "pass"
        ? c(ANSI.green, "✓")
        : c(ANSI.red, "✗");

      process.stdout.write(`\r  ${gateIcon} Scan complete ${c(ANSI.dim, `(${scanMs}ms)`)}\n\n`);

      // ── Step 3: Summary card ───────────────────────────────────────────

      const toolCount = artifact.checks.find(ch => ch.id === "tools")?.evidence[0]?.itemCount ?? 0;
      const promptCount = artifact.checks.find(ch => ch.id === "prompts")?.evidence[0]?.itemCount ?? 0;
      const resourceCount = artifact.checks.find(ch => ch.id === "resources")?.evidence[0]?.itemCount ?? 0;

      process.stdout.write(`  ${c(ANSI.bold, "Server")}    ${targetConfig.targetId}\n`);
      process.stdout.write(`  ${c(ANSI.dim, "Source")}    ${targetSource}\n`);
      process.stdout.write(
        `  ${c(ANSI.dim, "Capabilities")} ${toolCount} tools, ${promptCount} prompts, ${resourceCount} resources\n`,
      );

      // ── Step 4: Health Score ───────────────────────────────────────────

      const hs = artifact.healthScore;
      if (hs) {
        process.stdout.write(`\n  ${c(ANSI.bold, "Safety Grade")}\n`);
        process.stdout.write(
          `  ${gradeColor(hs.grade)}  ${hs.overall}/100  ${gradeBar(hs.overall)}\n\n`,
        );

        process.stdout.write(`  ${c(ANSI.dim, "Dimension Breakdown")}\n`);
        for (const dim of hs.dimensions) {
          const pct = Math.round(dim.weight * 100);
          const label = dim.name.padEnd(22);
          const scoreLabel = String(dim.score).padStart(3);
          process.stdout.write(
            `  ${c(ANSI.bold, label)} ${scoreLabel}/100  ${dimBar(dim.score)} ${c(ANSI.dim, `(${pct}%)`)}\n`,
          );
        }
      }

      // ── Step 5: Check results ──────────────────────────────────────────

      process.stdout.write(`\n  ${c(ANSI.bold, "Check Results")}\n`);
      for (const check of artifact.checks) {
        const icon = check.status === "pass" ? c(ANSI.green, "✓") :
          check.status === "fail" ? c(ANSI.red, "✗") :
          c(ANSI.yellow, "○");
        const status = colorStatus(check.status);
        process.stdout.write(
          `  ${icon} ${check.id.padEnd(18)} ${status.padEnd(12)} ${c(ANSI.dim, check.message)}\n`,
        );
      }

      process.stdout.write("\n");

      // ── Step 6: Next steps ─────────────────────────────────────────────

      if (artifact.gate === "pass") {
        process.stdout.write(`  ${c(ANSI.green, "✓")} ${c(ANSI.bold, "All checks passed!")}\n\n`);

        process.stdout.write(`  ${c(ANSI.bold, "What's next?")}\n`);
        const serverCount = targets.length > 1 ? targets.length : "";
        if (serverCount) {
          process.stdout.write(
            `    ${c(ANSI.cyan, "$")} ${c(ANSI.bold, `${bin} scan`)}${serverCount ? "" : ""} ${c(ANSI.dim, `— scan all ${serverCount} servers`)}\n`,
          );
        }
        process.stdout.write(
          `    ${c(ANSI.cyan, "$")} ${c(ANSI.bold, `${bin} diff`)} <run1> <run2>  ${c(ANSI.dim, "- compare before/after")}\n`,
        );
        process.stdout.write(
          `    ${c(ANSI.cyan, "$")} ${c(ANSI.bold, `${bin} badge`)} <server>      ${c(ANSI.dim, "- generate a safety badge")}\n`,
        );
        process.stdout.write(
          `    ${c(ANSI.cyan, "$")} ${c(ANSI.bold, `${bin} setup-ci`)}             ${c(ANSI.dim, "- add to CI pipeline")}\n`,
        );

        printCiConversionCta({ bin, context: "keep this safety grade visible in CI", target: targetConfig });
      } else {
        process.stdout.write(`  ${c(ANSI.yellow, "!")} ${c(ANSI.bold, "Some checks need attention")}\n\n`);

        process.stdout.write(`  ${c(ANSI.bold, "Quick fixes:")}\n`);
        process.stdout.write(
          `    ${c(ANSI.cyan, "$")} ${c(ANSI.bold, `${bin} enforce`)} ${targetConfig.targetId}  ${c(ANSI.dim, "- generate runtime policy")}\n`,
        );
        process.stdout.write(
          `    ${c(ANSI.cyan, "$")} ${c(ANSI.bold, `${bin} audit`)} ${targetConfig.targetId}   ${c(ANSI.dim, "- deep security audit")}\n`,
        );
        process.stdout.write(
          `    ${c(ANSI.cyan, "$")} ${c(ANSI.bold, `${bin} test --deep`)} ${targetConfig.targetId}  ${c(ANSI.dim, "- full tool invocation")}\n`,
        );
      }

      process.stdout.write("\n");

      // ── Telemetry ──────────────────────────────────────────────────────

      const checkStatuses: Record<string, string> = {};
      for (const ch of artifact.checks) checkStatuses[ch.id] = ch.status;

      recordEvent(buildEvent("command_complete", "demo", "cli", {
        targetIds: [targetConfig.targetId],
        gateResult: artifact.gate,
        healthScore: hs?.overall,
        healthGrade: hs?.grade,
        toolsFound: toolCount,
        promptsFound: promptCount,
        resourcesFound: resourceCount,
        checkStatuses,
        serversScanned: targets.length,
        deepFlag: options.deep,
        executionMs: scanMs,
        stageOverride: "demo",
      }));

      maybePrintCloudCta("general");
      recordSessionEnd(sessionId);
    });
}
