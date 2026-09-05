import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targetsPath = path.join(root, "docs", "safety-index", "targets.json");
const artifactsDir = path.join(root, "docs", "safety-index", "artifacts");
const outDir = path.join(root, "dashboard", "safety-index", "servers");
const sitemapPath = path.join(root, "dashboard", "sitemap.xml");

const BASE_URL = "https://mcp-observatory.com";

interface TargetEntry {
  id: string;
  name: string;
  repo: string;
  packageName: string;
  category: string;
  command: string;
  args: string[];
  timeoutMs: number;
  riskClass: string;
  failureClass: string;
  whyItMatters: string;
  reproductionNotes: string;
  env?: Record<string, string>;
  securitySuppressions?: string[];
  publicProof?: string;
}

interface HealthScore {
  overall: number;
  grade: string;
  dimensions: { name: string; weight: number; score: number; details: string[] }[];
}

interface CheckResult {
  id: string;
  status: string;
  message: string;
}

interface RunArtifact {
  gate: string;
  healthScore?: HealthScore;
  checks: CheckResult[];
  summary: { total: number; pass: number; fail: number; partial: number; unsupported: number; flaky: number; skipped: number };
  fatalError?: string;
  performanceMetrics?: { connectMs?: number };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function gradeTone(grade: string): string {
  if (grade === "A" || grade === "B") return "tone-success";
  if (grade === "C" || grade === "D") return "tone-warning";
  return "tone-error";
}

function checkLabel(status: string): string {
  const map: Record<string, string> = {
    pass: "Pass", fail: "Fail", partial: "Partial",
    unsupported: "N/A", flaky: "Flaky", skipped: "Skipped",
  };
  return map[status] ?? status;
}

function checkTone(status: string): string {
  if (status === "pass") return "tone-success";
  if (status === "fail") return "tone-error";
  if (status === "partial" || status === "flaky") return "tone-warning";
  return "tone-neutral";
}

function scoreMeter(score: number, label: string): string {
  const tone = score >= 90 ? "tone-success" : score >= 70 ? "tone-warning" : "tone-error";
  return `<progress class="score-meter ${tone}" max="100" value="${score}" aria-label="${esc(label)}">${score}%</progress>`;
}

function renderPage(t: TargetEntry, artifact: RunArtifact | null, index: number, total: number): string {
  const title = `${t.name} — Safety Report | MCP Observatory`;
  const desc = `Safety evaluation for ${t.packageName}: ${t.whyItMatters.substring(0, 150)}${t.whyItMatters.length > 150 ? "..." : ""}`;
  const pageUrl = `${BASE_URL}/safety-index/servers/${t.id}.html`;
  const hs = artifact?.healthScore;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f9fbfc">
  <meta name="description" content="${esc(desc)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${BASE_URL}/mcp-observatory-logo-v2.png">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${BASE_URL}/mcp-observatory-logo-v2.png">
  <link rel="canonical" href="${pageUrl}">
  <link rel="icon" href="/mcp-observatory-favicon-v2.png" type="image/png" sizes="1254x1254">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="/m3.css?v=20260902">
</head>
<body class="safety-detail-page">
<a class="skip-link" href="#main-content">Skip to main content</a>
<div class="container">
  <nav class="nav" aria-label="Primary navigation">
    <a href="/" class="brand" aria-label="MCP Observatory home"><img src="/mcp-observatory-logo-v2.png" alt="" width="1536" height="329"></a>
    <div class="navlinks">
      <a href="/safety-index/" aria-current="page">Safety Index</a>
      <a href="/release-gate-pilot/">Release Gate</a>
      <a href="/partners/">Partners</a>
      <a href="https://www.npmjs.com/package/@kryptosai/mcp-observatory">Install ↗</a>
    </div>
  </nav>

  <main id="main-content">
  <div class="breadcrumb">
    <a href="/safety-index/">Safety Index</a> &rsaquo; ${esc(t.name)}
  </div>

  <div class="hero">
    <h1>${esc(t.name)}</h1>
    <div class="meta">
      <span class="badge cat">${esc(t.category)}</span>
      <span class="badge risk">${esc(t.riskClass)}</span>
      ${artifact?.fatalError ? '<span class="badge fail">Startup Failed</span>' : artifact?.gate === "fail" ? '<span class="badge fail">Blocked</span>' : ""}
    </div>
    <p class="why">${esc(t.whyItMatters)}</p>
  </div>

  ${hs ? `
  <div class="grade-card">
    <div class="grade-letter ${gradeTone(hs.grade)}">${esc(hs.grade)}</div>
    <div class="grade-detail">
      <div class="grade-score">${hs.overall} / 100 <span class="grade-context">overall</span></div>
      <div class="grade-bar">${scoreMeter(hs.overall, `Overall safety score: ${hs.overall} out of 100`)}</div>
    </div>
  </div>
  ` : artifact?.fatalError ? `
  <div class="grade-card">
    <div class="grade-letter tone-error">N/A</div>
    <div class="grade-detail">
      <div class="grade-score grade-score-compact">Could not evaluate</div>
      <div class="failure-detail">${esc(artifact.fatalError.split("\\n")[0] ?? "Unknown error")}</div>
    </div>
  </div>
  ` : ""}

  ${hs ? `
  <div class="section">
    <h2>Score Dimensions</h2>
    <div class="panel">
      ${hs.dimensions.map(d => `
      <div class="dim-row">
        <div class="dim-name">${esc(d.name)}</div>
        <div class="dim-score">${d.score}/100</div>
        <div class="dim-bar">${scoreMeter(d.score, `${d.name}: ${d.score} out of 100`)}</div>
        <div class="dim-pct">${Math.round(d.weight * 100)}%</div>
      </div>`).join("")}
    </div>
  </div>
  ` : ""}

  ${artifact ? `
  <div class="section">
    <h2>Check Results</h2>
    <div class="panel">
      <div class="check-summary">
        <span class="tone-success">${artifact.summary.pass} pass</span>
        <span class="tone-error">${artifact.summary.fail} fail</span>
        <span class="tone-warning">${artifact.summary.partial + artifact.summary.flaky} partial</span>
        <span class="tone-neutral">${artifact.summary.unsupported + artifact.summary.skipped} skipped</span>
      </div>
      ${artifact.checks.map(ch => `
      <div class="check-row">
        <div class="check-id">${esc(ch.id)}</div>
        <div class="check-status ${checkTone(ch.status)}">${checkLabel(ch.status)}</div>
        <div class="check-msg">${esc(ch.message)}</div>
      </div>`).join("")}
    </div>
  </div>
  ` : `
  <div class="section">
    <h2>Check Results</h2>
    <div class="panel">
      <p class="empty-state">No artifact data available for this server.</p>
    </div>
  </div>
  `}

  <div class="links">
    ${t.repo ? `<a href="${esc(t.repo)}" target="_blank" rel="noopener" class="button">View Repository →</a>` : ""}
    ${t.publicProof ? `<a href="${esc(t.publicProof)}" target="_blank" rel="noopener" class="button">Public Proof →</a>` : ""}
    <a href="https://github.com/KryptosAI/mcp-observatory/blob/main/docs/safety-index/artifacts/${esc(t.id)}.json" target="_blank" rel="noopener" class="button">Raw Artifact →</a>
    <a href="https://github.com/KryptosAI/mcp-observatory/blob/main/docs/safety-index/artifacts/${esc(t.id)}.md" target="_blank" rel="noopener" class="button">Full Report →</a>
  </div>

  <div class="nav-pager">
    ${index > 0 ? `<a href="./${esc(total > 1 ? "" : "")}">&larr; Previous</a>` : "<span></span>"}
    ${index < total - 1 ? `<a href="./${esc(total > 1 ? "" : "")}">Next &rarr;</a>` : "<span></span>"}
  </div>
</div>
</main>

<footer>
  <div class="container">
    <p>MCP Observatory Safety Index &middot; ${total} servers evaluated &middot; <a href="/sitemap.xml">Sitemap</a></p>
    <p>Open-source MIT license &middot; <a href="https://github.com/KryptosAI/mcp-observatory">github.com/KryptosAI/mcp-observatory</a></p>
  </div>
</footer>
</body>
</html>`;
}

async function generateSitemap(ids: string[]): Promise<void> {
  const urls = [
    { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${BASE_URL}/start/`, changefreq: "monthly", priority: "0.9" },
    { loc: `${BASE_URL}/release-gate-pilot/`, changefreq: "weekly", priority: "0.9" },
    { loc: `${BASE_URL}/partners/`, changefreq: "weekly", priority: "0.8" },
    { loc: `${BASE_URL}/release-gate-evidence-pack/`, changefreq: "monthly", priority: "0.8" },
    { loc: `${BASE_URL}/partner-co-sell-kit/`, changefreq: "monthly", priority: "0.7" },
    { loc: `${BASE_URL}/privacy/`, changefreq: "yearly", priority: "0.4" },
    { loc: `${BASE_URL}/safety-index/`, changefreq: "daily", priority: "0.9" },
    ...ids.map(id => ({
      loc: `${BASE_URL}/safety-index/servers/${id}.html`,
      changefreq: "weekly" as const,
      priority: "0.6",
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${esc(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

  await writeFile(sitemapPath, xml, "utf8");
  console.log(`Sitemap: ${urls.length} URLs written to ${sitemapPath}`);
}

async function main(): Promise<void> {
  const raw = await readFile(targetsPath, "utf8");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const targets: TargetEntry[] = JSON.parse(raw);
  console.log(`Found ${targets.length} targets`);

  await mkdir(outDir, { recursive: true });

  let generated = 0;
  const skipped = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const t = targets[i]!;
    const artifactPath = path.join(artifactsDir, `${t.id}.json`);

    let artifact: RunArtifact | null = null;
    try {
      const rawArtifact = await readFile(artifactPath, "utf8");
      artifact = JSON.parse(rawArtifact) as RunArtifact;
    } catch {
      // No artifact available — still generate the page
    }

    // Update nav-pager with actual prev/next targets
    const prevTarget = i > 0 ? targets[i - 1]! : null;
    const nextTarget = i < targets.length - 1 ? targets[i + 1]! : null;

    let html = renderPage(t, artifact, i, targets.length);

    // Replace placeholder prev/next with real links
    html = html.replace(
      `<a href="./${esc(targets.length > 1 ? "" : "")}">&larr; Previous</a>`,
      prevTarget ? `<a href="./${esc(prevTarget.id)}.html">&larr; ${esc(prevTarget.name)}</a>` : "<span></span>",
    );
    html = html.replace(
      `<a href="./${esc(targets.length > 1 ? "" : "")}">Next &rarr;</a>`,
      nextTarget ? `<a href="./${esc(nextTarget.id)}.html">${esc(nextTarget.name)} &rarr;</a>` : "<span></span>",
    );
    html = html.replace(/[ \t]+$/gm, "");

    const outPath = path.join(outDir, `${t.id}.html`);
    await writeFile(outPath, html, "utf8");
    generated += 1;

    if ((i + 1) % 20 === 0) {
      console.log(`  ${i + 1}/${targets.length} pages generated...`);
    }
  }

  console.log(`Generated ${generated} server pages (${skipped} skipped) to ${outDir}`);

  // Generate sitemap
  await generateSitemap(targets.map(t => t.id));

  // Generate index page
  const indexPath = path.join(outDir, "..", "index.html");
  const indexHtml = generateIndexPage(targets);
  await writeFile(indexPath, indexHtml, "utf8");
  console.log(`Safety Index index page written to ${indexPath}`);
}

function generateIndexPage(targets: TargetEntry[]): string {
  const title = "MCP Server Safety Index — MCP Observatory";
  const desc = `Evidence-based safety evaluations for ${targets.length} MCP servers across ${new Set(targets.map(t => t.category)).size} categories.`;
  const categories = [...new Set(targets.map(t => t.category))].sort();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f9fbfc">
  <meta name="description" content="${esc(desc)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${BASE_URL}/mcp-observatory-logo-v2.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${BASE_URL}/mcp-observatory-logo-v2.png">
  <link rel="canonical" href="${BASE_URL}/safety-index/">
  <link rel="icon" href="/mcp-observatory-favicon-v2.png" type="image/png" sizes="1254x1254">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="/m3.css?v=20260902">
</head>
<body class="safety-index-page">
<a class="skip-link" href="#main-content">Skip to main content</a>
<div class="container">
  <nav class="nav" aria-label="Primary navigation">
    <a href="/" class="brand" aria-label="MCP Observatory home"><img src="/mcp-observatory-logo-v2.png" alt="" width="1536" height="329"></a>
    <div class="navlinks">
      <a href="/safety-index/" aria-current="page">Safety Index</a>
      <a href="/release-gate-pilot/">Release Gate</a>
      <a href="/partners/">Partners</a>
      <a href="https://www.npmjs.com/package/@kryptosai/mcp-observatory">Install ↗</a>
    </div>
  </nav>

  <main id="main-content">
  <div class="hero">
    <h1>MCP Server Safety Index</h1>
    <p class="sub">${esc(desc)} Each server is independently scanned and scored with public, reproducible evidence.</p>
  </div>

  <div class="stats">
    <div><strong>${targets.length}</strong> Servers Evaluated</div>
    <div><strong>${new Set(targets.map(t => t.category)).size}</strong> Categories</div>
  </div>

  <div class="index-controls">
    <label class="field-label">Search indexed servers<input type="search" id="search" placeholder="Search ${targets.length} servers by name, category, or package..."></label>
    <label class="field-label">Category<select id="categoryFilter"><option value="">All categories</option>${categories.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join("")}</select></label>
  </div>
  <p class="index-result-count" id="resultCount" role="status" aria-live="polite">Showing all ${targets.length} servers</p>

  <div class="table-wrap" role="region" aria-label="MCP server safety index" tabindex="0">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Server</th>
          <th>Category</th>
          <th>Risk Class</th>
          <th>Package</th>
        </tr>
      </thead>
      <tbody id="serverTable">
        ${targets.map((t, i) => `
        <tr data-category="${esc(t.category)}" data-name="${esc(t.name)}" data-package="${esc(t.packageName)}">
          <td class="row-number">${i + 1}</td>
          <td class="server-name"><a href="./servers/${esc(t.id)}.html">${esc(t.name)}</a></td>
          <td class="category-cell">${esc(t.category)}</td>
          <td class="risk-cell">${esc(t.riskClass)}</td>
          <td class="package-cell">${esc(t.packageName)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>
</div>
</main>

<footer>
  <div class="container">
    <p>MCP Observatory Safety Index &middot; ${targets.length} servers evaluated &middot; <a href="/sitemap.xml">Sitemap</a></p>
    <p>Open-source MIT license &middot; <a href="https://github.com/KryptosAI/mcp-observatory">github.com/KryptosAI/mcp-observatory</a></p>
  </div>
</footer>

<script src="/safety-index.js?v=20260902" defer></script>
</body>
</html>`;
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
