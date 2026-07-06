import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { scanForTargets } from "../src/discovery.js";

describe("scanForTargets", () => {
  it("returns an array (may be empty if no configs exist)", async () => {
    const targets = await scanForTargets();
    expect(Array.isArray(targets)).toBe(true);
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
        duplicate: {
          command: "npx",
          args: ["-y", "example-mcp"],
        },
        invalid: {
          args: ["missing-command"],
        },
        ignored: "not an object",
      },
    }), "utf8");

    const targets = await scanForTargets(configPath);

    expect(targets).toHaveLength(2);
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
