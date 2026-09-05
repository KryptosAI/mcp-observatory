import { readdir, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

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

  it("keeps the public offers and logo-led credibility proof explicit", async () => {
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
    expect(dashboardSource).toContain("Used by developers at");
    expect(dashboardSource).toContain("Recognizable systems. Inspectable evidence.");
    expect(dashboardSource).not.toContain("Evaluated technologies, not MCP Observatory customers, endorsements, or partnerships.");
    for (const logo of ["accenture.svg", "cisco.svg", "oracle.svg"]) {
      expect(dashboardSource).toContain(logo);
    }
    expect(dashboardSource).toContain("@latest cloud upload");
  });

  it("keeps the homepage conversion path accessible, current, and lightweight", async () => {
    const dashboardSource = await readFile("scripts/build-dashboard.ts", "utf8");
    const dashboard = await readFile("dashboard/index.html", "utf8");
    const safetyTargets = JSON.parse(await readFile("docs/safety-index/targets.json", "utf8")) as Array<{ id: string; name: string }>;
    const css = await readFile("dashboard/m3.css", "utf8");
    const siteScript = await readFile("dashboard/site.js", "utf8");

    expect(dashboardSource).not.toContain("<style>");
    expect(dashboard.match(/data-copy-command=/g)).toHaveLength(2);
    expect(dashboard).toContain('id="command-copy-status" role="status" aria-live="polite"');
    expect(dashboard).toContain("PUBLISHED EVIDENCE");
    expect(dashboard.match(/class="technology-logo-card /g)).toHaveLength(18);
    expect(dashboard.match(/class="organization-logo"/g)).toHaveLength(3);
    const technologyTargets = [
      ["Microsoft", "clarity-server"],
      ["Google", "chrome-devtools-mcp-server"],
      ["Cloudflare", "cloudflare-server"],
      ["GitHub", "github-mcp-server"],
      ["GitLab", "gitlab-server"],
      ["Docker", "docker-server"],
      ["Kubernetes", "kubernetes-server"],
      ["MongoDB", "mongodb-server"],
      ["Redis", "redis-server"],
      ["PostgreSQL", "postgres-server"],
      ["Supabase", "supabase-server"],
      ["Sentry", "sentry-server"],
      ["Stripe", "stripe-server"],
      ["Shopify", "shopify-mcp-server"],
      ["Notion", "notion-server"],
      ["Figma", "figma-server"],
      ["Linear", "linear-server"],
      ["Coinbase", "coinbase-cds-server"],
    ] as const;
    for (const [brand, targetId] of technologyTargets) {
      const target = safetyTargets.find(candidate => candidate.id === targetId);
      expect(target, `missing Safety Index metadata for ${targetId}`).toBeDefined();
      const href = `href="/safety-index/servers/${targetId}.html"`;
      const cardStart = dashboard.indexOf(href);
      const cardEnd = dashboard.indexOf("</a>", cardStart);
      const card = dashboard.slice(cardStart, cardEnd);
      expect(cardStart, `missing evidence card for ${brand}`).toBeGreaterThanOrEqual(0);
      expect(card).toContain(`<strong>${brand}</strong>`);
      expect(card).toContain(`aria-label="Inspect published evidence for ${target?.name}"`);
      expect(card).toContain(`title="${target?.name}"`);
    }
    expect(dashboard).toContain("Used by developers at");
    expect(dashboard).toMatch(/Browse all \d+ indexed servers/);
    expect(dashboard).not.toMatch(/>\s*LIVE\s*</i);
    const verifiedCards = dashboard.match(/class="verified-card"/g) ?? [];
    expect(verifiedCards.length).toBeGreaterThan(0);
    expect(verifiedCards.length).toBeLessThanOrEqual(3);
    expect(dashboard.match(/<time datetime="[^"]+">/g)).toHaveLength(verifiedCards.length);
    expect(dashboard).not.toContain('id="server-search"');
    expect(dashboard).toContain('href="/safety-index/">Explore the full Safety Index');
    expect(Buffer.byteLength(dashboard, "utf8")).toBeLessThanOrEqual(75_000);
    expect(dashboard.match(/rel="stylesheet"/g)).toHaveLength(1);
    expect(dashboard).toContain('rel="stylesheet" href="/m3.css');
    expect(dashboard).toContain('src="/site.js?v=20260905"');
    expect(css).toContain("m3.css owns all homepage layout and visual styling");
    expect(siteScript).toContain('[data-copy-command]');
  });

  it("copies the primary command and announces success", async () => {
    const siteScript = await readFile("dashboard/site.js", "utf8");
    const status = { textContent: "" };
    let click: (() => Promise<void>) | undefined;
    const button = {
      textContent: "Copy command",
      getAttribute: (name: string) => name === "data-copy-command" ? "npx observatory" : null,
      addEventListener: (_event: string, listener: () => Promise<void>) => {
        click = listener;
      },
    };
    let copied = "";
    const timers: Array<() => void> = [];

    runInNewContext(siteScript, {
      document: {
        querySelector: () => status,
        querySelectorAll: () => [button],
      },
      navigator: { clipboard: { writeText: (value: string) => {
        copied = value;
        return Promise.resolve();
      } } },
      window: {
        clearTimeout: () => undefined,
        setTimeout: (callback: () => void) => {
          timers.push(callback);
          return timers.length;
        },
      },
    });

    await click?.();

    expect(copied).toBe("npx observatory");
    expect(button.textContent).toBe("Copied");
    expect(status.textContent).toBe("Command copied to your clipboard.");
    expect(timers).toHaveLength(2);

    await click?.();
    expect(button.textContent).toBe("Copied");
    expect(timers).toHaveLength(4);
    timers.forEach(callback => callback());
    expect(button.textContent).toBe("Copy command");
  });

  it("uses one light public design system for Safety Index pages", async () => {
    const generator = await readFile("scripts/generate-server-pages.ts", "utf8");
    const css = await readFile("dashboard/m3.css", "utf8");
    const safetyIndexScript = await readFile("dashboard/safety-index.js", "utf8");

    for (const file of [
      "dashboard/safety-index/index.html",
      "dashboard/safety-index/servers/context7-server.html",
    ]) {
      const source = await readFile(file, "utf8");
      expect(source).toContain('<meta name="theme-color" content="#f9fbfc">');
      expect(source).not.toContain("evidence-theme");
      expect(source).not.toContain("color-scheme:dark");
      expect(source).not.toMatch(/<style\b/i);
      expect(source).not.toMatch(/style=/i);
    }

    expect(generator).not.toContain("evidence-theme");
    expect(generator).not.toContain("color-scheme:dark");
    expect(css).toContain("color-scheme:light");
    expect(css).toMatch(/\.safety-detail-page \.grade-detail\{width:100%\}/);
    expect(safetyIndexScript).toContain('#categoryFilter');
    expect(safetyIndexScript).toContain('#resultCount');
  });

  it("keeps Safety Index filtering compact and CSP-compatible", async () => {
    const index = await readFile("dashboard/safety-index/index.html", "utf8");
    const headers = await readFile("dashboard/_headers", "utf8");

    expect(index).toContain('id="search"');
    expect(index).toContain('id="categoryFilter"');
    expect(index).toContain('id="resultCount" role="status" aria-live="polite"');
    expect(index).toContain('class="table-wrap" role="region" aria-label="MCP server safety index" tabindex="0"');
    expect(index).not.toContain('id="catFilters"');
    expect(index).toContain('<script src="/safety-index.js?v=20260902" defer></script>');
    expect(index).not.toMatch(/<script(?:\s[^>]*)?>\s*(?!<\/script>)/i);
    expect(headers).toContain("script-src 'self'");
    expect(headers).toContain("style-src 'self'");
    expect(headers).not.toContain("'unsafe-inline'");
  });

  it("filters Safety Index rows by search and category", async () => {
    const script = await readFile("dashboard/safety-index.js", "utf8");
    const rows = [
      { dataset: { name: "Context7", package: "@upstash/context7-mcp", category: "Documentation / Search" }, hidden: false },
      { dataset: { name: "Memory", package: "@modelcontextprotocol/server-memory", category: "Reference / Memory" }, hidden: false },
    ];
    const listeners: Record<string, () => void> = {};
    const search = { value: "", addEventListener: (event: string, listener: () => void) => { listeners[event] = listener; } };
    const category = { value: "", addEventListener: (event: string, listener: () => void) => { listeners[event] = listener; } };
    const resultCount = { textContent: "Showing all 2 servers" };
    const table = { querySelectorAll: () => rows };

    runInNewContext(script, {
      document: {
        querySelector: (selector: string) => ({
          "#serverTable": table,
          "#search": search,
          "#categoryFilter": category,
          "#resultCount": resultCount,
        })[selector],
      },
    });

    search.value = "context7";
    listeners.input?.();
    expect(rows.map(row => row.hidden)).toEqual([false, true]);
    expect(resultCount.textContent).toBe("Showing 1 of 2 servers");

    search.value = "";
    category.value = "Reference / Memory";
    listeners.change?.();
    expect(rows.map(row => row.hidden)).toEqual([true, false]);
    expect(resultCount.textContent).toBe("Showing 1 of 2 servers");
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
