import type { Command } from "commander";

import * as readline from "node:readline";

import { loadTelemetryConfig, saveTelemetryConfig, isTelemetryEnabled, buildEvent, recordEvent } from "../telemetry.js";
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
        const token = process.env["MCP_OBSERVATORY_STATS_TOKEN"];
        if (!token) {
          process.stderr.write("  No stats token configured.\n");
          process.stderr.write("  Set MCP_OBSERVATORY_STATS_TOKEN in the environment.\n\n");
          return;
        }
        const authHeaders = { Authorization: `Bearer ${token}` };
        try {
          const excludeSession = process.env["MCP_OBSERVATORY_STATS_EXCLUDE_SESSION"];
          const all = await fetch(new URL("/v1/stats", endpoint), { headers: authHeaders }).then(r => r.json() as Promise<Record<string, unknown>>);
          const others = excludeSession
            ? await fetch(appendQuery(new URL("/v1/stats", endpoint).toString(), { exclude: excludeSession }), { headers: authHeaders }).then(r => r.json() as Promise<Record<string, unknown>>)
            : undefined;
          if (all.error) { process.stderr.write(`  Error: ${all.error as string}\n\n`); return; }
          const totalAll = (all.total as number) ?? 0;
          const totalOthers = (others?.total as number | undefined) ?? 0;
          const you = excludeSession ? totalAll - totalOthers : undefined;
          const sessionsAll = (all.uniqueSessions as number) ?? 0;
          const sessionsOthers = (others?.uniqueSessions as number | undefined) ?? 0;
          const last24hAll = (all.last24h as number) ?? 0;
          const last24hOthers = (others?.last24h as number | undefined) ?? 0;

          process.stdout.write(`  Total events:     ${totalAll}\n`);
          if (you !== undefined) {
            process.stdout.write(`  Excluded events:  ${you}\n`);
            process.stdout.write(`  Other events:     ${totalOthers}\n`);
          }
          process.stdout.write(`  Unique sessions:  ${sessionsAll}${excludeSession ? `  (${sessionsOthers} excluding provided session)` : ""}\n`);
          process.stdout.write(`  Last 24h:         ${last24hAll}${excludeSession ? `  (${last24hOthers} excluding provided session)` : ""}\n\n`);
        } catch {
          process.stderr.write("  Failed to fetch telemetry stats.\n\n");
        }
      } else {
        const effective = isTelemetryEnabled();
        process.stdout.write(`  Telemetry: ${effective ? "enabled" : "disabled"}\n`);
        process.stdout.write("  You can opt into identity exchange: mcp-observatory telemetry identify\n");
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
    })
    .command("identify")
    .description("Share your email to receive benchmarks and insights")
    .option("-e, --email <email>", "Email address to associate with your usage")
    .action(async (options: { email?: string }) => {
      const config = await loadTelemetryConfig();

      if (options.email) {
        config.optedInEmail = options.email;
        await saveTelemetryConfig(config);
        console.log("\n✓ Thank you! Your email has been associated with your usage data.");
        console.log("  You'll receive periodic benchmarks and early access to features.\n");
        return;
      }

      console.log("\n  Want to see how your MCP security compares to other teams?");
      console.log("  Share your email to receive:");
      console.log("  • Industry benchmark (how you rank vs peers)");
      console.log("  • Weekly security digest");
      console.log("  • Early access to enterprise features");
      console.log("");

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const email: string = await new Promise((resolve) => {
        rl.question("  Email: ", (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });

      if (!email || !email.includes("@")) {
        console.log("\n  No valid email provided. Run again when ready.\n");
        return;
      }

      config.optedInEmail = email;
      await saveTelemetryConfig(config);

      console.log(`\n  ✓ Thank you, ${email}!`);
      console.log("  You'll receive your first benchmark report within 48 hours.\n");

      recordEvent(buildEvent("identity_exchange", "telemetry", "cli"));
    });
}
