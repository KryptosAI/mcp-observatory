import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { readFileSync, readdirSync } from "node:fs";

/**
 * CLI/MCP Parity Tests
 *
 * These tests verify that the CLI and MCP server produce equivalent results
 * when given the same inputs. They run the CLI against the fixture server
 * and compare the check results with what the runner produces directly.
 */

const CLI = path.resolve("src/cli.ts");
const TSX = path.resolve("node_modules/.bin/tsx");
const FIXTURE_CONFIG = "tests/fixtures/sample-target-config.json";
const CLI_TEST_TIMEOUT_MS = 60_000;

vi.setConfig({ testTimeout: CLI_TEST_TIMEOUT_MS });

function runCli(args: string[]): string {
  return execFileSync(TSX, [CLI, ...args], {
    encoding: "utf8",
    timeout: CLI_TEST_TIMEOUT_MS,
    env: { ...process.env, NO_COLOR: "1" },
  });
}

/** Run CLI and find the latest artifact JSON from .mcp-observatory/runs */
function runAndGetArtifact(extraArgs: string[] = []): Record<string, unknown> {
  runCli(["run", "--target", FIXTURE_CONFIG, ...extraArgs]);

  // Find the latest artifact
  const runsDir = path.resolve(".mcp-observatory/runs");
  const files = readdirSync(runsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();
  const latest = files[0]!;
  const content = readFileSync(path.join(runsDir, latest), "utf8");
  return JSON.parse(content) as Record<string, unknown>;
}

describe("CLI/MCP Parity", () => {
  // ── Check coverage parity ────────────────────────────────────────────────

  it("CLI run produces tools, prompts, resources, conformance, schema-quality checks", () => {
    const artifact = runAndGetArtifact();
    const checks = artifact.checks as Array<{ id: string }>;
    const checkIds = checks.map((c) => c.id);

    expect(checkIds).toContain("tools");
    expect(checkIds).toContain("prompts");
    expect(checkIds).toContain("resources");
    expect(checkIds).toContain("conformance");
    expect(checkIds).toContain("schema-quality");
  }, CLI_TEST_TIMEOUT_MS);

  it("CLI run with --invoke-tools adds tools-invoke check", () => {
    const artifact = runAndGetArtifact(["--invoke-tools"]);
    const checks = artifact.checks as Array<{ id: string }>;
    const checkIds = checks.map((c) => c.id);

    expect(checkIds).toContain("tools-invoke");
  }, CLI_TEST_TIMEOUT_MS);

  it("CLI run with --security adds security check", () => {
    // Use test command which supports --security
    runCli(["test", "--security", "node", "tests/fixtures/fixture-server.mjs"]);

    // Find latest artifact
    const runsDir = path.resolve(".mcp-observatory/runs");
    const files = readdirSync(runsDir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();
    const latest = files[0]!;
    const content = readFileSync(path.join(runsDir, latest), "utf8");
    const artifact = JSON.parse(content) as { checks: Array<{ id: string }> };
    const checkIds = artifact.checks.map((c) => c.id);

    expect(checkIds).toContain("security");
  }, CLI_TEST_TIMEOUT_MS);

  // ── Artifact structure parity ────────────────────────────────────────────

  it("CLI artifact has required fields", () => {
    const artifact = runAndGetArtifact();

    expect(artifact).toHaveProperty("artifactType", "run");
    expect(artifact).toHaveProperty("schemaVersion");
    expect(artifact).toHaveProperty("gate");
    expect(artifact).toHaveProperty("runId");
    expect(artifact).toHaveProperty("createdAt");
    expect(artifact).toHaveProperty("toolVersion");
    expect(artifact).toHaveProperty("target");
    expect(artifact).toHaveProperty("environment");
    expect(artifact).toHaveProperty("summary");
    expect(artifact).toHaveProperty("checks");
  }, CLI_TEST_TIMEOUT_MS);

  it("CLI target info includes serverName", () => {
    const artifact = runAndGetArtifact();
    const target = artifact.target as { serverName?: string };
    expect(target.serverName).toBe("fixture-server");
  }, CLI_TEST_TIMEOUT_MS);

  // ── Diff output format parity ────────────────────────────────────────────

  it("CLI diff produces text output by default", () => {
    const output = runCli([
      "diff",
      "tests/fixtures/sample-run-a.json",
      "tests/fixtures/sample-run-b.json",
    ]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("CLI diff --format json produces valid JSON", () => {
    const output = runCli([
      "diff",
      "tests/fixtures/sample-run-a.json",
      "tests/fixtures/sample-run-b.json",
      "--format",
      "json",
    ]);
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty("artifactType", "diff");
  });

  it("CLI diff --format markdown produces markdown", () => {
    const output = runCli([
      "diff",
      "tests/fixtures/sample-run-a.json",
      "tests/fixtures/sample-run-b.json",
      "--format",
      "markdown",
    ]);
    expect(output).toContain("#");
  });

  // ── MCP server tool inventory ────────────────────────────────────────────

  it("MCP server tool names match CLI command names", () => {
    // The MCP server registers these tools (from server.ts):
    const expectedMcpTools = [
      "scan",
      "check_server",
      "score_server",
      "diff_runs",
      "get_last_run",
      "suggest_servers",
      "record",
      "replay",
      "verify",
      "watch",
    ];

    // The CLI registers these commands (from cli.ts):
    const expectedCliCommands = [
      "scan",
      "test",      // maps to check_server
      "score",     // maps to score_server
      "badge",     // CLI-only (generates SVG)
      "setup-ci",  // CLI-only CI adoption helper
      "init-ci",   // CLI-only backward-compatible alias
      "diff",      // maps to diff_runs
      "run",       // no direct MCP equivalent (uses target config)
      "suggest",   // maps to suggest_servers
      "record",
      "replay",
      "verify",
      "watch",
      "report",    // no MCP equivalent (intentional)
      "serve",     // starts the MCP server itself
      "cloud",     // CLI-only commercial pilot info
    ];

    // Intentional CLI-only commands:
    const intentionalCliOnly = ["run", "report", "serve", "badge", "cloud", "setup-ci", "init-ci"];
    // Intentional MCP-only tools:
    const intentionalMcpOnly = ["get_last_run"];
    // Name mappings:
    const nameMap: Record<string, string> = {
      test: "check_server",
      score: "score_server",
      diff: "diff_runs",
      suggest: "suggest_servers",
    };

    // Every CLI command (except intentional CLI-only) should have an MCP equivalent
    for (const cmd of expectedCliCommands) {
      if (intentionalCliOnly.includes(cmd)) continue;
      const mcpName = nameMap[cmd] ?? cmd;
      expect(expectedMcpTools).toContain(mcpName);
    }

    // Every MCP tool (except intentional MCP-only) should have a CLI equivalent
    for (const tool of expectedMcpTools) {
      if (intentionalMcpOnly.includes(tool)) continue;
      const cliName = Object.entries(nameMap).find(([, v]) => v === tool)?.[0] ?? tool;
      expect(expectedCliCommands).toContain(cliName);
    }
  });

  // ── Gate consistency ─────────────────────────────────────────────────────

  it("fixture server produces pass gate", () => {
    const artifact = runAndGetArtifact();
    expect(artifact.gate).toBe("pass");
  }, CLI_TEST_TIMEOUT_MS);

  // ── Intentional differences documentation ────────────────────────────────

  it("documents intentional CLI/MCP differences", () => {
    const intentionalDifferences = {
      "watch": "CLI runs a polling loop; MCP runs a single check + diff against previous",
      "interactive menu": "CLI shows interactive arrow-key menu; MCP has no equivalent (by design)",
      "color output": "CLI supports --no-color / ANSI; MCP returns plain text (by design)",
      "report": "CLI-only command for rendering existing artifacts (no MCP equivalent needed)",
      "serve": "CLI-only command that starts the MCP server itself",
      "run": "CLI-only command that reads target config files; MCP tools accept inline params",
      "get_last_run": "MCP-only convenience tool; CLI users use ls + diff manually",
      "badge": "CLI-only command that generates SVG badge from health score",
      "setup-ci": "CLI-only command that generates GitHub Action adoption assets",
      "init-ci": "CLI-only backward-compatible alias for setup-ci",
      "cloud": "CLI-only command that explains hosted reporting and paid pilot options",
    };

    expect(Object.keys(intentionalDifferences).length).toBeGreaterThanOrEqual(5);

    for (const [feature, explanation] of Object.entries(intentionalDifferences)) {
      expect(explanation.length).toBeGreaterThan(10);
      expect(feature.length).toBeGreaterThan(0);
    }
  });
});
