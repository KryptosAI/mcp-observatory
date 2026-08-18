import { spawn } from "node:child_process";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { targetFromCommand } from "./commands/helpers.js";
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

export async function protectMcpConfig(filePath: string): Promise<{ wrapped: number; skipped: number }> {
  const raw = JSON.parse(await readFile(filePath, "utf8")) as { mcpServers?: Record<string, Record<string, unknown>> };
  if (!raw.mcpServers || typeof raw.mcpServers !== "object") {
    throw new Error(`${filePath} has no mcpServers object.`);
  }
  let wrapped = 0;
  let skipped = 0;
  for (const server of Object.values(raw.mcpServers)) {
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
  await copyFile(filePath, `${filePath}.observatory.bak`);
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
