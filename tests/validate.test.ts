import { afterEach, describe, expect, it } from "vitest";
import { validateTargetConfig } from "../src/validate.js";

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
