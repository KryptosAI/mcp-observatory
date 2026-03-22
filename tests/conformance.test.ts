import { describe, expect, it, vi } from "vitest";

import { runConformanceCheck } from "../src/checks/conformance.js";
import type { CheckContext } from "../src/checks/base.js";

function makeContext(overrides: Partial<CheckContext> = {}): CheckContext {
  return {
    client: {
      listTools: vi.fn().mockResolvedValue({ tools: [{ name: "echo", inputSchema: { type: "object" } }] }),
      listPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
      listResources: vi.fn().mockResolvedValue({ resources: [] }),
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

describe("runConformanceCheck", () => {
  it("passes for a well-behaved server", async () => {
    const ctx = makeContext();
    const result = await runConformanceCheck(ctx);
    expect(result.result.status).toBe("pass");
    expect(result.result.id).toBe("conformance");
  });

  it("fails when capabilities are missing", async () => {
    const ctx = makeContext({ serverCapabilities: undefined });
    const result = await runConformanceCheck(ctx);
    expect(result.result.status).not.toBe("pass");
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("capabilities"))).toBe(true);
  });

  it("fails when advertised tools endpoint errors", async () => {
    const ctx = makeContext({
      client: {
        listTools: vi.fn().mockRejectedValue(new Error("connection reset")),
        listPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
        listResources: vi.fn().mockResolvedValue({ resources: [] }),
        callTool: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] }),
        request: vi.fn().mockRejectedValue(Object.assign(new Error("not found"), { code: -32601 })),
      } as unknown as CheckContext["client"],
      serverCapabilities: { tools: {} },
    });
    const result = await runConformanceCheck(ctx);
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("tools/list failed"))).toBe(true);
  });

  it("detects invalid tool response content", async () => {
    const ctx = makeContext({
      client: {
        listTools: vi.fn().mockResolvedValue({ tools: [{ name: "echo", inputSchema: { type: "object" } }] }),
        listPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
        listResources: vi.fn().mockResolvedValue({ resources: [] }),
        callTool: vi.fn().mockResolvedValue({ content: "not-an-array" }),
        request: vi.fn().mockRejectedValue(Object.assign(new Error("not found"), { code: -32601 })),
      } as unknown as CheckContext["client"],
    });
    const result = await runConformanceCheck(ctx);
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("not an array"))).toBe(true);
  });

  it("handles error responses gracefully", async () => {
    const ctx = makeContext({
      client: {
        listTools: vi.fn().mockResolvedValue({ tools: [] }),
        listPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
        listResources: vi.fn().mockResolvedValue({ resources: [] }),
        callTool: vi.fn(),
        request: vi.fn().mockRejectedValue(new Error("unknown error")),
      } as unknown as CheckContext["client"],
    });
    const result = await runConformanceCheck(ctx);
    // Should still complete without crashing
    expect(result.result.id).toBe("conformance");
  });

  it("skips endpoint checks when capabilities not advertised", async () => {
    const ctx = makeContext({ serverCapabilities: {} });
    const result = await runConformanceCheck(ctx);
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("skipped"))).toBe(true);
  });
});
