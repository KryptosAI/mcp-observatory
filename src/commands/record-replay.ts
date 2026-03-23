import os from "node:os";
import type { Command } from "commander";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import type { Cassette } from "../cassette.js";
import { defaultCassettesDirectory, loadCassette, saveCassette } from "../cassette.js";
import { runPromptsCheck } from "../checks/prompts.js";
import { runResourcesCheck } from "../checks/resources.js";
import { runToolsCheck } from "../checks/tools.js";
import { runToolsInvokeCheck } from "../checks/tools-invoke.js";
import {
  renderTerminal,
  type TargetConfig,
} from "../index.js";
import { runTargetRecording } from "../runner.js";
import { ReplayTransport } from "../transport/replay-transport.js";
import { SCHEMA_VERSION, type RunArtifact } from "../types.js";
import { buildRunId } from "../utils/ids.js";
import { compareResponses } from "../verify.js";
import { TOOL_VERSION } from "../version.js";
import { ANSI, c, readTargetConfig, targetFromCommand, getPassthroughArgs } from "./helpers.js";

export function registerRecordReplayCommands(program: Command, bin: string): void {
  // ── record ─────────────────────────────────────────────────────────────

  program
    .command("record", { hidden: true })
    .passThroughOptions()
    .description("Record a server session to a cassette file for replay.")
    .argument("[command...]", "Server command and arguments to run.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { target?: string }) => {
      const target = options.target
        ? await readTargetConfig(options.target)
        : targetFromCommand(commandArgs.length > 0 ? commandArgs : getPassthroughArgs());

      process.stdout.write(`${c(ANSI.dim, "⟳")} Recording session with ${c(ANSI.bold, target.targetId)}...\n`);

      const { artifact, cassetteEntries } = await runTargetRecording(target, { invokeTools: true });

      if (!cassetteEntries || cassetteEntries.length === 0) {
        process.stdout.write(`${c(ANSI.yellow, "⚠")} No traffic recorded.\n`);
        process.exitCode = 1;
        return;
      }

      const cassette: Cassette = {
        version: 1,
        targetId: target.targetId,
        recordedAt: new Date().toISOString(),
        transport: target.adapter === "http" ? "http" : "stdio",
        entries: cassetteEntries,
      };

      const cassettePath = await saveCassette(cassette, defaultCassettesDirectory(process.cwd()));

      const summary = renderTerminal(artifact);
      process.stdout.write(`\n${summary}\n`);
      process.stdout.write(`\n${c(ANSI.green, "✓")} Cassette saved: ${cassettePath}\n`);
      process.stdout.write(`  ${c(ANSI.dim, `${cassetteEntries.length} entries recorded`)}\n`);
      process.stdout.write(`\n  Replay offline:  ${c(ANSI.cyan, `${bin} replay ${cassettePath}`)}\n`);
      process.stdout.write(`  Verify live:     ${c(ANSI.cyan, `${bin} verify ${cassettePath} ${target.adapter === "http" ? `--target <config>` : commandArgs.join(" ")}`)}\n\n`);

      if (artifact.gate === "fail") {
        process.exitCode = 1;
      }
    });

  // ── replay ─────────────────────────────────────────────────────────────

  program
    .command("replay", { hidden: true })
    .description("Replay a cassette file offline — no live server needed.")
    .argument("<cassette>", "Path to a cassette JSON file.")
    .option("--no-color", "Disable colored output.")
    .action(async (cassettePath: string) => {
      const cassette = await loadCassette(cassettePath);

      process.stdout.write(`${c(ANSI.dim, "⟳")} Replaying cassette for ${c(ANSI.bold, cassette.targetId)} (${cassette.entries.length} entries)...\n`);

      // Create a target config for the replay
      const replayTarget: TargetConfig = {
        targetId: cassette.targetId,
        adapter: "local-process",
        command: "replay",
        args: [],
      };

      // Build a ReplayTransport and run checks against it
      const transport = new ReplayTransport(cassette.entries);
      const client = new Client(
        { name: "mcp-observatory", version: TOOL_VERSION },
        { capabilities: {} },
      );

      await client.connect(transport);
      const serverCapabilities = client.getServerCapabilities();

      const checkContext = {
        client,
        serverCapabilities,
        target: replayTarget,
        timeoutMs: 10_000,
        stderrLines: [] as string[],
      };

      const toolsCheck = await runToolsCheck(checkContext);
      const promptsCheck = await runPromptsCheck(checkContext);
      const resourcesCheck = await runResourcesCheck(checkContext);
      const invokeCheck = await runToolsInvokeCheck(checkContext);

      await client.close();

      const checks = [
        toolsCheck.result,
        promptsCheck.result,
        resourcesCheck.result,
        invokeCheck.result,
      ];

      const failCount = checks.filter((ch) => ch.status === "fail").length;
      const gate: "pass" | "fail" = failCount > 0 ? "fail" : "pass";
      const artifact = {
        artifactType: "run" as const,
        schemaVersion: SCHEMA_VERSION,
        gate,
        runId: buildRunId(),
        createdAt: new Date().toISOString(),
        toolVersion: TOOL_VERSION,
        target: {
          targetId: cassette.targetId,
          adapter: "local-process" as const,
          command: "replay",
          args: [] as string[],
          metadata: { source: "cassette", cassettePath },
        },
        environment: {
          platform: `${os.platform()} ${os.release()}`,
          nodeVersion: process.version,
        },
        summary: {
          total: checks.length,
          pass: checks.filter((ch) => ch.status === "pass").length,
          fail: failCount,
          partial: checks.filter((ch) => ch.status === "partial").length,
          unsupported: checks.filter((ch) => ch.status === "unsupported").length,
          flaky: checks.filter((ch) => ch.status === "flaky").length,
          skipped: checks.filter((ch) => ch.status === "skipped").length,
          gate,
        },
        checks,
      } satisfies RunArtifact;

      process.stdout.write(`\n${renderTerminal(artifact)}\n`);
      process.stdout.write(`\n${c(ANSI.dim, `Replayed from: ${cassettePath}`)}\n\n`);

      if (artifact.gate === "fail") {
        process.exitCode = 1;
      }
    });

  // ── verify ─────────────────────────────────────────────────────────────

  program
    .command("verify")
    .passThroughOptions()
    .description("Verify a live server still matches a recorded cassette.")
    .argument("<cassette>", "Path to a cassette JSON file.")
    .argument("[command...]", "Server command and arguments to run.")
    .option("--target <config>", "Path to a target config JSON file.")
    .option("--no-color", "Disable colored output.")
    .action(async (cassettePath: string, commandArgs: string[], options: { target?: string }) => {
      const cassette = await loadCassette(cassettePath);

      const target = options.target
        ? await readTargetConfig(options.target)
        : targetFromCommand(commandArgs.length > 0 ? commandArgs : getPassthroughArgs());

      process.stdout.write(`${c(ANSI.dim, "⟳")} Verifying ${c(ANSI.bold, target.targetId)} against cassette...\n`);

      const { cassetteEntries } = await runTargetRecording(target, { invokeTools: true });

      if (!cassetteEntries) {
        process.stdout.write(`${c(ANSI.red, "✗")} Failed to record live session for comparison.\n`);
        process.exitCode = 1;
        return;
      }

      const verifyResult = compareResponses(cassette, cassetteEntries);

      process.stdout.write("\n");

      for (const entry of verifyResult.entries) {
        if (entry.status === "pass") {
          process.stdout.write(`  ${c(ANSI.green, "✓")} ${entry.method}\n`);
        } else if (entry.status === "fail") {
          process.stdout.write(`  ${c(ANSI.red, "✗")} ${entry.method}\n`);
          if (entry.diff) {
            for (const line of entry.diff.split("\n")) {
              process.stdout.write(`    ${c(ANSI.dim, line)}\n`);
            }
          }
        } else {
          process.stdout.write(`  ${c(ANSI.yellow, "?")} ${entry.method} ${c(ANSI.dim, "(missing — server did not respond)")}\n`);
        }
      }

      process.stdout.write("\n");
      if (verifyResult.failed === 0 && verifyResult.missing === 0) {
        process.stdout.write(c(ANSI.green, `  ✓ All ${verifyResult.passed} responses match cassette\n`));
      } else {
        process.stdout.write(c(ANSI.red, `  ✗ ${verifyResult.failed} changed, ${verifyResult.missing} missing out of ${verifyResult.totalEntries} responses\n`));
        process.exitCode = 1;
      }
      process.stdout.write("\n");
    });
}
