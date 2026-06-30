import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { doctorSetupCi, initCi } from "../src/commands/init-ci.js";

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
    expect(workflowText).toContain("uses: KryptosAI/mcp-observatory/action@v0.25.1");
    expect(workflowText).not.toContain("pull-requests: write");
    expect(workflowText).not.toContain("statuses: write");
    expect(workflowText).toContain("command: npx -y @example/mcp-server");
    expect(workflowText).toContain("deep: true");
    expect(workflowText).toContain("security: true");
    expect(workflowText).toContain("comment-on-pr: false");
    expect(workflowText).toContain("set-status: false");

    const badgeText = await readFile(badgeFile, "utf8");
    expect(badgeText).toContain("MCP Observatory");
    expect(badgeText).toContain("github.com/KryptosAI/mcp-observatory");
  });

  it("can opt into PR comments and commit statuses", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");

    await initCi({
      command: "npx -y @example/mcp-server",
      workflow,
      commentOnPr: true,
      setStatus: true,
    });

    const workflowText = await readFile(workflow, "utf8");
    expect(workflowText).toContain("pull-requests: write");
    expect(workflowText).toContain("statuses: write");
    expect(workflowText).toContain("comment-on-pr: true");
    expect(workflowText).toContain("set-status: true");
  });

  it("can pin the generated workflow to a specific action ref", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");

    await initCi({
      command: "npx -y @example/mcp-server",
      workflow,
      actionRef: "b73627146ff9f9d19b9f9c1d3d88696a67fd4a66",
    });

    const workflowText = await readFile(workflow, "utf8");
    expect(workflowText).toContain("uses: KryptosAI/mcp-observatory/action@b73627146ff9f9d19b9f9c1d3d88696a67fd4a66");
  });

  it("uses a target config instead of a command when requested", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");
    await initCi({ target: "./observatory-target.json", workflow });

    const workflowText = await readFile(workflow, "utf8");
    expect(workflowText).toContain("target: ./observatory-target.json");
    expect(workflowText).not.toContain("command:");
  });

  it("creates the full adoption kit with --all", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");
    const badgeFile = path.join(dir, "docs/mcp-observatory-badge.md");
    const targetConfig = path.join(dir, "mcp-observatory.target.json");
    const prBody = path.join(dir, "docs/mcp-observatory-pr-body.md");
    const issueBody = path.join(dir, "docs/mcp-observatory-issue.md");
    const scoreBadge = path.join(dir, "docs/mcp-observatory-score-badge.md");

    const result = await initCi({
      command: "npx -y @example/mcp-server",
      workflow,
      badgeFile,
      targetConfig,
      prBody,
      issueBody,
      scoreBadge,
      all: true,
    });

    expect(result.workflowStatus).toBe("created");
    expect(result.badgeStatus).toBe("created");
    expect(result.targetConfigStatus).toBe("created");
    expect(result.prBodyStatus).toBe("created");
    expect(result.issueBodyStatus).toBe("created");
    expect(result.scoreBadgeStatus).toBe("created");

    expect(await readFile(workflow, "utf8")).toContain(`target: ${targetConfig}`);
    expect(await readFile(badgeFile, "utf8")).toContain("MCP Observatory");
    const targetJson = JSON.parse(await readFile(targetConfig, "utf8")) as { command: string; args: string[] };
    expect(targetJson.command).toBe("npx");
    expect(targetJson.args).toEqual(["-y", "@example/mcp-server"]);
    expect(await readFile(prBody, "utf8")).toContain("Add MCP Observatory CI");
    expect(await readFile(prBody, "utf8")).toContain("read-only by default");
    expect(await readFile(prBody, "utf8")).toContain("full commit SHA");
    expect(await readFile(prBody, "utf8")).toContain("local build/start command");
    expect(await readFile(issueBody, "utf8")).toContain("compatibility/security checks");
    expect(await readFile(issueBody, "utf8")).toContain("validates the pull request code");
    expect(await readFile(scoreBadge, "utf8")).toContain("mcp-observatory badge");
  });

  it("reports a ready setup-ci adoption kit", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");
    const badgeFile = path.join(dir, "docs/mcp-observatory-badge.md");
    const targetConfig = path.join(dir, "mcp-observatory.target.json");
    const prBody = path.join(dir, "docs/mcp-observatory-pr-body.md");
    const issueBody = path.join(dir, "docs/mcp-observatory-issue.md");
    const scoreBadge = path.join(dir, "docs/mcp-observatory-score-badge.md");

    await initCi({
      command: "npx -y @example/mcp-server",
      workflow,
      badgeFile,
      targetConfig,
      prBody,
      issueBody,
      scoreBadge,
      all: true,
    });

    const result = await doctorSetupCi({
      workflow,
      badgeFile,
      targetConfig,
      prBody,
      issueBody,
      scoreBadge,
    });

    expect(result.ready).toBe(true);
    expect(result.checks.find((check) => check.id === "workflow")).toMatchObject({ status: "pass" });
    expect(result.checks.find((check) => check.id === "action-ref")).toMatchObject({ status: "pass" });
    expect(result.checks.find((check) => check.id === "permissions")).toMatchObject({ status: "pass" });
  });

  it("reports missing setup-ci workflow as the blocking doctor failure", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");
    const result = await doctorSetupCi({ command: "npx -y @example/mcp-server", workflow });

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "workflow")).toMatchObject({
      status: "fail",
      fix: "npx @kryptosai/mcp-observatory setup-ci --all --command \"npx -y @example/mcp-server\"",
    });
  });

  it("preserves quoted command arguments in generated target config", async () => {
    const dir = await tempDir();
    const workflow = path.join(dir, ".github/workflows/mcp-observatory.yml");
    const badgeFile = path.join(dir, "docs/mcp-observatory-badge.md");
    const targetConfig = path.join(dir, "mcp-observatory.target.json");
    const prBody = path.join(dir, "docs/mcp-observatory-pr-body.md");
    const issueBody = path.join(dir, "docs/mcp-observatory-issue.md");
    const scoreBadge = path.join(dir, "docs/mcp-observatory-score-badge.md");

    await initCi({
      command: "node server.js --name \"Acme MCP\" --flag 'two words'",
      workflow,
      badgeFile,
      targetConfig,
      prBody,
      issueBody,
      scoreBadge,
      all: true,
    });

    const targetJson = JSON.parse(await readFile(targetConfig, "utf8")) as { command: string; args: string[] };
    expect(targetJson.command).toBe("node");
    expect(targetJson.args).toEqual(["server.js", "--name", "Acme MCP", "--flag", "two words"]);
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

  it("rejects target config generation when an existing target is supplied", async () => {
    await expect(initCi({ target: "./target.json", targetConfig: true })).rejects.toThrow("Use either --target or --target-config");
  });
});
