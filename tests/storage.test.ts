import { describe, expect, it } from "vitest";
import { mkdir, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { writeRunArtifact, readArtifact } from "../src/storage.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

describe("writeRunArtifact", () => {
  it("writes artifact to the specified directory and returns the path", async () => {
    const tmpDir = path.join(os.tmpdir(), `mcp-obs-storage-test-${Date.now()}`);
    try {
      const artifact = makeArtifact([
        { id: "tools", capability: "tools", status: "pass", durationMs: 100, message: "OK", evidence: [] },
      ]);
      const outPath = await writeRunArtifact(artifact, tmpDir);

      expect(outPath).toContain(tmpDir);
      expect(outPath).toContain(".json");

      const content = await readFile(outPath, "utf8");
      const parsed = JSON.parse(content) as Record<string, unknown>;
      expect(parsed["artifactType"]).toBe("run");
      expect(parsed["runId"]).toBe("test-run-id");
      expect(parsed["checks"]).toHaveLength(1);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("creates the output directory if it does not exist", async () => {
    const tmpDir = path.join(os.tmpdir(), `mcp-obs-storage-test-${Date.now()}`, "nested", "dir");
    try {
      const artifact = makeArtifact();
      const outPath = await writeRunArtifact(artifact, tmpDir);
      expect(outPath).toContain(tmpDir);
    } finally {
      await rm(path.join(os.tmpdir(), `mcp-obs-storage-test-${tmpDir.split("mcp-obs-storage-test-")[1]!.split("/")[0]!}`), { recursive: true, force: true });
    }
  });

  it("includes the target ID slug in the filename", async () => {
    const tmpDir = path.join(os.tmpdir(), `mcp-obs-storage-test-${Date.now()}`);
    try {
      const artifact = makeArtifact();
      const outPath = await writeRunArtifact(artifact, tmpDir);
      const filename = path.basename(outPath);
      expect(filename).toContain("test");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("readArtifact", () => {
  it("reads back a written run artifact with validation", async () => {
    const tmpDir = path.join(os.tmpdir(), `mcp-obs-storage-test-${Date.now()}`);
    try {
      const artifact = makeArtifact([
        { id: "tools", capability: "tools", status: "pass", durationMs: 50, message: "OK", evidence: [] },
      ]);
      const outPath = await writeRunArtifact(artifact, tmpDir);
      const loaded = await readArtifact(outPath);

      expect(loaded.artifactType).toBe("run");
      if (loaded.artifactType === "run") {
        expect(loaded.runId).toBe("test-run-id");
        expect(loaded.checks).toHaveLength(1);
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("throws on non-existent file", async () => {
    await expect(readArtifact("/tmp/nonexistent-artifact-file.json")).rejects.toThrow();
  });

  it("throws on invalid JSON", async () => {
    const tmpDir = path.join(os.tmpdir(), `mcp-obs-storage-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, "bad.json");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, "not valid json");

    try {
      await expect(readArtifact(filePath)).rejects.toThrow();
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
