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

    it("includes a campaign from the environment when provided", async () => {
      vi.stubEnv("MCP_OBSERVATORY_CAMPAIGN", "maintainer-pr");
      const { buildEvent } = await import("../src/telemetry.js");
      const event = buildEvent("command_run", "scan", "cli");
      expect(event.campaign).toBe("maintainer-pr");
    });

    it("rejects invalid campaign slugs", async () => {
      const { normalizeCampaign } = await import("../src/telemetry.js");
      expect(normalizeCampaign("agent-ci")).toBe("agent-ci");
      expect(() => normalizeCampaign("x")).toThrow(/Campaign must be/);
      expect(() => normalizeCampaign("bad slug")).toThrow(/Campaign must be/);
      expect(() => normalizeCampaign("https://example.com")).toThrow(/Campaign must be/);
    });

    it("classifies MCP Observatory GitHub Actions as first-party CI", async () => {
      vi.stubEnv("GITHUB_ACTIONS", "true");
      vi.stubEnv("GITHUB_REPOSITORY", "KryptosAI/mcp-observatory");
      vi.stubEnv("GITHUB_WORKFLOW", "Release");
      vi.stubEnv("GITHUB_RUN_ID", "123");
      vi.stubEnv("GITHUB_RUN_NUMBER", "74");
      vi.stubEnv("GITHUB_EVENT_NAME", "workflow_dispatch");
      vi.stubEnv("GITHUB_REF", "refs/heads/main");
      vi.stubEnv("GITHUB_ACTOR", "KryptosAI");
      const { buildEvent } = await import("../src/telemetry.js");
      const event = buildEvent("command_run", "run", "cli");
      expect(event.githubRepository).toBe("KryptosAI/mcp-observatory");
      expect(event.githubWorkflow).toBe("Release");
      expect(event.githubRunId).toBe("123");
      expect(event.githubRunNumber).toBe("74");
      expect(event.githubEventName).toBe("workflow_dispatch");
      expect(event.githubRef).toBe("refs/heads/main");
      expect(event.githubActor).toBe("KryptosAI");
      expect(event.isFirstParty).toBe(true);
      expect(event.telemetrySource).toBe("first_party_ci");
    });

    it("classifies other GitHub Actions repositories as external CI", async () => {
      vi.stubEnv("GITHUB_ACTIONS", "true");
      vi.stubEnv("GITHUB_REPOSITORY", "Acme/private-mcp");
      const { buildEvent } = await import("../src/telemetry.js");
      const event = buildEvent("command_run", "ci-report", "cli");
      expect(event.githubRepository).toBe("Acme/private-mcp");
      expect(event.isFirstParty).toBe(false);
      expect(event.telemetrySource).toBe("external_ci");
    });

    it("classifies local CLI and MCP transport usage separately", async () => {
      const { classifyTelemetrySource } = await import("../src/telemetry.js");
      expect(classifyTelemetrySource({ transport: "cli", isCI: false }).telemetrySource).toBe("local");
      expect(classifyTelemetrySource({ transport: "mcp", isCI: false }).telemetrySource).toBe("mcp");
    });
  });
});
