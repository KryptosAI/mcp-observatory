#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import path from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { diffArtifacts } from "./diff.js";
import { scanForTargets } from "./discovery.js";
import { renderMarkdown } from "./reporters/markdown.js";
import { runTarget } from "./runner.js";
import { defaultRunsDirectory, readArtifact, writeRunArtifact } from "./storage.js";
import type { RunArtifact } from "./types.js";
import { TOOL_VERSION } from "./version.js";

function formatRun(artifact: RunArtifact): string {
  const lines: string[] = [];
  lines.push(`Target: ${artifact.target.targetId}`);
  lines.push(`Gate: ${artifact.gate}`);
  lines.push(`Created: ${artifact.createdAt}`);
  if (artifact.target.serverName) {
    lines.push(`Server: ${artifact.target.serverName} ${artifact.target.serverVersion ?? ""}`);
  }
  lines.push("");
  for (const check of artifact.checks) {
    lines.push(`  [${check.status}] ${check.id}: ${check.message}`);
  }
  if (artifact.fatalError) {
    lines.push(`\nFatal error: ${artifact.fatalError}`);
  }
  return lines.join("\n");
}

export async function startServer(): Promise<void> {
  const server = new McpServer({
    name: "mcp-observatory",
    version: TOOL_VERSION,
  });

  server.tool(
    "scan",
    "Auto-discover MCP servers from config files and run checks against each one. Returns a summary of tools/prompts/resources status for every discovered server.",
    { config: z.string().optional().describe("Path to a specific MCP config file. If omitted, scans default locations.") },
    async ({ config }) => {
      const targets = await scanForTargets(config);
      if (targets.length === 0) {
        return { content: [{ type: "text" as const, text: "No MCP server configs found." }] };
      }

      const lines: string[] = [`Discovered ${targets.length} server(s):\n`];
      for (const t of targets) {
        // Skip ourselves to avoid recursive loop
        if (t.config.targetId === "mcp-observatory") continue;

        lines.push(`--- ${t.config.targetId} (from ${t.source}) ---`);
        try {
          const artifact = await runTarget(t.config);
          lines.push(formatRun(artifact));
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          lines.push(`  Error: ${msg}`);
        }
        lines.push("");
      }
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );

  server.tool(
    "check_server",
    "Run checks against a specific MCP server by command. Example: check_server({ command: 'npx -y @modelcontextprotocol/server-everything' })",
    {
      command: z.string().describe("The command to launch the MCP server (e.g. 'npx -y @modelcontextprotocol/server-everything')."),
      args: z.array(z.string()).optional().describe("Additional arguments for the command."),
    },
    async ({ command, args }) => {
      try {
        const target = {
          targetId: command,
          adapter: "local-process" as const,
          command,
          args: args ?? [],
          timeoutMs: 15_000,
        };
        const artifact = await runTarget(target);
        const outDir = defaultRunsDirectory();
        const outPath = await writeRunArtifact(artifact, outDir);
        return {
          content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nArtifact saved: ${outPath}` }],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error checking server: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "diff_runs",
    "Compare two run artifact files and return the diff showing regressions, recoveries, and schema drift.",
    {
      base: z.string().describe("Path to the base run artifact JSON file."),
      head: z.string().describe("Path to the head run artifact JSON file."),
    },
    async ({ base, head }) => {
      try {
        const baseArtifact = await readArtifact(base);
        const headArtifact = await readArtifact(head);

        if (baseArtifact.artifactType !== "run" || headArtifact.artifactType !== "run") {
          return { content: [{ type: "text" as const, text: "Both files must be run artifacts (not diff artifacts)." }], isError: true };
        }

        const diff = diffArtifacts(baseArtifact, headArtifact);
        const markdown = renderMarkdown(diff);
        return { content: [{ type: "text" as const, text: markdown }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error diffing runs: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "get_last_run",
    "Return the most recent run artifact for a given target ID. Searches the default runs directory.",
    {
      targetId: z.string().describe("The target ID to find the last run for (e.g. server name or command)."),
      runsDir: z.string().optional().describe("Custom runs directory. Defaults to .mcp-observatory/runs in cwd."),
    },
    async ({ targetId, runsDir }) => {
      try {
        const dir = runsDir ?? defaultRunsDirectory();
        let files: string[];
        try {
          files = await readdir(dir);
        } catch {
          return { content: [{ type: "text" as const, text: `No runs directory found at ${dir}` }], isError: true };
        }

        // Filter to JSON files matching the target, sorted newest-first by filename (ISO timestamp prefix)
        const needle = targetId.toLowerCase();
        const matching = files
          .filter((f) => f.endsWith(".json") && f.toLowerCase().includes(needle))
          .sort()
          .reverse();

        if (matching.length === 0) {
          return { content: [{ type: "text" as const, text: `No run artifacts found for target "${targetId}" in ${dir}` }] };
        }

        const latest = matching[0]!;
        const artifact = await readArtifact(path.join(dir, latest));
        if (artifact.artifactType !== "run") {
          return { content: [{ type: "text" as const, text: `Latest matching file is not a run artifact: ${latest}` }], isError: true };
        }

        return {
          content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nFile: ${path.join(dir, latest)}` }],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error reading last run: ${msg}` }], isError: true };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
