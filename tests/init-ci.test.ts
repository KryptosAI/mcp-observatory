import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initCi } from "../src/commands/init-ci.js";

const tempDirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-init-ci-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("init-ci", () => {
  it("creates a GitHub Action workflow and badge snippet", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");
    const badgeFile = path.join(dir, "docs/mcp-observatory-badge.md");

    const result = await initCi({
      command: "npx -y @example/mcp-server",
      workflow,
      badge: true,
      badgeFile,
    });

    expect(result.workflowStatus).toBe("created");
    expect(result.badgeStatus).toBe("created");

    const workflowText = await readFile(workflow, "utf8");
    expect(workflowText).toContain("uses: KryptosAI/mcp-observatory/action@main");
    expect(workflowText).toContain("command: npx -y @example/mcp-server");
    expect(workflowText).toContain("deep: true");
    expect(workflowText).toContain("security: true");

    const badgeText = await readFile(badgeFile, "utf8");
    expect(badgeText).toContain("MCP Observatory");
    expect(badgeText).toContain("github.com/KryptosAI/mcp-observatory");
  });

  it("uses a target config instead of a command when requested", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");
    await initCi({ target: "./observatory-target.json", workflow });

    const workflowText = await readFile(workflow, "utf8");
    expect(workflowText).toContain("target: ./observatory-target.json");
    expect(workflowText).not.toContain("command:");
  });

  it("skips existing files unless force is set", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");
    await initCi({ command: "npx -y first-server", workflow });
    const skipped = await initCi({ command: "npx -y second-server", workflow });
    expect(skipped.workflowStatus).toBe("skipped");
    expect(await readFile(workflow, "utf8")).toContain("first-server");

    const overwritten = await initCi({ command: "npx -y second-server", workflow, force: true });
    expect(overwritten.workflowStatus).toBe("overwritten");
    expect(await readFile(workflow, "utf8")).toContain("second-server");
  });

  it("rejects command and target together", async () => {
    await expect(initCi({ command: "npx -y server", target: "./target.json" })).rejects.toThrow("Use either --command or --target");
  });
});
