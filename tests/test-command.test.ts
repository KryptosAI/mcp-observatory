import { afterEach, describe, expect, it, vi } from "vitest";

import { extractTrailingConversionFlags, watchAndRerun } from "../src/commands/test.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extractTrailingConversionFlags", () => {
  it("extracts --watch from the trailing args and leaves the server command intact", () => {
    const { commandArgs, flags } = extractTrailingConversionFlags(
      ["npx", "-y", "@modelcontextprotocol/server-memory", "--watch"],
      {},
    );
    expect(commandArgs).toEqual(["npx", "-y", "@modelcontextprotocol/server-memory"]);
    expect(flags.watch).toBe(true);
  });

  it("leaves watch undefined when --watch isn't present", () => {
    const { flags } = extractTrailingConversionFlags(["npx", "-y", "server"], {});
    expect(flags.watch).toBeUndefined();
  });

  it("extracts --watch alongside other trailing conversion flags", () => {
    const { commandArgs, flags } = extractTrailingConversionFlags(
      ["npx", "-y", "server", "--no-attack-sim", "--watch", "--no-setup-ci"],
      {},
    );
    expect(commandArgs).toEqual(["npx", "-y", "server"]);
    expect(flags.attackSim).toBe(false);
    expect(flags.watch).toBe(true);
    expect(flags.noSetupCi).toBe(true);
  });
});

describe("watchAndRerun", () => {
  it("errors clearly and sets a non-zero exit code when no --target was given", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    process.exitCode = undefined;

    await watchAndRerun(undefined);

    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining("--watch requires --target <config.json>"),
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });
});
