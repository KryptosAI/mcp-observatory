import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const matrixSummaryPath = path.join(root, "examples", "matrix-summary.json");
const matrixHistoryPath = path.join(root, "examples", "matrix-history.json");
const safetyTargetsPath = path.join(root, "docs", "safety-index", "targets.json");
const demoPath = path.join(root, "docs", "demo.gif");
const logoPath = path.join(root, "docs", "assets", "mcp-observatory-logo.png");
const faviconPath = path.join(root, "docs", "assets", "mcp-observatory-favicon-v2.png");
const dashboardDir = path.join(root, "dashboard");
const badgesDir = path.join(dashboardDir, "badges");
const apiDir = path.join(dashboardDir, "api");

interface MatrixSummaryEntry {
  targetId: string;
  packageName: string;
  packageVersion?: string;
  runDate: string;
  gate: "pass" | "fail";
  tools: string;
  prompts: string;
  resources: string;
  command: string;
  whyItMatters: string;
}

interface HistoryEntry {
  date: string;
  entries: MatrixSummaryEntry[];
}

interface SafetyTarget {
  id: string;
  name: string;
  repo: string;
  packageName: string;
  category: string;
  riskClass: string;
  failureClass: string;
  whyItMatters: string;
}

function badge(targetId: string, gate: "pass" | "fail"): string {
  const label = "observatory";
  const message = gate === "pass" ? "passing" : "failing";
  const color = gate === "pass" ? "#4c1" : "#e05d44";
  const labelWidth = 72;
  const messageWidth = gate === "pass" ? 56 : 44;
  const totalWidth = labelWidth + messageWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + messageWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${message}</text>
  </g>
</svg>`;
}

function statusDot(gate: "pass" | "fail"): string {
  const color = gate === "pass" ? "#4c1" : "#e05d44";
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin:0 1px;" title="${gate}"></span>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function buildHtml(current: MatrixSummaryEntry[], history: HistoryEntry[], safetyTargets: SafetyTarget[]): string {
  const passCount = current.filter(e => e.gate === "pass").length;
  const failCount = current.filter(e => e.gate === "fail").length;

  const rows = current.map(entry => {
    const gateColor = entry.gate === "pass" ? "#4c1" : "#e05d44";
    const gateLabel = entry.gate === "pass" ? "PASS" : "FAIL";

    // Build trend dots from history (last 14 runs)
    const trend = history.slice(-14).map(h => {
      const match = h.entries.find(e => e.targetId === entry.targetId);
      return match ? statusDot(match.gate) : '<span style="display:inline-block;width:8px;height:8px;margin:0 1px;">-</span>';
    }).join("");

    return `<tr>
      <td><strong>${escapeHtml(entry.packageName)}</strong><br><code style="font-size:11px;color:#666;">${escapeHtml(entry.targetId)}</code></td>
      <td><span style="background:${gateColor};color:#fff;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:bold;">${gateLabel}</span></td>
      <td style="font-size:12px;">${entry.tools}</td>
      <td style="font-size:12px;">${entry.prompts}</td>
      <td style="font-size:12px;">${entry.resources}</td>
      <td style="font-size:12px;color:#666;">${formatDate(entry.runDate)}</td>
      <td>${trend || "-"}</td>
    </tr>`;
  }).join("\n");

  const categories = [...new Set(safetyTargets.map(target => target.category))].sort();
  const categoryOptions = categories.map(category =>
    `<option value="${escapeHtml(category.toLowerCase())}">${escapeHtml(category)}</option>`,
  ).join("");
  const safetyCards = safetyTargets.map((target, index) => `<article class="server-card${index >= 12 ? " is-hidden" : ""}" data-search="${escapeHtml(`${target.name} ${target.packageName} ${target.category} ${target.riskClass} ${target.failureClass}`.toLowerCase())}" data-category="${escapeHtml(target.category.toLowerCase())}">
      <div class="card-top"><span class="index-number">${String(index + 1).padStart(2, "0")}</span><span class="evidence-chip">Evidence published</span></div>
      <h3><a href="${escapeHtml(target.repo)}">${escapeHtml(target.name)}</a></h3>
      <code>${escapeHtml(target.packageName)}</code>
      <div class="card-meta"><span>${escapeHtml(target.category)}</span><span>${escapeHtml(target.riskClass)}</span></div>
      <p>${escapeHtml(target.whyItMatters)}</p>
      <div class="card-footer"><span>${escapeHtml(target.failureClass)}</span><a href="https://github.com/KryptosAI/mcp-observatory/blob/main/docs/safety-index/artifacts/${escapeHtml(target.id)}.md">View proof ↗</a></div>
    </article>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#070b14">
  <meta name="description" content="Live, reproducible health and compatibility evidence for Model Context Protocol servers.">
  <meta property="og:title" content="MCP Observatory — Trust your tools before your agents do">
  <meta property="og:description" content="Independent compatibility evidence for the MCP ecosystem.">
  <meta property="og:image" content="https://mcp-observatory.com/mcp-observatory-logo-v2.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://mcp-observatory.com/mcp-observatory-logo-v2.png">
  <link rel="canonical" href="https://mcp-observatory.com">
  <link rel="icon" href="/mcp-observatory-favicon-v2.png" type="image/png" sizes="1254x1254">
  <link rel="apple-touch-icon" href="/mcp-observatory-favicon-v2.png">
  <title>MCP Observatory — Live MCP Safety Index</title>
  <style>
    :root{color-scheme:dark;--bg:#070b14;--panel:rgba(16,24,40,.76);--line:rgba(148,163,184,.16);--muted:#91a0b6;--text:#eef4ff;--cyan:#58e6ff;--violet:#9b8cff;--green:#47e6a4;--red:#ff6b7a}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-width:320px;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:radial-gradient(circle at 12% 0%,rgba(68,97,255,.2),transparent 32rem),radial-gradient(circle at 88% 12%,rgba(45,212,191,.12),transparent 28rem),var(--bg);line-height:1.55}
    body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.16;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to bottom,#000,transparent 80%)}
    .container{width:min(1180px,calc(100% - 40px));margin:auto;position:relative}.nav{min-height:112px;display:flex;gap:24px;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;text-decoration:none}.brand img{display:block;width:250px;height:auto;filter:drop-shadow(0 14px 30px rgba(0,0,0,.18))}.navlinks{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:18px;align-items:center}.navlinks a{color:#b7c3d5;text-decoration:none;font-size:14px}.button{padding:10px 16px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
    .hero{padding:50px 0 54px;display:grid;grid-template-columns:1.4fr .6fr;gap:54px;align-items:end}.eyebrow{display:flex;align-items:center;gap:9px;color:#b9c7da;font-size:12px;font-weight:750;letter-spacing:.12em;text-transform:uppercase}.pulse{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 6px rgba(71,230,164,.11),0 0 22px var(--green)}h1{max-width:760px;margin:18px 0;font-size:clamp(44px,7vw,76px);line-height:1;letter-spacing:-.055em}h1 span{color:transparent;background:linear-gradient(100deg,#fff 10%,var(--cyan) 58%,#b4a9ff);background-clip:text;-webkit-background-clip:text}.subtitle{max-width:680px;margin:0;color:#a8b5c8;font-size:19px}.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:27px}.primary{color:#061018!important;background:linear-gradient(110deg,var(--cyan),#86f7d2);border-color:transparent!important;font-weight:800}.try-command{display:flex;align-items:center;justify-content:space-between;gap:18px;max-width:670px;margin-top:16px;padding:14px 16px;border:1px solid rgba(88,230,255,.25);border-radius:12px;background:#090f1b;box-shadow:inset 0 1px rgba(255,255,255,.04)}.try-command code{color:#dce8f8;background:none;padding:0}.try-command span{color:#697b92;font-size:11px;text-transform:uppercase;letter-spacing:.09em}
    .proof{padding:24px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(155deg,rgba(18,29,48,.9),rgba(9,15,27,.75));box-shadow:0 28px 80px rgba(0,0,0,.28)}.proof strong{font-size:13px}.score{margin:15px 0 8px;font-size:56px;font-weight:800;letter-spacing:-.06em}.score small{font-size:14px;font-weight:500;color:var(--muted);letter-spacing:0}.bar{height:7px;background:#172133;border-radius:10px;overflow:hidden}.bar span{display:block;width:100%;height:100%;background:linear-gradient(90deg,var(--green),var(--cyan))}
    .product-intro{max-width:760px;margin:0 auto 35px;text-align:center}.product-intro h2,.team-section h2,.demo-copy h2,.case-copy h2{margin:8px 0 13px;font-size:clamp(32px,5vw,48px);line-height:1.05;letter-spacing:-.045em}.product-intro p,.demo-copy p,.case-copy p{color:var(--muted)}.features{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:90px}.feature{padding:25px;border:1px solid var(--line);border-radius:17px;background:linear-gradient(145deg,rgba(18,27,45,.76),rgba(10,16,28,.66))}.feature-icon{display:grid;place-items:center;width:34px;height:34px;margin-bottom:30px;border-radius:10px;background:rgba(88,230,255,.09);color:var(--cyan);font-weight:800}.feature h3{margin:0 0 8px}.feature p{margin:0;color:var(--muted);font-size:13px}.team-section{display:grid;grid-template-columns:1fr .9fr;gap:32px;align-items:center;margin:0 0 90px;padding:34px;border:1px solid rgba(88,230,255,.22);border-radius:20px;background:radial-gradient(circle at 100% 0,rgba(88,230,255,.12),transparent 48%),var(--panel)}.team-points{display:grid;gap:12px}.team-points div{padding:12px 14px;border:1px solid var(--line);border-radius:11px;color:#b7c3d5;font-size:13px}.team-points b{color:var(--text)}.demo-section,.case-study{display:grid;grid-template-columns:.8fr 1.2fr;gap:42px;align-items:center;margin-bottom:90px}.demo-frame{overflow:hidden;border:1px solid rgba(88,230,255,.2);border-radius:18px;background:#05080e;box-shadow:0 30px 80px rgba(0,0,0,.38)}.demo-frame img{display:block;width:100%;height:auto}.case-study{grid-template-columns:1fr 1fr;padding:32px;border:1px solid rgba(255,107,122,.2);border-radius:20px;background:radial-gradient(circle at 100% 0,rgba(255,107,122,.09),transparent 50%),var(--panel)}.result-card{padding:24px;border:1px solid var(--line);border-radius:16px;background:#090f1b}.result-head{display:flex;justify-content:space-between;align-items:start}.result-score{font-size:52px;font-weight:820;letter-spacing:-.06em}.blocked{padding:5px 9px;border-radius:99px;background:rgba(255,107,122,.11);color:#ff8a96;font-size:10px;font-weight:800;letter-spacing:.08em}.result-bar{height:7px;margin:12px 0 20px;border-radius:8px;background:#192235;overflow:hidden}.result-bar span{display:block;width:72%;height:100%;background:linear-gradient(90deg,#ff6b7a,#ffc15c)}.finding-row{display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid var(--line);color:#9aa9bd;font-size:12px}.finding-row b{color:var(--text)}.section-title{margin:20px 0}.section-title h2{margin:6px 0;font-size:34px;letter-spacing:-.04em}.section-title p{margin:0;color:var(--muted)}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:22px 0}.stat{padding:20px 23px;border:1px solid var(--line);border-radius:16px;background:var(--panel)}.stat .number{font-size:36px;font-weight:780;letter-spacing:-.04em}.stat .label{font-size:13px;color:var(--muted)}.pass .number{color:var(--green)}.fail .number{color:var(--red)}
    .index-note{display:flex;gap:12px;align-items:flex-start;margin:18px 0 22px;padding:14px 16px;border:1px solid rgba(88,230,255,.18);border-radius:13px;background:rgba(88,230,255,.055);color:#b8c7da;font-size:13px}.index-note b{color:var(--cyan);white-space:nowrap}.directory-tools{display:grid;grid-template-columns:1fr 260px;gap:12px;margin-bottom:14px}.directory-tools input,.directory-tools select{width:100%;height:46px;padding:0 15px;border:1px solid var(--line);border-radius:12px;background:rgba(12,19,33,.9);color:var(--text);font:inherit;outline:none}.directory-tools input:focus,.directory-tools select:focus{border-color:rgba(88,230,255,.55);box-shadow:0 0 0 3px rgba(88,230,255,.08)}.directory-status{margin:0 0 14px;color:var(--muted);font-size:13px}.server-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.server-card{min-height:270px;padding:20px;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:17px;background:linear-gradient(145deg,rgba(18,27,45,.78),rgba(10,16,28,.68));transition:.18s ease}.server-card:hover{transform:translateY(-2px);border-color:rgba(88,230,255,.25);box-shadow:0 18px 46px rgba(0,0,0,.22)}.server-card.is-hidden{display:none}.card-top,.card-footer,.card-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.index-number{color:#687890;font-size:11px;font-weight:800;letter-spacing:.1em}.evidence-chip{padding:4px 8px;border-radius:99px;background:rgba(88,230,255,.09);color:#70e8b5;font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.06em}.server-card h3{margin:18px 0 7px;font-size:17px;line-height:1.25}.server-card h3 a{color:var(--text);text-decoration:none}.server-card code{align-self:flex-start;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8fa0b7;background:#172133;padding:4px 7px;border-radius:6px;font-size:11px}.card-meta{justify-content:flex-start;flex-wrap:wrap;margin:14px 0 5px}.card-meta span{padding:4px 7px;border:1px solid var(--line);border-radius:7px;color:#98a8bd;font-size:10px}.server-card p{margin:8px 0 18px;color:var(--muted);font-size:12px;line-height:1.5}.card-footer{margin-top:auto;padding-top:13px;border-top:1px solid rgba(148,163,184,.1);color:#718198;font-size:10px}.card-footer span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.card-footer a{flex:none;color:var(--cyan);text-decoration:none;font-size:11px}.show-more{display:flex;margin:20px auto 55px;padding:11px 20px;border:1px solid var(--line);border-radius:11px;background:var(--panel);color:var(--text);font:inherit;font-size:13px;font-weight:700;cursor:pointer}.show-more:hover{border-color:rgba(88,230,255,.45)}.table-shell{overflow:auto;border:1px solid var(--line);border-radius:18px;background:rgba(12,19,33,.8);box-shadow:0 26px 70px rgba(0,0,0,.22)}table{width:100%;border-collapse:collapse}th{text-align:left;padding:15px 17px;background:rgba(255,255,255,.025);color:#77869d;font-size:10px;text-transform:uppercase;letter-spacing:.11em}td{padding:16px 17px;border-top:1px solid rgba(148,163,184,.1)}tbody tr:hover{background:rgba(88,230,255,.035)}code{background:#172133;padding:3px 6px;border-radius:5px}.footer{padding:42px 0;text-align:center;color:var(--muted);font-size:13px}.footer a{color:var(--cyan);text-decoration:none}
    @media(max-width:900px){.server-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.features{grid-template-columns:1fr}.feature-icon{margin-bottom:18px}.team-section,.demo-section,.case-study{grid-template-columns:1fr}}@media(max-width:820px){.hero{grid-template-columns:1fr;padding-top:34px}.proof{max-width:520px}.nav{min-height:auto;padding:22px 0;align-items:flex-start}.brand img{width:205px}.navlinks{gap:12px}}@media(max-width:620px){.directory-tools{grid-template-columns:1fr}.server-grid{grid-template-columns:1fr}.server-card{min-height:230px}.try-command{align-items:flex-start;flex-direction:column}}@media(max-width:560px){.container{width:calc(100% - 28px)}h1{font-size:43px}.summary{grid-template-columns:1fr 1fr}.stat:last-child{grid-column:1/-1}th,td{padding:13px 12px}.subtitle{font-size:17px}.index-note{display:block}.index-note b{display:block;margin-bottom:4px}.case-study,.team-section{padding:20px}.nav{flex-wrap:wrap;gap:12px}.brand img{width:190px}.navlinks{width:100%;justify-content:space-between;gap:8px}.navlinks a{font-size:12px}.navlinks .button{padding:8px 11px}}
  </style>
</head>
<body>
  <div class="container">
    <nav class="nav"><a class="brand" href="/" aria-label="MCP Observatory home"><img src="/mcp-observatory-logo-v2.png" alt="MCP Observatory"></a><div class="navlinks"><a href="/safety-index/">Safety Index</a><a href="/release-gate-pilot/">Release Gate</a><a href="/partners/">Partners</a><a class="button" href="https://www.npmjs.com/package/@kryptosai/mcp-observatory">Install ↗</a></div></nav>
    <section class="hero"><div><div class="eyebrow"><i class="pulse"></i>Open-source MCP security</div><h1>Audit MCP servers <span>before agents depend on them.</span></h1><p class="subtitle">One command discovers risky tool surfaces, schema drift, prompt injection exposure, and unsafe defaults—then produces portable evidence your CI and agents can act on.</p><div class="hero-actions"><a class="button primary" href="#index">Browse the Index ↗</a><a class="button" href="#demo">Watch a real scan</a></div><div class="try-command"><code>npx @kryptosai/mcp-observatory</code><span>Try it now</span></div></div><aside class="proof"><strong>PUBLIC SAFETY INDEX · LIVE</strong><div class="score">${safetyTargets.length} <small>servers indexed</small></div><div class="bar"><span></span></div></aside></section>
    <section class="product-intro"><div class="eyebrow" style="justify-content:center">From uncertainty to evidence</div><h2>Security proof your agent stack can use.</h2><p>MCP Observatory turns a server command into a repeatable trust decision—not another badge or opaque score.</p></section>
    <section class="features"><article class="feature"><span class="feature-icon">01</span><h3>Receipts, not claims</h3><p>Generate signed-off JSON, Markdown, SARIF, and action receipts with the evidence behind every finding.</p></article><article class="feature"><span class="feature-icon">02</span><h3>CI-native protection</h3><p>Detect breaking schemas and unsafe capability drift before an updated server reaches production agents.</p></article><article class="feature"><span class="feature-icon">03</span><h3>Agent skill scanning</h3><p>Find embedded credentials, exfiltration patterns, prompt injection, remote execution, and Unicode obfuscation.</p></article></section>
    <section class="team-section" id="teams"><div><div class="eyebrow">For platform &amp; security teams</div><h2>Approve MCP servers before production agents depend on them.</h2><p class="subtitle">The MCP Release Gate Pilot gives teams a private approve, gate, or defer decision, CI evidence, and owner-ready remediation for their critical MCP servers.</p><div class="hero-actions"><a class="button primary" href="/release-gate-pilot/">Request a Release Gate Pilot ↗</a><a class="button" href="/partners/">Partner with us ↗</a></div></div><div class="team-points"><div><b>Private evidence.</b> Keep internal targets, findings, and remediation plans out of public reports.</div><div><b>Fits existing CI.</b> Send normalized findings to SARIF and GitHub Code Scanning.</div><div><b>Safe by default.</b> Review tool surfaces without destructive probes or production credentials.</div></div></section>
    <section class="demo-section" id="demo"><div class="demo-copy"><div class="eyebrow">Real command · real evidence</div><h2>See the full scan, not a marketing mockup.</h2><p>Watch MCP Observatory connect to a server, enumerate its capabilities, run security checks, and produce a decision-ready report.</p><a class="button" href="https://www.npmjs.com/package/@kryptosai/mcp-observatory">Install and run it ↗</a></div><div class="demo-frame"><img src="/demo.gif" alt="MCP Observatory running a real MCP server security scan" loading="lazy"></div></section>
    <section class="case-study"><div class="case-copy"><div class="eyebrow">The conversion moment</div><h2>A healthy protocol can still hide a dangerous tool surface.</h2><p>The Kubernetes MCP server connected cleanly and exposed working tools—but the security dimension scored zero. Observatory surfaced three high-risk command-execution boundaries before an agent could rely on them.</p><a class="button" href="/safety-index/servers/kubernetes-server">Inspect the Kubernetes evidence ↗</a></div><div class="result-card"><div class="result-head"><div><span class="eyebrow">Kubernetes MCP</span><div class="result-score">72<small>/100</small></div></div><span class="blocked">BLOCKED</span></div><div class="result-bar"><span></span></div><div class="finding-row"><span>Protocol compliance</span><b>100/100</b></div><div class="finding-row"><span>Security</span><b style="color:var(--red)">0/100</b></div><div class="finding-row"><span>High-risk findings</span><b>3</b></div><div class="finding-row"><span>Medium findings</span><b>3</b></div></div></section>
    <div class="section-title" id="index"><div class="eyebrow">MCP Safety Index</div><h2>${safetyTargets.length} evaluated servers</h2><p>A searchable evidence directory that grows automatically with the registry.</p></div>
    <div class="index-note"><b>Indexed does not mean failed.</b><span>This directory includes runnable, credential-gated, and schema-only evaluations. Pass/fail applies only to the credential-free daily verification below.</span></div>
    <div class="directory-tools"><input id="server-search" type="search" placeholder="Search servers, packages, categories, or risks…" aria-label="Search indexed servers"><select id="category-filter" aria-label="Filter by category"><option value="">All categories</option>${categoryOptions}</select></div>
    <p class="directory-status" id="directory-status">Showing 12 of ${safetyTargets.length} servers</p>
    <div class="server-grid" id="server-grid">${safetyCards}</div>
    <button class="show-more" id="show-more" type="button">Show 12 more</button>
    <div class="section-title"><div class="eyebrow">Daily verification</div><h2>Live compatibility matrix</h2><p>${current.length} credential-free targets rerun every day.</p></div>

    <div class="summary">
      <div class="stat pass">
        <div class="number">${passCount}</div>
        <div class="label">Passing</div>
      </div>
      <div class="stat fail">
        <div class="number">${failCount}</div>
        <div class="label">Failing</div>
      </div>
      <div class="stat">
        <div class="number">${current.length}</div>
        <div class="label">Total Servers</div>
      </div>
    </div>

    <div class="table-shell"><table>
      <thead>
        <tr>
          <th>Server</th>
          <th>Status</th>
          <th>Tools</th>
          <th>Prompts</th>
          <th>Resources</th>
          <th>Last Checked</th>
          <th>Trend</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table></div>

    <div class="footer">
      Powered by <a href="https://github.com/KryptosAI/mcp-observatory">MCP Observatory</a>
      &middot; Updated ${formatDate(new Date().toISOString())}
    </div>
  </div>
  <script src="/directory.js" defer></script>
</body>
</html>`;
}

async function main(): Promise<void> {
  await mkdir(badgesDir, { recursive: true });
  await mkdir(apiDir, { recursive: true });

  // Load current matrix summary
  const current = JSON.parse(
    await readFile(matrixSummaryPath, "utf8"),
  ) as MatrixSummaryEntry[];
  const safetyTargets = JSON.parse(
    await readFile(safetyTargetsPath, "utf8"),
  ) as SafetyTarget[];

  // Load or initialize history
  let history: HistoryEntry[] = [];
  try {
    history = JSON.parse(await readFile(matrixHistoryPath, "utf8")) as HistoryEntry[];
  } catch {
    // No history yet
  }

  // Generate dashboard HTML
  const html = buildHtml(current, history, safetyTargets);
  await writeFile(path.join(dashboardDir, "index.html"), html, "utf8");
  await copyFile(demoPath, path.join(dashboardDir, "demo.gif"));
  await copyFile(logoPath, path.join(dashboardDir, "mcp-observatory-logo-v2.png"));
  await copyFile(faviconPath, path.join(dashboardDir, "mcp-observatory-favicon-v2.png"));
  await writeFile(path.join(dashboardDir, "directory.js"), `(() => {
  const cards = [...document.querySelectorAll(".server-card")];
  const search = document.querySelector("#server-search");
  const category = document.querySelector("#category-filter");
  const status = document.querySelector("#directory-status");
  const showMore = document.querySelector("#show-more");
  let limit = 12;

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const selectedCategory = category.value;
    const matches = cards.filter(card =>
      (!query || card.dataset.search.includes(query)) &&
      (!selectedCategory || card.dataset.category === selectedCategory)
    );
    cards.forEach(card => card.classList.add("is-hidden"));
    matches.slice(0, limit).forEach(card => card.classList.remove("is-hidden"));
    const shown = Math.min(limit, matches.length);
    status.textContent = matches.length === 0
      ? "No servers match those filters"
      : \`Showing \${shown} of \${matches.length} matching servers\`;
    showMore.hidden = shown >= matches.length;
  };

  search.addEventListener("input", () => { limit = 12; render(); });
  category.addEventListener("change", () => { limit = 12; render(); });
  showMore.addEventListener("click", () => { limit += 12; render(); });
  render();
})();
`, "utf8");
  await writeFile(path.join(dashboardDir, "_headers"), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'
`, "utf8");
  await writeFile(path.join(dashboardDir, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://mcp-observatory.com/sitemap.xml\n", "utf8");
  // Generate badges
  for (const entry of current) {
    const slug = entry.targetId.replace(/[^a-z0-9-]/gi, "-");
    const svg = badge(entry.targetId, entry.gate);
    await writeFile(path.join(badgesDir, `${slug}.svg`), svg, "utf8");
  }

  // Generate API JSON
  await writeFile(
    path.join(apiDir, "latest.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), servers: current }, null, 2),
    "utf8",
  );

  process.stdout.write(`Dashboard built: ${dashboardDir}/index.html\n`);
  process.stdout.write(`Badges: ${current.length} SVGs in ${badgesDir}/\n`);
  process.stdout.write(`API: ${apiDir}/latest.json\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
