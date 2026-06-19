import { describe, expect, it, vi } from "vitest";

import { runListCheck, type ListCheckConfig } from "../src/checks/list-check.js";
import type { CheckContext } from "../src/checks/base.js";
import { makeContext } from "./fixtures/test-helpers.js";

interface MockTool {
  name: string;
  inputSchema?: object;
}

function makeToolListConfig(
  overrides: Partial<ListCheckConfig<MockTool>> = {},
): ListCheckConfig<MockTool> {
  return {
    capability: "tools",
    endpoint: "tools/list",
    listItems: async (ctx) => {
      const result = await ctx.client.listTools();
      return result.tools;
    },
    hasMinimalShape: (item) => typeof item.name === "string" && item.name.length > 0,
    getItemName: (item) => item.name,
    ...overrides,
  };
}

describe("runListCheck", () => {
  it("returns unsupported when capability is not advertised", async () => {
    const ctx = makeContext({ serverCapabilities: {} });
    const config = makeToolListConfig();
    const result = await runListCheck(config, ctx);

    expect(result.result.status).toBe("unsupported");
    expect(result.result.message).toContain("not advertised");
  });

  it("returns pass when items have minimal shape", async () => {
    const ctx = makeContext({
      serverCapabilities: { tools: {} },
      client: {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            { name: "echo", inputSchema: { type: "object" } },
            { name: "greet", inputSchema: { type: "object" } },
          ],
        }),
      } as unknown as CheckContext["client"],
    });
    const config = makeToolListConfig();
    const result = await runListCheck(config, ctx);

    expect(result.result.status).toBe("pass");
    expect(result.result.evidence[0]!.itemCount).toBe(2);
    expect(result.result.evidence[0]!.identifiers).toEqual(["echo", "greet"]);
  });

  it("returns partial when items fail minimal shape check", async () => {
    const ctx = makeContext({
      serverCapabilities: { tools: {} },
      client: {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            { name: "" }, // empty name fails hasMinimalShape
          ],
        }),
      } as unknown as CheckContext["client"],
    });
    const config = makeToolListConfig();
    const result = await runListCheck(config, ctx);

    expect(result.result.status).toBe("partial");
  });

  it("returns fail when list call throws", async () => {
    const ctx = makeContext({
      serverCapabilities: { tools: {} },
      client: {
        listTools: vi.fn().mockRejectedValue(new Error("Connection refused")),
      } as unknown as CheckContext["client"],
    });
    const config = makeToolListConfig();
    const result = await runListCheck(config, ctx);

    expect(result.result.status).toBe("fail");
    expect(result.result.message).toContain("Connection refused");
  });

  it("extracts schemas when getItemSchema is provided", async () => {
    const ctx = makeContext({
      serverCapabilities: { tools: {} },
      client: {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            { name: "echo", inputSchema: { type: "object", properties: { msg: { type: "string" } } } },
          ],
        }),
      } as unknown as CheckContext["client"],
    });
    const config = makeToolListConfig({
      getItemSchema: (item) => item.inputSchema,
    });
    const result = await runListCheck(config, ctx);

    expect(result.result.status).toBe("pass");
    expect(result.result.evidence[0]!.schemas).toBeDefined();
    expect(result.result.evidence[0]!.schemas!["echo"]).toBeDefined();
  });
});
