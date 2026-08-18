import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { makeArtifact } from "./fixtures/test-helpers.js";
import { assertPassingReceipt, protectMcpConfig, wrapServerEntry } from "../src/handshake.js";
import { writeRunArtifact } from "../src/storage.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("handshake", () => {
  it("denies connect when no passing receipt exists", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "obs-hand-"));
    dirs.push(dir);
    await expect(assertPassingReceipt("acme-mcp", dir)).rejects.toThrow("no receipt");
  });

  it("denies a failing receipt and allows a passing one", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "obs-hand-"));
    dirs.push(dir);
    await writeRunArtifact({ ...makeArtifact(), target: { targetId: "acme-mcp", adapter: "local-process", command: "npx", args: ["-y", "acme-mcp"] }, gate: "fail", createdAt: "2026-01-01T00:00:00Z" }, dir);
    await expect(assertPassingReceipt("acme-mcp", dir)).rejects.toThrow("not Ready");
    await writeRunArtifact({ ...makeArtifact(), target: { targetId: "acme-mcp", adapter: "local-process", command: "npx", args: ["-y", "acme-mcp"] }, gate: "pass", createdAt: "2026-01-02T00:00:00Z" }, dir);
    await expect(assertPassingReceipt("acme-mcp", dir)).resolves.toContain("acme-mcp");
  });

  it("wraps mcp.json stdio servers once and writes a backup", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "obs-hand-"));
    dirs.push(dir);
    const file = path.join(dir, ".mcp.json");
    await writeFile(file, JSON.stringify({
      mcpServers: {
        weather: { command: "uv", args: ["run", "weather.py"] },
        remote: { url: "https://example.com/mcp" },
      },
    }));
    const first = await protectMcpConfig(file);
    expect(first.wrapped).toBe(1);
    expect(first.skipped).toBe(1);
    const second = await protectMcpConfig(file);
    expect(second.wrapped).toBe(0);
    const saved = JSON.parse(await readFile(file, "utf8")) as { mcpServers: { weather: { command: string; args: string[] } } };
    expect(saved.mcpServers.weather).toEqual(wrapServerEntry("uv", ["run", "weather.py"]));
    await expect(readFile(`${file}.observatory.bak`, "utf8")).resolves.toContain("uv");
  });
});
