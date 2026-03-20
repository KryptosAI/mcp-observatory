import { describe, expect, it, vi } from "vitest";
import type { CheckContext } from "../src/checks/base.js";
import { runToolsInvokeCheck } from "../src/checks/tools-invoke.js";
import { isSafeToInvoke, stubFromSchema } from "../src/utils/schema-stub.js";

// ── Unit tests for isSafeToInvoke ──────────────────────────────────────────

describe("isSafeToInvoke", () => {
  it("returns true when no inputSchema", () => {
    expect(isSafeToInvoke({})).toBe(true);
  });

  it("returns true when inputSchema has no required fields", () => {
    expect(
      isSafeToInvoke({
        inputSchema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      })
    ).toBe(true);
  });

  it("returns true when required is empty array", () => {
    expect(
      isSafeToInvoke({
        inputSchema: {
          type: "object",
          required: [],
          properties: { name: { type: "string" } },
        },
      })
    ).toBe(true);
  });

  it("returns false when required fields exist and no readOnlyHint", () => {
    expect(
      isSafeToInvoke({
        inputSchema: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string" } },
        },
      })
    ).toBe(false);
  });

  it("returns true when readOnlyHint is true even with required fields", () => {
    expect(
      isSafeToInvoke({
        inputSchema: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string" } },
        },
        annotations: { readOnlyHint: true },
      })
    ).toBe(true);
  });

  it("returns false when readOnlyHint is false with required fields", () => {
    expect(
      isSafeToInvoke({
        inputSchema: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string" } },
        },
        annotations: { readOnlyHint: false },
      })
    ).toBe(false);
  });
});

// ── Unit tests for stubFromSchema ──────────────────────────────────────────

describe("stubFromSchema", () => {
  it("returns empty object for undefined schema", () => {
    expect(stubFromSchema(undefined)).toEqual({});
  });

  it("returns empty object when no required fields", () => {
    expect(
      stubFromSchema({
        type: "object",
        properties: { name: { type: "string" } },
      })
    ).toEqual({});
  });

  it("stubs required string field", () => {
    expect(
      stubFromSchema({
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" } },
      })
    ).toEqual({ name: "" });
  });

  it("stubs required number field", () => {
    expect(
      stubFromSchema({
        type: "object",
        required: ["count"],
        properties: { count: { type: "number" } },
      })
    ).toEqual({ count: 0 });
  });

  it("stubs required integer field", () => {
    expect(
      stubFromSchema({
        type: "object",
        required: ["count"],
        properties: { count: { type: "integer" } },
      })
    ).toEqual({ count: 0 });
  });

  it("stubs required boolean field", () => {
    expect(
      stubFromSchema({
        type: "object",
        required: ["flag"],
        properties: { flag: { type: "boolean" } },
      })
    ).toEqual({ flag: false });
  });

  it("stubs required array field", () => {
    expect(
      stubFromSchema({
        type: "object",
        required: ["items"],
        properties: { items: { type: "array" } },
      })
    ).toEqual({ items: [] });
  });

  it("stubs required object field", () => {
    expect(
      stubFromSchema({
        type: "object",
        required: ["config"],
        properties: { config: { type: "object" } },
      })
    ).toEqual({ config: {} });
  });

  it("stubs multiple required fields", () => {
    expect(
      stubFromSchema({
        type: "object",
        required: ["name", "count"],
        properties: {
          name: { type: "string" },
          count: { type: "number" },
        },
      })
    ).toEqual({ name: "", count: 0 });
  });

  it("defaults unknown type to empty string", () => {
    expect(
      stubFromSchema({
        type: "object",
        required: ["x"],
        properties: { x: { type: "unknown-type" } },
      })
    ).toEqual({ x: "" });
  });
});

// ── Integration-style tests for runToolsInvokeCheck ────────────────────────

