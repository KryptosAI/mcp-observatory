import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { writeTextFileAtomic } from "../src/utils/files.js";
import { slugify } from "../src/utils/ids.js";
import { appendQuery, requireHttpUrl } from "../src/utils/url.js";

describe("URL helpers", () => {
  it("accepts HTTP URLs and rejects non-HTTP protocols", () => {
    expect(requireHttpUrl("https://example.com/path", "Endpoint")).toBe("https://example.com/path");
    expect(requireHttpUrl("http://example.com/path", "Endpoint")).toBe("http://example.com/path");
    expect(() => requireHttpUrl("file:///tmp/secret", "Endpoint")).toThrow("Endpoint must use http: or https:.");
  });

  it("appends and replaces query params safely", () => {
    expect(appendQuery("https://example.com/stats?exclude=old&keep=1", {
      exclude: "new value",
      page: "2",
    })).toBe("https://example.com/stats?exclude=new+value&keep=1&page=2");
  });
});

describe("file and id helpers", () => {
  it("writes text files atomically", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "obs-utils-"));
    const filePath = path.join(dir, "nested.txt");
    try {
      await writeTextFileAtomic(filePath, "first");
      await expect(readFile(filePath, "utf8")).resolves.toBe("first");

      await writeTextFileAtomic(filePath, "second");
      await expect(readFile(filePath, "utf8")).resolves.toBe("second");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("cleans up temp files when atomic writes fail", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "obs-utils-"));
    try {
      await writeFile(path.join(dir, ".block.tmp"), "not used", "utf8");
      await expect(writeTextFileAtomic(path.join(dir, "missing", "out.txt"), "body")).rejects.toThrow();
      await expect(readFile(path.join(dir, "missing", "out.txt"), "utf8")).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("slugifies to a stable lowercase ASCII identifier", () => {
    expect(slugify("  @Scope/Fancy MCP Server!!!  ")).toBe("scope-fancy-mcp-server");
    expect(slugify("----")).toBe("");
    expect(slugify("a".repeat(80))).toHaveLength(64);
  });
});
