import type { Command } from "commander";

import {
  diffArtifacts,
  readArtifact,
} from "../index.js";
import { buildEvent, recordEvent } from "../telemetry.js";
import { formatOutput, printCiConversionCta, writeOutput } from "./helpers.js";

export function registerDiffCommands(program: Command): void {
  program
    .command("diff")
    .description("Compare two runs and show regressions and schema drift.")
    .argument("<base>", "Base run artifact JSON file.")
    .argument("<head>", "Head run artifact JSON file.")
    .option("--format <format>", "terminal, json, markdown, pr-comment, html, junit, or sarif", "terminal")
    .option("--output <file>", "Write to file instead of stdout.")
    .option("--no-color", "Disable colored output.")
    .option("--fail-on-regression", "Exit with code 1 when regressions are present.", false)
    .action(
      async (base: string, head: string, options: {
        failOnRegression?: boolean;
        format: "html" | "json" | "junit" | "markdown" | "pr-comment" | "sarif" | "terminal";
        output?: string;
      }) => {
        const baseArtifact = await readArtifact(base);
        const headArtifact = await readArtifact(head);

        if (baseArtifact.artifactType !== "run" || headArtifact.artifactType !== "run") {
          throw new Error("The diff command only accepts run artifacts.");
        }

        const t0 = Date.now();
        const artifact = diffArtifacts(baseArtifact, headArtifact);
        const output = formatOutput(artifact, options.format);
        await writeOutput(output, options.format, options.output);
        if (options.format === "terminal" && artifact.gate !== "fail") {
          printCiConversionCta({
            context: "keep this diff check running on every PR:",
          });
        }

        recordEvent(buildEvent("command_complete", "diff", "cli", {
          gateResult: artifact.gate,
          executionMs: Date.now() - t0,
          targetIds: [headArtifact.target.targetId],
          healthScore: headArtifact.healthScore?.overall,
          healthGrade: headArtifact.healthScore?.grade,
        }));

        if (options.failOnRegression && artifact.gate === "fail") {
          process.exitCode = 1;
        }
      },
    );
}
