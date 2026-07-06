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
  /gitEmail/,
  /gitRemoteUrl/,
  /serverCommands/,
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /token\s*[:=]\s*["'][A-Za-z0-9_\-.]{16,}["']/i,
  /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)/i,
];

const forbiddenText = [
  "thinkingdata.cn",
  "kimquy.capital",
  "paperstreetdata.com",
  "cyberneticsplus.com",
];

describe("public proof docs privacy guardrails", () => {
  it("does not expose private telemetry exports or raw telemetry field names in packaged docs", async () => {
    for (const docPath of await packagedMarkdownDocs()) {
      const content = await readFile(path.join(process.cwd(), docPath), "utf8");
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toMatch(pattern);
      }
      const lowerContent = content.toLowerCase();
      for (const text of forbiddenText) {
        expect(lowerContent).not.toContain(text);
      }
    }
  });

  it("keeps README action examples read-only and pinned", async () => {
    const content = await readFile(path.join(process.cwd(), "README.md"), "utf8");
    expect(content).toContain("KryptosAI/mcp-observatory/action@v1.28.0");
    expect(content).not.toContain("KryptosAI/mcp-observatory/action@main");
    expect(content).not.toContain("pull-requests: write\n  statuses: write");
  });

  it("keeps Action README examples pinned", async () => {
    const content = await readFile(path.join(process.cwd(), "action/README.md"), "utf8");
    expect(content).toContain("KryptosAI/mcp-observatory/action@v1.28.0");
    expect(content).not.toContain("KryptosAI/mcp-observatory/action@main");
  });

  it("packages the launch, attribution, bot, and gallery docs", async () => {
    const docs = await packagedMarkdownDocs();
    expect(docs).toContain("CONTRIBUTORS.md");
    expect(docs).toContain("docs/launch.md");
    expect(docs).toContain("docs/code-scanning-demo.md");
    expect(docs).toContain("docs/agent-tasks.md");
    expect(docs).toContain("docs/target-gallery.md");
    expect(docs).toContain("docs/campaign-attribution.md");
    expect(docs).toContain("docs/commercial-boundary.md");
    expect(docs).toContain("docs/mcp-receipts.md");
    expect(docs).toContain("docs/contributor-recognition.md");
    expect(docs).toContain("docs/contributor-proof-cards/README.md");
  });

  it("documents and guards the commercial/private asset boundary", async () => {
    const boundary = await readFile(path.join(process.cwd(), "docs/commercial-boundary.md"), "utf8");
    const commercial = await readFile(path.join(process.cwd(), "COMMERCIAL.md"), "utf8");
    const readme = await readFile(path.join(process.cwd(), "README.md"), "utf8");
    const gitignore = await readFile(path.join(process.cwd(), ".gitignore"), "utf8");

    expect(boundary).toContain("What Stays Open");
    expect(boundary).toContain("What Stays Proprietary");
    expect(boundary).toContain("The public health score in this repository is open source");
    expect(commercial).toContain("open core and commercial boundary");
    expect(readme).toContain("./docs/commercial-boundary.md");
    expect(gitignore).toContain("commercial-private/");
    expect(gitignore).toContain("private-intelligence/");
    expect(gitignore).toContain("customer-reports/");
    expect(gitignore).toContain("pilot-deliverables/");
  });

  it("keeps contributor recognition public, badge-renderable, and honest about GitHub achievements", async () => {
    const readme = await readFile(path.join(process.cwd(), "README.md"), "utf8");
    const contributors = await readFile(path.join(process.cwd(), "CONTRIBUTORS.md"), "utf8");
    const recognition = await readFile(path.join(process.cwd(), "docs/contributor-recognition.md"), "utf8");
    const proofCards = await readFile(path.join(process.cwd(), "docs/contributor-proof-cards/README.md"), "utf8");

    expect(readme).toContain("[MCP Observatory Contributors](./docs/contributor-recognition.md)");
    expect(contributors).toContain("Official GitHub profile achievements are platform-controlled");
    expect(recognition).toContain("Official GitHub profile achievements are platform-controlled");
    expect(`${contributors}\n${recognition}`).not.toMatch(/award official GitHub Achievements/i);
    expect(recognition).toContain("https://img.shields.io/badge/MCP%20Observatory-Target%20Scout-2563eb");
    expect(recognition).toContain("https://img.shields.io/badge/MCP%20Observatory-Safety%20Index%20Contributor-16a34a");
    expect(recognition).toContain("https://img.shields.io/badge/MCP%20Observatory-CI%20Integrator-7c3aed");
    expect(recognition).toContain("https://img.shields.io/badge/MCP%20Observatory-Maintainer%20Partner-f97316");
    expect(proofCards).toContain("Merged PR");
    expect(proofCards).toContain("Generated Evidence");
  });

  it("keeps markdown fences balanced in packaged docs", async () => {
    for (const docPath of await packagedMarkdownDocs()) {
      const content = await readFile(path.join(process.cwd(), docPath), "utf8");
      const backtickFenceCount = content.match(/^```/gm)?.length ?? 0;
      const tildeFenceCount = content.match(/^~~~/gm)?.length ?? 0;
      expect(backtickFenceCount, `${docPath} has unbalanced backtick fences`).toBe(backtickFenceCount % 2 === 0 ? backtickFenceCount : -1);
      expect(tildeFenceCount, `${docPath} has unbalanced tilde fences`).toBe(tildeFenceCount % 2 === 0 ? tildeFenceCount : -1);
    }
  });
});
