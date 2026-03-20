import { describe, expect, it } from "vitest";

import { SECURITY_RULES, CREDENTIAL_PATTERNS, type ToolInfo } from "../src/checks/security-rules.js";

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
