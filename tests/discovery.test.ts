import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  defaultConfigPaths,
  defaultSkillPaths,
  discoverFromAmazonQ,
  discoverFromAntigravity,
  discoverFromClaudeCode,
  
  discoverFromCodex,
  discoverFromCursor,
  discoverFromGeminiCli,
  discoverFromKiro,
  discoverFromOpenCode,
  discoverFromVSCode,
  discoverFromWindsurf,
  discoverSkillPaths,
  scanForTargets,
} from "../src/discovery.js";

describe("scanForTargets", () => {
  it("returns an array (may be empty if no configs exist)", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-empty-home-"));
    const spy = vi.spyOn(os, "homedir").mockReturnValue(dir);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);
    try { expect((await scanForTargets()).length).toBe(0); } finally { spy.mockRestore(); cwdSpy.mockRestore(); }
  });

  it("returns empty array for a nonexistent config path", async () => {
    const targets = await scanForTargets("/nonexistent/path.json");
    expect(targets).toEqual([]);
  });

  it("extracts HTTP and local process targets from an explicit config", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-discovery-"));
    const configPath = path.join(dir, "config.json");
    await writeFile(configPath, JSON.stringify({
      mcpServers: {
        docs: {
          url: "https://example.test/mcp",
          authToken: "token",
        },
        local: {
          command: "npx",
          args: ["-y", "example-mcp", 42, null],
          env: { SAFE_MODE: "1" },
        },
        differentContext: {
          command: "npx",
          args: ["-y", "example-mcp"],
        },
        exactDuplicate: {
          command: "npx", args: ["-y", "example-mcp"], env: { SAFE_MODE: "1" },
        },
        invalid: {
          args: ["missing-command"],
        },
        ignored: "not an object",
      },
    }), "utf8");

    const targets = await scanForTargets(configPath);

    expect(targets).toHaveLength(3);
    expect(targets[2]?.config.targetId).toBe("differentContext");
    expect(targets[0]).toMatchObject({
      source: configPath,
      config: {
        targetId: "docs",
        adapter: "http",
        url: "https://example.test/mcp",
        authToken: "token",
      },
    });
    expect(targets[1]).toMatchObject({
      source: configPath,
      config: {
        targetId: "local",
        adapter: "local-process",
        command: "npx",
        args: ["-y", "example-mcp"],
        env: { SAFE_MODE: "1" },
      },
    });
  });

  it("keeps argument boundaries and authentication contexts distinct during deduplication", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-context-"));
    const configPath = path.join(dir, "config.json");
    await writeFile(configPath, JSON.stringify({mcpServers:{
      oneArgument:{command:"node",args:["a b"]},
      twoArguments:{command:"node",args:["a","b"]},
      authenticatedA:{url:"https://example.test/mcp",authToken:"fixture-a"},
      authenticatedB:{url:"https://example.test/mcp",authToken:"fixture-b"},
      authenticatedDuplicate:{url:"https://example.test/mcp",authToken:"fixture-a"},
      ordered:{command:"node",args:["server"],env:{A:"1",B:"2"}},
      reordered:{command:"node",args:["server"],env:{B:"2",A:"1"}},
    }}));
    const targets=await scanForTargets(configPath);
    expect(targets.map(target=>target.config.targetId)).toEqual([
      "oneArgument","twoArguments","authenticatedA","authenticatedB","ordered",
    ]);
  });

  it("extracts MCP targets from Codex TOML config", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-discovery-"));
    const configPath = path.join(dir, "config.toml");
    await writeFile(configPath, `
[mcp_servers.notion]
url = "https://mcp.notion.com/mcp"

[mcp_servers.playwright]
command = "npx"
args = [
  "@playwright/mcp@latest",
  "--isolated"
]

[mcp_servers.playwright.env]
MCP_ENV = "test"

[mcp_servers.playwright.tools.browser_tabs]
approval_mode = "approve"

[mcp_servers.disabled]
command = "npx"
args = ["-y", "disabled-mcp"]
enabled = false
`, "utf8");

    const targets = await scanForTargets(configPath);

    expect(targets).toHaveLength(2);
    expect(targets[0]).toMatchObject({
      source: configPath,
      config: {
        targetId: "notion",
        adapter: "http",
        url: "https://mcp.notion.com/mcp",
      },
    });
    expect(targets[1]).toMatchObject({
      source: configPath,
      config: {
        targetId: "playwright",
        adapter: "local-process",
        command: "npx",
        args: ["@playwright/mcp@latest", "--isolated"],
        env: { MCP_ENV: "test" },
      },
    });
  });

  it("ignores malformed config documents", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-discovery-"));
    const arrayConfig = path.join(dir, "array.json");
    const noServersConfig = path.join(dir, "no-servers.json");
    const badJsonConfig = path.join(dir, "bad.json");
    await writeFile(arrayConfig, "[]", "utf8");
    await writeFile(noServersConfig, JSON.stringify({ mcpServers: [] }), "utf8");
    await writeFile(badJsonConfig, "{", "utf8");

    await expect(scanForTargets(arrayConfig)).resolves.toEqual([]);
    await expect(scanForTargets(noServersConfig)).resolves.toEqual([]);
    await expect(scanForTargets(badJsonConfig)).resolves.toEqual([]);
  });
});

