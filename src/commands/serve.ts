import type { Command } from "commander";

import { ANSI, LOGO, c, useColor } from "./helpers.js";
import { TOOL_VERSION } from "../version.js";

export function registerServeCommands(program: Command): void {
  program
    .command("serve")
    .description("Start as an MCP server for AI agents.")
    .option("--quiet", "Do not print the startup banner to stderr.", false)
    .action(async (options: { quiet?: boolean }) => {
      if (!options.quiet && process.stderr.isTTY) {
        process.stderr.write(useColor() ? c(ANSI.cyan, LOGO) + `  ${c(ANSI.dim, `v${TOOL_VERSION}`)}\n` : LOGO + `  v${TOOL_VERSION}\n`);
        process.stderr.write(`  ${c(ANSI.bold, "MCP server mode")}\n`);
        process.stderr.write(`  ${c(ANSI.dim, "Listening on stdio. Configure your MCP client to launch this command.")}\n\n`);
      }
      const { startServer } = await import("../server.js");
      await startServer();
    });
}
