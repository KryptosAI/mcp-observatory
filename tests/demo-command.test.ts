import { describe, expect, it, vi, afterEach } from "vitest";
import { Command } from "commander";
import { registerDemoCommands } from "../src/commands/demo.js";
import { runTarget } from "../src/index.js";

vi.mock("../src/index.js", () => ({
  runTarget: vi.fn().mockResolvedValue({
    artifactType: "run",
    gate: "pass",
    checks: [],
    summary: { pass: 0, fail: 0, partial: 0, flaky: 0, unsupported: 0, skipped: 0 },
  }),
}));

vi.mock("../src/discovery.js", () => ({
  scanForTargets: vi.fn().mockResolvedValue([]),
}));

vi.mock("../src/telemetry.js", () => ({
  generateSessionId: vi.fn().mockReturnValue("test-session"),
  recordSessionStart: vi.fn(),
  recordSessionEnd: vi.fn(),
  buildEvent: vi.fn().mockReturnValue({}),
  recordEvent: vi.fn(),
}));

vi.mock("../src/commercial.js", () => ({
  maybePrintCloudCta: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("demo command", () => {
  it("uses default timeout of 15000ms", async () => {
    const program = new Command();
    registerDemoCommands(program);

    await program.parseAsync(["node", "cli.js", "demo"]);

    expect(runTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 15000,
      }),
      expect.anything()
    );
  });

  it("respects custom timeout value", async () => {
    const program = new Command();
    registerDemoCommands(program);

    await program.parseAsync(["node", "cli.js", "demo", "--timeout", "30000"]);

    expect(runTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 30000,
      }),
      expect.anything()
    );
  });

  it("shows clear error for non-number timeout value", async () => {
    const program = new Command();
    registerDemoCommands(program);

    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    process.exitCode = undefined;

    await program.parseAsync(["node", "cli.js", "demo", "--timeout", "abc"]);

    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining("Invalid timeout value")
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });
});
