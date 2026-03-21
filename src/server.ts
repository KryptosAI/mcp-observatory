#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import path from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import type { Cassette } from "./cassette.js";
import { defaultCassettesDirectory, loadCassette, saveCassette } from "./cassette.js";
import { diffArtifacts } from "./diff.js";
import { scanForTargets } from "./discovery.js";
import { detectEnvironment } from "./environment.js";
import { renderMarkdown } from "./reporters/markdown.js";
import { runTarget, runTargetRecording } from "./runner.js";
import type { RunOptions } from "./runner.js";
import { defaultRunsDirectory, readArtifact, writeRunArtifact } from "./storage.js";
import type { RunArtifact } from "./types.js";
import { compareResponses } from "./verify.js";
import { loadTelemetryConfig, recordEvent, buildEvent } from "./telemetry.js";
import { TOOL_VERSION } from "./version.js";

// ── Security: Command Allowlist ────────────────────────────────────────────
// MCP server mode is invoked by an LLM, not an operator. Arbitrary command
// execution would let a prompt-injection attack run anything on the host.
// Only commands whose base executable appears in this set are permitted.
const ALLOWED_COMMANDS = new Set([
  "npx",
  "node",
  "python",
  "python3",
  "uvx",
  "docker",
  "deno",
  "bun",
]);

function validateCommand(command: string): void {
  const base = path.basename(command.split(/\s+/)[0] ?? "");
  if (!ALLOWED_COMMANDS.has(base)) {
    throw new Error(
      `Command "${base}" is not in the MCP server allowlist. ` +
      `Allowed executables: ${[...ALLOWED_COMMANDS].join(", ")}. ` +
      `Use the CLI for arbitrary commands.`
    );
  }
}

// ── Security: Path Validation ──────────────────────────────────────────────
// File-reading tools must not traverse outside expected directories.
function validatePath(filePath: string, allowedRoot: string): string {
  const resolved = path.resolve(filePath);
  const root = path.resolve(allowedRoot);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(
      `Path "${filePath}" resolves outside allowed directory "${allowedRoot}".`
    );
  }
  return resolved;
}

