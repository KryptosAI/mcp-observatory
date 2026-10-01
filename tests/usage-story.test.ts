import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { UsageStore, observeTool, usageRequests, analyzeUsage, startUsageReview, type ReportInput, type CallEvent } from "../src/usage/index.js";
const dirs: string[] = [];
const closers: Array<() => Promise<void>> = [];
async function store() { const dir = await mkdtemp(path.join(os.tmpdir(), "usage-story-")); dirs.push(dir); return new UsageStore(dir); }
afterEach(async () => { await Promise.all(closers.splice(0).map(close => close())); await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
const consent = (): ReportInput["consent"] => ({ optedIn: true, userReviewed: true, reviewedAt: new Date().toISOString(), policyVersion: "test-v1" });

describe("MCP product-team acceptance criteria", () => {
  it("AC1: captures tool args, exact sanitized tool error and latency without opting in to result payloads", async () => {
    const local = await store();
    const handler = observeTool({ store: local, server: "billing", tool: "search", argumentKeys: ["query", "token"], captureErrorMessage: true },
      () => Promise.resolve({ isError: true, content: [{ type: "text", text: "Search unavailable for jane@example.com token=private" }] }));
    await handler({ query: "overdue invoices", token: "private", secretNote: "do not capture" });
    const event = (await local.read())[0] as CallEvent;
    expect(event).toMatchObject({ tool: "search", args: { query: "overdue invoices", token: "[REDACTED]" }, status: "tool_error", error: { message: "Search unavailable for [REDACTED] token=[REDACTED]" } });
    expect(event.latencyMs).toBeGreaterThanOrEqual(0);
    expect(event).not.toHaveProperty("result");
  });
  it("AC2: captures an explicit summary proxy, prefers original text, and labels missing context honestly", async () => {
    const local = await store();
    await observeTool({ store: local, server: "s", tool: "t", requestContext: args => ({ text: String(args.summary), provenance: "model_summary" }) }, () => Promise.resolve({}))({ summary: "Find unpaid bills for jane@example.com" });
    expect(usageRequests(await local.read())[0]).toMatchObject({ asked: "Find unpaid bills for [REDACTED]", provenance: "model_summary" });
    const captured = await local.read();
    await local.report({ callIds: [captured[0]!.id], asked: "Find overdue invoices", expected: "Overdue only", got: "All invoices", outcome: "failure", provenance: "user_written", consent: consent() });
    expect(usageRequests(await local.read())[0]).toMatchObject({ asked: "Find overdue invoices", provenance: "user_written" });
    await observeTool({ store: local, server: "s", tool: "t" }, () => Promise.resolve({}))({ privateText: "unshared" });
    expect(usageRequests(await local.read()).find(r => r.provenance === "unavailable")?.asked).toContain("not captured");
  });
  it("AC3: one flag links a multi-tool request, repeated flags are idempotent and require consent", async () => {
    const local = await store(), requestId = randomUUID();
    const options = { store: local, server: "s", correlationId: () => requestId,
      requestContext: () => ({ text: "Find overdue invoices", provenance: "model_summary" as const }) };
    await observeTool({ ...options, tool: "search" }, () => Promise.resolve({}))({});
    await observeTool({ ...options, tool: "format" }, () => Promise.resolve({}))({});
    const calls = await local.read();
    const flagged = await Promise.all([local.flag(calls[0]!.id, consent()), local.flag(calls[1]!.id, consent())]);
    const report = flagged[0];
    expect(flagged[1].id).toBe(report.id);
    expect(new Set(report.callIds)).toEqual(new Set(calls.map(c => c.id)));
    expect(report).toMatchObject({ flag: true, outcome: "failure", asked: "Find overdue invoices", provenance: "model_summary" });
    expect((await local.flag(calls[1]!.id, consent())).id).toBe(report.id);
    expect((await local.read()).filter(e => e.kind === "report")).toHaveLength(1);
    await expect(local.flag(calls[0]!.id, { ...consent(), optedIn: false } as unknown as ReportInput["consent"])).rejects.toThrow();
    await expect(local.flag(randomUUID(), consent())).rejects.toThrow(/expired/);
  });
  it("AC4: groups all captured intents, ranks failures, and excludes unknown satisfaction from rates", async () => {
    const local = await store();
    const invoke = (text: string, intent: string, error = false) => observeTool({ store: local, server: "s", tool: "t", requestContext: () => ({ text, intent, provenance: "model_summary" }) }, () => Promise.resolve({ isError: error }))({});
    await invoke("Find overdue invoices", "invoice-search", true);
    await invoke("Show unpaid bills", "invoice-search");
    await invoke("Make a meeting", "calendar");
    const analysis = await analyzeUsage(await local.read());
    expect(analysis.totalRequests).toBe(3);
    expect(analysis.totalReports).toBe(0);
    expect(analysis.clusters[0]).toMatchObject({ label: "invoice-search", count: 2, failureRequests: 1, knownOutcomes: 1, unknownOutcomes: 1, failureRate: 1 });
    expect(analysis.clusters[1]).toMatchObject({ label: "calendar", failureRate: null, unknownOutcomes: 1 });
  });
  it("AC5: stores only safe selected data at a chosen location; the handler still receives original args", async () => {
    const local = await store();
    let original = "";
    await observeTool({ store: local, server: "s", tool: "t", argumentKeys: ["query", "password"], redactions: ["Customer Mercury"],
      requestContext: args => ({ text: String(args.summary), provenance: "model_summary" }) }, args => { original = String(args.password); return Promise.resolve({}); })({ query: "Customer Mercury", password: "private", summary: "Customer Mercury jane@example.com", omitted: "private note" });
    expect(original).toBe("private");
    const event = (await local.read())[0]!;
    const saved = await readFile(path.join(local.directory, `${event.id}.json`), "utf8");
    expect(saved).not.toMatch(/private|Mercury|jane@example.com/);
    expect(saved).toContain("[REDACTED]");
  });
  it("preserves captured original wording over a later model summary and uses safe args only as a labeled fallback", async () => {
    const local = await store();
    await observeTool({ store: local, server: "s", tool: "t", requestContext: () => ({ text: "Find only my overdue invoices", provenance: "user_written" }) }, () => Promise.resolve({}))({});
    const call = (await local.read())[0]!;
    await local.report({ callIds: [call.id], asked: "Find invoices", expected: "Useful invoices", got: "All invoices", outcome: "failure", provenance: "model_summary", consent: consent() });
    expect(usageRequests(await local.read())[0]).toMatchObject({ asked: "Find only my overdue invoices", provenance: "user_written" });
    await observeTool({ store: local, server: "s", tool: "t", argumentKeys: ["query"] }, () => Promise.resolve({}))({ query: "overdue", request_summary: "PRIVATE UNCONSENTED PROMPT" });
    const fallback = usageRequests(await local.read()).find(r => r.provenance === "tool_args")!;
    expect(fallback.asked).toBe('{"query":"overdue"}');
    expect(JSON.stringify(await local.read())).not.toContain("UNCONSENTED");
  });
  it("malformed context callbacks fail open without capturing their private values or changing the tool result", async () => {
    const local = await store(); let failures = 0;
    const returned = { content: [{ type: "text", text: "unchanged" }] };
    const invoke = observeTool({ store: local, server: "s", tool: "t", correlationId: () => "invalid",
      requestContext: () => ({ text: "PRIVATE", provenance: "bad" as "user_written" }), onCaptureError: () => { failures++; } }, () => Promise.resolve(returned));
    expect(await invoke({})).toBe(returned);
    expect(failures).toBe(2);
    expect((await local.read())[0]).not.toHaveProperty("request");
    expect(JSON.stringify(await local.read())).not.toContain("PRIVATE");
  });
  it("explicit report links combine calls once and expired evidence remains visibly missing", async () => {
    const local = await store();
    const invoke = observeTool({ store: local, server: "s", tool: "t", argumentKeys: ["query"] }, () => Promise.resolve({}));
    await invoke({ query: "invoices" }); await invoke({ query: "bills" });
    const calls = await local.read();
    await local.report({ callIds: calls.map(c => c.id), asked: "Find invoices", expected: "Overdue", got: "All", outcome: "failure", provenance: "user_written", consent: consent() });
    expect((await analyzeUsage(await local.read())).totalRequests).toBe(1);
    await rm(path.join(local.directory, `${calls[0]!.id}.json`));
    expect(usageRequests(await local.read())[0]).toMatchObject({ missingCallIds: [calls[0]!.id], outcome: "failure" });
    const review = await startUsageReview(local); closers.push(review.close);
    expect(await (await fetch(review.url)).text()).toContain("Some linked calls are no longer retained");
  });
  it("provides an actual local review API with one-step linked feedback and protects evidence from other origins", async () => {
    const local = await store();
    await observeTool({ store: local, server: "s", tool: "t", requestContext: () => ({ text: '<script>alert("xss")</script>', provenance: "model_summary" }) }, () => Promise.resolve({}))({});
    const review = await startUsageReview(local); closers.push(review.close);
    const html = await (await fetch(review.url)).text();
    const config = JSON.parse(/const config=(.*?);let data/.exec(html)![1]!) as { token: string };
    expect(html).toContain("This wasn't what I wanted");
    expect(html).not.toContain('<script>alert("xss")');
    expect((await fetch(review.url + "/api/requests")).status).toBe(403);
    expect((await fetch(review.url + "/api/requests", { headers: { "x-usage-token": config.token, Origin: "https://evil.example" } })).status).toBe(403);
    const before = await (await fetch(review.url + "/api/requests", { headers: { "x-usage-token": config.token } })).json() as { requests: Array<{ calls: Array<{ id: string }> }> };
    const response = await fetch(review.url + "/api/flag/" + before.requests[0]!.calls[0]!.id, { method: "POST", headers: { "x-usage-token": config.token } });
    expect(response.status).toBe(200);
    const result = await response.json() as { reportId: string; callIds: string[] };
    expect(result.callIds).toEqual([before.requests[0]!.calls[0]!.id]);
    const exported = await fetch(review.url + "/api/export/" + result.reportId, { headers: { "x-usage-token": config.token } });
    expect(exported.status).toBe(200);
    expect(await exported.json()).toMatchObject({ reportId: result.reportId, asked: '<script>alert("xss")</script>', consent: { optedIn: true, userReviewed: true } });
  });
});
