import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
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
    expect(stdout).toContain("--setup-ci");
  });

  it("test subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["test", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("test");
    expect(stdout).toContain("--setup-ci");
    expect(stdout).toContain("--no-setup-ci");
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
    expect(stdout).toContain("--setup-ci");
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

  it("cloud subcommand prints pilot info", () => {
    const { stdout, exitCode } = runCli(["cloud"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("MCP Observatory Cloud");
    expect(stdout).toContain("Enterprise Pilot");
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

  it("test --setup-ci --yes writes adoption kit when flags trail the server command", () => {
    const tmpDir = path.join(os.tmpdir(), `obs-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const fixture = path.resolve("tests/fixtures/fixture-server.mjs");

    const { stdout, exitCode } = runCli(["test", "node", fixture, "--setup-ci", "--yes"], { cwd: tmpDir });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("created: .github/workflows/mcp-observatory.yml");
    expect(fs.existsSync(path.join(tmpDir, ".github/workflows/mcp-observatory.yml"))).toBe(true);
    expect(fs.readFileSync(path.join(tmpDir, "mcp-observatory.target.json"), "utf8")).toContain("fixture-server.mjs");
    fs.rmSync(tmpDir, { recursive: true, force: true });
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

  // ── Lock commands ───────────────────────────────────────────────
  it("lock subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["lock", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("lock");
  });

  // ── History commands ────────────────────────────────────────────
  it("history subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["history", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("history");
  });

  it("init-ci subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["init-ci", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("init-ci");
  });

  it("setup-ci subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["setup-ci", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("setup-ci");
    expect(stdout).toContain("--doctor");
    expect(stdout).toContain("--from-last-run");
  });

  it("setup-ci --from-last-run uses the latest successful run artifact", () => {
    const tmpDir = path.join(os.tmpdir(), `obs-test-${Date.now()}`);
    const runsDir = path.join(tmpDir, ".mcp-observatory", "runs");
    fs.mkdirSync(runsDir, { recursive: true });
    const fixture = fs.readFileSync(path.resolve("tests/fixtures/sample-run-a.json"), "utf8");
    fs.writeFileSync(path.join(runsDir, "2026-07-01T00-00-00.000Z--fixture-server.json"), fixture);

    const { stdout, exitCode } = runCli(["setup-ci", "--from-last-run"], { cwd: tmpDir });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Using latest successful run:");
    expect(fs.readFileSync(path.join(tmpDir, "mcp-observatory.target.json"), "utf8")).toContain("fixture-server.mjs");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("history with no data shows empty message", () => {
    const tmpDir = path.join(os.tmpdir(), `obs-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const { stdout, exitCode } = runCli(["history"], { cwd: tmpDir });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("No history");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── CI Report commands ──────────────────────────────────────────
  it("ci-report subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["ci-report", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("ci-report");
  });

  it("ci-report with empty dir outputs valid JSON", () => {
    const tmpDir = path.join(os.tmpdir(), `obs-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const { stdout, exitCode } = runCli(["ci-report", "--artifacts-dir", tmpDir]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    expect(parsed).toHaveProperty("hasRegressions", false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
