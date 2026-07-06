import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = path.resolve("scripts/postinstall.mjs");

async function tempProject(pkg: Record<string, unknown>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "obs-postinstall-"));
  await writeFile(path.join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n", "utf8");
  return dir;
}

function runPostinstall(projectRoot: string, extraEnv: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "",
      GITHUB_ACTIONS: "",
      INIT_CWD: projectRoot,
      ...extraEnv,
    },
  });
}

describe("postinstall CI helper", () => {
  it("prints setup-ci guidance for likely MCP projects without writing by default", async () => {
    const dir = await tempProject({
      name: "@example/mcp-server",
      keywords: ["mcp-server"],
    });
    try {
      const result = runPostinstall(dir);

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("MCP Observatory: CI ready.");
      expect(result.stderr).toContain("setup-ci --all --command \"npx -y @example/mcp-server\"");
      await expect(readFile(path.join(dir, ".github/workflows/mcp-observatory.yml"), "utf8")).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("creates the workflow when package config opts into auto setup", async () => {
    const dir = await tempProject({
      name: "@example/mcp-server",
      mcpName: "io.example/server",
      scripts: { mcp: "node server.js" },
      mcpObservatory: {
        autoSetupCi: true,
        command: "npm run mcp",
        sarif: true,
      },
    });
    try {
      const result = runPostinstall(dir);
      const workflow = await readFile(path.join(dir, ".github/workflows/mcp-observatory.yml"), "utf8");

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("created .github/workflows/mcp-observatory.yml");
      expect(workflow).toContain('command: "npm run mcp"');
      expect(workflow).toContain("security-events: write");
      expect(workflow).toContain("upload-sarif: true");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("uses env opt-in and does not overwrite an existing workflow", async () => {
    const dir = await tempProject({
      name: "@example/mcp-server",
      dependencies: { "@modelcontextprotocol/sdk": "1.0.0" },
    });
    const workflowPath = path.join(dir, ".github/workflows/mcp-observatory.yml");
    try {
      await mkdir(path.dirname(workflowPath), { recursive: true });
      await writeFile(workflowPath, "existing\n", "utf8");

      const result = runPostinstall(dir, {
        MCP_OBSERVATORY_AUTO_SETUP_CI: "1",
        MCP_OBSERVATORY_TARGET_COMMAND: "npm run server:mcp",
      });
      const workflow = await readFile(workflowPath, "utf8");

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("already exists");
      expect(workflow).toBe("existing\n");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("skips when disabled or running in CI", async () => {
    const dir = await tempProject({
      name: "@example/mcp-server",
      keywords: ["mcp"],
      mcpObservatory: { autoSetupCi: true, command: "npm run mcp" },
    });
    try {
      const disabled = runPostinstall(dir, { MCP_OBSERVATORY_POSTINSTALL: "0" });
      const ci = runPostinstall(dir, { CI: "true" });

      expect(disabled.status).toBe(0);
      expect(disabled.stderr).toBe("");
      expect(ci.status).toBe(0);
      expect(ci.stderr).toBe("");
      await expect(readFile(path.join(dir, ".github/workflows/mcp-observatory.yml"), "utf8")).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
