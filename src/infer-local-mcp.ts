import { readFileSync } from "node:fs";
import path from "node:path";

import type { TargetConfig } from "./types.js";

const SELF_PACKAGE = "@kryptosai/mcp-observatory";

function readPackage(cwd: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isLikelyMcpPackage(pkg: Record<string, unknown>): boolean {
  const keywords = Array.isArray(pkg.keywords) ? pkg.keywords.map(String) : [];
  const deps = {
    ...(typeof pkg.dependencies === "object" && pkg.dependencies ? pkg.dependencies as Record<string, unknown> : {}),
    ...(typeof pkg.devDependencies === "object" && pkg.devDependencies ? pkg.devDependencies as Record<string, unknown> : {}),
    ...(typeof pkg.peerDependencies === "object" && pkg.peerDependencies ? pkg.peerDependencies as Record<string, unknown> : {}),
  };
  const scripts = pkg.scripts && typeof pkg.scripts === "object" ? Object.keys(pkg.scripts) : [];
  return Boolean(pkg.mcpName) ||
    keywords.some((keyword) => /^(mcp|mcp-server|model-context-protocol)$/i.test(keyword)) ||
    Object.prototype.hasOwnProperty.call(deps, "@modelcontextprotocol/sdk") ||
    scripts.some((name) => /(^|:)mcp($|:|-)/i.test(name));
}

export function inferLocalMcpTarget(cwd = process.cwd(), timeoutMs = 15_000): TargetConfig | null {
  const pkg = readPackage(cwd);
  if (!pkg || !isLikelyMcpPackage(pkg)) return null;
  const name = typeof pkg.name === "string" ? pkg.name.trim() : "";
  if (!name || name === SELF_PACKAGE) return null;
  const scripts = typeof pkg.scripts === "object" && pkg.scripts ? pkg.scripts as Record<string, string> : {};
  for (const script of ["mcp", "start:mcp", "server:mcp", "mcp:serve", "dev:mcp"]) {
    if (scripts[script]) {
      return {
        targetId: name,
        adapter: "local-process",
        command: "npm",
        args: ["run", script],
        timeoutMs,
      };
    }
  }
  return {
    targetId: name,
    adapter: "local-process",
    command: "npx",
    args: ["-y", name],
    timeoutMs,
  };
}
