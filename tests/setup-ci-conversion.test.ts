import { mkdtemp, readFile, rm } from "node:fs/promises";
import { Readable, Writable } from "node:stream";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { maybeConvertPassingCheckToCi } from "../src/commands/setup-ci-conversion.js";
import type { RunArtifact } from "../src/types.js";

const tempDirs: string[] = [];
let originalCwd = process.cwd();

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-setup-ci-conversion-"));
  tempDirs.push(dir);
  return dir;
}

function outputSink(): { output: Writable; text: () => string } {
  const chunks: string[] = [];
  return {
    output: new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    }),
    text: () => chunks.join(""),
  };
}

function passingArtifact(overrides: Partial<RunArtifact> = {}): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate: "pass",
    runId: "run_test",
    createdAt: "2026-07-01T00:00:00.000Z",
    toolVersion: "0.26.1",
    target: {
      targetId: "example-server",
      adapter: "local-process",
      command: "npx",
      args: ["-y", "example-mcp"],
    },
    environment: {
      platform: "test",
      nodeVersion: "v26.0.0",
    },
    summary: {
      total: 1,
      pass: 1,
      fail: 0,
      partial: 0,
      unsupported: 0,
      flaky: 0,
      skipped: 0,
      gate: "pass",
    },
    checks: [],
    ...overrides,
  };
}

afterEach(async () => {
  process.chdir(originalCwd);
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  originalCwd = process.cwd();
});

describe("post-check setup-ci conversion", () => {
  it("prompts in interactive mode and defaults Enter to Yes", async () => {
    const dir = await tempDir();
    process.chdir(dir);
    const sink = outputSink();

    const result = await maybeConvertPassingCheckToCi({
      artifact: passingArtifact(),
      input: Readable.from(["\n"]),
      output: sink.output,
      isInteractive: true,
    });

    expect(result.status).toBe("written");
    const workflow = await readFile(path.join(dir, ".github/workflows/mcp-observatory.yml"), "utf8");
    expect(workflow).toContain("target: mcp-observatory.target.json");
    expect(workflow).toContain("schedule:");
    expect(workflow).toContain('cron: "0 9 * * 1"');
    expect(workflow).toContain("security-events: write");
    expect(workflow).toContain("upload-sarif: true");
    expect(await readFile(path.join(dir, "mcp-observatory.target.json"), "utf8")).toContain("example-mcp");
    expect(sink.text()).toContain("Convert this passing MCP check into CI + Code Scanning? [Y/n]");
    expect(sink.text()).toContain("Code Scanning: SARIF upload is enabled");
    expect(sink.text()).toContain("Automation: weekly scheduled checks are enabled");
    expect(sink.text()).toContain("Verify: npx @kryptosai/mcp-observatory setup-ci --doctor");
  });

  it("lets interactive users answer n without writing files", async () => {
    const dir = await tempDir();
    process.chdir(dir);
    const sink = outputSink();

    const result = await maybeConvertPassingCheckToCi({
      artifact: passingArtifact(),
      input: Readable.from(["n\n"]),
      output: sink.output,
      isInteractive: true,
    });

    expect(result.status).toBe("skipped");
    await expect(readFile(path.join(dir, ".github/workflows/mcp-observatory.yml"), "utf8")).rejects.toThrow();
    expect(sink.text()).toContain("Skipped. Convert later with:");
  });

  it("does not write in non-interactive mode unless --setup-ci --yes is present", async () => {
    const dir = await tempDir();
    process.chdir(dir);
    const sink = outputSink();

    const result = await maybeConvertPassingCheckToCi({
      artifact: passingArtifact(),
      output: sink.output,
      isInteractive: false,
    });

    expect(result.status).toBe("hinted");
    await expect(readFile(path.join(dir, ".github/workflows/mcp-observatory.yml"), "utf8")).rejects.toThrow();
    expect(sink.text()).toContain("CI conversion available:");
    expect(sink.text()).toContain("setup-ci --all --command");
    expect(sink.text()).toContain("--sarif");
    expect(sink.text()).toContain("--schedule weekly");
  });

  it("writes automatically with --setup-ci --yes", async () => {
    const dir = await tempDir();
    process.chdir(dir);
    const sink = outputSink();

    const result = await maybeConvertPassingCheckToCi({
      artifact: passingArtifact(),
      output: sink.output,
      isInteractive: false,
      setupCi: true,
      yes: true,
    });

    expect(result.status).toBe("written");
    const workflow = await readFile(path.join(dir, ".github/workflows/mcp-observatory.yml"), "utf8");
    expect(workflow).toContain("MCP Observatory");
    expect(workflow).toContain("upload-sarif: true");
    expect(workflow).toContain("schedule:");
  });

  it("can opt out of SARIF upload for automatic CI conversion", async () => {
    const dir = await tempDir();
    process.chdir(dir);
    const sink = outputSink();

    const result = await maybeConvertPassingCheckToCi({
      artifact: passingArtifact(),
      output: sink.output,
      isInteractive: false,
      setupCi: true,
      yes: true,
      ciSarif: false,
    });

    expect(result.status).toBe("written");
    const workflow = await readFile(path.join(dir, ".github/workflows/mcp-observatory.yml"), "utf8");
    expect(workflow).not.toContain("security-events: write");
    expect(workflow).not.toContain("upload-sarif: true");
    expect(workflow).toContain("schedule:");
    expect(sink.text()).toContain("Code Scanning: SARIF upload is not enabled");
  });

  it("never writes for failed or fatal artifacts", async () => {
    const dir = await tempDir();
    process.chdir(dir);

    const result = await maybeConvertPassingCheckToCi({
      artifact: passingArtifact({ gate: "fail" }),
      isInteractive: true,
      setupCi: true,
      yes: true,
    });

    expect(result.status).toBe("not-eligible");
    await expect(readFile(path.join(dir, ".github/workflows/mcp-observatory.yml"), "utf8")).rejects.toThrow();
  });

  it("skips existing generated files unless force is set", async () => {
    const dir = await tempDir();
    process.chdir(dir);

    await maybeConvertPassingCheckToCi({
      artifact: passingArtifact(),
      isInteractive: false,
      setupCi: true,
      yes: true,
    });
    const skipped = await maybeConvertPassingCheckToCi({
      artifact: passingArtifact({
        target: {
          targetId: "second-server",
          adapter: "local-process",
          command: "npx",
          args: ["-y", "second-mcp"],
        },
      }),
      isInteractive: false,
      setupCi: true,
      yes: true,
    });

    expect(skipped.initResult?.workflowStatus).toBe("skipped");
    expect(await readFile(path.join(dir, "mcp-observatory.target.json"), "utf8")).toContain("example-mcp");

    const overwritten = await maybeConvertPassingCheckToCi({
      artifact: passingArtifact({
        target: {
          targetId: "second-server",
          adapter: "local-process",
          command: "npx",
          args: ["-y", "second-mcp"],
        },
      }),
      isInteractive: false,
      setupCi: true,
      yes: true,
      force: true,
    });

    expect(overwritten.initResult?.workflowStatus).toBe("overwritten");
    expect(await readFile(path.join(dir, "mcp-observatory.target.json"), "utf8")).toContain("second-mcp");
  });
});
