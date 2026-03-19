import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { TargetConfig } from "./types.js";

interface DiscoveredTarget {
  source: string;
  config: TargetConfig;
}

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

  // Current directory configs
  paths.push(path.join(process.cwd(), ".claude.json"));
  paths.push(path.join(process.cwd(), ".mcp.json"));

  return paths;
}

async function tryReadJson(filePath: string): Promise<unknown> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as unknown;
  } catch {
    return undefined;
  }
}

function extractTargets(data: unknown, source: string): DiscoveredTarget[] {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return [];
  }

  const obj = data as Record<string, unknown>;
  const servers = obj["mcpServers"];
  if (typeof servers !== "object" || servers === null || Array.isArray(servers)) {
    return [];
  }

  const results: DiscoveredTarget[] = [];
  for (const [name, entry] of Object.entries(servers as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }
    const serverEntry = entry as Record<string, unknown>;
    const command = serverEntry["command"];
    const args = serverEntry["args"];

    if (typeof command !== "string" || command.length === 0) {
      continue;
    }

    const parsedArgs: string[] = [];
    if (Array.isArray(args)) {
      for (const arg of args) {
        if (typeof arg === "string") {
          parsedArgs.push(arg);
        }
      }
    }

    const env: Record<string, string> | undefined =
      typeof serverEntry["env"] === "object" && serverEntry["env"] !== null && !Array.isArray(serverEntry["env"])
        ? serverEntry["env"] as Record<string, string>
        : undefined;

    results.push({
      source,
      config: {
        targetId: name,
        adapter: "local-process",
        command,
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
      const key = `${target.config.command} ${target.config.args.join(" ")}`;
      if (!seen.has(key)) {
        seen.add(key);
        allTargets.push(target);
      }
    }
  }

  return allTargets;
}
