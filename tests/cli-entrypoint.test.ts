import { describe, expect, it, vi } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

const CLI = path.resolve("src/cli.ts");
const TSX = path.resolve("node_modules/.bin/tsx");
const CLI_TEST_TIMEOUT_MS = 30_000;

vi.setConfig({ testTimeout: CLI_TEST_TIMEOUT_MS });

function runCli(args: string[], opts?: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv }): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync(TSX, [CLI, ...args], {
      encoding: "utf8",
      timeout: opts?.timeout ?? CLI_TEST_TIMEOUT_MS,
      cwd: opts?.cwd ?? process.cwd(),
      env: { ...process.env, NO_COLOR: "1", ...opts?.env },
    });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? "", exitCode: e.status ?? 1 };
  }
}

function runCliWithStderr(args: string[], opts?: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv }): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(TSX, [CLI, ...args], {
    encoding: "utf8",
    timeout: opts?.timeout ?? CLI_TEST_TIMEOUT_MS,
    cwd: opts?.cwd ?? process.cwd(),
    env: { ...process.env, NO_COLOR: "1", ...opts?.env },
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.status ?? 1,
  };
}

function telemetryEvents(stderr: string): Array<Record<string, unknown>> {
  return stderr
    .split("\n")
    .filter((line) => line.startsWith("[telemetry] "))
    .map((line) => JSON.parse(line.slice("[telemetry] ".length)) as Record<string, unknown>);
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
    expect(stdout).toContain("--no-ci-sarif");
  });

  it("test subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["test", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("test");
    expect(stdout).toContain("--sarif");
    expect(stdout).toContain("--campaign");
    expect(stdout).toContain("--setup-ci");
    expect(stdout).toContain("--no-setup-ci");
    expect(stdout).toContain("--no-ci-sarif");
  });

  it("attack-sim subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["attack-sim", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("attack-sim");
    expect(stdout).toContain("--fail-on-high");
    expect(stdout).toContain("--baseline");
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
    expect(stdout).toContain("--campaign");
    expect(stdout).toContain("--setup-ci");
  });

  it("serve subcommand shows help", () => {
    const { stdout, exitCode } = runCli(["serve", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("serve");
    expect(stdout).toContain("--quiet");
  });

  it("serve keeps stdio output clean for MCP hosts", () => {
    const { stdout, stderr, exitCode } = runCliWithStderr(["serve", "--quiet"], { timeout: 2_000 });
    expect([0, 143]).toContain(exitCode);
    expect(stdout).toBe("");
    expect(stderr).toBe("");
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
    expect(fs.readFileSync(path.join(tmpDir, ".github/workflows/mcp-observatory.yml"), "utf8")).toContain("upload-sarif: true");
    expect(fs.readFileSync(path.join(tmpDir, "mcp-observatory.target.json"), "utf8")).toContain("fixture-server.mjs");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("test --sarif writes a SARIF file when the flag trails the server command", () => {
    const tmpDir = path.join(os.tmpdir(), `obs-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const fixture = path.resolve("tests/fixtures/fixture-server.mjs");
    const sarifPath = path.join(tmpDir, "observatory.sarif");

    const { stdout, exitCode } = runCli(["test", "node", fixture, "--sarif", sarifPath, "--no-setup-ci"], { cwd: tmpDir });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Wrote sarif report");
    const sarif = JSON.parse(fs.readFileSync(sarifPath, "utf8")) as { version: string; runs: unknown[] };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs).toHaveLength(1);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("attack-sim writes JSON, Markdown, and SARIF for a target config", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-attack-"));
    fs.mkdirSync(tmpDir, { recursive: true });
    const jsonPath = path.join(tmpDir, "attack-artifact.json");
    const reportPath = path.join(tmpDir, "attack-report.md");
    const sarifPath = path.join(tmpDir, "attack.sarif");
    const targetPath = path.join(tmpDir, "target.json");
    fs.writeFileSync(targetPath, JSON.stringify({
      targetId: "fixture-server",
      adapter: "local-process",
      command: "node",
      args: [path.resolve("tests/fixtures/fixture-server.mjs")],
      cwd: process.cwd(),
      timeoutMs: 10000,
    }));

    const { stdout, exitCode } = runCli([
      "attack-sim",
      "--target",
      targetPath,
      "--json",
      jsonPath,
      "--output",
      reportPath,
      "--sarif",
      sarifPath,
    ], { cwd: tmpDir, timeout: 25_000 });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("attack-sim");
    const artifact = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as { checks: Array<{ id: string }> };
    expect(artifact.checks.some((check) => check.id === "attack-sim")).toBe(true);
    expect(fs.readFileSync(reportPath, "utf8")).toContain("MCP Attack Simulation Report");
    const sarif = JSON.parse(fs.readFileSync(sarifPath, "utf8")) as { version: string };
    expect(sarif.version).toBe("2.1.0");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("attack-sim accepts positional server commands and fails on high findings when requested", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-attack-"));
    fs.mkdirSync(tmpDir, { recursive: true });
    const fixture = path.resolve("tests/fixtures/poisoned-fixture-server.mjs");
    const jsonPath = path.join(tmpDir, "attack-artifact.json");

    const { stdout, exitCode } = runCli([
      "attack-sim",
      "node",
      fixture,
      "--json",
      jsonPath,
      "--fail-on-high",
    ], { cwd: tmpDir, timeout: 25_000 });
    expect(exitCode).toBe(1);
    expect(stdout).toContain("attack-sim: fail");
    const artifact = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as { checks: Array<{ id: string; status: string }> };
    expect(artifact.checks.find((check) => check.id === "attack-sim")?.status).toBe("fail");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("attack-sim accepts equals-form output flags and strips CLI-only flags", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-attack-"));
    fs.mkdirSync(tmpDir, { recursive: true });
    const fixture = path.resolve("tests/fixtures/poisoned-fixture-server.mjs");
    const jsonPath = path.join(tmpDir, "attack-artifact.json");

    const { stdout, exitCode } = runCli([
      "attack-sim",
      "node",
      fixture,
      `--json=${jsonPath}`,
      "--no-color",
      "--fail-on-high",
    ], { cwd: tmpDir, timeout: 25_000 });

    expect(exitCode).toBe(1);
    expect(stdout).toContain("attack-sim: fail");
    expect(fs.existsSync(jsonPath)).toBe(true);
    const artifact = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as { checks: Array<{ id: string; status: string }> };
    expect(artifact.checks.find((check) => check.id === "attack-sim")?.status).toBe("fail");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("test --campaign records attribution and strips the flag from pass-through server args", () => {
    const tmpDir = path.join(os.tmpdir(), `obs-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const fixture = path.resolve("tests/fixtures/fixture-server.mjs");

    const { stderr, exitCode } = runCliWithStderr(["test", "node", fixture, "--campaign", "maintainer-pr", "--no-setup-ci"], {
      cwd: tmpDir,
      env: {
        MCP_OBSERVATORY_TELEMETRY_DEBUG: "1",
      },
    });
    expect(exitCode).toBe(0);
    const complete = telemetryEvents(stderr).find((event) => event["event"] === "command_complete" && event["command"] === "test");
    expect(complete?.["campaign"]).toBe("maintainer-pr");
    expect(JSON.stringify(complete?.["serverCommands"])).not.toContain("--campaign");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("test uses MCP_OBSERVATORY_CAMPAIGN when no flag is passed", () => {
    const tmpDir = path.join(os.tmpdir(), `obs-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const fixture = path.resolve("tests/fixtures/fixture-server.mjs");

    const { stderr, exitCode } = runCliWithStderr(["test", "node", fixture, "--no-setup-ci"], {
      cwd: tmpDir,
      env: {
        MCP_OBSERVATORY_CAMPAIGN: "bot-runtime-review",
        MCP_OBSERVATORY_TELEMETRY_DEBUG: "1",
      },
    });
    expect(exitCode).toBe(0);
    const events = telemetryEvents(stderr);
    expect(events.find((event) => event["event"] === "command_run")?.["campaign"]).toBe("bot-runtime-review");
    expect(events.find((event) => event["event"] === "command_complete")?.["campaign"]).toBe("bot-runtime-review");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("test rejects invalid campaign slugs", () => {
    const fixture = path.resolve("tests/fixtures/fixture-server.mjs");
    const { stderr, exitCode } = runCliWithStderr(["test", "node", fixture, "--campaign", "bad slug", "--no-setup-ci"]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("Campaign must be");
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
    expect(stdout).toContain("--sarif");
    expect(stdout).toContain("--schedule");
    expect(stdout).toContain("--fix");
    expect(stdout).toContain("--campaign");
  });

  it("action source gates SARIF upload behind an explicit input", () => {
    const action = fs.readFileSync(path.resolve("action/action.yml"), "utf8");
    expect(action).toContain("upload-sarif:");
    expect(action).toContain("sarif-path:");
    expect(action).toContain("github/codeql-action/upload-sarif@v4");
    expect(action).toContain("if: inputs.upload-sarif == 'true'");
    expect(action).toContain("Skipping SARIF for multi-server matrix scan");
  });

  it("setup-ci --from-last-run uses the latest successful run artifact", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-test-"));
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

  it("setup-ci --doctor --fix repairs CI with SARIF and weekly automation", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-test-"));
    const workflow = path.join(tmpDir, ".github/workflows/mcp-observatory.yml");
    fs.mkdirSync(path.dirname(workflow), { recursive: true });
    fs.writeFileSync(workflow, [
      "name: MCP Observatory",
      "on: [pull_request]",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  mcp-observatory:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v6",
      "      - uses: KryptosAI/mcp-observatory/action@v0.27.0",
      "        with:",
      "          command: npx -y @example/mcp-server",
      "",
    ].join("\n"));

    const { stdout, exitCode } = runCli(["setup-ci", "--doctor", "--fix"], { cwd: tmpDir });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Applied repair:");
    const workflowText = fs.readFileSync(workflow, "utf8");
    expect(workflowText).toContain("security-events: write");
    expect(workflowText).toContain("upload-sarif: true");
    expect(workflowText).toContain("schedule:");
    expect(fs.readFileSync(path.join(tmpDir, "mcp-observatory.target.json"), "utf8")).toContain("@example/mcp-server");
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
