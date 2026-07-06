import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { loadCassette, saveCassette } from "../src/cassette.js";
import { makeCassette } from "./fixtures/test-helpers.js";

describe("cassette round-trip", () => {
  it("saves and loads a cassette file", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "mcp-obs-test-"));

    try {
      const original = makeCassette();
      const filePath = await saveCassette(original, tmpDir);

      expect(filePath).toContain("test-server.cassette.json");

      const loaded = await loadCassette(filePath);
      expect(loaded.version).toBe(1);
      expect(loaded.targetId).toBe("test-server");
      expect(loaded.entries).toHaveLength(2);
      expect(loaded.entries[0]!.method).toBe("initialize");
      expect(loaded.entries[1]!.direction).toBe("response");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("rejects invalid cassette files", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "mcp-obs-test-"));
    const filePath = path.join(tmpDir, "bad.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, JSON.stringify({ notACassette: true }));

    try {
      await expect(loadCassette(filePath)).rejects.toThrow("Invalid cassette file");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
