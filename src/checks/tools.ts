import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import type { CheckContext, ObservedCheck } from "./base.js";
import { runListCheck } from "./list-check.js";

export async function runToolsCheck(context: CheckContext): Promise<ObservedCheck> {
  return runListCheck<Tool>({
    capability: "tools",
    endpoint: "tools/list",
    listItems: async (ctx) => (await ctx.client.listTools(undefined, { timeout: ctx.timeoutMs })).tools,
    hasMinimalShape: (tool) => typeof tool.name === "string" && tool.name.trim().length > 0,
    getItemName: (tool) => tool.name,
  }, context);
}
