import { describe, expect, it, vi } from "vitest";

import { runLightweightSecurityCheck, runSecurityCheck } from "../src/checks/security.js";
import { SECURITY_RULES, CREDENTIAL_PATTERNS, type ToolInfo } from "../src/checks/security-rules.js";
import { makeContext } from "./fixtures/test-helpers.js";

function findRule(id: string) {
  return SECURITY_RULES.find(r => r.id === id)!;
}

describe("security rules", () => {
  describe("shell-injection", () => {
    const rule = findRule("shell-injection");

    it("flags tools with command/exec/shell params", () => {
      const tool: ToolInfo = {
        name: "run_task",
        inputSchema: { type: "object", properties: { command: { type: "string" } } },
      };
      const finding = rule.match(tool);
      expect(finding).not.toBeNull();
      expect(finding!.severity).toBe("high");
      expect(finding!.message).toContain("command");
    });

    it("flags tools with exec-like names", () => {
      const tool: ToolInfo = { name: "exec_query" };
      const finding = rule.match(tool);
      expect(finding).not.toBeNull();
      expect(finding!.message).toContain("exec_query");
    });

    it("flags tools with dangerous descriptions", () => {
      const tool: ToolInfo = {
        name: "helper",
        description: "Execute a shell command on the host system.",
        inputSchema: { type: "object", properties: { input: { type: "string" } } },
      };
      const finding = rule.match(tool);
      expect(finding).not.toBeNull();
    });

    it("passes clean tools", () => {
      const tool: ToolInfo = {
        name: "get_weather",
        description: "Get weather for a city.",
        inputSchema: { type: "object", properties: { city: { type: "string" } } },
      };
      expect(rule.match(tool)).toBeNull();
    });
  });

  describe("broad-filesystem", () => {
    const rule = findRule("broad-filesystem");

    it("flags destructive tools with path params", () => {
      const tool: ToolInfo = {
        name: "write_file",
        description: "Write content to a file.",
        inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } } },
        annotations: { readOnlyHint: false },
      };
      const finding = rule.match(tool);
      expect(finding).not.toBeNull();
      expect(finding!.severity).toBe("medium");
    });

    it("flags tools with delete in description", () => {
      const tool: ToolInfo = {
        name: "remove_item",
        description: "Delete a file at the given path.",
        inputSchema: { type: "object", properties: { file: { type: "string" } } },
      };
      expect(rule.match(tool)).not.toBeNull();
    });

    it("passes read-only tools with path params", () => {
      const tool: ToolInfo = {
        name: "read_file",
        description: "Read a file.",
        inputSchema: { type: "object", properties: { path: { type: "string" } } },
        annotations: { readOnlyHint: true },
      };
      expect(rule.match(tool)).toBeNull();
    });

    it("passes tools without filesystem params", () => {
      const tool: ToolInfo = {
        name: "compute",
        inputSchema: { type: "object", properties: { expression: { type: "string" } } },
      };
      expect(rule.match(tool)).toBeNull();
    });
  });

  describe("permissive-schema", () => {
    const rule = findRule("permissive-schema");

    it("flags destructive tools with no schema", () => {
      const tool: ToolInfo = {
        name: "danger_tool",
        annotations: { destructiveHint: true },
      };
      const finding = rule.match(tool);
      expect(finding).not.toBeNull();
      expect(finding!.severity).toBe("low");
    });

    it("flags destructive tools with additionalProperties", () => {
      const tool: ToolInfo = {
        name: "update_config",
        inputSchema: { type: "object", properties: { key: { type: "string" } }, additionalProperties: true },
        annotations: { readOnlyHint: false },
      };
      expect(rule.match(tool)).not.toBeNull();
    });

    it("passes read-only tools with loose schemas", () => {
      const tool: ToolInfo = {
        name: "search",
        inputSchema: { type: "object", additionalProperties: true },
        annotations: { readOnlyHint: true },
      };
      expect(rule.match(tool)).toBeNull();
    });
  });
});

describe("credential patterns", () => {
  it("detects AWS keys", () => {
    const text = "access_key: AKIAIOSFODNN7EXAMPLE";
    expect(CREDENTIAL_PATTERNS.some(p => p.pattern.test(text))).toBe(true);
  });

  it("detects GitHub tokens", () => {
    const text = "token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn";
    expect(CREDENTIAL_PATTERNS.some(p => p.pattern.test(text))).toBe(true);
  });

  it("does not false-positive on normal text", () => {
    const text = "The weather is sunny and 72 degrees.";
    expect(CREDENTIAL_PATTERNS.some(p => p.pattern.test(text))).toBe(false);
  });
});

