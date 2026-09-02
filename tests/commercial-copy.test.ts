import { readdir, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const USER_FACING_FILES = [
  "README.md",
  "README-zh-CN.md",
  "COMMERCIAL.md",
  "TERMS.md",
  "src/cli.ts",
  "src/commercial.ts",
  "src/receipt.ts",
  "src/commands/demo.ts",
  "src/commands/enterprise-report.ts",
  "src/commands/setup-ci-conversion.ts",
  "src/reporters/common.ts",
  "scripts/build-dashboard.ts",
  "scripts/generate-server-pages.ts",
  "dashboard/index.html",
  "dashboard/_redirects",
  "dashboard/release-gate-pilot/index.html",
  "dashboard/sitemap.xml",
  "llms.txt",
  "docs/demo.cast",
  "docs/demo.svg",
  "docs/launch.md",
  "docs/paid-pilot-offer.md",
  "docs/procurement-one-pager.md",
  "docs/government-enterprise-pilot.md",
  "docs/mcp-security-field-guide.md",
  "docs/mcp-security-platform.md",
  "docs/reference-evaluations.md",
  "docs/mcp-safety-report-latest.md",
  "docs/feishu-lark-mcp.md",
  "docs/ecosystem-distribution-kit.md",
  "docs/certification-distribution.md",
  "docs/mcp-receipts.md",
  "docs/attack-simulation-pilot.md",
  "docs/proof.md",
  "docs/project-case-study.md",
  ".github/ISSUE_TEMPLATE/certification-request.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/mcp-readiness-pilot.yml",
] as const;

async function combinedCopy(): Promise<string> {
  const sources = await Promise.all(USER_FACING_FILES.map(async file => `${file}\n${await readFile(file, "utf8")}`));
  return sources.join("\n");
}

describe("commercial copy consistency", () => {
  it("keeps English as npm's only root README candidate", async () => {
    const rootEntries = await readdir(process.cwd(), { withFileTypes: true });
    const npmReadmeCandidates = rootEntries
      .filter(entry => entry.isFile() && /^README(?:\..*)?$/i.test(entry.name))
      .map(entry => entry.name)
      .sort();
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { files?: string[] };
    const englishReadme = await readFile("README.md", "utf8");
    const chineseReadme = await readFile("README-zh-CN.md", "utf8");
    const chineseDocsIndex = await readFile("docs/zh/README.md", "utf8");

    expect(npmReadmeCandidates).toEqual(["README.md"]);
    expect(packageJson.files).toContain("README-zh-CN.md");
    expect(englishReadme).toContain("[Simplified Chinese](README-zh-CN.md)");
    expect(chineseReadme).toContain("🇺🇸 English: [README.md](README.md)");
    expect(chineseDocsIndex).toContain("[简体中文 README](../../README-zh-CN.md)");
  });

  it("redirects both public terms paths to the canonical terms", async () => {
    const canonicalTermsUrl = "https://app.mcp-observatory.com/terms";
    const redirects = (await readFile("dashboard/_redirects", "utf8"))
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith("#"));
    const termsRules = redirects.filter(line => /^\/terms\/?\s/.test(line));
    const dashboardSource = await readFile("scripts/build-dashboard.ts", "utf8");

    expect(termsRules).toEqual([
      `/terms ${canonicalTermsUrl} 302`,
      `/terms/ ${canonicalTermsUrl} 302`,
    ]);
    expect(dashboardSource).toContain('href="/terms/"');
  });

  it("does not advertise an unavailable self-service Team plan", async () => {
    const source = await combinedCopy();

    expect(source).not.toMatch(/pricing\?plan=team/i);
    expect(source).not.toMatch(/Team\s*(?:·|:)\s*\$299/i);
    expect(source).not.toMatch(/Start Team/i);
    expect(source).not.toMatch(/私有集群审查|集群可见性|托管历史、私有仓库报告、支持/);
    expect(source).not.toMatch(/private fleet reporting|hosted reporting, private deployment, or fleet visibility/i);
  });

  it("does not advertise superseded pilot prices, duration, scope, or certification services", async () => {
    const source = await combinedCopy();

    expect(source).not.toMatch(/\$2,500|\$2500|\$10,000|\$50,000/i);
    expect(source).not.toMatch(/30[- ]day pilot/i);
    expect(source).not.toMatch(/5\s*(?:to|–|-)\s*25 MCP servers/i);
    expect(source).not.toMatch(/paid certification|certification review|certification conversations/i);
  });

  it("keeps the public offers and logo disclosure explicit", async () => {
    const commercial = await readFile("COMMERCIAL.md", "utf8");
    const terms = await readFile("TERMS.md", "utf8");
    const dashboardSource = await readFile("scripts/build-dashboard.ts", "utf8");

    expect(commercial).toContain("Individual Pro | $29/month");
    expect(commercial).toContain("$15,000");
    expect(commercial).toContain("1–3 critical MCP servers");
    expect(commercial).toContain("10 business days");
    expect(terms).toContain("renew monthly");
    expect(terms).toContain("Acceptable Use");
    expect(terms).toContain("Hosted Data");
    expect(dashboardSource).toContain("Evaluated technologies, not MCP Observatory customers, endorsements, or partnerships.");
    expect(dashboardSource).toContain("@latest cloud upload");
  });

  it("keeps checkout behind a successful free upload", async () => {
    const cli = await readFile("src/cli.ts", "utf8");

    expect(cli).not.toMatch(/openBrowser\s*\(.*(?:checkout|pricing)/s);
    expect(cli).toContain("emitCloudUploadResponse(response");
  });

  it("keeps refreshed proof-index links relative to the examples directory", async () => {
    const proofIndex = await readFile("examples/INDEX.md", "utf8");

    expect(proofIndex).toContain("](./artifacts/context7-server.json)");
    expect(proofIndex).not.toContain("](./examples/artifacts/");
  });

  it("does not publish local workstation paths in refreshed proof artifacts", async () => {
    const summary = JSON.parse(await readFile("examples/matrix-summary.json", "utf8")) as Array<{
      artifactPath: string;
      reportPath: string;
    }>;
    const files = summary.flatMap(entry => [
      entry.artifactPath.replace(/^\.\//, ""),
      entry.reportPath.replace(/^\.\//, ""),
    ]);
    const sources = await Promise.all(files.map(file => readFile(file, "utf8")));

    for (const source of sources) {
      expect(source).not.toMatch(/\/(?:Users|home)\/[^/]+\/|[A-Za-z]:\\+Users\\+[^\\]+\\+/);
    }
  });

  it("detects plain-text and JSON-escaped Windows home paths", () => {
    const localPathPattern = /[A-Za-z]:\\+Users\\+[^\\]+\\+/;
    expect("C:\\Users\\william\\repo").toMatch(localPathPattern);
    expect("C:\\\\Users\\\\william\\\\repo").toMatch(localPathPattern);
    expect("C:\\ProgramData\\mcp-observatory").not.toMatch(localPathPattern);
  });
});
