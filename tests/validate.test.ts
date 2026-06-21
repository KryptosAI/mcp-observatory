import { afterEach, describe, expect, it } from "vitest";
import { validateRunArtifact, validateTargetConfig } from "../src/validate.js";

describe("validateTargetConfig", () => {
  afterEach(() => {
    delete process.env["MCP_TEST_TOKEN"];
    delete process.env["MCP_TEST_HEADER"];
    delete process.env["MCP_TEST_ENV"];
  });

  it("validates a correct local-process config", () => {
    const config = validateTargetConfig({
      targetId: "test",
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
    });
    expect(config.targetId).toBe("test");
    expect(config.adapter).toBe("local-process");
  });

  it("throws on missing targetId", () => {
    expect(() => validateTargetConfig({ adapter: "local-process", command: "node", args: [] }))
      .toThrow("targetId");
  });

  it("throws on missing adapter", () => {
    expect(() => validateTargetConfig({ targetId: "test", command: "node", args: [] }))
      .toThrow("adapter");
  });

  it("throws on non-object input", () => {
    expect(() => validateTargetConfig("not an object")).toThrow();
  });

  it("expands environment references in HTTP auth fields", () => {
    process.env["MCP_TEST_TOKEN"] = "token-123";
    process.env["MCP_TEST_HEADER"] = "header-456";
    const config = validateTargetConfig({
      targetId: "http-test",
      adapter: "http",
      url: "https://mcp.example.com",
      authToken: "${MCP_TEST_TOKEN}",
      headers: {
        "X-Api-Key": "$MCP_TEST_HEADER",
      },
    });
    expect(config.adapter).toBe("http");
    if (config.adapter !== "http") throw new Error("Expected http config");
    expect(config.authToken).toBe("token-123");
    expect(config.headers?.["X-Api-Key"]).toBe("header-456");
  });

  it("expands local-process env references", () => {
    process.env["MCP_TEST_ENV"] = "secret-env";
    const config = validateTargetConfig({
      targetId: "local-test",
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
      env: {
        API_TOKEN: "env:MCP_TEST_ENV",
      },
      securitySuppressions: ["shell-injection", "dangerous_tool:permissive-schema"],
    });
    expect(config.adapter).toBe("local-process");
    if (config.adapter !== "local-process") throw new Error("Expected local-process config");
    expect(config.env?.["API_TOKEN"]).toBe("secret-env");
    expect(config.securitySuppressions).toEqual(["shell-injection", "dangerous_tool:permissive-schema"]);
  });

  it("throws when an env reference is missing", () => {
    expect(() => validateTargetConfig({
      targetId: "http-test",
      adapter: "http",
      url: "https://mcp.example.com",
      authToken: "${MCP_TEST_TOKEN}",
    })).toThrow("MCP_TEST_TOKEN");
  });
});

describe("validateRunArtifact", () => {
  const validRun = {
    artifactType: "run",
    schemaVersion: "1.0.0",
    gate: "pass",
    runId: "run_test",
    createdAt: "2026-06-21T00:00:00.000Z",
    toolVersion: "0.22.0",
    target: {
      targetId: "example",
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
    },
    environment: {
      platform: "darwin",
      nodeVersion: "v24.0.0",
    },
    summary: {
      gate: "pass",
      total: 1,
      pass: 1,
      fail: 0,
      partial: 0,
      unsupported: 0,
      flaky: 0,
      skipped: 0,
    },
    checks: [
      {
        id: "security-lite",
        capability: "security-lite",
        status: "pass",
        durationMs: 1,
        message: "ok",
        evidence: [],
      },
    ],
  };

  it("validates nested run artifact fields", () => {
    expect(validateRunArtifact(validRun).runId).toBe("run_test");
  });

  it("rejects invalid nested check statuses", () => {
    const invalid = structuredClone(validRun);
    invalid.checks[0]!.status = "danger";
    expect(() => validateRunArtifact(invalid)).toThrow("invalid status");
  });

  it("rejects missing summary counts", () => {
    const invalid = structuredClone(validRun);
    delete (invalid.summary as Partial<typeof invalid.summary>).total;
    expect(() => validateRunArtifact(invalid)).toThrow("summary");
  });
});
