import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { cleanupExpiredScans, type Env } from "../src/worker.js";
import { createSessionToken, verifySessionToken } from "../src/auth.js";
import { MemoryKV, testDatabase } from "./d1.js";

const databases: ReturnType<typeof testDatabase>[] = [];
afterEach(() => { vi.restoreAllMocks(); for (const item of databases.splice(0)) item.sqlite.close(); });
async function fixture() {
  const data = testDatabase(); databases.push(data);
  data.sqlite.exec("INSERT INTO orgs(id,domain) VALUES(1,'one'),(2,'two'); INSERT INTO users(id,github_id,github_login,org_id) VALUES(1,'one','one',1),(2,'two','two',2); INSERT INTO entitlements(user_id) VALUES(1),(2);");
  const env: Env = { DB: data.db, SCAN_CACHE: new MemoryKV() as unknown as KVNamespace, SESSION_SECRET: "fixture-only-session-secret-with-sufficient-entropy", APP_BASE_URL: "https://observatory.example" };
  const tokens = await Promise.all([1, 2].map(userId => createSessionToken({ sub: `github:${userId}`, userId }, env.SESSION_SECRET!)));
  const call = (route: string, options: RequestInit = {}, user = 1) => worker.fetch(new Request(`https://observatory.example${route}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${tokens[user - 1]!}` } }), env);
  return { ...data, env, tokens, call };
}
function artifact(runId: string, targetId = "server-a") {
  return { artifactType: "run", schemaVersion: "1.0.0", gate: "pass", runId, createdAt: new Date().toISOString(), toolVersion: "test",
    target: { targetId, adapter: "http", command: "", args: [], url: "https://public.example/mcp" },
    environment: { platform: "fixture", nodeVersion: "24" },
    summary: { total: 1, pass: 1, fail: 0, partial: 0, unsupported: 0, flaky: 0, skipped: 0, gate: "pass" },
    checks: [{ id: "tools", capability: "tools", status: "pass", durationMs: 1, message: "<script>untrusted()</script>", evidence: [] }],
    healthScore: { overall: 90, grade: "A", dimensions: [] },
  };
}

describe("MIT hosted Observatory", () => {
  it("keeps health public and requires authorization before any scan", async () => {
    const { env } = await fixture();
    expect((await worker.fetch(new Request("https://observatory.example/api/v1/health"), env)).status).toBe(200);
    const request = new Request("https://observatory.example/api/v1/scan", { method: "POST", body: JSON.stringify({ url: "http://127.0.0.1" }) });
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect((await worker.fetch(request, env)).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("grants history, CI ingestion and downloads without a paid plan while preserving tenancy", async () => {
    const { call } = await fixture();
    const entitlement = await call("/api/entitlements");
    expect(await entitlement.json()).toMatchObject({ plan: "free", permissions: { canViewHistory: true, canDownloadArtifacts: true, canHostedScan: true } });
    for (const runId of ["run-one", "run-two"]) {
      const value = artifact(runId, runId);
      const uploaded = await call("/api/v1/artifacts", { method: "POST", body: JSON.stringify(value), headers: { "X-MCP-Observatory-Org": "victim" } });
      expect(uploaded.status).toBe(200);
    }
    const index = await call("/api/v1/artifacts/github-user-1");
    const body: unknown = await index.json();
    expect(body).toHaveProperty("lockedHistoryCount", 0);
    expect(body).toHaveProperty("artifacts", expect.arrayContaining([expect.objectContaining({ runId: "run-one" }), expect.objectContaining({ runId: "run-two" })]));
    expect((await call("/api/v1/artifacts/github-user-1/run-one")).status).toBe(200);
    expect((await call("/api/v1/artifacts/github-user-1/run-one", {}, 2)).status).toBe(403);
    const report = await (await call("/results/run-one")).text();
    expect(report).toContain("&lt;script&gt;untrusted()&lt;/script&gt;");
    expect(report).not.toContain("<script>untrusted()");
    expect(report).toContain("Download original JSON");
  });

  it("retains hosted capacity and payload limits without offering checkout", async () => {
    const { call, sqlite } = await fixture();
    const large = { ...artifact("large"), padding: "x".repeat(2 * 1024 * 1024) };
    expect((await call("/api/v1/artifacts", { method: "POST", body: JSON.stringify(large) })).status).toBe(413);
    sqlite.prepare("INSERT INTO monthly_usage(user_id,month,uploads) VALUES(1,?,10000)").run(new Date().toISOString().slice(0, 7));
    const capacity = await call("/api/v1/artifacts", { method: "POST", body: JSON.stringify(artifact("capacity")) });
    expect(capacity.status).toBe(429);
    expect((await call("/stripe/checkout", { method: "POST", body: "{}" })).status).toBe(404);
  });

  it("blocks private, credential-bearing and non-HTTP targets without issuing target requests", async () => {
    const { call } = await fixture();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    for (const url of ["http://127.0.0.1/mcp", "http://[fd00::1]/mcp", "file:///etc/passwd", "https://user:secret@public.example/mcp"]) {
      expect((await call("/api/v1/scan", { method: "POST", body: JSON.stringify({ url }) })).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes expired hosted receipts without touching another account's retained evidence", async () => {
    const { call, env, sqlite } = await fixture();
    await call("/api/v1/artifacts", { method: "POST", body: JSON.stringify(artifact("expired")) });
    await call("/api/v1/artifacts", { method: "POST", body: JSON.stringify(artifact("retained")) }, 2);
    sqlite.prepare("UPDATE server_scans SET retention_deadline=datetime('now','-1 day') WHERE run_id='expired'").run();
    expect(await cleanupExpiredScans(env)).toMatchObject({ scansDeleted: 1 });
    expect((await call("/results/expired")).status).toBe(404);
    expect((await call("/results/retained", {}, 2)).status).toBe(200);
  });

  it("verifies signed sessions and rejects another deployment's signing secret", async () => {
    const { tokens, env } = await fixture();
    expect(await verifySessionToken(tokens[0]!, env.SESSION_SECRET!)).toMatchObject({ userId: 1 });
    expect(await verifySessionToken(tokens[0]!, "a-different-fixture-secret")).toBeNull();
  });
});
