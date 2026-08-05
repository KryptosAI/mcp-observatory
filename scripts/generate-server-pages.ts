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

function gradeColor(grade: string): string {
  if (grade === "A" || grade === "B") return "var(--green)";
  if (grade === "C" || grade === "D") return "var(--amber)";
  return "var(--red)";
}

function gradeBar(score: number): string {
  const width = 24;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const fillColor = score >= 90 ? "var(--green)" : score >= 70 ? "var(--amber)" : "var(--red)";
  return `<span style="color:${fillColor}">${"█".repeat(filled)}</span><span style="color:rgba(148,163,184,.2)">${"░".repeat(empty)}</span>`;
}

function checkIcon(status: string): string {
  if (status === "pass") return '<span style="color:var(--green)">✓</span>';
  if (status === "fail") return '<span style="color:var(--red)">✗</span>';
  return '<span style="color:var(--amber)">○</span>';
}

function checkLabel(status: string): string {
  const map: Record<string, string> = {
    pass: "Pass", fail: "Fail", partial: "Partial",
    unsupported: "N/A", flaky: "Flaky", skipped: "Skipped",
  };
  return map[status] ?? status;
}

function checkColor(status: string): string {
  if (status === "pass") return "var(--green)";
  if (status === "fail") return "var(--red)";
  if (status === "partial" || status === "flaky") return "var(--amber)";
  return "var(--muted)";
}

