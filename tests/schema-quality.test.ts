import { describe, expect, it, vi } from "vitest";

import { runSchemaQualityCheck } from "../src/checks/schema-quality.js";
import type { CheckContext } from "../src/checks/base.js";

function makeContext(tools: object[] = [], prompts: object[] = [], resources: object[] = []): CheckContext {
  return {
    client: {
      listTools: vi.fn().mockResolvedValue({ tools }),
      listPrompts: vi.fn().mockResolvedValue({ prompts }),
      listResources: vi.fn().mockResolvedValue({ resources }),
    } as unknown as CheckContext["client"],
    serverCapabilities: {
      tools: tools.length > 0 ? {} : undefined,
      prompts: prompts.length > 0 ? {} : undefined,
      resources: resources.length > 0 ? {} : undefined,
    },
    target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
    timeoutMs: 5000,
    stderrLines: [],
  };
}

describe("runSchemaQualityCheck", () => {
  it("passes for well-described tools", async () => {
    const ctx = makeContext([
      {
        name: "get_weather",
        description: "Get current weather for a location",
        inputSchema: {
          type: "object",
          properties: {
            city: { type: "string", description: "City name" },
          },
          required: ["city"],
        },
      },
    ]);
    const result = await runSchemaQualityCheck(ctx);
    expect(result.result.status).toBe("pass");
  });

  it("warns on missing tool description", async () => {
    const ctx = makeContext([
      {
        name: "get_weather",
        inputSchema: { type: "object", properties: {} },
      },
    ]);
    const result = await runSchemaQualityCheck(ctx);
    expect(result.result.status).not.toBe("pass");
    expect(result.result.evidence[0]?.diagnostics).toBeDefined();
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("Missing description"))).toBe(true);
  });

  it("warns on missing input schema", async () => {
    const ctx = makeContext([
      { name: "do_thing", description: "Does a thing" },
    ]);
    const result = await runSchemaQualityCheck(ctx);
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("Missing input schema"))).toBe(true);
  });

  it("warns on whitespace in tool name", async () => {
    const ctx = makeContext([
      {
        name: "get weather",
        description: "Gets weather",
        inputSchema: { type: "object" },
      },
    ]);
    const result = await runSchemaQualityCheck(ctx);
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("whitespace"))).toBe(true);
  });

  it("warns on missing property descriptions", async () => {
    const ctx = makeContext([
      {
        name: "search",
        description: "Search for items",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      },
    ]);
    const result = await runSchemaQualityCheck(ctx);
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("Property 'query' missing description"))).toBe(true);
  });

  it("checks prompt quality", async () => {
    const ctx = makeContext([], [
      { name: "greeting", arguments: [{ name: "name" }] },
    ]);
    const result = await runSchemaQualityCheck(ctx);
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("prompt"))).toBe(true);
  });

  it("checks resource quality", async () => {
    const ctx = makeContext([], [], [
      { name: "config", uri: "file:///config.json" },
    ]);
    const result = await runSchemaQualityCheck(ctx);
    expect(result.result.evidence[0]?.diagnostics?.some(d => d.includes("resource"))).toBe(true);
  });

  it("passes with no capabilities", async () => {
    const ctx: CheckContext = {
      client: {} as CheckContext["client"],
      serverCapabilities: {},
      target: { targetId: "test", adapter: "local-process", command: "test", args: [] },
      timeoutMs: 5000,
      stderrLines: [],
    };
    const result = await runSchemaQualityCheck(ctx);
    expect(result.result.status).toBe("pass");
  });

  it("fails when majority of items have warnings", async () => {
    const ctx = makeContext([
      { name: "a" },
      { name: "b" },
      { name: "c" },
    ]);
    const result = await runSchemaQualityCheck(ctx);
    expect(result.result.status).toBe("fail");
  });
});
