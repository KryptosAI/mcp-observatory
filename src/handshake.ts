import { spawn } from "node:child_process";
import { access, copyFile, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { targetFromCommand } from "./commands/helpers.js";
import { defaultConfigPaths } from "./discovery.js";
import { defaultRunsDirectory, findLatestArtifact, readArtifact } from "./storage.js";
import { slugify } from "./utils/ids.js";

const WRAP_MARK = "mcp-observatory";
const WRAP_SUB = "wrap";

export function handshakeTargetId(command: string[]): string {
  return slugify(targetFromCommand(command).targetId);
}

export async function assertPassingReceipt(targetId: string, runsDir = defaultRunsDirectory()): Promise<string> {
  const latest = await findLatestArtifact(runsDir, targetId);
  if (!latest) {
    throw new Error(
      `MCP Observatory blocked connect: no receipt for ${targetId}. Run: npx -y @kryptosai/mcp-observatory@latest test ${targetId}`,
    );
  }
  const artifact = await readArtifact(latest);
  if (artifact.artifactType !== "run" || artifact.gate !== "pass" || artifact.fatalError) {
    throw new Error(
      `MCP Observatory blocked connect: last receipt for ${targetId} is not Ready. Inspect ${latest}`,
    );
  }
  return latest;
}

export function wrapServerEntry(command: string, args: string[] = []): { command: string; args: string[] } {
  if (command === "npx" && args.includes(WRAP_SUB) && args.some((arg) => arg.includes(WRAP_MARK))) {
    return { command, args };
  }
  return {
    command: "npx",
    args: ["-y", "@kryptosai/mcp-observatory@latest", "wrap", "--", command, ...args],
  };
}

function serverMap(raw: Record<string, unknown>): Record<string, Record<string, unknown>> | null {
  for (const key of ["mcpServers", "servers"]) {
    const value = raw[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, Record<string, unknown>>;
    }
  }
  return null;
}

export async function protectMcpConfig(filePath: string): Promise<{ wrapped: number; skipped: number }> {
  const raw = JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
  const servers = serverMap(raw);
  if (!servers) {
    throw new Error(`${filePath} has no mcpServers or servers object.`);
  }
  let wrapped = 0;
  let skipped = 0;
  for (const server of Object.values(servers)) {
    if (typeof server.command !== "string") {
      skipped += 1;
      continue;
    }
    const currentArgs = Array.isArray(server.args) ? server.args.map(String) : [];
    if (currentArgs.includes(WRAP_SUB) && currentArgs.some((arg) => arg.includes(WRAP_MARK))) {
      skipped += 1;
      continue;
    }
    const next = wrapServerEntry(server.command, currentArgs);
    server.command = next.command;
    server.args = next.args;
    wrapped += 1;
  }
  const backup = `${filePath}.observatory.bak`;
  try {
    await access(backup);
  } catch {
    await copyFile(filePath, backup);
  }
  await writeFile(filePath, `${JSON.stringify(raw, null, 2)}\n`);
  return { wrapped, skipped };
}

export async function execWrappedServer(command: string[]): Promise<number> {
  const child = spawn(command[0]!, command.slice(1), { stdio: "inherit" });
  return await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

export function defaultProtectPath(cwd = process.cwd()): string {
  return path.join(cwd, ".mcp.json");
}

export async function findProtectableConfigs(cwd = process.cwd()): Promise<string[]> {
  const candidates = [...new Set([defaultProtectPath(cwd), ...defaultConfigPaths()])];
  const found: string[] = [];
  for (const filePath of candidates) {
    try {
      await access(filePath);
      found.push(filePath);
    } catch {
      // missing
    }
  }
  return found;
}

export async function unprotectMcpConfig(filePath: string): Promise<boolean> {
  const backup = `${filePath}.observatory.bak`;
  try {
    await access(backup);
  } catch {
    return false;
  }
  await rename(backup, filePath);
  return true;
}
