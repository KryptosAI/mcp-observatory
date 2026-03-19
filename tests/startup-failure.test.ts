import { describe, expect, it } from "vitest";

import { runTarget, type TargetConfig } from "../src/index.js";

describe("startup failure diagnosis", () => {
  it("formats actionable fatal errors when the target exits before initialization", async () => {
    const target: TargetConfig = {
      targetId: "early-close",
      adapter: "local-process",
      command: "node",
      args: ["-e", "setTimeout(() => process.exit(0), 10)"],
      cwd: ".",
      timeoutMs: 1000
    };

    const artifact = await runTarget(target);

    expect(artifact.gate).toBe("fail");
    expect(artifact.fatalError).toContain(
      "Could not establish a plain stdio MCP session for target `early-close`.",
    );
    expect(artifact.fatalError).toContain("Next steps:");
    expect(artifact.checks.every((check) => check.status === "skipped")).toBe(true);
    expect(artifact.checks[0]?.message).toContain(
      "See the failure diagnosis.",
    );
  });
});
