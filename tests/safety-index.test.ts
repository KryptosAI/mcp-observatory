import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  loadSafetyTargets,
  renderSafetyIndex,
  verdictForArtifact,
  type SafetyIndexEntry,
  type SafetyIndexTarget,
} from "../scripts/run-safety-index.js";
import type { RunArtifact } from "../src/types.js";

const tempDirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-safety-index-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function artifact(overrides: Partial<RunArtifact> = {}): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    runId: "run_test",
    createdAt: "2026-06-24T00:00:00.000Z",
    toolVersion: "0.24.0",
    gate: "pass",
    target: {
      targetId: "test",
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
    },
    environment: {
      platform: "darwin",
      nodeVersion: "v24.0.0",
    },
    summary: {
      gate: "pass",
      total: 2,
      pass: 2,
      fail: 0,
      partial: 0,
      unsupported: 0,
      flaky: 0,
      skipped: 0,
    },
    checks: [
      {
        id: "tools",
        capability: "tools",
        status: "pass",
        durationMs: 1,
        message: "1 tool",
        evidence: [],
      },
      {
        id: "security-lite",
        capability: "security-lite",
        status: "pass",
        durationMs: 1,
        message: "ok",
        evidence: [],
      },
    ],
    ...overrides,
  };
}

const target: SafetyIndexTarget = {
  id: "test-server",
  name: "Test Server",
  repo: "https://github.com/example/test-server",
  category: "Reference",
  command: "npx",
  args: ["-y", "test-server"],
  riskClass: "Reference compatibility",
  failureClass: "Tool schema clarity",
  whyItMatters: "It exercises the renderer.",
  reproductionNotes: "Zero-config public package.",
};

describe("Safety Index", () => {
  it("loads typed target entries", async () => {
    const dir = await tempDir();
    const file = path.join(dir, "targets.json");
    await writeFile(file, JSON.stringify([target], null, 2), "utf8");

    const targets = await loadSafetyTargets(file);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.id).toBe("test-server");
  });

  it("requires target args", async () => {
    const dir = await tempDir();
    const file = path.join(dir, "targets.json");
    await writeFile(file, JSON.stringify([{ ...target, args: "npx" }], null, 2), "utf8");

    await expect(loadSafetyTargets(file)).rejects.toThrow("args");
  });

  it("derives verdicts from artifact evidence", () => {
    expect(verdictForArtifact(artifact())).toBe("Ready for CI");
    expect(verdictForArtifact(artifact({ fatalError: "startup failed" }))).toBe("Not reproducible");
    expect(verdictForArtifact(artifact({
      gate: "fail",
      checks: [
        {
          id: "security-lite",
          capability: "security-lite",
          status: "fail",
          durationMs: 1,
          message: "finding",
          evidence: [{ endpoint: "security/scan-lite", advertised: true, responded: true, minimalShapePresent: true, diagnostics: ["[high] command execution"] }],
        },
      ],
    }))).toBe("Unsafe default posture");
  });

  it("renders deterministic markdown with evidence links", () => {
    const entry: SafetyIndexEntry = {
      target,
      artifact: artifact(),
      verdict: "Ready for CI",
      artifactPath: path.join(process.cwd(), "docs/safety-index/artifacts/test-server.json"),
      reportPath: path.join(process.cwd(), "docs/safety-index/artifacts/test-server.md"),
    };

    const first = renderSafetyIndex([entry]);
    const second = renderSafetyIndex([entry]);
    expect(first).toBe(second);
    expect(first).toContain("MCP Server Safety Index v1");
    expect(first).toContain("Action Receipt");
    expect(first).toContain("CI Gate");
    expect(first).toContain("setup-ci --all --command");
    expect(first).toContain("[JSON](./safety-index/artifacts/test-server.json)");
    expect(first).toContain("Tool schema clarity: 1 server(s)");
  });
});
