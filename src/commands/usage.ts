import path from "node:path";
import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { z } from "zod";
import { UsageStore, writeUsageOutput, reportInputSchema, analyzeUsage, exportUsageRegression, usageRequests, startUsageReview } from "../usage/index.js";

export function registerUsageCommands(program: Command): void {
  const usage = program.command("usage").description("Local production call evidence and opted-in intent/outcome learning.");
  const directory = (value?: string) => value ?? path.join(process.cwd(), ".mcp-observatory", "usage");
  usage.command("feedback-template").description("Print a report for user review; does not collect or submit feedback.")
    .action(() => {
      process.stdout.write(JSON.stringify({ callIds: [], asked: "What did you ask?", expected: "What should have happened?", got: "What happened?",
        outcome: "unclear", provenance: "user_written", consent: { optedIn: false, userReviewed: false, reviewedAt: new Date().toISOString(), policyVersion: "your-notice-v1" }, excerpt: [],
      }, null, 2) + "\n");
    });
  usage.command("report").description("Save reviewed feedback and selected excerpts linked to calls.").argument("<file>", "User-reviewed JSON report; consent attestations must be true.")
    .option("--retention-days <days>", "Retention window; must match the SDK store (default 7).")
    .option("--dir <directory>", "Usage store directory.")
    .option("--redact <text...>", "Additional private strings to remove before writing.")
    .action(async (file: string, options: { retentionDays?: string; dir?: string; redact?: string[] }) => {
      const input = reportInputSchema.parse(JSON.parse(await readFile(file, "utf8")) as unknown);
      const event = await new UsageStore(directory(options.dir), { retentionDays: options.retentionDays === undefined ? undefined : Number(options.retentionDays) }).report(input, options.redact);
      process.stdout.write(JSON.stringify({ reportId: event.id }) + "\n");
    });
  usage.command("analyze").description("Group opted-in intents and inspect linked failure evidence.").option("--retention-days <days>", "Retention window; match the SDK store (default 7).")
    .option("--dir <directory>", "Usage store directory.")
    .option("--out <file>", "Save the JSON analysis.")
    .option("--embeddings <file>", "Local JSON map from request UUID to embedding vector; enables semantic clustering.")
    .option("--threshold <number>", "Cosine similarity threshold.")
    .action(async (options: { retentionDays?: string; dir?: string; out?: string; embeddings?: string; threshold?: string }) => {
      const events = await new UsageStore(directory(options.dir), { retentionDays: options.retentionDays === undefined ? undefined : Number(options.retentionDays) }).read();
      const embeddingMap = options.embeddings ? z.record(z.string().uuid(), z.array(z.number().finite())).parse(JSON.parse(await readFile(options.embeddings, "utf8")) as unknown) : undefined;
      const requests = usageRequests(events).filter(r => r.provenance !== "unavailable");
      const result = await analyzeUsage(events, {
        threshold: options.threshold === undefined ? undefined : Number(options.threshold),
        embed: embeddingMap ? () => Promise.resolve(requests.map(request => {
          const vector = embeddingMap[request.id] ?? request.reports.map(report => embeddingMap[report.id]).find(Boolean);
          if (!vector) throw new Error(`Missing embedding for request ${request.id}`);
          return vector;
        })) : undefined,
      });
      if (options.out) await writeUsageOutput(options.out, result);
      else process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    });
  usage.command("export").description("Export a feedback report as a reviewable regression case.").argument("<report-id>").requiredOption("--out <file>", "Regression-case JSON output.")
    .option("--retention-days <days>", "Retention window; must match the SDK store (default 7).")
    .option("--dir <directory>", "Usage store directory.")
    .action(async (reportId: string, options: { retentionDays?: string; out: string; dir?: string }) => {
      await writeUsageOutput(options.out, exportUsageRegression(await new UsageStore(directory(options.dir), { retentionDays: options.retentionDays === undefined ? undefined : Number(options.retentionDays) }).read(), reportId));
      process.stdout.write("Regression case saved; review fixture arguments and define the expected-outcome assertion before invoking a tool.\n");
    });
  usage.command("review").description("Open a local request-evidence screen with one-click dissatisfaction feedback.")
    .option("--dir <directory>", "Usage store directory.")
    .option("--port <port>", "Loopback port (default: choose an available port).", "0")
    .option("--retention-days <days>", "Retention window; match the SDK store (default 7).")
    .action(async (options: { dir?: string; port: string; retentionDays?: string }) => {
      const review = await startUsageReview(new UsageStore(directory(options.dir), { retentionDays: options.retentionDays === undefined ? undefined : Number(options.retentionDays) }), { port: Number(options.port) });
      process.stdout.write(`Review requests: ${review.url}\nLocal store: ${directory(options.dir)}\nPress Ctrl+C to stop.\n`);
      process.once("SIGINT", () => { void review.close(); });
      process.once("SIGTERM", () => { void review.close(); });
    });
  usage.command("prune").description("Delete expired usage records from the local store.").option("--retention-days <days>", "Retention window; match the SDK store (default 7).")
    .option("--dir <directory>", "Usage store directory.")
    .action(async (options: { retentionDays?: string; dir?: string }) => {
      process.stdout.write(JSON.stringify({ removed: await new UsageStore(directory(options.dir), { retentionDays: options.retentionDays === undefined ? undefined : Number(options.retentionDays) }).prune() }) + "\n");
    });
}
