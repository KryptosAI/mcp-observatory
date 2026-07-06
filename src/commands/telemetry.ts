import type { Command } from "commander";

import { loadTelemetryConfig, saveTelemetryConfig, isTelemetryEnabled } from "../telemetry.js";
import { appendQuery, requireHttpUrl } from "../utils/url.js";

const TELEMETRY_FIELDS = [
  "sessionId",
  "timestamp",
  "version",
  "command",
  "transport",
  "os",
  "arch",
  "nodeVersion",
  "isCI",
  "ciName",
  "ciProvider",
  "org",
  "contact",
  "gitEmail",
  "gitRemoteUrl",
  "hostname",
  "serversScanned",
  "toolsFound",
  "promptsFound",
  "resourcesFound",
  "gateResult",
  "executionMs",
  "securityFlag",
  "targetIds",
  "installedServers",
  "serverCommands",
  "healthScore",
  "healthGrade",
  "securityFindingCount",
  "connectMs",
  "fatalError",
  "checkStatuses",
  "suggestedServers",
  "detectedLanguages",
  "detectedFrameworks",
];

export function registerTelemetryCommands(program: Command): void {
  program
    .command("telemetry")
    .description("Manage product usage telemetry.")
    .argument("[action]", "enable, disable, stats, or status (default: status)")
    .option("--verbose", "Show the telemetry fields that may be collected.", false)
    .action(async (action?: string, options?: { verbose?: boolean }) => {
      const config = await loadTelemetryConfig();
      const envDisabled = process.env["DO_NOT_TRACK"] === "1" ||
        process.env["MCP_OBSERVATORY_TELEMETRY_DISABLED"] === "1";

      if (action === "enable") {
        config.telemetryEnabled = true;
        await saveTelemetryConfig(config);
        process.stdout.write("  Telemetry enabled.\n\n");
      } else if (action === "disable") {
        config.telemetryEnabled = false;
        await saveTelemetryConfig(config);
        process.stdout.write("  Telemetry disabled.\n\n");
      } else if (action === "stats") {
        const endpoint = requireHttpUrl(
          process.env["MCP_OBSERVATORY_TELEMETRY_URL"] ?? "https://mcp-observatory-telemetry.kryptosai.workers.dev",
          "Telemetry stats endpoint",
        );
        const token = process.env["MCP_OBSERVATORY_STATS_TOKEN"] ?? config.statsToken;
        if (!token) {
          process.stderr.write("  No stats token configured.\n");
          process.stderr.write("  Set MCP_OBSERVATORY_STATS_TOKEN or add \"statsToken\" to ~/.mcp-observatory/config.json\n\n");
          return;
        }
        const authHeaders = { Authorization: `Bearer ${token}` };
        try {
          const [all, others] = await Promise.all([
            fetch(new URL("/v1/stats", endpoint), { headers: authHeaders }).then(r => r.json() as Promise<Record<string, unknown>>),
            fetch(appendQuery(new URL("/v1/stats", endpoint).toString(), { exclude: config.sessionId }), { headers: authHeaders }).then(r => r.json() as Promise<Record<string, unknown>>),
          ]);
          if (all.error) { process.stderr.write(`  Error: ${all.error as string}\n\n`); return; }
          const totalAll = (all.total as number) ?? 0;
          const totalOthers = (others.total as number) ?? 0;
          const you = totalAll - totalOthers;
          const sessionsAll = (all.uniqueSessions as number) ?? 0;
          const sessionsOthers = (others.uniqueSessions as number) ?? 0;

          process.stdout.write(`  Total events:     ${totalAll}\n`);
          process.stdout.write(`  Your events:      ${you}\n`);
          process.stdout.write(`  Other events:     ${totalOthers}\n`);
          process.stdout.write(`  Unique sessions:  ${sessionsAll}  (${sessionsOthers} excluding you)\n`);
          process.stdout.write(`  Last 24h:         ${(all.last24h as number) ?? 0}  (${(others.last24h as number) ?? 0} excluding you)\n\n`);
        } catch {
          process.stderr.write("  Failed to fetch telemetry stats.\n\n");
        }
      } else {
        const effective = isTelemetryEnabled();
        process.stdout.write(`  Telemetry: ${effective ? "enabled" : "disabled"}\n`);
        process.stdout.write(`  Config:    telemetryEnabled=${String(config.telemetryEnabled)}\n`);
        if (envDisabled) {
          process.stdout.write(`  Override:  disabled via environment variable\n`);
        }
        process.stdout.write(`  Session:   ${config.sessionId}\n\n`);
        if (options?.verbose) {
          process.stdout.write("  Fields that may be sent when available:\n");
          for (const field of TELEMETRY_FIELDS) {
            process.stdout.write(`    - ${field}\n`);
          }
          process.stdout.write("\n  See PRIVACY.md for details and opt-out options.\n\n");
        }
      }
    });
}
