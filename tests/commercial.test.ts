import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  hasValidToken: vi.fn(),
  whoami: vi.fn(),
}));

// Keep these wrapper tests hermetic: a developer's real auth file must never
// affect assertions or appear in failure output. auth.test.ts covers storage.
vi.mock("../src/auth.js", () => authMocks);

import {
  cloudUpgradeLine,
  hasCloudToken,
  maybePrintCloudCta,
  printCloudInfo,
  getCloudAccessToken,
  cloudWhoami,
  getCloudUploadEndpoint,
  DEFAULT_CLOUD_UPLOAD_ENDPOINT,
} from "../src/commercial.js";
import { setQuiet } from "../src/commands/helpers.js";

const originalEnv = { ...process.env };
const originalTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.getAccessToken.mockResolvedValue(null);
  authMocks.hasValidToken.mockReturnValue(false);
  authMocks.whoami.mockResolvedValue({ authenticated: false });
});

afterEach(() => {
  process.env = { ...originalEnv };
  setQuiet(false);
  vi.restoreAllMocks();
  if (originalTTY) Object.defineProperty(process.stdout, "isTTY", originalTTY);
  else Reflect.deleteProperty(process.stdout, "isTTY");
});

function captureStdout(): { output: () => string } {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  });
  return { output: () => chunks.join("") };
}

describe("commercial cloud messaging", () => {
  it("detects whether a cloud token is configured", () => {
    delete process.env["MCP_OBSERVATORY_CLOUD_TOKEN"];
    expect(hasCloudToken()).toBe(false);

    process.env["MCP_OBSERVATORY_CLOUD_TOKEN"] = "token";
    expect(hasCloudToken()).toBe(true);
  });

  it("offers the same optional ClearFrame workflow for every gate and context", () => {
    process.env["NO_COLOR"] = "1";
    for (const context of ["ci", "security", "fleet", "general"] as const) {
      expect(cloudUpgradeLine(context)).toContain("mcp-observatory clearframe");
      expect(cloudUpgradeLine(context)).not.toMatch(/pricing|\$29|subscription/);
    }
  });

  it("keeps promotional output off stdout and suppresses it in quiet, CI, redirected, and opt-out contexts", () => {
    const stdout = captureStdout();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
    delete process.env["CI"];
    maybePrintCloudCta("ci", "fail");
    expect(stdout.output()).toBe("");
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("Continue in ClearFrame"));
    stderr.mockClear();
    setQuiet(true); maybePrintCloudCta(); setQuiet(false);
    process.env["CI"] = "true"; maybePrintCloudCta(); delete process.env["CI"];
    process.env["MCP_OBSERVATORY_NO_PROMO"] = "1"; maybePrintCloudCta(); delete process.env["MCP_OBSERVATORY_NO_PROMO"];
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true }); maybePrintCloudCta();
    expect(stderr).not.toHaveBeenCalled();
  });

  it("prints free local alternatives without an Observatory checkout", () => {
    const stdout = captureStdout();
    printCloudInfo();
    expect(stdout.output()).toContain("free and open source under MIT");
    expect(stdout.output()).toContain("dashboard");
    expect(stdout.output()).toContain("clearframecode.com/download/");
    expect(stdout.output()).not.toMatch(/Individual Pro|Release Gate Pilot|\$29/);
  });

  it("getCloudAccessToken prefers env token over stored token", async () => {
    process.env["MCP_OBSERVATORY_CLOUD_TOKEN"] = "env-token";
    expect(await getCloudAccessToken()).toBe("env-token");
    expect(authMocks.getAccessToken).not.toHaveBeenCalled();

    delete process.env["MCP_OBSERVATORY_CLOUD_TOKEN"];
    // Falls back through the mocked auth boundary, never developer storage.
    expect(await getCloudAccessToken()).toBeNull();
    expect(authMocks.getAccessToken).toHaveBeenCalledOnce();
  });

  it("cloudWhoami returns unauthenticated when no token exists", async () => {
    delete process.env["MCP_OBSERVATORY_CLOUD_TOKEN"];
    const info = await cloudWhoami();
    expect(info.authenticated).toBe(false);
    expect(authMocks.whoami).toHaveBeenCalledOnce();
  });

  it("allows hosted upload endpoint overrides while preserving the production default", () => {
    delete process.env["MCP_OBSERVATORY_CLOUD_ENDPOINT"];
    delete process.env["MCP_OBSERVATORY_CLOUD_URL"];
    expect(getCloudUploadEndpoint()).toBe(DEFAULT_CLOUD_UPLOAD_ENDPOINT);

    process.env["MCP_OBSERVATORY_CLOUD_URL"] = "https://selfhost.example/";
    expect(getCloudUploadEndpoint()).toBe("https://selfhost.example/api/v1/artifacts");

    process.env["MCP_OBSERVATORY_CLOUD_ENDPOINT"] = "https://staging.example/api/v1/artifacts";
    expect(getCloudUploadEndpoint()).toBe("https://staging.example/api/v1/artifacts");
  });
});