describe("unicode-obfuscation security rule", () => {
  const rule = findRule("unicode-obfuscation-description");

  it("flags tool descriptions with zero-width characters", () => {
    const tool: ToolInfo = {
      name: "get_data",
      description: `Fetch data from the API\u200B and return results.`,
    };
    const finding = rule.match(tool);
    expect(finding).not.toBeNull();
    expect(finding!.severity).toBe("high");
    expect(finding!.ruleId).toBe("unicode-obfuscation-description");
    expect(finding!.message).toContain("hidden Unicode characters");
  });

  it("flags tool descriptions with bidi override characters", () => {
    const tool: ToolInfo = {
      name: "run_task",
      description: `Run safe task\u202E (malicious code hidden) \u202C and return.`,
    };
    const finding = rule.match(tool);
    expect(finding).not.toBeNull();
    expect(finding!.severity).toBe("high");
    expect(finding!.ruleId).toBe("unicode-obfuscation-description");
  });

  it("flags tool descriptions with bidi isolate characters", () => {
    const tool: ToolInfo = {
      name: "execute",
      description: `Execute \u2066hidden\u2069 command.`,
    };
    const finding = rule.match(tool);
    expect(finding).not.toBeNull();
    expect(finding!.severity).toBe("high");
  });

  it("passes clean tool descriptions without unicode obfuscation", () => {
    const tool: ToolInfo = {
      name: "get_weather",
      description: "Get weather for a city using the OpenWeatherMap API.",
    };
    expect(rule.match(tool)).toBeNull();
  });

  it("passes tools with no description", () => {
    const tool: ToolInfo = { name: "no_description_tool" };
    expect(rule.match(tool)).toBeNull();
  });
});

describe("security check evidence", () => {
  it("emits structured findings", () => {
    const check = runLightweightSecurityCheck([
      {
        name: "exec_query",
        inputSchema: { type: "object", properties: { command: { type: "string" } } },
      },
    ], {
      targetId: "test",
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
    });

    const evidence = check.result.evidence[0]!;
    expect(evidence.findings?.[0]?.["ruleId"]).toBe("shell-injection");
    expect(check.result.status).toBe("fail");
  });

  it("honors security suppressions by rule id and tool name", () => {
    const check = runLightweightSecurityCheck([
      {
        name: "exec_query",
        inputSchema: { type: "object", properties: { command: { type: "string" } } },
      },
    ], {
      targetId: "test",
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
      securitySuppressions: ["shell-injection"],
    });

    const evidence = check.result.evidence[0]!;
    expect(evidence.findings).toBeUndefined();
    expect(evidence.itemCount).toBe(0);
    expect(check.result.status).toBe("pass");
  });

  it("flags unauthenticated HTTP targets as partial", () => {
    const check = runLightweightSecurityCheck([], {
      targetId: "http-test",
      adapter: "http",
      url: "https://example.com/mcp",
    });

    expect(check.result.status).toBe("partial");
    expect(check.result.evidence[0]?.findings?.[0]?.["ruleId"]).toBe("no-auth-http");
  });

  it("accepts HTTP targets with auth headers", () => {
    const check = runLightweightSecurityCheck([], {
      targetId: "http-test",
      adapter: "http",
      url: "https://example.com/mcp",
      headers: { Authorization: "Bearer token" },
    });

    expect(check.result.status).toBe("pass");
    expect(check.result.evidence[0]?.findings).toBeUndefined();
  });

  it("suppresses findings by toolName:ruleId", () => {
    const check = runLightweightSecurityCheck([
      {
        name: "exec_query",
        inputSchema: { type: "object", properties: { command: { type: "string" } } },
      },
    ], {
      targetId: "test",
      adapter: "local-process",
      command: "node",
      args: ["server.js"],
      securitySuppressions: ["exec_query:shell-injection"],
    });

    expect(check.result.status).toBe("pass");
    expect(check.result.evidence[0]?.findings).toBeUndefined();
  });
});

describe("full security check", () => {
  it("lists tools when advertised and reports high-severity findings", async () => {
    const context = makeContext({
      client: {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            {
              name: "exec_query",
              inputSchema: { type: "object", properties: { command: { type: "string" } } },
            },
          ],
        }),
      } as unknown as ReturnType<typeof makeContext>["client"],
      serverCapabilities: { tools: {} },
    });

    const check = await runSecurityCheck(context, []);

    expect(check.result.id).toBe("security");
    expect(check.result.status).toBe("fail");
    expect(check.result.message).toContain("1 high");
    expect(check.result.evidence[0]?.identifiers).toContain("exec_query");
  });

  it("scans previous tool responses for credential patterns", async () => {
    const context = makeContext({
      client: {
        listTools: vi.fn().mockResolvedValue({ tools: [] }),
      } as unknown as ReturnType<typeof makeContext>["client"],
      serverCapabilities: {},
    });

    const check = await runSecurityCheck(context, [
      {
        id: "tools-invoke",
        capability: "tools-invoke",
        status: "pass",
        durationMs: 1,
        message: "OK",
        evidence: [
          {
            endpoint: "tools/call",
            advertised: true,
            responded: true,
            minimalShapePresent: true,
            responseSnapshots: {
              get_secret: { token: "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn" },
            },
          },
        ],
      },
    ]);

    expect(check.result.status).toBe("fail");
    expect(check.result.evidence[0]?.findings?.[0]?.["ruleId"]).toBe("credential-pattern");
    expect(check.result.evidence[0]?.findings?.[0]?.["toolName"]).toBe("get_secret");
  });

  it("still returns a passing check when tool listing fails", async () => {
    const context = makeContext({
      client: {
        listTools: vi.fn().mockRejectedValue(new Error("list failed")),
      } as unknown as ReturnType<typeof makeContext>["client"],
      serverCapabilities: { tools: {} },
    });

    const check = await runSecurityCheck(context, []);

    expect(check.result.status).toBe("pass");
    expect(check.result.message).toBe("No security issues detected.");
  });
});