function dimBar(score: number): string {
  const width = 20;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return `<span style="color:rgba(148,163,184,.25)">${"▐".repeat(filled)}</span><span style="color:rgba(148,163,184,.08)">${"░".repeat(empty)}</span>`;
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
  <meta name="theme-color" content="#070b14">
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
  <style>
    :root{color-scheme:dark;--bg:#070b14;--panel:rgba(16,24,40,.76);--line:rgba(148,163,184,.16);--muted:#91a0b6;--text:#eef4ff;--cyan:#58e6ff;--violet:#9b8cff;--green:#47e6a4;--red:#ff6b7a;--amber:#f5a623}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-width:320px;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:radial-gradient(circle at 12% 0%,rgba(68,97,255,.2),transparent 32rem),radial-gradient(circle at 88% 12%,rgba(45,212,191,.12),transparent 28rem),var(--bg);line-height:1.55}
    body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.16;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to bottom,#000,transparent 80%)}
    .container{width:min(900px,calc(100% - 40px));margin:auto;position:relative}
    .nav{min-height:80px;display:flex;align-items:center;justify-content:space-between;padding:20px 0}
    .brand{display:flex;align-items:center;text-decoration:none;color:var(--text);font-size:16px;font-weight:700;gap:10px}
    .brand svg{width:28px;height:28px}
    .navlinks{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:flex-end}
    .navlinks a{color:#b7c3d5;text-decoration:none;font-size:13px}
    .navlinks a:hover{color:var(--text)}
    .button{padding:8px 14px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);text-decoration:none;font-size:13px;transition:.18s ease}
    .button:hover{border-color:rgba(88,230,255,.25)}

    .breadcrumb{padding:12px 0;color:var(--muted);font-size:13px}
    .breadcrumb a{color:var(--muted);text-decoration:none}
    .breadcrumb a:hover{color:var(--text)}

    .hero{padding:10px 0 32px;border-bottom:1px solid var(--line);margin-bottom:32px}
    .hero h1{margin:0 0 8px;font-size:clamp(28px,4vw,42px);line-height:1.15;letter-spacing:-.03em;word-break:break-word}
    .hero .meta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px}
    .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border:1px solid var(--line)}
    .badge.cat{color:var(--cyan);border-color:rgba(88,230,255,.2);background:rgba(88,230,255,.06)}
    .badge.risk{color:var(--amber);border-color:rgba(245,166,35,.2);background:rgba(245,166,35,.06)}
    .badge.fail{color:var(--red);border-color:rgba(255,107,122,.2);background:rgba(255,107,122,.06)}
    .hero .why{max-width:700px;color:#a8b5c8;font-size:15px;line-height:1.6}

    .grade-card{display:flex;align-items:center;gap:20px;padding:24px;border:1px solid var(--line);border-radius:17px;background:linear-gradient(145deg,rgba(18,27,45,.78),rgba(10,16,28,.68));margin-bottom:24px}
    .grade-letter{font-size:64px;font-weight:900;line-height:1;letter-spacing:-.06em}
    .grade-detail{flex:1}
    .grade-score{font-size:28px;font-weight:700;letter-spacing:-.03em;margin-bottom:6px}
    .grade-bar{font-family:monospace;font-size:15px;letter-spacing:.15em;line-height:1.2}

    .section{margin-bottom:28px}
    .section h2{margin:0 0 14px;font-size:17px;letter-spacing:-.02em}
    .panel{padding:20px 24px;border:1px solid var(--line);border-radius:17px;background:linear-gradient(145deg,rgba(18,27,45,.78),rgba(10,16,28,.68))}

    .dim-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(148,163,184,.06)}
    .dim-row:last-child{border-bottom:0}
    .dim-name{width:180px;font-weight:600;font-size:14px;flex-shrink:0}
    .dim-score{width:60px;font-size:15px;font-weight:700;text-align:right;flex-shrink:0}
    .dim-bar{flex:1;font-family:monospace;font-size:13px;letter-spacing:.15em}
    .dim-pct{width:44px;font-size:12px;color:var(--muted);text-align:right;flex-shrink:0}

    .check-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(148,163,184,.06)}
    .check-row:last-child{border-bottom:0}
    .check-icon{width:16px;text-align:center;flex-shrink:0}
    .check-id{width:150px;font-family:"SF Mono","Fira Code",monospace;font-size:12px;color:var(--cyan);flex-shrink:0}
    .check-status{width:70px;font-size:12px;font-weight:700;flex-shrink:0}
    .check-msg{font-size:12px;color:var(--muted);flex:1}

    .links{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
    .links .button{font-size:13px}

    .nav-pager{display:flex;justify-content:space-between;padding:32px 0;border-top:1px solid var(--line);margin-top:40px}
    .nav-pager a{color:var(--muted);text-decoration:none;font-size:14px;display:flex;align-items:center;gap:8px}
    .nav-pager a:hover{color:var(--text)}

    footer{padding:32px 0 48px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
    footer a{color:var(--muted)}
    @media(max-width:640px){.nav{flex-wrap:wrap;gap:12px}.navlinks{width:100%;justify-content:space-between;gap:10px}.navlinks a{font-size:12px}.grade-card{flex-direction:column;text-align:center}.dim-name{width:120px}.check-id{width:100px}}
  </style>
  <link rel="stylesheet" href="/m3.css?v=20260805-2">
</head>
<body class="evidence-theme">
<a class="skip-link" href="#main-content">Skip to main content</a>
<div class="container">
  <nav class="nav" aria-label="Primary navigation">
    <a href="/" class="brand" aria-label="MCP Observatory">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="7" fill="#58e6ff" fill-opacity=".15"/><path d="M7 11c1.5-2 3-3 5-3s3.5 1 5 3M7 17c1.5 2 3 3 5 3s3.5-1 5-3" stroke="#58e6ff" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="14" r="1.5" fill="#47e6a4"/><circle cx="14" cy="14" r="1.5" fill="#47e6a4"/><circle cx="20" cy="14" r="1.5" fill="#47e6a4"/></svg>
      Observatory
    </a>
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
      ${artifact?.gate === "fail" ? '<span class="badge fail">Startup Failed</span>' : ""}
    </div>
    <p class="why">${esc(t.whyItMatters)}</p>
  </div>

  ${hs ? `
  <div class="grade-card">
    <div class="grade-letter" style="color:${gradeColor(hs.grade)}">${esc(hs.grade)}</div>
    <div class="grade-detail">
      <div class="grade-score">${hs.overall} / 100 <span style="font-size:14px;color:var(--muted);font-weight:400">overall</span></div>
      <div class="grade-bar">${gradeBar(hs.overall)}</div>
    </div>
  </div>
  ` : artifact?.fatalError ? `
  <div class="grade-card">
    <div class="grade-letter" style="color:var(--red)">—</div>
    <div class="grade-detail">
      <div class="grade-score" style="font-size:16px;font-weight:600;color:var(--muted)">Could not evaluate</div>
      <div style="font-size:13px;color:var(--muted)">${esc(artifact.fatalError.split("\\n")[0] ?? "Unknown error")}</div>
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
        <div class="dim-bar">${dimBar(d.score)}</div>
        <div class="dim-pct">${Math.round(d.weight * 100)}%</div>
      </div>`).join("")}
    </div>
  </div>
  ` : ""}

  ${artifact ? `
  <div class="section">
    <h2>Check Results</h2>
    <div class="panel">
      <div style="display:flex;gap:18px;margin-bottom:14px;font-size:12px;color:var(--muted)">
        <span><span style="color:var(--green)">●</span> ${artifact.summary.pass} pass</span>
        <span><span style="color:var(--red)">●</span> ${artifact.summary.fail} fail</span>
        <span><span style="color:var(--amber)">●</span> ${artifact.summary.partial + artifact.summary.flaky} partial</span>
        <span><span style="color:var(--muted)">●</span> ${artifact.summary.unsupported + artifact.summary.skipped} skipped</span>
      </div>
      ${artifact.checks.map(ch => `
      <div class="check-row">
        <div class="check-icon">${checkIcon(ch.status)}</div>
        <div class="check-id">${esc(ch.id)}</div>
        <div class="check-status" style="color:${checkColor(ch.status)}">${checkLabel(ch.status)}</div>
        <div class="check-msg">${esc(ch.message)}</div>
      </div>`).join("")}
    </div>
  </div>
  ` : `
  <div class="section">
    <h2>Check Results</h2>
    <div class="panel">
      <p style="color:var(--muted)">No artifact data available for this server.</p>
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
    { loc: `${BASE_URL}/release-gate-pilot/`, changefreq: "weekly", priority: "0.9" },
    { loc: `${BASE_URL}/partners/`, changefreq: "weekly", priority: "0.8" },
    { loc: `${BASE_URL}/release-gate-evidence-pack/`, changefreq: "monthly", priority: "0.8" },
    { loc: `${BASE_URL}/partner-co-sell-kit/`, changefreq: "monthly", priority: "0.7" },
    { loc: `${BASE_URL}/privacy/`, changefreq: "yearly", priority: "0.4" },
    { loc: `${BASE_URL}/safety-index/`, changefreq: "daily", priority: "0.9" },
    { loc: `${BASE_URL}/fleet-monitor.html`, changefreq: "daily", priority: "0.8" },
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#070b14">
  <meta name="description" content="${esc(desc)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${BASE_URL}/mcp-observatory-logo-v2.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${BASE_URL}/mcp-observatory-logo-v2.png">
  <link rel="canonical" href="${BASE_URL}/safety-index/">
  <link rel="icon" href="/mcp-observatory-favicon-v2.png" type="image/png" sizes="1254x1254">
  <title>${esc(title)}</title>
  <style>
    :root{color-scheme:dark;--bg:#070b14;--panel:rgba(16,24,40,.76);--line:rgba(148,163,184,.16);--muted:#91a0b6;--text:#eef4ff;--cyan:#58e6ff;--violet:#9b8cff;--green:#47e6a4;--red:#ff6b7a;--amber:#f5a623}
    *{box-sizing:border-box}body{margin:0;min-width:320px;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:radial-gradient(circle at 12% 0%,rgba(68,97,255,.2),transparent 32rem),radial-gradient(circle at 88% 12%,rgba(45,212,191,.12),transparent 28rem),var(--bg);line-height:1.55}
    body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.16;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to bottom,#000,transparent 80%)}
    .container{width:min(1100px,calc(100% - 40px));margin:auto;position:relative}
    .nav{min-height:80px;display:flex;align-items:center;justify-content:space-between;padding:20px 0}
    .brand{display:flex;align-items:center;text-decoration:none;color:var(--text);font-size:16px;font-weight:700;gap:10px}
    .brand svg{width:28px;height:28px}
    .navlinks{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:flex-end}
    .navlinks a{color:#b7c3d5;text-decoration:none;font-size:13px}
    .navlinks a:hover{color:var(--text)}

    .hero{padding:10px 0 32px;border-bottom:1px solid var(--line);margin-bottom:28px}
    .hero h1{margin:0 0 8px;font-size:clamp(28px,4vw,42px);line-height:1.15;letter-spacing:-.03em}
    .hero .sub{max-width:700px;color:#a8b5c8;font-size:15px}

    .stats{display:flex;gap:40px;margin-bottom:28px;font-size:14px;color:var(--muted)}
    .stats strong{display:block;font-size:28px;color:var(--text);font-weight:700;letter-spacing:-.03em}

    .search-bar{margin-bottom:20px}
    .search-bar input{width:100%;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--text);font-size:14px;font-family:inherit;outline:none}
    .search-bar input:focus{border-color:rgba(88,230,255,.3)}
    .search-bar input::placeholder{color:var(--muted)}

    .cat-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
    .cat-filters button{padding:5px 12px;border:1px solid var(--line);border-radius:16px;background:transparent;color:var(--muted);font-size:12px;cursor:pointer;font-family:inherit;transition:.15s ease}
    .cat-filters button:hover,.cat-filters button.active{border-color:var(--cyan);color:var(--cyan);background:rgba(88,230,255,.06)}

    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:10px 12px;color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--line)}
    td{padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.06)}
    tr:hover td{background:rgba(88,230,255,.03)}
    .server-name{font-weight:600;color:var(--text)}
    .server-name a{color:inherit;text-decoration:none}
    .server-name a:hover{color:var(--cyan)}

    footer{padding:32px 0 48px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
    footer a{color:var(--muted)}
    @media(max-width:640px){.nav{flex-wrap:wrap;gap:12px}.navlinks{width:100%;justify-content:space-between;gap:10px}.navlinks a{font-size:12px}}
  </style>
  <link rel="stylesheet" href="/m3.css?v=20260805-2">
</head>
<body class="evidence-theme">
<a class="skip-link" href="#main-content">Skip to main content</a>
<div class="container">
  <nav class="nav" aria-label="Primary navigation">
    <a href="/" class="brand" aria-label="MCP Observatory">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="7" fill="#58e6ff" fill-opacity=".15"/><path d="M7 11c1.5-2 3-3 5-3s3.5 1 5 3M7 17c1.5 2 3 3 5 3s3.5-1 5-3" stroke="#58e6ff" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="14" r="1.5" fill="#47e6a4"/><circle cx="14" cy="14" r="1.5" fill="#47e6a4"/><circle cx="20" cy="14" r="1.5" fill="#47e6a4"/></svg>
      Observatory
    </a>
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

  <div class="search-bar">
    <label class="field-label">Search indexed servers<input type="text" id="search" placeholder="Search ${targets.length} servers by name, category, or package..." oninput="filterTable()"></label>
  </div>

  <div class="cat-filters" id="catFilters"></div>

  <div class="table-wrap">
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
          <td style="color:var(--muted)">${i + 1}</td>
          <td class="server-name"><a href="./servers/${esc(t.id)}.html">${esc(t.name)}</a></td>
          <td style="color:var(--cyan)">${esc(t.category)}</td>
          <td style="color:var(--amber)">${esc(t.riskClass)}</td>
          <td style="font-family:monospace;font-size:11px;color:var(--muted)">${esc(t.packageName)}</td>
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

<script>
  const rows = Array.from(document.querySelectorAll("#serverTable tr"));
  const cats = [...new Set(rows.map(r => r.dataset.category))].sort();
  const filterDiv = document.getElementById("catFilters");
  let activeCat = "";
  cats.forEach(c => {
    const btn = document.createElement("button");
    btn.textContent = c;
    btn.onclick = () => { activeCat = activeCat === c ? "" : c; updateFilters(); };
    filterDiv.appendChild(btn);
  });
  function updateFilters() {
    document.querySelectorAll("#catFilters button").forEach(b => {
      b.classList.toggle("active", b.textContent === activeCat);
    });
    filterTable();
  }
  function filterTable() {
    const q = document.getElementById("search").value.toLowerCase();
    rows.forEach(r => {
      const matchCat = !activeCat || r.dataset.category === activeCat;
      const matchSearch = !q || r.dataset.name.toLowerCase().includes(q) || r.dataset.package.toLowerCase().includes(q) || r.dataset.category.toLowerCase().includes(q);
      r.style.display = matchCat && matchSearch ? "" : "none";
    });
  }
</script>
</body>
</html>`;
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
