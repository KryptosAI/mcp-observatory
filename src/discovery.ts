import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

import type { TargetConfig } from "./types.js";

interface DiscoveredTarget {
  source: string;
  config: TargetConfig;
}

const mcpServerEntrySchema = z.object({
  url: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.unknown()).optional(),
  env: z.record(z.string(), z.unknown()).optional(),
  authToken: z.string().optional(),
}).passthrough();

const mcpConfigSchema = z.object({
  mcpServers: z.record(z.string(), z.unknown()),
}).passthrough();

type McpConfig = z.infer<typeof mcpConfigSchema>;

function defaultConfigPaths(): string[] {
  const home = os.homedir();
  const paths: string[] = [];

  // Claude Code user config
  paths.push(path.join(home, ".claude.json"));

  // Claude Desktop (macOS)
  if (process.platform === "darwin") {
    paths.push(path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"));
  }

  // Claude Desktop (Windows)
  if (process.platform === "win32") {
    const appData = process.env["APPDATA"];
    if (appData) {
      paths.push(path.join(appData, "Claude", "claude_desktop_config.json"));
    }
  }

  // Walk up from cwd to find .mcp.json and .claude.json in parent directories
  // (capped at 10 levels to avoid scanning the entire filesystem)
  let dir = process.cwd();
  const root = path.parse(dir).root;
  let depth = 0;
  while (dir !== root && depth < 10) {
    paths.push(path.join(dir, ".claude.json"));
    paths.push(path.join(dir, ".mcp.json"));
    // Also check for Claude Code project-level config
    paths.push(path.join(dir, ".claude", "settings.local.json"));
    dir = path.dirname(dir);
    depth++;
  }

  return paths;
}

async function tryReadJson(filePath: string): Promise<McpConfig | undefined> {
  try {
    const content = await readFile(filePath, "utf8");
    return mcpConfigSchema.parse(JSON.parse(content));
  } catch {
    return undefined;
  }
}

function extractTargets(data: McpConfig, source: string): DiscoveredTarget[] {
  const results: DiscoveredTarget[] = [];

  for (const [name, entry] of Object.entries(data.mcpServers)) {
    const parsed = mcpServerEntrySchema.safeParse(entry);
    if (!parsed.success) continue;
    const serverEntry = parsed.data;

    // HTTP/SSE server (has url field)
    if (serverEntry.url) {
      results.push({
        source,
        config: {
          targetId: name,
          adapter: "http",
          url: serverEntry.url,
          authToken: serverEntry.authToken,
          timeoutMs: 15_000,
        }
      });
      continue;
    }

    // Local process server (has command field)
    if (!serverEntry.command) {
      continue;
    }

    const parsedArgs: string[] = [];
    if (serverEntry.args) {
      for (const arg of serverEntry.args) {
        if (typeof arg === "string") {
          parsedArgs.push(arg);
        }
      }
    }

    const envPairs: Array<[string, string]> = [];
    if (serverEntry.env) {
      for (const [key, value] of Object.entries(serverEntry.env)) {
        if (typeof value === "string") {
          envPairs.push([key, value]);
        }
      }
    }
    const env: Record<string, string> | undefined =
      envPairs.length > 0 ? Object.fromEntries(envPairs) : undefined;

    results.push({
      source,
      config: {
        targetId: name,
        adapter: "local-process",
        command: serverEntry.command,
        args: parsedArgs,
        env,
        timeoutMs: 15_000,
      }
    });
  }

  return results;
}

export async function scanForTargets(configPath?: string): Promise<DiscoveredTarget[]> {
  const paths = configPath ? [configPath] : defaultConfigPaths();
  const allTargets: DiscoveredTarget[] = [];
  const seen = new Set<string>();

  for (const p of paths) {
    const data = await tryReadJson(p);
    if (data === undefined) continue;

    const targets = extractTargets(data, p);
    for (const target of targets) {
      const key = target.config.adapter === "http"
        ? target.config.url
        : `${target.config.command} ${target.config.args.join(" ")}`;
      if (!seen.has(key)) {
        seen.add(key);
        allTargets.push(target);
      }
    }
  }

  return allTargets;
}