describe("defaultConfigPaths — agent coverage", () => {
  beforeEach(() => {
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function verifyPathsContain(actual: string[], expectedSuffixes: string[], label: string) {
    for (const suffix of expectedSuffixes) {
      const found = actual.some((p) => p.endsWith(suffix));
      expect(found, `${label}: expected path ending with "${suffix}"`).toBe(true);
    }
  }

  it("includes Claude Code config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [".claude.json"], "Claude Code");
  });

  it("includes Cursor config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".cursor", "mcp.json")], "Cursor");
  });

  it("includes Windsurf config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".windsurf", "mcp.json")], "Windsurf");
  });

  it("includes VS Code config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".vscode", "mcp.json")], "VS Code");
  });

  it("includes OpenCode config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [
      path.join(".config", "opencode", "opencode.json"),
      path.join(".opencode", "opencode.json"),
    ], "OpenCode");
  });

  it("includes Codex config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [
      path.join(".codex", "config.toml"),
      path.join(".codex", "config.json"),
    ], "Codex");
  });

  it("includes Gemini CLI config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".gemini", "mcp.json")], "Gemini CLI");
  });

  it("includes Kiro config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".kiro", "mcp.json")], "Kiro");
  });

  it("includes Antigravity config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".antigravity", "mcp.json")], "Antigravity");
  });

  it("includes Amazon Q config paths", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".amazonq", "mcp.json")], "Amazon Q");
  });

  it("includes project-level .cursor/mcp.json", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".cursor", "mcp.json")], "project Cursor");
  });

  it("includes project-level .vscode/mcp.json", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".vscode", "mcp.json")], "project VS Code");
  });

  it("includes project-level .opencode/opencode.json", () => {
    const paths = defaultConfigPaths();
    verifyPathsContain(paths, [path.join(".opencode", "opencode.json")], "project OpenCode");
  });
});

describe("defaultSkillPaths — agent coverage", () => {
  function verifyPathsContain(actual: string[], expectedSuffixes: string[], label: string) {
    for (const suffix of expectedSuffixes) {
      const found = actual.some((p) => p.endsWith(suffix));
      expect(found, `${label}: expected path ending with "${suffix}"`).toBe(true);
    }
  }

  it("includes Cursor skill paths", () => {
    const paths = defaultSkillPaths();
    verifyPathsContain(paths, [path.join(".cursor", "skills")], "Cursor skills");
  });

  it("includes OpenCode skill paths", () => {
    const paths = defaultSkillPaths();
    verifyPathsContain(paths, [
      path.join(".config", "opencode", "skills"),
      path.join(".opencode", "skills"),
    ], "OpenCode skills");
  });

  it("includes Codex skill paths", () => {
    const paths = defaultSkillPaths();
    verifyPathsContain(paths, [
      path.join(".agents", "skills"),
      path.join(".codex", "skills"),
    ], "Codex skills");
  });

  it("includes Amp skill paths", () => {
    const paths = defaultSkillPaths();
    verifyPathsContain(paths, [
      path.join(".config", "agents", "skills"),
      path.join(".amp", "skills"),
    ], "Amp skills");
  });

  it("includes OpenClaw skill paths", () => {
    const paths = defaultSkillPaths();
    verifyPathsContain(paths, [
      path.join(".openclaw", "skills"),
      path.join(".openclaw", "workspace", "skills"),
      path.join(".clawdbot", "skills"),
    ], "OpenClaw skills");
  });
});

