import { randomUUID } from "node:crypto";
import { mkdtemp, rm, readdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { UsageStore, observeTool, analyzeUsage, exportUsageRegression, verifyUsageRegression, sanitizeValue, type ReportInput, type CallEvent } from "../src/usage/index.js";

const directories: string[] = [];
async function setup() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "observatory-usage-"));
  directories.push(directory);
  return new UsageStore(directory);
}
afterEach(async () => { await Promise.all(directories.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
function report(callIds: string[], asked = "Find overdue invoices"): ReportInput {
  return { callIds, asked, expected: "Only overdue invoices", got: "All invoices", outcome: "failure", provenance: "user_written",
    consent: { optedIn: true, userReviewed: true, reviewedAt: new Date().toISOString(), policyVersion: "v1" },
    excerpt: [{ role: "user", text: "No, I meant overdue invoices", provenance: "user_text" }],
  };
}

describe("production usage evidence", () => {
  it("preserves handler result and SDK context, captures safe fields and separates tool failures", async () => {
    const store = await setup();
    const result = { isError: true, content: [{ type: "text", text: "email=alice@example.com password=hunter2" }] };
    let id = "";
    const handler = observeTool({ store, server: "billing", tool: "find", argumentKeys: ["query", "password"], captureResult: true, redactions: ["customer-name"] },
      (args: Record<string, unknown>, ctx, extra: { marker: string }) => {
        id = ctx.callId;
        expect(extra.marker).toBe("sdk-context");
        expect(args.password).toBe("secret");
        return Promise.resolve(result);
      });
    expect(await handler({ query: "customer-name", password: "secret", hidden: "private" }, { marker: "sdk-context" })).toBe(result);
    const [event] = await store.read();
    expect(event).toMatchObject({ id, status: "tool_error", args: { query: "[REDACTED]", password: "[REDACTED]" } });
    expect((event as CallEvent).latencyMs).toBeGreaterThanOrEqual(0);
    const disk = await readFile(path.join(store.directory, `${id}.json`), "utf8");
    expect(disk).not.toMatch(/alice@example|hunter2|customer-name|private|"secret"/);
    expect((await stat(path.join(store.directory, `${id}.json`))).mode & 0o777).toBe(0o600);
  });
  it("defaults to metadata only and preserves thrown errors even if capture fails", async () => {
    const store = await setup();
    const failure = new Error("password=private");
    const handler = observeTool({ store, server: "s", tool: "t" }, () => Promise.reject(failure));
    await expect(handler({ token: "private" })).rejects.toBe(failure);
    expect(await store.read()).toMatchObject([{ status: "exception", args: {}, error: { message: "Handler threw (message omitted)" } }]);
    const unavailable = new UsageStore(path.join(store.directory, "file", "nested"));
    await writeFile(path.join(store.directory, "file"), "not a directory");
    let captureErrors = 0;
    const broken = observeTool({ store: unavailable, server: "s", tool: "t", onCaptureError: () => { captureErrors++; throw new Error("callback"); } }, () => Promise.reject(failure));
    await expect(broken({})).rejects.toBe(failure);
    expect(captureErrors).toBe(1);
    const ok = observeTool({ store: unavailable, server: "s", tool: "t" }, () => Promise.resolve({ content: [] }));
    await expect(ok({})).resolves.toEqual({ content: [] });
  });
  it("snapshots invocation arguments before a handler can mutate them", async () => {
    const store = await setup();
    const handler = observeTool({ store, server: "s", tool: "t", argumentKeys: ["query"] }, (args: { query: string }) => {
      args.query = "mutated";
      return Promise.resolve({ content: [] });
    });
    await handler({ query: "original" });
    expect((await store.read())[0]).toMatchObject({ args: { query: "original" } });
  });
  it("stores simultaneous invocations without conflating identical requests", async () => {
    const store = await setup();
    const handler = observeTool({ store, server: "s", tool: "t" }, () => Promise.resolve({ content: [] }));
    await Promise.all(Array.from({ length: 20 }, () => handler({})));
    const events = await store.read();
    expect(events).toHaveLength(20);
    expect(new Set(events.map(e => e.id)).size).toBe(20);
    expect(new Set(events.filter(e => e.kind === "call").map(e => e.correlationId)).size).toBe(20);
  });
  it("rejects unreviewed reports, unknown calls, future reviews and dishonest turn provenance", async () => {
    const store = await setup();
    const input = report([]);
    await expect(store.report({ ...input, consent: { ...input.consent, userReviewed: false } } as unknown as ReportInput)).rejects.toThrow();
    await expect(store.report({ ...input, consent: { ...input.consent, optedIn: false } } as unknown as ReportInput)).rejects.toThrow();
    await expect(store.report(report([randomUUID()]))).rejects.toThrow(/unknown/);
    await expect(store.report({ ...input, consent: { ...input.consent, reviewedAt: "2099-01-01T00:00:00Z" } })).rejects.toThrow(/future/);
    await expect(store.report({ ...input, excerpt: [{ role: "assistant", text: "made up", provenance: "user_text" }] })).rejects.toThrow(/provenance/);
    expect(await readdir(store.directory)).toHaveLength(0);
  });
  it("retains model-summary provenance and redacts only selected excerpts", async () => {
    const store = await setup();
    const saved = await store.report({ ...report([]), provenance: "model_summary", asked: "Find account for bob@example.com", excerpt: [{ role: "user", text: "Project Mercury", provenance: "model_summary" }] }, ["Mercury"]);
    expect(saved.provenance).toBe("model_summary");
    expect(saved.asked).not.toContain("bob@example.com");
    expect(saved.excerpt[0]).toEqual({ role: "user", text: "Project [REDACTED]", provenance: "model_summary" });
  });
  it("captures sanitized exception messages and keeps observed errors separate from feedback", async () => {
    const store = await setup();
    const handler = observeTool({ store, server: "s", tool: "t", captureErrorMessage: true }, () => Promise.reject(new Error("token=private bob@example.com")));
    await expect(handler({})).rejects.toThrow("token=private");
    const call = (await store.read())[0]!;
    const saved = await store.report(report([call.id]));
    const events = await store.read();
    expect(events[0]).toMatchObject({ error: { message: "token=[REDACTED] [REDACTED]" } });
    expect((await analyzeUsage(events)).clusters[0]).toMatchObject({ observedCallErrors: 1, reportedFailures: 1 });
    expect(exportUsageRegression(events, saved.id).consent.userReviewed).toBe(true);
    await expect(store.appendCall(call as CallEvent)).rejects.toThrow();
    expect(await store.read()).toHaveLength(2);
  });
  it("excludes expired evidence and physically prunes it", async () => {
    const store = await setup();
    await store.report(report([]));
    const future = new UsageStore(store.directory, { now: () => new Date(Date.now() + 8 * 86_400_000) });
    expect(await future.read()).toEqual([]);
    expect(await future.prune()).toBe(1);
    expect(await readdir(store.directory)).toEqual([]);
  });
  it("bounds nested/circular data and redacts sensitive keys and free-text tokens", () => {
    const circular: Record<string, unknown> = { authorization: "secret", text: "Bearer xyz sk-123456 ghp_abcdef" };
    circular.self = circular;
    expect(JSON.stringify(sanitizeValue(circular))).not.toMatch(/xyz|123456|abcdef|secret/);
    expect(JSON.stringify(sanitizeValue(circular))).toContain("DEPTH_LIMIT");
  });
});

describe("intent and breakdown analysis", () => {
  it("clusters related asks, distinguishes observed/reported/inferred evidence, and exports a failing then passing regression", async () => {
    const store = await setup();
    const broken = observeTool({ store, server: "billing", tool: "find", argumentKeys: ["overdue"], captureResult: true, transport: "http" }, () => Promise.resolve({ content: [{ type: "text", text: "all invoices" }] }));
    await broken({ overdue: true });
    const call = (await store.read())[0]!;
    const saved = await store.report(report([call.id]));
    await store.report(report([], "Find overdue invoices please"));
    await store.report(report([], "Schedule a calendar meeting"));
    const events = await store.read();
    const analysis = await analyzeUsage(events);
    expect(analysis.method).toBe("lexical_cosine");
    expect(analysis.clusters.map(c => c.count)).toEqual([2, 1]);
    const cluster = analysis.clusters[0]!;
    expect(cluster.reportedFailures).toBe(2);
    expect(cluster.observedCallErrors).toBe(0);
    expect(cluster.breakdowns).toContainEqual(expect.objectContaining({ evidence: "possible_user_correction", status: "inferred" }));
    const regression = exportUsageRegression(events, saved.id);
    expect(regression.cases[0]?.args).toEqual({ overdue: true });
    expect(regression.cases[0]?.cassetteFragment?.entries[1]?.result).toEqual({ content: [{ type: "text", text: "all invoices" }] });
    const assertOutcome = (value: string) => { if (value !== "overdue invoices") throw new Error("Wrong invoice filter"); };
    await expect(verifyUsageRegression({ args: { overdue: true }, invoke: () => Promise.resolve("all invoices"), assertOutcome })).rejects.toThrow("Wrong invoice filter");
    await expect(verifyUsageRegression({ args: regression.cases[0]?.args, invoke: () => Promise.resolve("overdue invoices"), assertOutcome })).resolves.toBe("overdue invoices");
  });
  it("supports semantic embeddings with unrelated words and rejects invalid providers", async () => {
    const store = await setup();
    await store.report(report([], "Find overdue invoices"));
    await store.report(report([], "Show unpaid bills"));
    const events = await store.read();
    expect((await analyzeUsage(events)).clusters).toHaveLength(2);
    expect((await analyzeUsage(events, { embed: () => Promise.resolve([[1, 0], [0.99, 0.01]]) })).clusters).toHaveLength(1);
    await expect(analyzeUsage(events, { embed: () => Promise.resolve([[1], [1, 2]]) })).rejects.toThrow(/Embedding/);
    await expect(analyzeUsage(events, { embed: () => Promise.resolve([[0], [0]]) })).rejects.toThrow(/Embedding/);
    await expect(analyzeUsage(events, { threshold: Number.NaN })).rejects.toThrow(/threshold/);
  });
  it("never fabricates a replay result when metadata only was recorded", async () => {
    const store = await setup();
    await observeTool({ store, server: "s", tool: "t" }, () => Promise.resolve({ content: [] }))({});
    const call = (await store.read())[0]!;
    const saved = await store.report(report([call.id]));
    const regression = exportUsageRegression(await store.read(), saved.id);
    expect(regression.cases[0]).not.toHaveProperty("cassetteFragment");
    expect(regression.cases[0]?.requiresArgumentReview).toBe(true);
  });
  it("provides a real CLI report-analysis-export flow", async () => {
    const store = await setup();
    await observeTool({ store, server: "s", tool: "t" }, () => Promise.resolve({ content: [] }))({});
    const call = (await store.read())[0]!;
    const input = path.join(store.directory, "report-input.json");
    await writeFile(input, JSON.stringify(report([call.id])));
    const run = (args: string[]) => execFileSync(path.resolve("node_modules/.bin/tsx"), [path.resolve("src/cli.ts"), "usage", ...args], { encoding: "utf8", env: { ...process.env, MCP_OBSERVATORY_TELEMETRY: "0", NO_COLOR: "1" } });
    const imported = JSON.parse(run(["report", input, "--dir", store.directory])) as { reportId: string };
    const analysis = JSON.parse(run(["analyze", "--dir", store.directory])) as { totalReports: number };
    expect(analysis.totalReports).toBe(1);
    const output = path.join(store.directory, "regression.json");
    run(["export", imported.reportId, "--dir", store.directory, "--out", output]);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ kind: "usage_regression", reportId: imported.reportId });
    expect(run(["feedback-template"])).toContain('"optedIn": false');
  }, 30000);
});
