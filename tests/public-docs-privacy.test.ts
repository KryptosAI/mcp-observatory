import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function markdownFilesUnder(relativeDir: string): Promise<string[]> {
  const root = path.join(process.cwd(), relativeDir);
  if (!(await exists(root))) return [];
  const rootStat = await stat(root);
  if (rootStat.isFile()) return relativeDir.endsWith(".md") ? [relativeDir] : [];
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return markdownFilesUnder(relativePath);
    return entry.isFile() && entry.name.endsWith(".md") ? [relativePath] : [];
  }));
  return files.flat();
}

async function packagedMarkdownDocs(): Promise<string[]> {
  const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as { files?: string[] };
  const docs = await Promise.all((packageJson.files ?? []).map(async (entry) => {
    if (entry.endsWith(".md")) return [entry];
    if (entry.startsWith("docs/")) return markdownFilesUnder(entry);
    return [];
  }));
  return [...new Set(docs.flat())].sort();
}

const forbiddenPatterns = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /telemetry-exports\//,
  /events-flat-full/,
  /thinkingdata\.cn/i,
  /kimquy\.capital/i,
  /paperstreetdata\.com/i,
  /cyberneticsplus\.com/i,
  /gitEmail/,
  /gitRemoteUrl/,
  /serverCommands/,
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /token\s*[:=]\s*["'][A-Za-z0-9_\-.]{16,}["']/i,
  /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)/i,
];

describe("public proof docs privacy guardrails", () => {
  it("does not expose private telemetry exports or raw telemetry field names in packaged docs", async () => {
    for (const docPath of await packagedMarkdownDocs()) {
      const content = await readFile(path.join(process.cwd(), docPath), "utf8");
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });

  it("keeps README action examples read-only and pinned", async () => {
    const content = await readFile(path.join(process.cwd(), "README.md"), "utf8");
    expect(content).toContain("KryptosAI/mcp-observatory/action@v0.26.1");
    expect(content).not.toContain("KryptosAI/mcp-observatory/action@main");
    expect(content).not.toContain("pull-requests: write\n  statuses: write");
  });
});
