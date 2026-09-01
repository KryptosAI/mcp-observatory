import type { Command } from "commander";

import {
  identifyTelemetry,
  setTelemetryPreference,
  telemetryPreview,
  telemetryStatus,
} from "../telemetry.js";

const FIELD_GROUPS = [
  "installation, machine, fingerprint, session, run, and event identifiers",
  "hostname, Git email/remote, repository host/organization/name, and domains",
  "GitHub actor/repository/workflow/run/ref and CI provider",
  "command/feature sequence, transport, OS/architecture/Node/package versions",
  "target and installed-server IDs, sanitized commands, counts, scores, findings, outcomes, failures, and timing",
  "first-party, fixture, automation, environment, distribution, campaign, and notice provenance",
  "email/contact only when deliberately supplied through telemetry identify",
];

export function registerTelemetryCommands(program: Command): void {
  const telemetry = program
    .command("telemetry")
    .description("Manage identity-rich product telemetry.")
    .argument("[action]", "status, enable, disable, or preview", "status")
    .option("--verbose", "Show every category that may be collected.", false)
    .action(async (action: string, options: { verbose?: boolean }) => {
      if (action === "enable") {
        await setTelemetryPreference("enabled");
        process.stdout.write("  Telemetry enabled. The current notice has been accepted.\n\n");
        return;
      }
      if (action === "disable") {
        await setTelemetryPreference("disabled");
        process.stdout.write("  Telemetry disabled. Any unsent retry queue was removed.\n\n");
        return;
      }
      if (action === "preview") {
        process.stdout.write(JSON.stringify(await telemetryPreview(), null, 2) + "\n");
        return;
      }
      if (action !== "status") throw new Error("Telemetry action must be status, enable, disable, or preview.");
      const status = await telemetryStatus();
      process.stdout.write(`  Telemetry: ${status.enabled ? "enabled" : "disabled"}\n`);
      process.stdout.write(`  Preference: ${status.config.telemetryPreference}\n`);
      process.stdout.write(`  Jurisdiction mode: ${status.policy.mode}\n`);
      process.stdout.write(`  Notice: ${status.policy.noticeVersion}\n`);
      process.stdout.write(`  Installation: ${status.config.installationId}\n`);
      process.stdout.write(`  Machine: ${status.config.machineId}\n`);
      if (status.override) process.stdout.write(`  Environment override: ${status.override}\n`);
      if (options.verbose) {
        process.stdout.write("\n  Categories collected when available:\n");
        for (const group of FIELD_GROUPS) process.stdout.write(`    - ${group}\n`);
      }
      process.stdout.write("\n  Inspect an exact event with: mcp-observatory telemetry preview\n\n");
    });

  telemetry
    .command("identify")
    .description("Associate an explicitly supplied email with telemetry.")
    .requiredOption("-e, --email <email>", "Email address to associate with this installation.")
    .action(async (options: { email: string }) => {
      await identifyTelemetry(options.email);
      process.stdout.write("  Email associated with this installation for private analytics.\n\n");
    });
}
