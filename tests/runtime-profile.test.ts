import { describe, expect, it } from "vitest";

import { analyzeRuntimeProfile, runRuntimeProfileCheck } from "../src/checks/runtime-profile.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

function makeTool(overrides: Partial<Tool> = {}): Tool {
  return {
    name: "test_tool",
    inputSchema: { type: "object", properties: {} },
    ...overrides,
  };
}

describe("runtime-profile check", () => {
  describe("analyzeRuntimeProfile", () => {
    it("detects egress from URL/host parameters", () => {
      const tools: Tool[] = [
        makeTool({
          name: "fetch_data",
          description: "Fetch data from an API.",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL to fetch" },
              host: { type: "string", description: "Host to connect" },
            },
          },
        }),
      ];

      const profile = analyzeRuntimeProfile(tools);
      expect(profile.confidence).toBe("high");
      expect(profile.egress).toBeDefined();
      expect(profile.egress!.length).toBeGreaterThanOrEqual(2);
      expect(profile.egress!.some((e) => e.source === "tool_schema")).toBe(true);
    });

    it("detects egress from endpoint/hostname parameters", () => {
      const tools: Tool[] = [
        makeTool({
          name: "call_service",
          inputSchema: {
            type: "object",
            properties: {
              endpoint: { type: "string", example: "https://api.example.com" },
              hostname: { type: "string", default: "db.internal" },
            },
          },
        }),
      ];

      const profile = analyzeRuntimeProfile(tools);
      expect(profile.egress).toBeDefined();
      expect(profile.egress!.some((e) => e.protocol === "HTTPS")).toBe(true);
    });

    it("detects state mutations from file/path parameters", () => {
      const tools: Tool[] = [
        makeTool({
          name: "write_file",
          description: "Write content to a file.",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to write to" },
              filename: { type: "string" },
              directory: { type: "string", default: "/tmp/output" },
            },
          },
        }),
      ];

      const profile = analyzeRuntimeProfile(tools);
      expect(profile.stateMutations).toBeDefined();
      expect(profile.stateMutations!.length).toBeGreaterThanOrEqual(2);
      expect(profile.stateMutations!.some((m) => m.resource === "filesystem")).toBe(true);
      expect(profile.stateMutations!.some((m) => m.scope === "specific_path")).toBe(true);
    });

    it("detects state mutations from command execution parameters", () => {
      const tools: Tool[] = [
        makeTool({
          name: "execute_code",
          description: "Execute arbitrary code.",
          inputSchema: {
            type: "object",
            properties: {
              command: { type: "string", description: "Command to run" },
            },
          },
        }),
      ];

      const profile = analyzeRuntimeProfile(tools);
      expect(profile.stateMutations).toBeDefined();
      expect(profile.stateMutations!.some((m) => m.operation === "execute")).toBe(true);
      expect(profile.stateMutations!.some((m) => m.resource === "network")).toBe(true);
    });

    it("detects state mutations from environment variable parameters", () => {
      const tools: Tool[] = [
        makeTool({
          name: "set_config",
          inputSchema: {
            type: "object",
            properties: {
              env: { type: "string", description: "Environment variable name" },
            },
          },
        }),
      ];

      const profile = analyzeRuntimeProfile(tools);
      expect(profile.stateMutations).toBeDefined();
      expect(profile.stateMutations!.some((m) => m.resource === "environment")).toBe(true);
      expect(profile.stateMutations!.some((m) => m.scope === "global")).toBe(true);
    });

    it("detects mutations from tool descriptions mentioning write/delete", () => {
      const tools: Tool[] = [
        makeTool({
          name: "cleanup",
          description: "Delete temporary files from the working directory.",
          inputSchema: {
            type: "object",
            properties: { pattern: { type: "string" } },
          },
        }),
      ];

      const profile = analyzeRuntimeProfile(tools);
      expect(profile.stateMutations).toBeDefined();
      expect(profile.stateMutations!.some((m) => m.source === "description_analysis")).toBe(true);
    });

    it("detects mutations from tool names suggesting write/exec", () => {
      const tools: Tool[] = [
        makeTool({
          name: "delete_file",
          inputSchema: { type: "object", properties: {} },
        }),
      ];

      const profile = analyzeRuntimeProfile(tools);
      expect(profile.stateMutations).toBeDefined();
      expect(profile.stateMutations!.some((m) => m.operation === "delete")).toBe(true);
      expect(profile.stateMutations!.some((m) => m.source === "description_analysis")).toBe(true);
    });

    it("returns low confidence with empty arrays for clean tools", () => {
      const tools: Tool[] = [
        makeTool({
          name: "get_weather",
          description: "Get the weather for a city.",
          inputSchema: {
            type: "object",
            properties: { city: { type: "string" } },
          },
        }),
      ];

      const profile = analyzeRuntimeProfile(tools);
      expect(profile.confidence).toBe("low");
      expect(profile.egress).toBeUndefined();
      expect(profile.stateMutations).toBeUndefined();
    });

    it("handles tools without inputSchema", () => {
      const tools: Tool[] = [
        { name: "bare_tool" } as Tool,
      ];

      const profile = analyzeRuntimeProfile(tools);
      expect(profile.confidence).toBe("low");
    });

    it("handles an empty tools array", () => {
      const profile = analyzeRuntimeProfile([]);
      expect(profile.confidence).toBe("low");
      expect(profile.egress).toBeUndefined();
      expect(profile.stateMutations).toBeUndefined();
    });
  });

  describe("runRuntimeProfileCheck", () => {
    it("returns a passing check with no findings", () => {
      const check = runRuntimeProfileCheck([
        makeTool({ name: "echo", inputSchema: { type: "object", properties: {} } }),
      ]);

      expect(check.result.id).toBe("runtime-profile");
      expect(check.result.status).toBe("pass");
      expect(check.result.message).toContain("No egress");
    });

    it("returns a partial check when high-confidence findings exist", () => {
      const check = runRuntimeProfileCheck([
        makeTool({
          name: "fetch_url",
          inputSchema: { type: "object", properties: { url: { type: "string" } } },
        }),
      ]);

      expect(check.result.id).toBe("runtime-profile");
      expect(check.result.status).toBe("partial");
      expect(check.result.evidence[0]?.itemCount).toBeGreaterThan(0);
    });

    it("includes structured findings in evidence", () => {
      const check = runRuntimeProfileCheck([
        makeTool({
          name: "download",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string" },
              path: { type: "string" },
            },
          },
        }),
      ]);

      const findings = check.result.evidence[0]?.findings;
      expect(findings).toBeDefined();
      expect(findings!.some((f) => (f)["source"] === "tool_schema")).toBe(true);
    });
  });
});
