import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";

import { buildRiskGraph, loadRiskGraphInputs, renderRiskGraphHtml, renderRiskGraphJson, renderRiskGraphMarkdown } from "../risk-graph.js";
import { buildEvent, recordEvent } from "../telemetry.js";

interface RiskGraphOptions {
  input?: string[];
  output?: string;
  json?: string;
  html?: string;
}

async function writeOutput(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${content}\n`, "utf8");
}

export function registerRiskGraphCommands(program: Command): void {
  program
    .command("risk-graph")
    .description("Build an MCP risk graph from run artifacts and receipts.")
    .option("--input <path>", "Artifact file or directory. Can be repeated.", (value, previous: string[] = []) => [...previous, value], [])
    .option("--output <file>", "Write a Markdown risk graph.")
    .option("--json <file>", "Write graph JSON for agents/tools.")
    .option("--html <file>", "Write a standalone HTML graph.")
    .action(async (options: RiskGraphOptions) => {
      const startedAt = Date.now();
      const inputs = options.input && options.input.length > 0 ? options.input : ["docs/safety-index/artifacts"];
      const loaded = await loadRiskGraphInputs(inputs);
      const graph = await buildRiskGraph(loaded.inputs);
      graph.warnings.push(...loaded.warnings);
      if (graph.summary.totalServers === 0) {
        throw new Error(`No supported MCP run artifacts or receipts found in: ${inputs.join(", ")}`);
      }

      const wrote: string[] = [];
      if (options.json) {
        await writeOutput(options.json, renderRiskGraphJson(graph));
        wrote.push(`JSON ${options.json}`);
      }
      if (options.output) {
        await writeOutput(options.output, renderRiskGraphMarkdown(graph));
        wrote.push(`Markdown ${options.output}`);
      }
      if (options.html) {
        await writeOutput(options.html, renderRiskGraphHtml(graph));
        wrote.push(`HTML ${options.html}`);
      }

      if (wrote.length === 0) {
        process.stdout.write(`${renderRiskGraphMarkdown(graph)}\n`);
      } else {
        process.stdout.write(`Built MCP risk graph with ${graph.summary.totalServers} server(s), ${graph.summary.totalBoundaries} boundary class(es), highest risk ${graph.summary.highestRiskLevel}.\n`);
        process.stdout.write(`Wrote ${wrote.join(", ")}\n`);
        process.stdout.write("Next: npx @kryptosai/mcp-observatory setup-ci --all --sarif --schedule weekly\n");
      }

      recordEvent(buildEvent("command_complete", "risk-graph", "cli", {
        executionMs: Date.now() - startedAt,
        riskGraphGenerated: true,
        riskGraphNodeCount: graph.nodes.length,
        riskGraphServerCount: graph.summary.totalServers,
        riskGraphBoundaryCount: graph.summary.totalBoundaries,
        riskGraphHighestRisk: graph.summary.highestRiskLevel,
        riskGraphInputCount: loaded.inputs.length,
        riskGraphOutputFormats: [
          options.json ? "json" : undefined,
          options.output ? "markdown" : undefined,
          options.html ? "html" : undefined,
          !options.json && !options.output && !options.html ? "stdout-markdown" : undefined,
        ].filter((format): format is string => Boolean(format)),
      }));
    });
}
