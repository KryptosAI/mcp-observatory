import type { Command } from "commander";
import { defaultRunsDirectory } from "../storage.js";
import { startLocalDashboard } from "../local-dashboard.js";

export function registerDashboardCommands(program: Command): void {
  program.command("dashboard")
    .description("Serve free local scan history, HTML reports, JSON downloads, and ClearFrame tasks on loopback.")
    .option("--dir <directory>", "Run receipt directory.", defaultRunsDirectory())
    .option("--port <port>", "Loopback port; 0 selects an available port.", "0")
    .action(async (options: { dir: string; port: string }) => {
      const dashboard = await startLocalDashboard(options.dir, Number(options.port));
      process.stdout.write(`Local dashboard: ${dashboard.url}\nNo account or upload required. Press Ctrl+C to stop.\n`);
      const stop = () => { void dashboard.close(); };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
}
