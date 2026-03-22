import type { Command } from "commander";

export function registerServeCommands(program: Command): void {
  program
    .command("serve")
    .description("Start as an MCP server for AI agents.")
    .action(async () => {
      const { startServer } = await import("../server.js");
      await startServer();
    });
}
