#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import path from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { diffArtifacts } from "./diff.js";
import { scanForTargets } from "./discovery.js";
import { detectEnvironment } from "./environment.js";
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
        // Skip ourselves to avoid recursive loop.
        // A tool checking itself checking itself... we have to draw the line somewhere.
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

  server.tool(
    "suggest_servers",
    "Gather context about the current environment to help recommend MCP servers. Returns currently configured servers, detected languages/frameworks/databases/services, and available servers from the MCP registry.",
    {
      cwd: z.string().optional().describe("Working directory to scan for environment signals. Defaults to process.cwd()."),
    },
    async ({ cwd }) => {
      const workDir = cwd ?? process.cwd();
      const sections: string[] = [];

      // 1. Current MCP servers
      try {
        const targets = await scanForTargets();
        if (targets.length > 0) {
          const serverLines = targets.map((t) => {
            const id = t.config.targetId;
            const detail = t.config.adapter === "http"
              ? `(HTTP: ${t.config.url})`
              : `(command: ${t.config.command} ${t.config.args.join(" ")})`;
            return `  - ${id} ${detail} [source: ${t.source}]`;
          });
          sections.push(`## Currently Configured MCP Servers\n${serverLines.join("\n")}`);
        } else {
          sections.push("## Currently Configured MCP Servers\nNone found.");
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        sections.push(`## Currently Configured MCP Servers\nError scanning: ${msg}`);
      }

      // 2. Environment detection
      try {
        const env = await detectEnvironment(workDir);
        const envLines: string[] = [];
        if (env.languages.length > 0) envLines.push(`  Languages: ${env.languages.join(", ")}`);
        if (env.frameworks.length > 0) envLines.push(`  Frameworks: ${env.frameworks.join(", ")}`);
        if (env.databases.length > 0) envLines.push(`  Databases: ${env.databases.join(", ")}`);
        if (env.cloud.length > 0) envLines.push(`  Cloud: ${env.cloud.join(", ")}`);
        if (env.cicd.length > 0) envLines.push(`  CI/CD: ${env.cicd.join(", ")}`);
        if (env.services.length > 0) envLines.push(`  Services (detected from .env keys): ${env.services.join(", ")}`);
        if (envLines.length > 0) {
          sections.push(`## Detected Environment (${workDir})\n${envLines.join("\n")}`);
        } else {
          sections.push(`## Detected Environment (${workDir})\nNo recognizable project signals found.`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        sections.push(`## Detected Environment\nError: ${msg}`);
      }

      // 3. MCP Registry
      try {
        const registryUrl = "https://registry.modelcontextprotocol.io/v0/servers";
        const response = await fetch(registryUrl, {
          signal: AbortSignal.timeout(10_000),
          headers: { "Accept": "application/json" },
        });
        if (response.ok) {
          const data: unknown = await response.json();

          function formatRegistryEntry(entry: Record<string, unknown>): string {
            // Registry returns { server: { name, description, ... }, ... }
            const srv = (typeof entry["server"] === "object" && entry["server"] !== null
              ? entry["server"] : entry) as Record<string, unknown>;
            const rawName = srv["name"] ?? entry["name"] ?? entry["id"];
            const name = typeof rawName === "string" ? rawName : "unknown";
            const rawDesc = srv["description"] ?? entry["description"];
            const desc = typeof rawDesc === "string" ? ` — ${rawDesc}` : "";
            return `  - ${name}${desc}`;
          }

          if (Array.isArray(data)) {
            const entries = data.slice(0, 50) as Array<Record<string, unknown>>;
            const registryLines = entries.map(formatRegistryEntry);
            sections.push(`## MCP Registry (${String(entries.length)} of ${String(data.length)} servers shown)\n${registryLines.join("\n")}`);
          } else if (typeof data === "object" && data !== null) {
            const obj = data as Record<string, unknown>;
            const servers = obj["servers"] ?? obj["results"] ?? obj["items"];
            if (Array.isArray(servers)) {
              const entries = (servers as Array<Record<string, unknown>>).slice(0, 50);
              const registryLines = entries.map(formatRegistryEntry);
              sections.push(`## MCP Registry (${String(entries.length)} of ${String(servers.length)} servers shown)\n${registryLines.join("\n")}`);
            } else {
              sections.push(`## MCP Registry\nRegistry returned data but in an unexpected format. Keys: ${Object.keys(obj).join(", ")}`);
            }
          }
        } else {
          sections.push(`## MCP Registry\nRegistry returned HTTP ${String(response.status)}. The listing endpoint may not be publicly available.`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        sections.push(`## MCP Registry\nCould not reach registry: ${msg}`);
      }

      return { content: [{ type: "text" as const, text: sections.join("\n\n") }] };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
