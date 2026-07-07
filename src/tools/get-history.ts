import { z } from "zod";

import { readHistory, getTrend, renderTrendLabel } from "../history.js";
import { logRequest } from "./helpers.js";

export const name = "get_history";
export const description = "Get health score trends for MCP servers from run history.";
export const schema = {
  target: z.string().optional().describe("Filter to a specific target ID."),
};

export async function handler({ target }: { target?: string }) {
  const startMs = Date.now();
  try {
    const history = await readHistory();
    let targetIds = [...new Set(history.entries.map(e => e.targetId))];
    if (target) targetIds = targetIds.filter(id => id === target);

    if (targetIds.length === 0) {
      logRequest("get_history", startMs);
      return { content: [{ type: "text" as const, text: "No history found. Run a scan or test first." }] };
    }

    const lines: string[] = [];
    for (const id of targetIds) {
      const trend = getTrend(id, history);
      if (!trend) continue;
      const label = renderTrendLabel(trend);
      lines.push(`${id}: ${trend.current.grade} (${trend.current.healthScore}) ${label}`);
    }

    logRequest("get_history", startMs);
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logRequest("get_history", startMs, true);
    return { content: [{ type: "text" as const, text: `History failed: ${msg}` }], isError: true };
  }
}
