import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workerPath = path.join(process.cwd(), "api", "src", "worker.ts");

describe("hosted Worker hardening", () => {
  it("keeps hosted scoring aligned with security-lite and invocation latency", async () => {
    const source = await readFile(workerPath, "utf8");
    const scoreModel = await readFile(path.join(process.cwd(), "src", "score-model.ts"), "utf8");
    expect(source).toContain('from "../../src/score-model.js"');
    expect(source).toContain('computeScoreModel(checks, performanceMetrics, undefined, ["security", "security-lite"])');
    expect(scoreModel).toContain("Object.values(metrics.toolInvokeMs)");
  });

  it("requires hosted scan auth before rate limiting and target validation", async () => {
    const source = await readFile(workerPath, "utf8");
    const authIndex = source.indexOf("const authError = requireHostedScanAuth(request, env);");
    const rateLimitIndex = source.indexOf("const allowed = await checkRateLimit(ip, env.SCAN_CACHE);");
    const scanIndex = source.indexOf("const artifact = await scanHttpTarget(body.url);");

    expect(source).toContain("HOSTED_SCAN_TOKEN");
    expect(authIndex).toBeGreaterThan(0);
    expect(rateLimitIndex).toBeGreaterThan(authIndex);
    expect(scanIndex).toBeGreaterThan(rateLimitIndex);
  });

  it("uses cryptographic run IDs and defensive response headers", async () => {
    const source = await readFile(workerPath, "utf8");

    expect(source).toContain("crypto.getRandomValues(bytes)");
    expect(source).not.toContain("Math.random()");
    expect(source).toContain('"X-Content-Type-Options": "nosniff"');
    expect(source).toContain('"Referrer-Policy": "no-referrer"');
    expect(source).toContain("frame-ancestors 'none'");
    expect(source).toContain("...securityHeaders()");
  });
});
