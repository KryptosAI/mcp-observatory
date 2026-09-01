import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  _flushTelemetryForTests,
  _resetTelemetryForTests,
  buildEvent,
  identifyTelemetry,
  initializeTelemetry,
  isTelemetryEnabled,
  loadTelemetryConfig,
  recordEvent,
  setTelemetryPreference,
} from "../src/telemetry.js";

let telemetryDirectory: string;

function policy(mode: "notice-and-opt-out" | "prior-consent"): Response {
  return Response.json({ mode, noticeVersion: "2026-09-01", schemaVersion: 2 });
}

beforeEach(async () => {
  telemetryDirectory = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-telemetry-test-"));
  vi.stubEnv("MCP_OBSERVATORY_CONFIG_DIR", telemetryDirectory);
  vi.stubEnv("NODE_ENV", "");
  vi.stubEnv("DO_NOT_TRACK", "");
  vi.stubEnv("MCP_OBSERVATORY_TELEMETRY", "");
  vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_DISABLED", "");
  vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_URL", "https://telemetry.example.test/v1/events");
  vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_POLICY_URL", "https://telemetry.example.test/v1/policy");
  _resetTelemetryForTests();
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(telemetryDirectory, { recursive: true, force: true });
});

describe("collection precedence", () => {
  it("requires an affirmative choice in prior-consent mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(policy("prior-consent"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await initializeTelemetry({ showNotice: false })).toBe(false);
    expect(isTelemetryEnabled()).toBe(false);
    expect((await loadTelemetryConfig()).telemetryPreference).toBe("unset");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("enables after notice in notice-and-opt-out mode", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(policy("notice-and-opt-out")));
    expect(await initializeTelemetry({ showNotice: false })).toBe(true);
    expect(isTelemetryEnabled()).toBe(true);
    expect((await loadTelemetryConfig()).telemetryPreference).toBe("enabled");
  });

  it("lets explicit disable and DO_NOT_TRACK override policy", async () => {
    vi.stubEnv("DO_NOT_TRACK", "1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await initializeTelemetry({ showNotice: false })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("payload construction and delivery", () => {
  it("sends the rich identifiers while dropping unknown fields and redacting secrets", async () => {
    vi.stubEnv("MCP_OBSERVATORY_CONTACT", "implicit-contact@example.test");
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn((input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();
      requests.push({ url, init });
      return Promise.resolve(url.endsWith("/v1/policy") ? policy("notice-and-opt-out") : Response.json({ ok: true }));
    }));
    await initializeTelemetry({ showNotice: false });
    recordEvent(buildEvent("command_complete", "test", "cli", {
      targetIds: ["real-server"],
      serverCommands: ["node server.js --token=ghp_abcdefghijklmnopqrstuvwxyz --password hunter2"],
      fatalError: "password=hunter2",
      rawMcpMessage: "must not leave the process",
    }));
    await _flushTelemetryForTests();
    const posted = requests.find((request) => request.init?.method === "POST");
    expect(posted).toBeDefined();
    const postedBody = posted?.init?.body;
    expect(typeof postedBody).toBe("string");
    const body = JSON.parse(postedBody as string) as Record<string, unknown>;
    expect(body).toMatchObject({ schemaVersion: 2, noticeVersion: "2026-09-01", event: "command_complete" });
    expect(body.installationId).toEqual(expect.any(String));
    expect(body.machineId).toEqual(expect.any(String));
    expect(body.machineFingerprint).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(JSON.stringify(body)).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz");
    expect(JSON.stringify(body)).not.toContain("implicit-contact@example.test");
    expect(body).not.toHaveProperty("rawMcpMessage");
  });

  it("never executes or fetches a hostile non-HTTP endpoint", async () => {
    vi.stubEnv("MCP_OBSERVATORY_TELEMETRY", "1");
    vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_URL", "file:///tmp/telemetry;touch-pwned");
    vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_POLICY_URL", "javascript:alert(1)");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await initializeTelemetry({ showNotice: false })).toBe(true);
    recordEvent(buildEvent("command_run", "scan; touch pwned", "cli"));
    await _flushTelemetryForTests();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects cleartext telemetry endpoints outside loopback", async () => {
    vi.stubEnv("MCP_OBSERVATORY_TELEMETRY", "1");
    vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_URL", "http://telemetry.example.test/v1/events");
    vi.stubEnv("MCP_OBSERVATORY_TELEMETRY_POLICY_URL", "http://telemetry.example.test/v1/policy");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await initializeTelemetry({ showNotice: false })).toBe(true);
    recordEvent(buildEvent("command_run", "scan", "cli"));
    await _flushTelemetryForTests();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("queues failed delivery and removes the queue on opt-out", async () => {
    vi.stubGlobal("fetch", vi.fn((input: string | URL | Request): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.endsWith("/v1/policy")) return Promise.resolve(policy("notice-and-opt-out"));
      return Promise.reject(new Error("offline"));
    }));
    await initializeTelemetry({ showNotice: false });
    recordEvent(buildEvent("command_run", "scan", "cli"));
    await _flushTelemetryForTests();
    await expect(access(path.join(telemetryDirectory, "telemetry-queue.json"))).resolves.toBeUndefined();
    await setTelemetryPreference("disabled");
    await expect(access(path.join(telemetryDirectory, "telemetry-queue.json"))).rejects.toThrow();
  });
});

describe("local privacy controls", () => {
  it("writes owner-only configuration permissions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(policy("notice-and-opt-out")));
    await initializeTelemetry({ showNotice: false });
    const configFile = path.join(telemetryDirectory, "config.json");
    expect(JSON.parse(await readFile(configFile, "utf8"))).toHaveProperty("installationId");
    if (process.platform !== "win32") expect((await stat(configFile)).mode & 0o777).toBe(0o600);
  });

  it("validates deliberately supplied identity email", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(policy("prior-consent")));
    await expect(identifyTelemetry("not-an-email")).rejects.toThrow(/valid email/);
  });
});
