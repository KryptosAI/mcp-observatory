import type { Command } from "commander";

import {
  diffArtifacts,
  readArtifact,
} from "../index.js";
import { buildEvent, recordEvent } from "../command-events.js";
import type { PermissionDeltaEntry, PermissionDeltaThreshold, SchemaDriftEntry, SchemaDriftSeverity } from "../types.js";
import { formatOutput, printCiConversionCta, writeOutput } from "./helpers.js";

const SCHEMA_DRIFT_SEVERITIES = new Set<SchemaDriftSeverity>(["info", "medium", "high"]);
const PERMISSION_DELTA_THRESHOLDS = new Set<PermissionDeltaThreshold>(["widening", "review"]);
const SCHEMA_DRIFT_SEVERITY_RANK: Record<SchemaDriftSeverity, number> = {
  info: 1,
  medium: 2,
  high: 3,
};

function parseSchemaDriftSeverity(value: string | undefined): SchemaDriftSeverity | undefined {
  if (value === undefined) return undefined;
  if (SCHEMA_DRIFT_SEVERITIES.has(value as SchemaDriftSeverity)) {
    return value as SchemaDriftSeverity;
  }
  throw new Error(`Invalid schema drift severity "${value}". Expected one of: info, medium, high.`);
}

function parsePermissionDeltaThreshold(value: string | undefined): PermissionDeltaThreshold | undefined {
  if (value === undefined) return undefined;
  if (PERMISSION_DELTA_THRESHOLDS.has(value as PermissionDeltaThreshold)) {
    return value as PermissionDeltaThreshold;
  }
  throw new Error(`Invalid permission-delta threshold "${value}". Expected one of: widening, review.`);
}

function hasSchemaDriftAtOrAbove(entries: SchemaDriftEntry[] | undefined, severity: SchemaDriftSeverity | undefined): boolean {
  if (severity === undefined || entries === undefined) return false;
  return entries.some((entry) => SCHEMA_DRIFT_SEVERITY_RANK[entry.severity] >= SCHEMA_DRIFT_SEVERITY_RANK[severity]);
}

function hasPermissionDeltaAtThreshold(entries: PermissionDeltaEntry[] | undefined, threshold: PermissionDeltaThreshold | undefined): boolean {
  if (threshold === undefined || entries === undefined) return false;
  return entries.some((entry) => entry.risk === "widening" || (threshold === "review" && entry.risk === "review"));
}

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
    .option("--fail-on-schema-drift <severity>", "Exit with code 1 when schema drift at or above severity is present: info, medium, or high.")
    .option("--fail-on-permission-delta <threshold>", "Exit with code 1 on permission widening, or on widening and review-class changes: widening or review.")
    .action(
      async (base: string, head: string, options: {
        failOnRegression?: boolean;
        failOnPermissionDelta?: string;
        failOnSchemaDrift?: string;
        format: "html" | "json" | "junit" | "markdown" | "pr-comment" | "sarif" | "terminal";
        output?: string;
      }) => {
        const baseArtifact = await readArtifact(base);
        const headArtifact = await readArtifact(head);

        if (baseArtifact.artifactType !== "run" || headArtifact.artifactType !== "run") {
          throw new Error("The diff command only accepts run artifacts.");
        }

        const t0 = Date.now();
        const failOnPermissionDelta = parsePermissionDeltaThreshold(options.failOnPermissionDelta);
        const failOnSchemaDrift = parseSchemaDriftSeverity(options.failOnSchemaDrift);
        const artifact = diffArtifacts(baseArtifact, headArtifact, { failOnPermissionDelta, failOnSchemaDrift });
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

        if (
          (options.failOnRegression && artifact.regressions.length > 0)
          || hasPermissionDeltaAtThreshold(artifact.permissionDeltas, failOnPermissionDelta)
          || hasSchemaDriftAtOrAbove(artifact.schemaDrift, failOnSchemaDrift)
        ) {
          process.exitCode = 1;
        }
      },
    );
}