// ── Observability ──────────────────────────────────────────────────────────
function logRequest(tool: string, startMs: number, error?: boolean): void {
  const durationMs = Date.now() - startMs;
  const status = error ? "ERROR" : "OK";
  process.stderr.write(`[observatory] ${tool} ${status} ${durationMs}ms\n`);
  recordEvent(buildEvent("tool_call", tool, "mcp"));
}

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
  // Warm telemetry config cache
  await loadTelemetryConfig();

  const server = new McpServer({
    name: "mcp-observatory",
    version: TOOL_VERSION,
  });

  server.tool(
    "scan",
    "Auto-discover MCP servers from config files and run checks against each one. Returns a summary of tools/prompts/resources status for every discovered server.",
    {
      config: z.string().optional().describe("Path to a specific MCP config file. If omitted, scans default locations."),
      deep: z.boolean().optional().describe("Also invoke safe tools to verify they execute."),
      security: z.boolean().optional().describe("Run security analysis on tool schemas."),
    },
    async ({ config, deep, security }) => {
      const startMs = Date.now();
      const targets = await scanForTargets(config);
      if (targets.length === 0) {
        logRequest("scan", startMs);
        return { content: [{ type: "text" as const, text: "No MCP server configs found." }] };
      }

      const opts: RunOptions = {};
      if (deep) opts.invokeTools = true;
      if (security) opts.securityCheck = true;

      const lines: string[] = [`Discovered ${targets.length} server(s):\n`];
      for (const t of targets) {
        if (t.config.targetId === "mcp-observatory") continue;

        lines.push(`--- ${t.config.targetId} (from ${t.source}) ---`);
        try {
          const artifact = await runTarget(t.config, opts);
          lines.push(formatRun(artifact));
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          lines.push(`  Error: ${msg}`);
        }
        lines.push("");
      }
      logRequest("scan", startMs);
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );

  server.tool(
    "check_server",
    "Run checks against a specific MCP server by command. Example: check_server({ command: 'npx -y @modelcontextprotocol/server-everything' })",
    {
      command: z.string().describe("The command to launch the MCP server (e.g. 'npx -y @modelcontextprotocol/server-everything')."),
      args: z.array(z.string()).optional().describe("Additional arguments for the command."),
      deep: z.boolean().optional().describe("Also invoke safe tools to verify they execute."),
      security: z.boolean().optional().describe("Run security analysis on tool schemas."),
    },
    async ({ command, args, deep, security }) => {
      const startMs = Date.now();
      try {
        validateCommand(command);
        const target = {
          targetId: command,
          adapter: "local-process" as const,
          command,
          args: args ?? [],
          timeoutMs: 15_000,
        };
        const opts: RunOptions = {};
        if (deep) opts.invokeTools = true;
        if (security) opts.securityCheck = true;
        const artifact = await runTarget(target, opts);
        const outDir = defaultRunsDirectory();
        const outPath = await writeRunArtifact(artifact, outDir);
        logRequest("check_server", startMs);
        return {
          content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nArtifact saved: ${outPath}` }],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logRequest("check_server", startMs, true);
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
      format: z.enum(["markdown", "json"]).optional().describe("Output format: 'markdown' (default) or 'json'."),
    },
    async ({ base, head, format }) => {
      const startMs = Date.now();
      try {
        const runsDir = defaultRunsDirectory();
        const basePath = validatePath(base, runsDir);
        const headPath = validatePath(head, runsDir);

        const baseArtifact = await readArtifact(basePath);
        const headArtifact = await readArtifact(headPath);

        if (baseArtifact.artifactType !== "run" || headArtifact.artifactType !== "run") {
          return { content: [{ type: "text" as const, text: "Both files must be run artifacts (not diff artifacts)." }], isError: true };
        }

        const diff = diffArtifacts(baseArtifact, headArtifact);
        const output = format === "json"
          ? JSON.stringify(diff, null, 2)
          : renderMarkdown(diff);
        logRequest("diff_runs", startMs);
        return { content: [{ type: "text" as const, text: output }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logRequest("diff_runs", startMs, true);
        return { content: [{ type: "text" as const, text: `Error diffing runs: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "get_last_run",
    "Return the most recent run artifact for a given target ID. Searches the default runs directory.",
    {
      targetId: z.string().describe("The target ID to find the last run for (e.g. server name or command)."),
    },
    async ({ targetId }) => {
      const startMs = Date.now();
      try {
        const dir = defaultRunsDirectory();
        let files: string[];
        try {
          files = await readdir(dir);
        } catch {
          return { content: [{ type: "text" as const, text: `No runs directory found at ${dir}` }], isError: true };
        }

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

        logRequest("get_last_run", startMs);
        return {
          content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nFile: ${path.join(dir, latest)}` }],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logRequest("get_last_run", startMs, true);
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
      const startMs = Date.now();
      const workDir = cwd ?? process.cwd();
      // Constrain to cwd subtree
      const resolvedDir = path.resolve(workDir);
      const cwdRoot = path.resolve(process.cwd());
      if (!resolvedDir.startsWith(cwdRoot + path.sep) && resolvedDir !== cwdRoot) {
        logRequest("suggest_servers", startMs, true);
        return { content: [{ type: "text" as const, text: `Path "${cwd}" resolves outside the working directory.` }], isError: true };
      }
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

      logRequest("suggest_servers", startMs);
      return { content: [{ type: "text" as const, text: sections.join("\n\n") }] };
    },
  );

  server.tool(
    "record",
    "Record a live MCP server session to a cassette file. The cassette captures all JSON-RPC traffic and can be replayed offline or used to verify future server versions.",
    {
      command: z.string().describe("The command to launch the MCP server."),
      args: z.array(z.string()).optional().describe("Additional arguments for the command."),
    },
    async ({ command, args }) => {
      const startMs = Date.now();
      try {
        validateCommand(command);
        const target = {
          targetId: command,
          adapter: "local-process" as const,
          command,
          args: args ?? [],
          timeoutMs: 15_000,
        };
        const { artifact, cassetteEntries } = await runTargetRecording(target, { invokeTools: true });

        if (!cassetteEntries || cassetteEntries.length === 0) {
          return { content: [{ type: "text" as const, text: "No traffic recorded." }], isError: true };
        }

        const cassette: Cassette = {
          version: 1,
          targetId: target.targetId,
          recordedAt: new Date().toISOString(),
          transport: "stdio",
          entries: cassetteEntries,
        };

        const cassettePath = await saveCassette(cassette, defaultCassettesDirectory());
        logRequest("record", startMs);
        return {
          content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nCassette saved: ${cassettePath}\n${cassetteEntries.length} entries recorded.\n\nReplay offline: replay({ cassette: "${cassettePath}" })\nVerify live: verify({ cassette: "${cassettePath}", command: "${command}" })` }],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logRequest("record", startMs, true);
        return { content: [{ type: "text" as const, text: `Error recording: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "replay",
    "Replay a cassette file offline — no live server needed. Runs all checks against the recorded responses.",
    {
      cassette: z.string().describe("Path to a cassette JSON file."),
    },
    async ({ cassette: cassettePath }) => {
      const startMs = Date.now();
      try {
        const cassettesDir = defaultCassettesDirectory();
        validatePath(cassettePath, cassettesDir);
        const { ReplayTransport } = await import("./transport/replay-transport.js");
        const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
        const { runToolsCheck } = await import("./checks/tools.js");
        const { runPromptsCheck } = await import("./checks/prompts.js");
        const { runResourcesCheck } = await import("./checks/resources.js");
        const { runToolsInvokeCheck } = await import("./checks/tools-invoke.js");

        const cassette = await loadCassette(cassettePath);
        const replayTransport = new ReplayTransport(cassette.entries);
        const client = new Client({ name: "mcp-observatory", version: TOOL_VERSION }, { capabilities: {} });
        await client.connect(replayTransport);

        const checkContext = {
          client,
          serverCapabilities: client.getServerCapabilities(),
          target: { targetId: cassette.targetId, adapter: "local-process" as const, command: "replay", args: [] as string[] },
          timeoutMs: 10_000,
          stderrLines: [] as string[],
        };

        const checks = [
          (await runToolsCheck(checkContext)).result,
          (await runPromptsCheck(checkContext)).result,
          (await runResourcesCheck(checkContext)).result,
          (await runToolsInvokeCheck(checkContext)).result,
        ];
        await client.close();

        const lines = [`Replay of ${cassette.targetId} (${cassette.entries.length} entries):\n`];
        for (const check of checks) {
          lines.push(`  [${check.status}] ${check.id}: ${check.message}`);
        }
        logRequest("replay", startMs);
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logRequest("replay", startMs, true);
        return { content: [{ type: "text" as const, text: `Error replaying: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "verify",
    "Verify a live server still matches a recorded cassette. Connects to the server, replays the same requests, and compares responses.",
    {
      cassette: z.string().describe("Path to a cassette JSON file."),
      command: z.string().describe("The command to launch the MCP server."),
      args: z.array(z.string()).optional().describe("Additional arguments for the command."),
    },
    async ({ cassette: cassettePath, command, args }) => {
      const startMs = Date.now();
      try {
        validateCommand(command);
        const cassettesDir = defaultCassettesDirectory();
        validatePath(cassettePath, cassettesDir);
        const cassette = await loadCassette(cassettePath);
        const target = {
          targetId: command,
          adapter: "local-process" as const,
          command,
          args: args ?? [],
          timeoutMs: 15_000,
        };

        const { cassetteEntries } = await runTargetRecording(target, { invokeTools: true });
        if (!cassetteEntries) {
          return { content: [{ type: "text" as const, text: "Failed to record live session for comparison." }], isError: true };
        }

        const result = compareResponses(cassette, cassetteEntries);
        const lines: string[] = [`Verify: ${result.passed} passed, ${result.failed} changed, ${result.missing} missing\n`];
        for (const entry of result.entries) {
          const icon = entry.status === "pass" ? "✓" : entry.status === "fail" ? "✗" : "?";
          lines.push(`  ${icon} ${entry.method}${entry.diff ? ` — ${entry.diff}` : ""}`);
        }
        logRequest("verify", startMs);
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logRequest("verify", startMs, true);
        return { content: [{ type: "text" as const, text: `Error verifying: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "watch",
    "Run checks against a server repeatedly and report when results change. Returns the initial check and starts monitoring. Note: in MCP server mode this runs a single check and diff against the previous run rather than a persistent loop.",
    {
      command: z.string().describe("The command to launch the MCP server."),
      args: z.array(z.string()).optional().describe("Additional arguments for the command."),
    },
    async ({ command, args }) => {
      const startMs = Date.now();
      try {
        validateCommand(command);
        const target = {
          targetId: command,
          adapter: "local-process" as const,
          command,
          args: args ?? [],
          timeoutMs: 15_000,
        };

        // Run current check
        const artifact = await runTarget(target);
        const outDir = defaultRunsDirectory();
        const outPath = await writeRunArtifact(artifact, outDir);

        // Find previous run to diff against
        let diffText = "";
        try {
          const files = await readdir(outDir);
          const needle = target.targetId.toLowerCase();
          const matching = files
            .filter((f) => f.endsWith(".json") && f.toLowerCase().includes(needle) && path.join(outDir, f) !== outPath)
            .sort()
            .reverse();

          if (matching.length > 0) {
            const prevArtifact = await readArtifact(path.join(outDir, matching[0]!));
            if (prevArtifact.artifactType === "run") {
              const diff = diffArtifacts(prevArtifact, artifact);
              if (diff.summary.regressions > 0 || diff.summary.recoveries > 0 || diff.summary.added > 0 || diff.summary.removed > 0) {
                diffText = `\n\nChanges since last run:\n${renderMarkdown(diff)}`;
              } else {
                diffText = "\n\nNo changes since last run.";
              }
            }
          }
        } catch {
          // No previous run — that's fine
        }

        logRequest("watch", startMs);
        return {
          content: [{ type: "text" as const, text: `${formatRun(artifact)}\n\nArtifact saved: ${outPath}${diffText}` }],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logRequest("watch", startMs, true);
        return { content: [{ type: "text" as const, text: `Error watching: ${msg}` }], isError: true };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
