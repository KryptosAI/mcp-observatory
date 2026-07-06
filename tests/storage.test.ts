import { describe, expect, it } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  defaultRunsDirectory,
  ensureDirectory,
  findLatestArtifact,
  findLatestSuccessfulRunArtifact,
  readArtifact,
  writeRunArtifact,
} from "../src/storage.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

async function makeTempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "mcp-obs-storage-test-"));
}

describe("writeRunArtifact", () => {
  it("writes artifact to the specified directory and returns the path", async () => {
    const tmpDir = await makeTempDir();
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
    const rootDir = await makeTempDir();
    const tmpDir = path.join(rootDir, "nested", "dir");
    try {
      const artifact = makeArtifact();
      const outPath = await writeRunArtifact(artifact, tmpDir);
      expect(outPath).toContain(tmpDir);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("includes the target ID slug in the filename", async () => {
    const tmpDir = await makeTempDir();
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
    const tmpDir = await makeTempDir();
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
    const tmpDir = await makeTempDir();
    const filePath = path.join(tmpDir, "bad.json");
    await writeFile(filePath, "not valid json");

    try {
      await expect(readArtifact(filePath)).rejects.toThrow();
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns unrecognized JSON shapes for backwards compatibility", async () => {
    const tmpDir = await makeTempDir();
    const filePath = path.join(tmpDir, "target.json");
    await writeFile(filePath, JSON.stringify({ targetId: "legacy-target" }), "utf8");

    try {
      await expect(readArtifact(filePath)).resolves.toEqual({ targetId: "legacy-target" });
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("artifact lookup helpers", () => {
  it("builds the default runs directory under the provided cwd", () => {
    expect(defaultRunsDirectory("/workspace")).toBe(path.join("/workspace", ".mcp-observatory", "runs"));
  });

  it("ensures nested directories exist", async () => {
    const tmpDir = await makeTempDir();
    const nested = path.join(tmpDir, "a", "b");
    try {
      await ensureDirectory(nested);
      await writeFile(path.join(nested, "ok.txt"), "ok", "utf8");
      await expect(readFile(path.join(nested, "ok.txt"), "utf8")).resolves.toBe("ok");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("finds the newest artifact for a target and honors exclusions", async () => {
    const tmpDir = await makeTempDir();
    try {
      const oldPath = await writeRunArtifact({ ...makeArtifact(), createdAt: "2026-01-01T00:00:00Z" }, tmpDir);
      const newPath = await writeRunArtifact({ ...makeArtifact(), createdAt: "2026-01-02T00:00:00Z" }, tmpDir);

      await expect(findLatestArtifact(tmpDir, "test")).resolves.toBe(newPath);
      await expect(findLatestArtifact(tmpDir, "test", newPath)).resolves.toBe(oldPath);
      await expect(findLatestArtifact(tmpDir, "missing")).resolves.toBeNull();
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("finds the newest successful run and skips malformed, failed, or fatal artifacts", async () => {
    const tmpDir = await makeTempDir();
    try {
      const passing = await writeRunArtifact({ ...makeArtifact(), createdAt: "2026-01-01T00:00:00Z", gate: "pass" }, tmpDir);
      await writeRunArtifact({ ...makeArtifact(), createdAt: "2026-01-02T00:00:00Z", gate: "fail" }, tmpDir);
      await writeRunArtifact({ ...makeArtifact(), createdAt: "2026-01-03T00:00:00Z", gate: "pass", fatalError: "boom" }, tmpDir);
      await writeFile(path.join(tmpDir, "2026-01-04T00-00-00Z--bad.json"), "{", "utf8");

      await expect(findLatestSuccessfulRunArtifact(tmpDir)).resolves.toBe(passing);
      await expect(findLatestSuccessfulRunArtifact(path.join(tmpDir, "missing"))).resolves.toBeNull();
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
