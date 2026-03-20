import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve("src/cli.ts");
const TSX = path.resolve("node_modules/.bin/tsx");

function runCli(args: string[], opts?: { cwd?: string; timeout?: number }): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync(TSX, [CLI, ...args], {
      encoding: "utf8",
      timeout: opts?.timeout ?? 15_000,
      cwd: opts?.cwd ?? process.cwd(),
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? "", exitCode: e.status ?? 1 };
  }
}

describe("CLI entrypoint", () => {
  it("prints version with --version", () => {
    const { stdout, exitCode } = runCli(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("prints help with --help", () => {
    const { stdout, exitCode } = runCli(["--help"]);
    expect(exitCode).toBe(0);
    // Help shows ASCII art logo + command list
    expect(stdout).toContain("scan");
    expect(stdout).toContain("test");
    expect(stdout).toContain("MCP");
  });

  it("scan subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["scan", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("scan");
  });

  it("test subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["test", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("test");
  });

  it("diff subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["diff", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("diff");
  });

  it("run subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["run", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("run");
  });

  it("serve subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["serve", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("serve");
  });

  it("record subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["record", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("record");
  });

  it("replay subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["replay", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("replay");
  });

  it("verify subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["verify", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("verify");
  });

  it("suggest subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["suggest", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("suggest");
  });

  it("watch subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["watch", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("watch");
  });

  it("report subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["report", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("report");
  });

  it("diff runs two sample artifacts", () => {
    const { stdout, exitCode } = runCli([
      "diff",
      "tests/fixtures/sample-run-a.json",
      "tests/fixtures/sample-run-b.json",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
  });

  it("run executes against fixture server", () => {
    const { stdout, exitCode } = runCli([
      "run",
      "--target",
      "tests/fixtures/sample-target-config.json",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("fixture-server");
  });

  it("diff --format json outputs valid JSON", () => {
    const { stdout, exitCode } = runCli([
      "diff",
      "tests/fixtures/sample-run-a.json",
      "tests/fixtures/sample-run-b.json",
      "--format",
      "json",
    ]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    expect(parsed).toHaveProperty("artifactType", "diff");
  });

  it("diff --format markdown outputs markdown", () => {
    const { stdout, exitCode } = runCli([
      "diff",
      "tests/fixtures/sample-run-a.json",
      "tests/fixtures/sample-run-b.json",
      "--format",
      "markdown",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("#");
  });

  it("exits non-zero for unknown command", () => {
    const { exitCode } = runCli(["nonexistent-command"]);
    expect(exitCode).not.toBe(0);
  });
});
