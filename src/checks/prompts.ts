import type { Prompt } from "@modelcontextprotocol/sdk/types.js";

import type { CheckContext, ObservedCheck } from "./base.js";
import { runListCheck } from "./list-check.js";

export async function runPromptsCheck(context: CheckContext): Promise<ObservedCheck> {
  return runListCheck<Prompt>({
    capability: "prompts",
    endpoint: "prompts/list",
    listItems: async (ctx) => (await ctx.client.listPrompts(undefined, { timeout: ctx.timeoutMs })).prompts,
    hasMinimalShape: (prompt) => typeof prompt.name === "string" && prompt.name.trim().length > 0,
    getItemName: (prompt) => prompt.name,
  }, context);
}
