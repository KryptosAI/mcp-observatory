import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RunArtifact } from "./types.js";

// ── Lock File Types ─────────────────────────────────────────────────────────

export interface LockFileToolEntry {
  name: string;
  description?: string;
  inputSchema: object;
}

export interface LockFilePromptEntry {
  name: string;
  description?: string;
  arguments?: object[];
}

export interface LockFileResourceEntry {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface LockFileServerEntry {
  targetId: string;
  lockedAt: string;
  serverName?: string;
  serverVersion?: string;
  tools: LockFileToolEntry[];
  prompts: LockFilePromptEntry[];
  resources: LockFileResourceEntry[];
}

export interface LockFile {
  version: 1;
  lockedAt: string;
  servers: LockFileServerEntry[];
}

export interface LockDriftEntry {
  targetId: string;
  category: "tools" | "prompts" | "resources";
  name: string;
  change: string;
}

export interface LockVerifyResult {
  targetId: string;
  passed: boolean;
  drift: LockDriftEntry[];
}

// ── Path helpers ────────────────────────────────────────────────────────────

export function defaultLockPath(cwd?: string): string {
  return path.join(cwd ?? process.cwd(), ".mcp-observatory", "lock.json");
}

// ── Read / Write ────────────────────────────────────────────────────────────

export async function readLockFile(lockPath?: string): Promise<LockFile> {
  const filePath = lockPath ?? defaultLockPath();
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as LockFile;
}

export async function writeLockFile(
  lockFile: LockFile,
  lockPath?: string,
): Promise<string> {
  const filePath = lockPath ?? defaultLockPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(lockFile, null, 2) + "\n", "utf8");
  return filePath;
}

// ── Build Lock Entry from RunArtifact ───────────────────────────────────────

export function buildServerLockEntry(artifact: RunArtifact): LockFileServerEntry {
  const toolsCheck = artifact.checks.find((ch) => ch.id === "tools");
  const promptsCheck = artifact.checks.find((ch) => ch.id === "prompts");
  const resourcesCheck = artifact.checks.find((ch) => ch.id === "resources");

  // Extract tools
  const tools: LockFileToolEntry[] = [];
  if (toolsCheck && toolsCheck.evidence.length > 0) {
    const ev = toolsCheck.evidence[0]!;
    const schemas = ev.schemas as Record<string, object> | undefined;
    const identifiers = ev.identifiers ?? [];

    if (schemas && Object.keys(schemas).length > 0) {
      for (const name of Object.keys(schemas)) {
        tools.push({ name, inputSchema: schemas[name]! });
      }
    } else {
      // Fall back to identifiers only
      for (const name of identifiers) {
        tools.push({ name, inputSchema: {} });
      }
    }
  }

  // Extract prompts
  const prompts: LockFilePromptEntry[] = [];
  if (promptsCheck && promptsCheck.evidence.length > 0) {
    const ev = promptsCheck.evidence[0]!;
    const identifiers = ev.identifiers ?? [];
    for (const name of identifiers) {
      prompts.push({ name });
    }
  }

  // Extract resources
  const resources: LockFileResourceEntry[] = [];
  if (resourcesCheck && resourcesCheck.evidence.length > 0) {
    const ev = resourcesCheck.evidence[0]!;
    const identifiers = ev.identifiers ?? [];
    for (const name of identifiers) {
      resources.push({ name, uri: name });
    }
  }

  return {
    targetId: artifact.target.targetId,
    lockedAt: new Date().toISOString(),
    serverName: artifact.target.serverName,
    serverVersion: artifact.target.serverVersion,
    tools,
    prompts,
    resources,
  };
}

// ── Verify against lock ─────────────────────────────────────────────────────

export function verifyAgainstLock(
  lockEntry: LockFileServerEntry,
  artifact: RunArtifact,
): LockVerifyResult {
  const current = buildServerLockEntry(artifact);
  const drift: LockDriftEntry[] = [];
  const targetId = lockEntry.targetId;

  // Compare tools
  const lockedToolNames = new Set(lockEntry.tools.map((t) => t.name));
  const currentToolNames = new Set(current.tools.map((t) => t.name));

  for (const name of currentToolNames) {
    if (!lockedToolNames.has(name)) {
      drift.push({ targetId, category: "tools", name, change: "added" });
    }
  }
  for (const name of lockedToolNames) {
    if (!currentToolNames.has(name)) {
      drift.push({ targetId, category: "tools", name, change: "removed" });
    }
  }

  // Compare tool schemas for tools present in both
  const lockedToolMap = new Map(lockEntry.tools.map((t) => [t.name, t]));
  for (const tool of current.tools) {
    const locked = lockedToolMap.get(tool.name);
    if (locked) {
      const lockedSchema = JSON.stringify(locked.inputSchema);
      const currentSchema = JSON.stringify(tool.inputSchema);
      if (lockedSchema !== currentSchema) {
        drift.push({
          targetId,
          category: "tools",
          name: tool.name,
          change: "schema changed",
        });
      }
    }
  }

  // Compare prompts
  const lockedPromptNames = new Set(lockEntry.prompts.map((p) => p.name));
  const currentPromptNames = new Set(current.prompts.map((p) => p.name));

  for (const name of currentPromptNames) {
    if (!lockedPromptNames.has(name)) {
      drift.push({ targetId, category: "prompts", name, change: "added" });
    }
  }
  for (const name of lockedPromptNames) {
    if (!currentPromptNames.has(name)) {
      drift.push({ targetId, category: "prompts", name, change: "removed" });
    }
  }

  // Compare resources
  const lockedResourceNames = new Set(lockEntry.resources.map((r) => r.name));
  const currentResourceNames = new Set(current.resources.map((r) => r.name));

  for (const name of currentResourceNames) {
    if (!lockedResourceNames.has(name)) {
      drift.push({ targetId, category: "resources", name, change: "added" });
    }
  }
  for (const name of lockedResourceNames) {
    if (!currentResourceNames.has(name)) {
      drift.push({ targetId, category: "resources", name, change: "removed" });
    }
  }

  return { targetId, passed: drift.length === 0, drift };
}

// ── Merge lock files ────────────────────────────────────────────────────────

export function mergeLockFile(
  existing: LockFile,
  newEntries: LockFileServerEntry[],
): LockFile {
  const serverMap = new Map<string, LockFileServerEntry>();

  // Start with existing entries
  for (const entry of existing.servers) {
    serverMap.set(entry.targetId, entry);
  }

  // Overwrite / add new entries
  for (const entry of newEntries) {
    serverMap.set(entry.targetId, entry);
  }

  return {
    version: 1,
    lockedAt: new Date().toISOString(),
    servers: Array.from(serverMap.values()),
  };
}
