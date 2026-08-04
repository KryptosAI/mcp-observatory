import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  defaultLockPath,
  readLockFile,
  writeLockFile,
  buildServerLockEntry,
  verifyAgainstLock,
  mergeLockFile,
} from "../src/lockfile.js";
import type { LockFile, LockFileServerEntry } from "../src/lockfile.js";
import { makeArtifact } from "./fixtures/test-helpers.js";
import type { CheckResult } from "../src/types.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeToolsCheck(overrides: Partial<CheckResult["evidence"][0]> = {}): CheckResult {
  return {
    id: "tools",
    capability: "tools",
    status: "pass",
    durationMs: 100,
    message: "OK",
    evidence: [{
      endpoint: "tools/list",
      advertised: true,
      responded: true,
      minimalShapePresent: true,
      itemCount: 2,
      identifiers: ["echo", "greet"],
      schemas: {
        echo: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
        greet: { type: "object", properties: { name: { type: "string" } } },
      },
      ...overrides,
    }],
  };
}

function makePromptsCheck(): CheckResult {
  return {
    id: "prompts",
    capability: "prompts",
    status: "pass",
    durationMs: 50,
    message: "OK",
    evidence: [{
      endpoint: "prompts/list",
      advertised: true,
      responded: true,
      minimalShapePresent: true,
      itemCount: 1,
      identifiers: ["daily-brief"],
    }],
  };
}

function makeResourcesCheck(): CheckResult {
  return {
    id: "resources",
    capability: "resources",
    status: "pass",
    durationMs: 50,
    message: "OK",
    evidence: [{
      endpoint: "resources/list",
      advertised: true,
      responded: true,
      minimalShapePresent: true,
      itemCount: 1,
      identifiers: ["file:///data.json"],
    }],
  };
}

function fullArtifact() {
  return makeArtifact([makeToolsCheck(), makePromptsCheck(), makeResourcesCheck()]);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("defaultLockPath", () => {
  it("returns correct path relative to cwd", () => {
    const result = defaultLockPath("/my/project");
    expect(result).toBe(path.join("/my/project", ".mcp-observatory", "lock.json"));
  });

  it("uses process.cwd() when no cwd provided", () => {
    const result = defaultLockPath();
    expect(result).toBe(path.join(process.cwd(), ".mcp-observatory", "lock.json"));
  });
});

describe("writeLockFile + readLockFile", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "lockfile-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("round-trips correctly", async () => {
    const lockPath = path.join(tmpDir, ".mcp-observatory", "lock.json");
    const lockFile: LockFile = {
      version: 1,
      lockedAt: "2026-03-23T00:00:00Z",
      servers: [
        {
          targetId: "test-server",
          lockedAt: "2026-03-23T00:00:00Z",
          tools: [{ name: "echo", inputSchema: { type: "object" } }],
          prompts: [{ name: "daily-brief" }],
          resources: [{ name: "file:///data.json", uri: "file:///data.json" }],
        },
      ],
    };

    await writeLockFile(lockFile, lockPath);
    const read = await readLockFile(lockPath);
    expect(read).toEqual(lockFile);
  });

  it("readLockFile throws when file does not exist", async () => {
    const lockPath = path.join(tmpDir, "nonexistent", "lock.json");
    await expect(readLockFile(lockPath)).rejects.toThrow();
  });
});

describe("buildServerLockEntry", () => {
  it("extracts tools with schemas from artifact evidence", () => {
    const artifact = fullArtifact();
    const entry = buildServerLockEntry(artifact);

    expect(entry.targetId).toBe("test");
    expect(entry.tools).toHaveLength(2);
    expect(entry.tools[0]!.name).toBe("echo");
    expect(entry.tools[0]!.inputSchema).toEqual({
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    });
    expect(entry.tools[1]!.name).toBe("greet");
    expect(entry.prompts).toHaveLength(1);
    expect(entry.prompts[0]!.name).toBe("daily-brief");
    expect(entry.resources).toHaveLength(1);
    expect(entry.resources[0]!.name).toBe("file:///data.json");
    expect(entry.resources[0]!.uri).toBe("file:///data.json");
  });

  it("handles artifact with no schemas (falls back to identifiers)", () => {
    const artifact = makeArtifact([
      makeToolsCheck({ schemas: undefined }),
      makePromptsCheck(),
      makeResourcesCheck(),
    ]);
    const entry = buildServerLockEntry(artifact);

    expect(entry.tools).toHaveLength(2);
    expect(entry.tools[0]!.name).toBe("echo");
    expect(entry.tools[0]!.inputSchema).toEqual({});
    expect(entry.tools[1]!.name).toBe("greet");
    expect(entry.tools[1]!.inputSchema).toEqual({});
  });
});

