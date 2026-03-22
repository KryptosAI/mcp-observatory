import { vi } from "vitest";

import type { CheckContext } from "../../src/checks/base.js";
import type { Cassette, CassetteEntry } from "../../src/cassette.js";
import type { RunArtifact } from "../../src/types.js";

/**
 * Create a mock CheckContext with sensible defaults.
 * Override any field via the `overrides` parameter.
 */
export function makeContext(overrides: Partial<CheckContext> = {}): CheckContext {
  return {
    client: {
      listTools: vi.fn().mockResolvedValue({ tools: [{ name: "echo", inputSchema: { type: "object" } }] }),
      listPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
      listResources: vi.fn().mockResolvedValue({ resources: [] }),
      listResourceTemplates: vi.fn().mockResolvedValue({ resourceTemplates: [] }),
      callTool: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "hello" }] }),
      request: vi.fn().mockRejectedValue(Object.assign(new Error("Method not found"), { code: -32601 })),
    } as unknown as CheckContext["client"],
    serverCapabilities: { tools: {} },
    target: { targetId: "test", adapter: "local-process" as const, command: "test", args: [] },
    timeoutMs: 5000,
    stderrLines: [],
    ...overrides,
  };
}

/**
 * Create a RunArtifact with sensible defaults.
 * Supply `checks` and optionally `fatalError`.
 */
export function makeArtifact(checks: RunArtifact["checks"] = [], fatalError?: string): RunArtifact {
  return {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate: checks.some(c => c.status === "fail") ? "fail" : "pass",
    runId: "test-run-id",
    createdAt: "2026-03-21T00:00:00Z",
    toolVersion: "0.9.0",
    target: { targetId: "test", adapter: "local-process" as const, command: "test", args: [] },
    environment: { platform: "darwin", nodeVersion: "v22.0.0" },
    summary: { total: checks.length, pass: 0, fail: 0, partial: 0, unsupported: 0, flaky: 0, skipped: 0, gate: "pass" },
    checks,
    fatalError,
  };
}

/**
 * Create a Cassette with sensible defaults.
 * Override any field via `overrides`, or pass custom entries.
 */
export function makeCassette(overrides?: Partial<Cassette>): Cassette;
export function makeCassette(entries: CassetteEntry[]): Cassette;
export function makeCassette(arg?: Partial<Cassette> | CassetteEntry[]): Cassette {
  const overrides = Array.isArray(arg) ? { entries: arg } : (arg ?? {});
  return {
    version: 1,
    targetId: "test-server",
    recordedAt: "2026-03-20T00:00:00.000Z",
    transport: "stdio",
    entries: [
      {
        direction: "request",
        method: "initialize",
        params: { capabilities: {} },
        timestampMs: 0,
      },
      {
        direction: "response",
        method: "initialize",
        result: { capabilities: { tools: {} } },
        timestampMs: 5,
      },
    ],
    ...overrides,
  };
}