describe("runToolsInvokeCheck", () => {
  it("returns unsupported when tools not advertised", async () => {
    const context: CheckContext = {
      client: {} as CheckContext["client"],
      serverCapabilities: undefined,
      target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
      timeoutMs: 5000,
      stderrLines: [],
    };

    const { result } = await runToolsInvokeCheck(context);
    expect(result.id).toBe("tools-invoke");
    expect(result.status).toBe("unsupported");
    expect(result.message).toContain("not advertised");
  });

  it("returns unsupported when tools capability is undefined", async () => {
    const context: CheckContext = {
      client: {} as CheckContext["client"],
      serverCapabilities: { prompts: {} },
      target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
      timeoutMs: 5000,
      stderrLines: [],
    };

    const { result } = await runToolsInvokeCheck(context);
    expect(result.status).toBe("unsupported");
  });

  it("returns fail when listTools throws", async () => {
    const mockClient = {
      listTools: vi.fn().mockRejectedValue(new Error("Connection lost")),
    };
    const context: CheckContext = {
      client: mockClient as unknown as CheckContext["client"],
      serverCapabilities: { tools: {} },
      target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
      timeoutMs: 5000,
      stderrLines: [],
    };

    const { result } = await runToolsInvokeCheck(context);
    expect(result.status).toBe("fail");
    expect(result.message).toContain("Failed to list tools");
  });

  it("returns pass when tools exist but none are safe to invoke", async () => {
    const mockClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [
          {
            name: "dangerous-tool",
            inputSchema: {
              type: "object",
              required: ["target"],
              properties: { target: { type: "string" } },
            },
          },
        ],
      }),
    };
    const context: CheckContext = {
      client: mockClient as unknown as CheckContext["client"],
      serverCapabilities: { tools: {} },
      target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
      timeoutMs: 5000,
      stderrLines: [],
    };

    const { result } = await runToolsInvokeCheck(context);
    expect(result.status).toBe("pass");
    expect(result.message).toContain("none are safe to invoke");
  });

  it("returns pass when safe tool responds successfully", async () => {
    const mockClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [
          {
            name: "echo",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      }),
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "hello" }],
        isError: false,
      }),
    };
    const context: CheckContext = {
      client: mockClient as unknown as CheckContext["client"],
      serverCapabilities: { tools: {} },
      target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
      timeoutMs: 5000,
      stderrLines: [],
    };

    const { result } = await runToolsInvokeCheck(context);
    expect(result.status).toBe("pass");
    expect(result.message).toContain("1 passed");
  });

  it("returns partial when some tools fail", async () => {
    const mockClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [
          { name: "good-tool", inputSchema: { type: "object", properties: {} } },
          { name: "bad-tool", inputSchema: { type: "object", properties: {} } },
        ],
      }),
      callTool: vi.fn().mockImplementation(({ name }: { name: string }) => {
        if (name === "good-tool") {
          return Promise.resolve({ content: [{ type: "text", text: "ok" }], isError: false });
        }
        return Promise.resolve({ content: [{ type: "text", text: "error" }], isError: true });
      }),
    };
    const context: CheckContext = {
      client: mockClient as unknown as CheckContext["client"],
      serverCapabilities: { tools: {} },
      target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
      timeoutMs: 5000,
      stderrLines: [],
    };

    const { result } = await runToolsInvokeCheck(context);
    expect(result.status).toBe("partial");
    expect(result.message).toContain("1 passed");
    expect(result.message).toContain("1 failed");
  });

  it("returns fail when all tools fail", async () => {
    const mockClient = {
      listTools: vi.fn().mockResolvedValue({
        tools: [
          { name: "broken", inputSchema: { type: "object", properties: {} } },
        ],
      }),
      callTool: vi.fn().mockRejectedValue(new Error("Tool crashed")),
    };
    const context: CheckContext = {
      client: mockClient as unknown as CheckContext["client"],
      serverCapabilities: { tools: {} },
      target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
      timeoutMs: 5000,
      stderrLines: [],
    };

    const { result } = await runToolsInvokeCheck(context);
    expect(result.status).toBe("fail");
  });
});
