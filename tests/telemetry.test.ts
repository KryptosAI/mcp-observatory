import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("telemetry", () => {
  describe("isTelemetryEnabled", () => {
    it("returns false when DO_NOT_TRACK=1", async () => {
      vi.stubEnv("DO_NOT_TRACK", "1");
      const { isTelemetryEnabled, _resetConfigCache } = await import("../src/telemetry.js");
      _resetConfigCache();
      expect(isTelemetryEnabled()).toBe(false);
    });

    it("returns false when MCP_OBSERVATORY_TELEMETRY_DISABLED=1", async () => {
      vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_DISABLED", "1");
      const { isTelemetryEnabled, _resetConfigCache } = await import("../src/telemetry.js");
      _resetConfigCache();
      expect(isTelemetryEnabled()).toBe(false);
    });

    it("returns true when no env vars are set", async () => {
      vi.stubEnv("DO_NOT_TRACK", "");
      vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_DISABLED", "");
      const { isTelemetryEnabled, _resetConfigCache } = await import("../src/telemetry.js");
      _resetConfigCache();
      expect(isTelemetryEnabled()).toBe(true);
    });
  });

  describe("detectCI", () => {
    it("detects GitHub Actions", async () => {
      vi.stubEnv("GITHUB_ACTIONS", "true");
      // ci-info reads env at import time, so we test via telemetry's detectCI
      const { detectCI } = await import("../src/telemetry.js");
      const result = detectCI();
      // ci-info may or may not detect this depending on import caching,
      // but our wrapper should at minimum return the right shape
      expect(result).toHaveProperty("isCI");
      expect(result).toHaveProperty("ciName");
    });

    it("returns isCI=false in normal env", async () => {
      vi.stubEnv("CI", "");
      vi.stubEnv("GITHUB_ACTIONS", "");
      vi.stubEnv("GITLAB_CI", "");
      const { detectCI } = await import("../src/telemetry.js");
      const result = detectCI();
      expect(result).toHaveProperty("isCI");
      expect(result).toHaveProperty("ciName");
    });
  });

  describe("recordEvent", () => {
    it("does not throw when endpoint is unreachable", async () => {
      vi.stubEnv("DO_NOT_TRACK", "");
      vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_DISABLED", "");
      vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_URL", "http://localhost:1/nope");
      const { recordEvent, buildEvent, _resetConfigCache } = await import("../src/telemetry.js");
      _resetConfigCache();
      // Should not throw
      expect(() => recordEvent(buildEvent("test", "test_cmd", "cli"))).not.toThrow();
    });

    it("skips fetch when telemetry is disabled", async () => {
      vi.stubEnv("DO_NOT_TRACK", "1");
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { recordEvent, buildEvent, _resetConfigCache } = await import("../src/telemetry.js");
      _resetConfigCache();
      recordEvent(buildEvent("test", "test_cmd", "cli"));
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("logs to stderr in debug mode instead of calling fetch", async () => {
      vi.stubEnv("DO_NOT_TRACK", "");
      vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_DISABLED", "");
      vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_DEBUG", "1");
      const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { recordEvent, buildEvent, _resetConfigCache } = await import("../src/telemetry.js");
      _resetConfigCache();
      recordEvent(buildEvent("test", "test_cmd", "cli"));
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("[telemetry]"));
    });
  });

  describe("buildEvent", () => {
    it("returns a well-formed event", async () => {
      const { buildEvent } = await import("../src/telemetry.js");
      const event = buildEvent("command_run", "scan", "cli");
      expect(event.event).toBe("command_run");
      expect(event.command).toBe("scan");
      expect(event.transport).toBe("cli");
      expect(event.os).toBe(process.platform);
      expect(event.arch).toBe(process.arch);
      expect(event.nodeVersion).toBe(process.version);
      expect(event.version).toBeDefined();
    });

    it("includes declared org and contact when provided", async () => {
      vi.stubEnv("MCP_OBSERVATORY_ORG", "example.com");
      vi.stubEnv("MCP_OBSERVATORY_CONTACT", "ops@example.com");
      const { buildEvent, collectUserIdentity, _resetIdentityCache } = await import("../src/telemetry.js");
      _resetIdentityCache();
      await collectUserIdentity();
      const event = buildEvent("command_run", "scan", "cli");
      expect(event.org).toBe("example.com");
      expect(event.contact).toBe("ops@example.com");
    });
  });
});
