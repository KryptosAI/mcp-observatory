import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workerPath = path.join(process.cwd(), "api", "src", "worker.ts");

describe("hosted Worker hardening", () => {
  it("keeps hosted scoring aligned with security-lite and invocation latency", async () => {
    const source = await readFile(workerPath, "utf8");
    expect(source).toContain('scoreDimension("Security", w.security, checks, ["security", "security-lite"])');
    expect(source).toContain("Object.values(metrics.toolInvokeMs)");
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
});
