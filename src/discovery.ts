import { access, readFile } from "node:fs/promises";
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

// ── Per-agent config path functions ─────────────────────────────────────────

function claudeCodeConfigPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".claude.json")];
}

function claudeDesktopConfigPaths(): string[] {
  const home = os.homedir();
  const paths: string[] = [];
  if (process.platform === "darwin") {
    paths.push(path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"));
  }
  if (process.platform === "win32") {
    const appData = process.env["APPDATA"];
    if (appData) {
      paths.push(path.join(appData, "Claude", "claude_desktop_config.json"));
    }
  }
  return paths;
}

function cursorConfigPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".cursor", "mcp.json")];
}

function windsurfConfigPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".windsurf", "mcp.json")];
}

function vscodeConfigPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".vscode", "mcp.json")];
}

function opencodeConfigPaths(): string[] {
  const home = os.homedir();
  return [
    path.join(home, ".config", "opencode", "opencode.json"),
    path.join(home, ".opencode", "opencode.json"),
  ];
}

function codexConfigPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".codex", "config.json")];
}

function geminiCliConfigPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".gemini", "mcp.json")];
}

function kiroConfigPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".kiro", "mcp.json")];
}

function antigravityConfigPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".antigravity", "mcp.json")];
}

function amazonQConfigPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".amazonq", "mcp.json")];
}

// ── Per-agent skill path functions ──────────────────────────────────────────

function cursorSkillPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, ".cursor", "skills")];
}

function opencodeSkillPaths(): string[] {
  const home = os.homedir();
  return [
    path.join(home, ".config", "opencode", "skills"),
    path.join(home, ".opencode", "skills"),
  ];
}

function codexSkillPaths(): string[] {
  const home = os.homedir();
  return [
    path.join(home, ".agents", "skills"),
    path.join(home, ".codex", "skills"),
  ];
}

function ampSkillPaths(): string[] {
  const home = os.homedir();
  return [
    path.join(home, ".config", "agents", "skills"),
    path.join(home, ".amp", "skills"),
  ];
}

function openclawSkillPaths(): string[] {
  const home = os.homedir();
  return [
    path.join(home, ".openclaw", "skills"),
    path.join(home, ".openclaw", "workspace", "skills"),
    path.join(home, ".clawdbot", "skills"),
  ];
}

// ── Project-level config paths ──────────────────────────────────────────────

function projectConfigPaths(): string[] {
  const paths: string[] = [];
  let dir = process.cwd();
  const root = path.parse(dir).root;
  let depth = 0;
  while (dir !== root && depth < 10) {
    paths.push(path.join(dir, ".claude.json"));
    paths.push(path.join(dir, ".mcp.json"));
    paths.push(path.join(dir, ".claude", "settings.local.json"));
    paths.push(path.join(dir, ".cursor", "mcp.json"));
    paths.push(path.join(dir, ".windsurf", "mcp.json"));
    paths.push(path.join(dir, ".vscode", "mcp.json"));
    paths.push(path.join(dir, ".opencode", "opencode.json"));
    paths.push(path.join(dir, ".gemini", "mcp.json"));
    paths.push(path.join(dir, ".kiro", "mcp.json"));
    paths.push(path.join(dir, ".antigravity", "mcp.json"));
    paths.push(path.join(dir, ".amazonq", "mcp.json"));
    dir = path.dirname(dir);
    depth++;
  }
  return paths;
}

function projectSkillPaths(): string[] {
  const paths: string[] = [];
  let dir = process.cwd();
  const root = path.parse(dir).root;
  let depth = 0;
  while (dir !== root && depth < 10) {
    paths.push(path.join(dir, ".cursor", "skills"));
    paths.push(path.join(dir, ".opencode", "skills"));
    paths.push(path.join(dir, ".agents", "skills"));
    paths.push(path.join(dir, ".codex", "skills"));
    dir = path.dirname(dir);
    depth++;
  }
  return paths;
}

// ── Aggregate path functions ────────────────────────────────────────────────

function defaultConfigPaths(): string[] {
  return [
    ...claudeCodeConfigPaths(),
    ...claudeDesktopConfigPaths(),
    ...cursorConfigPaths(),
    ...windsurfConfigPaths(),
    ...vscodeConfigPaths(),
    ...opencodeConfigPaths(),
    ...codexConfigPaths(),
    ...geminiCliConfigPaths(),
    ...kiroConfigPaths(),
    ...antigravityConfigPaths(),
    ...amazonQConfigPaths(),
    ...projectConfigPaths(),
  ];
}

function defaultSkillPaths(): string[] {
  return [
    ...cursorSkillPaths(),
    ...opencodeSkillPaths(),
    ...codexSkillPaths(),
    ...ampSkillPaths(),
    ...openclawSkillPaths(),
    ...projectSkillPaths(),
  ];
}

// ── Core scanning logic ─────────────────────────────────────────────────────

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

// ── Public API ──────────────────────────────────────────────────────────────

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

export async function discoverSkillPaths(explicitPath?: string): Promise<string[]> {
  if (explicitPath) {
    try {
      await access(explicitPath);
      return [explicitPath];
    } catch {
      return [];
    }
  }

  const paths = defaultSkillPaths();
  const results: string[] = [];
  const seen = new Set<string>();

  for (const p of paths) {
    if (seen.has(p)) continue;
    seen.add(p);
    try {
      await access(p);
      results.push(p);
    } catch {
      // Path doesn't exist, skip
    }
  }

  return results;
}

// ── Per-agent discovery exports ─────────────────────────────────────────────

export async function discoverFromCursor(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(cursorConfigPaths());
}

export async function discoverFromWindsurf(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(windsurfConfigPaths());
}

export async function discoverFromVSCode(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(vscodeConfigPaths());
}

export async function discoverFromOpenCode(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(opencodeConfigPaths());
}

export async function discoverFromCodex(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(codexConfigPaths());
}

export async function discoverFromGeminiCli(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(geminiCliConfigPaths());
}

export async function discoverFromKiro(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(kiroConfigPaths());
}

export async function discoverFromAntigravity(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(antigravityConfigPaths());
}

export async function discoverFromAmazonQ(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(amazonQConfigPaths());
}

export async function discoverFromClaudeDesktop(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(claudeDesktopConfigPaths());
}

export async function discoverFromClaudeCode(): Promise<DiscoveredTarget[]> {
  return scanForTargetsFromPaths(claudeCodeConfigPaths());
}

async function scanForTargetsFromPaths(configPaths: string[]): Promise<DiscoveredTarget[]> {
  const allTargets: DiscoveredTarget[] = [];
  const seen = new Set<string>();

  for (const p of configPaths) {
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

export { defaultConfigPaths, defaultSkillPaths };
