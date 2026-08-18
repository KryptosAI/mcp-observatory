import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { inferLocalMcpTarget, isLikelyMcpPackage } from "../src/infer-local-mcp.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function pkgDir(pkg: Record<string, unknown>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "obs-infer-"));
  dirs.push(dir);
  await writeFile(path.join(dir, "package.json"), `${JSON.stringify(pkg)}\n`);
  return dir;
}

describe("inferLocalMcpTarget", () => {
  it("returns null for this scanner package so demo does not recurse", () => {
    expect(inferLocalMcpTarget(process.cwd())).toBeNull();
  });

  it("tests a local MCP package by name", async () => {
    const dir = await pkgDir({
      name: "@acme/mcp-server",
      keywords: ["mcp-server"],
    });
    expect(inferLocalMcpTarget(dir)).toMatchObject({
      targetId: "@acme/mcp-server",
      command: "npx",
      args: ["-y", "@acme/mcp-server"],
    });
  });

  it("prefers an mcp npm script", async () => {
    const dir = await pkgDir({
      name: "acme-mcp",
      mcpName: "io.acme/server",
      scripts: { mcp: "node server.js" },
    });
    expect(inferLocalMcpTarget(dir)).toMatchObject({
      command: "npm",
      args: ["run", "mcp"],
    });
  });

  it("ignores non-MCP apps", async () => {
    const dir = await pkgDir({ name: "website", dependencies: { react: "1" } });
    expect(isLikelyMcpPackage({ name: "website", dependencies: { react: "1" } })).toBe(false);
    expect(inferLocalMcpTarget(dir)).toBeNull();
  });
});