describe("verifyAgainstLock", () => {
  it("passes when schemas match", () => {
    const artifact = fullArtifact();
    const lockEntry = buildServerLockEntry(artifact);
    const result = verifyAgainstLock(lockEntry, artifact);

    expect(result.passed).toBe(true);
    expect(result.drift).toHaveLength(0);
  });

  it("detects added tool", () => {
    const artifact = fullArtifact();
    const lockEntry = buildServerLockEntry(artifact);

    // Remove a tool from the lock so the live version has an "extra"
    lockEntry.tools = lockEntry.tools.filter((t) => t.name !== "greet");

    const result = verifyAgainstLock(lockEntry, artifact);
    expect(result.passed).toBe(false);
    expect(result.drift).toContainEqual(
      expect.objectContaining({ category: "tools", name: "greet", change: "added" }),
    );
  });

  it("detects removed tool", () => {
    const artifact = makeArtifact([
      makeToolsCheck({
        identifiers: ["echo"],
        schemas: {
          echo: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
        },
        itemCount: 1,
      }),
      makePromptsCheck(),
      makeResourcesCheck(),
    ]);

    // Lock has both echo + greet, but live only has echo
    const lockEntry = buildServerLockEntry(fullArtifact());
    const result = verifyAgainstLock(lockEntry, artifact);

    expect(result.passed).toBe(false);
    expect(result.drift).toContainEqual(
      expect.objectContaining({ category: "tools", name: "greet", change: "removed" }),
    );
  });

  it("detects changed tool schema", () => {
    const artifact = fullArtifact();
    const lockEntry = buildServerLockEntry(artifact);

    // Mutate the locked schema to differ
    lockEntry.tools[0]!.inputSchema = { type: "object", properties: { msg: { type: "number" } } };

    const result = verifyAgainstLock(lockEntry, artifact);
    expect(result.passed).toBe(false);
    expect(result.drift).toContainEqual(
      expect.objectContaining({ category: "tools", name: "echo", change: "schema changed" }),
    );
  });

  it("detects added/removed prompts", () => {
    const artifact = fullArtifact();
    const lockEntry = buildServerLockEntry(artifact);

    // Add an extra prompt to the lock that doesn't exist in live
    lockEntry.prompts.push({ name: "weekly-report" });

    const result = verifyAgainstLock(lockEntry, artifact);
    expect(result.passed).toBe(false);
    expect(result.drift).toContainEqual(
      expect.objectContaining({ category: "prompts", name: "weekly-report", change: "removed" }),
    );
  });
});

describe("mergeLockFile", () => {
  it("replaces existing server entry", () => {
    const existing: LockFile = {
      version: 1,
      lockedAt: "2026-03-22T00:00:00Z",
      servers: [
        {
          targetId: "server-a",
          lockedAt: "2026-03-22T00:00:00Z",
          tools: [{ name: "old-tool", inputSchema: {} }],
          prompts: [],
          resources: [],
        },
      ],
    };

    const replacement: LockFileServerEntry = {
      targetId: "server-a",
      lockedAt: "2026-03-23T00:00:00Z",
      tools: [{ name: "new-tool", inputSchema: { type: "object" } }],
      prompts: [],
      resources: [],
    };

    const merged = mergeLockFile(existing, [replacement]);
    expect(merged.servers).toHaveLength(1);
    expect(merged.servers[0]!.tools[0]!.name).toBe("new-tool");
  });

  it("adds new server entry", () => {
    const existing: LockFile = {
      version: 1,
      lockedAt: "2026-03-22T00:00:00Z",
      servers: [
        {
          targetId: "server-a",
          lockedAt: "2026-03-22T00:00:00Z",
          tools: [],
          prompts: [],
          resources: [],
        },
      ],
    };

    const newEntry: LockFileServerEntry = {
      targetId: "server-b",
      lockedAt: "2026-03-23T00:00:00Z",
      tools: [{ name: "b-tool", inputSchema: {} }],
      prompts: [],
      resources: [],
    };

    const merged = mergeLockFile(existing, [newEntry]);
    expect(merged.servers).toHaveLength(2);
    expect(merged.servers.map((s) => s.targetId)).toContain("server-a");
    expect(merged.servers.map((s) => s.targetId)).toContain("server-b");
  });
});

describe("verifyAgainstLock schema ordering", () => {
  it("does not report drift when only property order differs in inputSchema", () => {
    const artifact = fullArtifact();
    const lockEntry = buildServerLockEntry(artifact);

    // Same schema, different key order
    lockEntry.tools[0]!.inputSchema = {
      required: ["message"],
      type: "object",
      properties: { message: { type: "string" } },
    };

    const result = verifyAgainstLock(lockEntry, artifact);
    expect(result.passed).toBe(true);
    expect(result.drift).toHaveLength(0);
  });
});
