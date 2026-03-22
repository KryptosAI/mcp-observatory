import type { Command } from "commander";

import {
  renderTerminal,
  runTarget,
  writeRunArtifact,
  type TargetConfig,
} from "../index.js";
import { readTargetConfig } from "./helpers.js";

// ── Watch mode implementation ───────────────────────────────────────────────

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

export { runWatchMode };

export function registerWatchCommands(program: Command): void {
  program
    .command("watch")
    .description("Watch a server for changes, alert on regressions.")
    .argument("<config>", "Path to a target config JSON file.")
    .option("--interval <seconds>", "Check interval in seconds.", "30")
    .option("--no-color", "Disable colored output.")
    .action(async (configPath: string, options: { interval: string }) => {
      const target = await readTargetConfig(configPath);
      const outDir = (await import("../storage.js")).defaultRunsDirectory(process.cwd());
      await runWatchMode(target, outDir, parseInt(options.interval, 10) || 30);
    });
}
