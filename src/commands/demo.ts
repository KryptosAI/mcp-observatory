import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";

import { runTarget } from "../index.js";
import type { TargetConfig } from "../types.js";
import { scanForTargets } from "../discovery.js";
import { inferLocalMcpTarget } from "../infer-local-mcp.js";
import { buildEvent, generateSessionId, recordEvent, recordSessionEnd, recordSessionStart } from "../command-events.js";
import { extractObservatoryFindings } from "../findings.js";
import { defaultRunsDirectory, writeRunArtifact } from "../storage.js";
import {
  ANSI,
  c,
  colorStatus,
  getBinName,
  isQuiet,
  LOGO,
} from "./helpers.js";

function packagedDemoTarget(timeoutMs: number): TargetConfig {
  const require = createRequire(import.meta.url);
  const here = path.dirname(fileURLToPath(import.meta.url));
  let dir = here;
  let packageRoot = "";
  for (let i = 0; i < 6; i++) {
    try {
      const pkg = require(path.join(dir, "package.json")) as { name?: string };
      if (pkg.name === "@kryptosai/mcp-observatory") {
        packageRoot = dir;
        break;
      }
    } catch {
      // keep walking
    }
    dir = path.dirname(dir);
  }
  if (!packageRoot) {
    throw new Error("Could not locate the packaged MCP Observatory demo server.");
  }
  return {
    targetId: "mcp-observatory-demo",
    adapter: "local-process",
    command: process.execPath,
    args: [path.join(packageRoot, "examples/demo-mcp-server.mjs")],
    timeoutMs,
  };
}

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
    .option("--example", "Scan only the packaged example; do not discover or start your configured servers.", false)
    .option("--deep", "Run full tool invocation and security checks (takes longer)", false)
    .option("--timeout <ms>", "Timeout in milliseconds", "15000")
    .option("--no-color", "Disable colored output")
    .action(async (options: { server?: string; example?: boolean; deep?: boolean; timeout: string }) => {
      const sessionId = generateSessionId();
      recordSessionStart(sessionId);
      const t0 = Date.now();
      const bin = getBinName();

      const timeoutMs = Number(options.timeout);
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        process.stdout.write(
          `  ${c(ANSI.red, "✗")} Invalid --timeout "${options.timeout}" — expected a positive number of milliseconds.\n`,
        );
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
      const targets = options.example ? [] : await scanForTargets();

      let targetConfig: TargetConfig;
      let targetSource: string;

      if (options.example) {
        if (options.server) throw new Error("Choose either --example or --server, not both.");
        targetConfig = packagedDemoTarget(timeoutMs);
        targetSource = "packaged local demo server";
        process.stdout.write("\r  Using the packaged example. Your configured servers are not started.\n");
      } else if (options.server) {
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
          timeoutMs,
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
        targetConfig = { ...targets[0]!.config, timeoutMs };
        targetSource = targets[0]!.source;
        process.stdout.write(`\n  ${c(ANSI.dim, "Scanning first server...")}\n`);
      } else {
        const inferred = inferLocalMcpTarget(process.cwd(), timeoutMs);
        if (inferred) {
          targetConfig = inferred;
          targetSource = "this repository's MCP package";
          process.stdout.write(
            `\r  ${c(ANSI.green, "✓")} No client config. Testing ${c(ANSI.bold, inferred.targetId)} from package.json\n`,
          );
        } else {
          targetConfig = packagedDemoTarget(timeoutMs);
          targetSource = "packaged local demo server";
          process.stdout.write(
            `\r  ${c(ANSI.yellow, "!")} No MCP servers configured.\n`,
          );
          process.stdout.write(
            `    ${c(ANSI.dim, "Running packaged local demo server")}\n`,
          );
          process.stdout.write(
            `    ${c(ANSI.dim, `Tip: ${bin} suggest  → discover servers for your stack`)}\n`,
          );
        }
      }

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

      const fixes = extractObservatoryFindings(artifact)
        .filter((finding) => finding.severity !== "info" && finding.recommendation)
        .slice(0, 3);
      if (fixes.length > 0) {
        process.stdout.write(`  ${c(ANSI.bold, "Issues to fix")}\n`);
        for (const finding of fixes) {
          process.stdout.write(`    ${finding.severity} ${finding.title}: ${finding.recommendation}\n`);
        }
        process.stdout.write("\n");
      }

      // ── Step 6: Next steps ─────────────────────────────────────────────

      if (artifact.gate === "pass") {
        process.stdout.write(`  ${c(ANSI.green, "✓")} ${c(ANSI.bold, "Passed the configured release gate.")}\n\n`);

      } else {
        process.stdout.write(`  ${c(ANSI.yellow, "!")} ${c(ANSI.bold, "Some checks need attention")}\n\n`);

        if (!isQuiet()) {
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

      const outPath = await writeRunArtifact(artifact, defaultRunsDirectory(process.cwd()));
      if (!isQuiet()) {
        process.stdout.write(`  Receipt saved: ${outPath}\n`);
        if (targetConfig.targetId === "mcp-observatory-demo") {
          process.stdout.write("  This is the included example, not a result for your own server.\n");
        }
        process.stdout.write(`\n  Next: save this result online (optional, free)\n    ${bin} cloud upload\n`);
        process.stdout.write("  Run it in this same folder. Connect GitHub in the browser, then return here.\n");
        process.stdout.write("  Local scanning stays free. Setup help: https://mcp-observatory.com/start/\n\n");
      }
      recordSessionEnd(sessionId);
    });
}
