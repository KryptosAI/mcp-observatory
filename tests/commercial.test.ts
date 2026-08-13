import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  process.env = { ...originalEnv };
  setQuiet(false);
  vi.restoreAllMocks();
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

  it("renders context-specific upgrade lines without color when NO_COLOR is set", () => {
    process.env["NO_COLOR"] = "1";

    expect(cloudUpgradeLine("ci")).toContain("hosted CI history");
    expect(cloudUpgradeLine("security")).toContain("hosted security reports");
    expect(cloudUpgradeLine("fleet")).toContain("MCP fleet visibility");
    expect(cloudUpgradeLine("general")).toContain("hosted reporting");
    expect(cloudUpgradeLine()).toContain("https://app.mcp-observatory.com/pricing?plan=individual");
    expect(cloudUpgradeLine("ci")).toContain("https://app.mcp-observatory.com/pricing?plan=team");
    expect(cloudUpgradeLine()).toContain("mcp-observatory cloud login");
  });

  it("prints a CTA only when a cloud token is absent", () => {
    process.env["NO_COLOR"] = "1";
    delete process.env["MCP_OBSERVATORY_CLOUD_TOKEN"];
    const first = captureStdout();

    maybePrintCloudCta("ci");

    expect(first.output()).toContain("Production MCP teams");
    expect(first.output()).toContain("hosted CI history");

    vi.restoreAllMocks();
    process.env["MCP_OBSERVATORY_CLOUD_TOKEN"] = "token";
    const second = captureStdout();

    maybePrintCloudCta("ci");

    expect(second.output()).toBe("");
  });

  it("suppresses the CTA in quiet mode even without a cloud token", () => {
    process.env["NO_COLOR"] = "1";
    delete process.env["MCP_OBSERVATORY_CLOUD_TOKEN"];
    setQuiet(true);
    const stdout = captureStdout();

    maybePrintCloudCta("ci");

    expect(stdout.output()).toBe("");
  });

  it("prints cloud pricing and upload guidance", () => {
    process.env["NO_COLOR"] = "1";
    const stdout = captureStdout();

    printCloudInfo();

    expect(stdout.output()).toContain("MCP Observatory Cloud");
    expect(stdout.output()).toContain("Individual Pro: $29/month");
    expect(stdout.output()).toContain("pricing?plan=team");
    expect(stdout.output()).toContain("Team Pilot");
    expect(stdout.output()).toContain("cloud upload .mcp-observatory/runs/<run>.json");
    expect(stdout.output()).toContain("william@banksey.com");
  });

  it("getCloudAccessToken prefers env token over stored token", async () => {
    process.env["MCP_OBSERVATORY_CLOUD_TOKEN"] = "env-token";
    expect(await getCloudAccessToken()).toBe("env-token");
    delete process.env["MCP_OBSERVATORY_CLOUD_TOKEN"];
    // Falls back to stored token (null when no auth.json exists)
    expect(await getCloudAccessToken()).toBeNull();
  });

  it("cloudWhoami returns unauthenticated when no token exists", async () => {
    delete process.env["MCP_OBSERVATORY_CLOUD_TOKEN"];
    const info = await cloudWhoami();
    expect(info.authenticated).toBe(false);
  });

  it("allows hosted upload endpoint overrides while preserving the production default", () => {
    delete process.env["MCP_OBSERVATORY_CLOUD_ENDPOINT"];
    expect(getCloudUploadEndpoint()).toBe(DEFAULT_CLOUD_UPLOAD_ENDPOINT);

    process.env["MCP_OBSERVATORY_CLOUD_ENDPOINT"] = "https://staging.example/api/v1/artifacts";
    expect(getCloudUploadEndpoint()).toBe("https://staging.example/api/v1/artifacts");
  });
});
