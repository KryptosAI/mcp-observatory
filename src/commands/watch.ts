import type { Command } from "commander";

import {
  renderTerminal,
  runTarget,
  writeRunArtifact,
  type TargetConfig,
} from "../index.js";
import { isCI } from "../ci.js";
import { defaultRunsDirectory, findLatestArtifact, readArtifact } from "../storage.js";
import { ANSI, c, formatOutput, targetFromCommand } from "./helpers.js";

// ── One-shot mode ────────────────────────────────────────────────────────────

async function runWatchOneShot(
  target: TargetConfig,
  outDir: string,
  options: { format: string; failOnRegression: boolean },
): Promise<void> {
  const { diffArtifacts: diff } = await import("../diff.js");

  const artifact = await runTarget(target);
  const outPath = await writeRunArtifact(artifact, outDir);

  // Find the PREVIOUS run for this target (excluding the one just written)
  const latestPath = await findLatestArtifact(outDir, target.targetId);
  if (latestPath && latestPath !== outPath) {
    const previousRaw = await readArtifact(latestPath);
    if (previousRaw.artifactType === "run") {
      const previous = previousRaw;
      const diffResult = diff(previous, artifact);

      process.stdout.write(formatOutput(diffResult, options.format as "terminal" | "json") + "\n");
      process.stdout.write(`${c(ANSI.dim, `Artifact: ${outPath}`)}\n`);

      if (options.failOnRegression && diffResult.summary.regressions > 0) {
        process.exitCode = 1;
      }
      return;
    }
  }

  // First run — no previous artifact to diff against
  process.stdout.write(formatOutput(artifact, options.format as "terminal" | "json") + "\n");
  process.stdout.write(`${c(ANSI.dim, `Artifact: ${outPath}`)}\n`);

  if (artifact.gate === "fail") {
    process.exitCode = 1;
  }
}

// ── Continuous polling mode ──────────────────────────────────────────────────

async function runWatchMode(target: TargetConfig, outDir: string, intervalSeconds: number): Promise<void> {
  const { diffArtifacts: diff } = await import("../diff.js");

  process.stdout.write(`Watch mode: checking every ${intervalSeconds}s. Press Ctrl+C to stop.\n\n`);

  let previousArtifact = await runTarget(target);
  await writeRunArtifact(previousArtifact, outDir);
  process.stdout.write(`${renderTerminal(previousArtifact)}\n\n`);

  const loop = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));

    const currentArtifact = await runTarget(target);
    const diffResult = diff(previousArtifact, currentArtifact);

    if (diffResult.summary.regressions > 0 || diffResult.summary.recoveries > 0 || diffResult.summary.added > 0 || diffResult.summary.removed > 0) {
      const outPath = await writeRunArtifact(currentArtifact, outDir);
      process.stdout.write(`\n--- Change detected at ${currentArtifact.createdAt} ---\n`);
      process.stdout.write(`${renderTerminal(diffResult)}\n`);
      process.stdout.write(`Artifact: ${outPath}\n\n`);
    }

    previousArtifact = currentArtifact;
    void loop();
  };

  void loop();

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      process.stdout.write("\nWatch mode stopped.\n");
      resolve();
    });
  });
}

// ── Register ────────────────────────────────────────────────────────────────

export { runWatchMode, runWatchOneShot };

export function registerWatchCommands(program: Command): void {
  program
    .command("watch")
    .passThroughOptions()
    .description("Run a server check, diff against previous run, alert on regressions.")
    .argument("<command...>", "Server command and arguments to run.")
    .option("--interval <seconds>", "Continuous polling interval in seconds (omit for one-shot).")
    .option("--format <format>", "Output format: terminal or json.", "terminal")
    .option("--fail-on-regression", "Exit with code 1 on regressions.", isCI)
    .option("--no-fail-on-regression", "Do not exit with code 1 on regressions.")
    .option("--no-color", "Disable colored output.")
    .action(async (commandArgs: string[], options: { interval?: string; format: string; failOnRegression: boolean }) => {
      const target = targetFromCommand(commandArgs);
      const outDir = defaultRunsDirectory(process.cwd());

      if (options.interval) {
        await runWatchMode(target, outDir, parseInt(options.interval, 10) || 30);
      } else {
        await runWatchOneShot(target, outDir, {
          format: options.format,
          failOnRegression: options.failOnRegression,
        });
      }
    });
}
