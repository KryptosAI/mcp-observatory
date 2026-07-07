import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ANSI,
  c,
  colorStatus,
  formatOutput,
  getBinName,
  quoteShell,
  setupCiHint,
  targetFromCommand,
  useColor,
  writeOutput,
} from "../src/commands/helpers.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

const originalArgv = [...process.argv];
const originalEnv = { ...process.env };

afterEach(() => {
  process.argv = [...originalArgv];
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

function captureStdout(): { output: () => string } {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  });
  return { output: () => chunks.join("") };
}

describe("command helper target handling", () => {
  it("builds a local-process target from a command", () => {
    expect(targetFromCommand(["python", "server.py"])).toEqual({
      targetId: "python",
      adapter: "local-process",
      command: "python",
      args: ["server.py"],
      timeoutMs: 15_000,
    });
  });

  it("uses the wrapped package name as the target id for launcher commands", () => {
    expect(targetFromCommand(["node", "server.js"]).targetId).toBe("server.js");
    expect(targetFromCommand(["npx", "-y", "@scope/server", "--port", "3000"]).targetId).toBe("@scope/server");
    expect(targetFromCommand(["bunx", "run", "example-mcp"]).targetId).toBe("example-mcp");
  });

  it("throws when no command is provided", () => {
    expect(() => targetFromCommand([])).toThrow("No command provided");
  });
});

describe("command helper formatting", () => {
  it("controls ANSI color output using env and argv", () => {
    delete process.env["NO_COLOR"];
    process.argv = ["node", "cli.js"];
    expect(useColor()).toBe(true);
    expect(c(ANSI.green, "pass")).toContain(ANSI.green);

    process.env["NO_COLOR"] = "1";
    expect(useColor()).toBe(false);
    expect(c(ANSI.green, "pass")).toBe("pass");

    delete process.env["NO_COLOR"];
    process.argv = ["node", "cli.js", "--no-color"];
    expect(useColor()).toBe(false);
  });

  it("colors known statuses and leaves unknown statuses unchanged", () => {
    process.env["NO_COLOR"] = "1";
    expect(colorStatus("pass")).toBe("pass");
    expect(colorStatus("fail")).toBe("fail");
    expect(colorStatus("partial")).toBe("partial");
    expect(colorStatus("flaky")).toBe("flaky");
    expect(colorStatus("unsupported")).toBe("unsupported");
    expect(colorStatus("skipped")).toBe("skipped");
    expect(colorStatus("other")).toBe("other");
  });

  it("quotes shell values only when needed", () => {
    expect(quoteShell("simple/path:@scope=value")).toBe("simple/path:@scope=value");
    expect(quoteShell("needs space")).toBe("\"needs space\"");
    expect(quoteShell("quote\"me")).toBe("\"quote\\\"me\"");
  });

  it("builds setup-ci hints from target paths, local commands, and defaults", () => {
    expect(setupCiHint(undefined, "configs/prod target.json", "obs")).toBe("obs setup-ci --all --target \"configs/prod target.json\"");
    expect(setupCiHint({ targetId: "test", adapter: "local-process", command: "npm", args: ["run", "mcp"] }, undefined, "obs")).toBe("obs setup-ci --all --command \"npm run mcp\"");
    expect(setupCiHint(undefined, undefined, "obs")).toBe("obs setup-ci --all --target mcp-observatory.target.json");
  });

  it("detects npx invocation for copy-pasteable commands", () => {
    process.argv = ["node", "/Users/test/.npm/_npx/123/bin/mcp-observatory"];
    expect(getBinName()).toBe("npx @kryptosai/mcp-observatory");

    process.argv = ["node", "/repo/dist/cli.js"];
    expect(getBinName()).toBe("mcp-observatory");
  });
});

describe("command helper output", () => {
  it("formats JSON output deterministically", () => {
    const artifact = makeArtifact();

    expect(formatOutput(artifact, "json")).toContain("\"artifactType\": \"run\"");
    expect(formatOutput(artifact, "terminal")).toContain("MCP Observatory Run");
  });

  it("warns before falling back to terminal output for unknown formats", () => {
    const artifact = makeArtifact();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    expect(formatOutput(artifact, "unsupported")).toContain("MCP Observatory Run");
    expect(stderr).toHaveBeenCalledWith(
      "Warning: unknown format 'unsupported'. Supported: html, json, junit, markdown, pr-comment, sarif, terminal. Falling back to terminal.\n",
    );
  });

  it("writes formatted output to stdout or a file", async () => {
    const stdout = captureStdout();

    await writeOutput("hello", "text");
    expect(stdout.output()).toBe("hello\n");

    vi.restoreAllMocks();
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-helpers-"));
    const outPath = path.join(tmpDir, "nested", "report.txt");
    const fileStdout = captureStdout();
    try {
      await writeOutput("file body", "text", outPath);
      await expect(readFile(outPath, "utf8")).resolves.toBe("file body\n");
      expect(fileStdout.output()).toContain(`Wrote text report to ${outPath}`);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
