import { afterEach, describe, expect, it, vi } from "vitest";

import { cloudUpgradeLine, hasCloudToken, maybePrintCloudCta, printCloudInfo } from "../src/commercial.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
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
    expect(cloudUpgradeLine()).toContain("mcp-observatory cloud");
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

  it("prints cloud pricing and upload guidance", () => {
    process.env["NO_COLOR"] = "1";
    const stdout = captureStdout();

    printCloudInfo();

    expect(stdout.output()).toContain("MCP Observatory Cloud");
    expect(stdout.output()).toContain("Team Pilot");
    expect(stdout.output()).toContain("cloud upload .mcp-observatory/runs/<run>.json");
    expect(stdout.output()).toContain("william@banksey.com");
  });
});