describe("discoverSkillPaths", () => {
  it("returns explicit path if it exists", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-skills-"));
    const paths = await discoverSkillPaths(dir);
    expect(paths).toEqual([dir]);
  });

  it("returns empty array for nonexistent explicit path", async () => {
    const paths = await discoverSkillPaths("/nonexistent/skills/path");
    expect(paths).toEqual([]);
  });
});

describe("per-agent discovery functions", () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "mcp-observatory-agent-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function setupAgentConfig(homeDir: string, configDir: string, configFile: string) {
    const fullDir = path.join(homeDir, configDir);
    await mkdir(fullDir, { recursive: true });
    const configPath = path.join(fullDir, configFile);
    await writeFile(configPath, JSON.stringify({
      mcpServers: {
        "test-server": { command: "npx", args: ["-y", "test-mcp"] },
      },
    }), "utf8");
    return configPath;
  }

  it("discoverFromCursor reads ~/.cursor/mcp.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".cursor", "mcp.json");

    const targets = await discoverFromCursor();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
    expect(targets[0]!.source).toContain(path.join(".cursor", "mcp.json"));
  });

  it("discoverFromWindsurf reads ~/.windsurf/mcp.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".windsurf", "mcp.json");

    const targets = await discoverFromWindsurf();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
  });

  it("discoverFromVSCode reads ~/.vscode/mcp.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".vscode", "mcp.json");

    const targets = await discoverFromVSCode();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
  });

  it("discoverFromOpenCode reads ~/.config/opencode/opencode.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, path.join(".config", "opencode"), "opencode.json");

    const targets = await discoverFromOpenCode();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
  });

  it("discoverFromOpenCode reads ~/.opencode/opencode.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".opencode", "opencode.json");

    const targets = await discoverFromOpenCode();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
  });

  it("discoverFromCodex reads ~/.codex/config.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".codex", "config.json");

    const targets = await discoverFromCodex();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
  });

  it("discoverFromCodex reads ~/.codex/config.toml", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    const configDir = path.join(tmpDir, ".codex");
    await mkdir(configDir, { recursive: true });
    const configPath = path.join(configDir, "config.toml");
    await writeFile(configPath, `
[mcp_servers.notion]
url = "https://mcp.notion.com/mcp"
`, "utf8");

    const targets = await discoverFromCodex();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("notion");
    expect(targets[0]!.source).toContain(path.join(".codex", "config.toml"));
  });

  it("discoverFromGeminiCli reads ~/.gemini/mcp.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".gemini", "mcp.json");

    const targets = await discoverFromGeminiCli();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
  });

  it("discoverFromKiro reads ~/.kiro/mcp.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".kiro", "mcp.json");

    const targets = await discoverFromKiro();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
  });

  it("discoverFromAntigravity reads ~/.antigravity/mcp.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".antigravity", "mcp.json");

    const targets = await discoverFromAntigravity();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
  });

  it("discoverFromAmazonQ reads ~/.amazonq/mcp.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".amazonq", "mcp.json");

    const targets = await discoverFromAmazonQ();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("test-server");
  });

  it("discoverFromClaudeCode reads ~/.claude.json", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    const configPath = path.join(tmpDir, ".claude.json");
    await writeFile(configPath, JSON.stringify({
      mcpServers: {
        "claude-server": { command: "npx", args: ["-y", "claude-mcp"] },
      },
    }), "utf8");

    const targets = await discoverFromClaudeCode();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.config.targetId).toBe("claude-server");
  });

  it("returns empty array when agent config does not exist", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);

    const targets = await discoverFromCursor();
    expect(targets).toEqual([]);
  });

  it("scanForTargets discovers from all agents when configs exist", async () => {
    vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    await setupAgentConfig(tmpDir, ".cursor", "mcp.json");
    await setupAgentConfig(tmpDir, ".windsurf", "mcp.json");

    const targets = await scanForTargets();
    expect(targets.length).toBeGreaterThanOrEqual(1);
    const targetIds = targets.map((t) => t.config.targetId);
    expect(new Set(targetIds).size).toBe(targetIds.length);
  });
});
