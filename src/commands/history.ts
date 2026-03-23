import type { Command } from "commander";
import { readHistory, getTrend, renderTrendLabel } from "../history.js";
import { buildEvent, recordEvent } from "../telemetry.js";
import { ANSI, c } from "./helpers.js";

export function registerHistoryCommands(program: Command): void {
  program
    .command("history")
    .description("Show health score trends for your MCP servers.")
    .option("--target <id>", "Filter to a specific server target ID.")
    .option("--json", "Output raw JSON.", false)
    .option("--no-color", "Disable colored output.")
    .action(async (options: { target?: string; json: boolean }) => {
      const history = await readHistory();

      if (options.json) {
        process.stdout.write(JSON.stringify(history, null, 2) + "\n");
        return;
      }

      // Get unique target IDs preserving insertion order
      let targetIds = [...new Set(history.entries.map((e) => e.targetId))];
      if (options.target) {
        targetIds = targetIds.filter((id) => id === options.target);
      }

      if (targetIds.length === 0) {
        process.stdout.write(
          "No history found. Run a scan or test to start tracking.\n",
        );
        return;
      }

      // Print header
      process.stdout.write(
        c(ANSI.bold, "  Target") +
          "                          " +
          c(ANSI.bold, "Health") +
          "  " +
          c(ANSI.bold, "Trend") +
          "\n",
      );

      for (const id of targetIds) {
        const trend = getTrend(id, history);
        if (!trend) continue;

        const { current } = trend;
        const gradeColor =
          current.grade === "A"
            ? ANSI.green
            : current.grade === "F"
              ? ANSI.red
              : ANSI.yellow;
        const label = renderTrendLabel(trend);
        const paddedId = id.padEnd(30);

        process.stdout.write(
          `  ${paddedId} ${c(gradeColor, current.grade)} (${current.healthScore})  ${label}\n`,
        );
      }

      recordEvent(buildEvent("command_complete", "history", "cli", {
        historyEntryCount: history.entries.length,
      }));
    });
}
