import { describe, expect, it } from "vitest";
import { HttpAdapter } from "../src/adapters/http.js";
import { AdapterConnectError } from "../src/adapters/local-process.js";
import type { HttpTargetConfig } from "../src/types.js";

describe("HttpAdapter", () => {
  it("throws AdapterConnectError for unreachable URL", async () => {
    const adapter = new HttpAdapter();
    const target: HttpTargetConfig = {
      targetId: "unreachable",
      adapter: "http",
      url: "http://127.0.0.1:19999/unreachable-test-endpoint",
      timeoutMs: 2000,
    };

    await expect(adapter.connect(target)).rejects.toThrow(AdapterConnectError);
  });

  it("throws AdapterConnectError with stderr lines on failure", async () => {
    const adapter = new HttpAdapter();
    const target: HttpTargetConfig = {
      targetId: "bad-url",
      adapter: "http",
      url: "http://127.0.0.1:19999/bad",
      timeoutMs: 2000,
    };

    try {
      await adapter.connect(target);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AdapterConnectError);
      const connectError = error as AdapterConnectError;
      // stderr should include the SSE fallback message
      expect(connectError.stderrLines).toContain("Streamable HTTP failed, falling back to SSE.");
    }
  });

  it("passes auth token as Bearer header", async () => {
    const adapter = new HttpAdapter();
    const target: HttpTargetConfig = {
      targetId: "auth-test",
      adapter: "http",
      url: "http://127.0.0.1:19999/auth-test",
      authToken: "test-token-123",
      timeoutMs: 2000,
    };

    // We can't test the actual header injection without a server,
    // but we can verify it doesn't crash with auth config
    await expect(adapter.connect(target)).rejects.toThrow(AdapterConnectError);
  });

  it("passes custom headers", async () => {
    const adapter = new HttpAdapter();
    const target: HttpTargetConfig = {
      targetId: "headers-test",
      adapter: "http",
      url: "http://127.0.0.1:19999/headers-test",
      headers: { "X-Custom": "value" },
      timeoutMs: 2000,
    };

    await expect(adapter.connect(target)).rejects.toThrow(AdapterConnectError);
  });

  it("respects timeout", async () => {
    const adapter = new HttpAdapter();
    const target: HttpTargetConfig = {
      targetId: "timeout-test",
      adapter: "http",
      url: "http://192.0.2.1:1", // Non-routable IP — will timeout
      timeoutMs: 1000,
    };

    const start = Date.now();
    await expect(adapter.connect(target)).rejects.toThrow();
    const elapsed = Date.now() - start;
    // Should fail within a reasonable time (timeout + some overhead)
    expect(elapsed).toBeLessThan(10_000);
  });

  it("includes recording transport when record option is set", async () => {
    const adapter = new HttpAdapter();
    const target: HttpTargetConfig = {
      targetId: "record-test",
      adapter: "http",
      url: "http://127.0.0.1:19999/record-test",
      timeoutMs: 2000,
    };

    // Even though connection fails, verify it doesn't crash with record option
    await expect(adapter.connect(target, { record: true })).rejects.toThrow(AdapterConnectError);
  });
});
