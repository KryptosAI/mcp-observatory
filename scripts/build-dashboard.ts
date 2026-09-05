import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  siCoinbase,
  siDocker,
  siFigma,
  siGithub,
  siGitlab,
  siKubernetes,
  siLinear,
  siMongodb,
  siNotion,
  siPostgresql,
  siRedis,
  siSentry,
  siShopify,
  siStripe,
  siSupabase,
  type SimpleIcon,
} from "simple-icons";

const root = process.cwd();
const matrixSummaryPath = path.join(root, "examples", "matrix-summary.json");
const safetyTargetsPath = path.join(root, "docs", "safety-index", "targets.json");
const demoPath = path.join(root, "docs", "demo.gif");
const logoSvgPath = path.join(root, "docs", "assets", "mcp-observatory-logo.svg");
const logoPath = path.join(root, "docs", "assets", "mcp-observatory-logo.png");
const faviconSvgPath = path.join(root, "docs", "assets", "mcp-observatory-favicon.svg");
const faviconPath = path.join(root, "docs", "assets", "mcp-observatory-favicon-v2.png");
const dashboardDir = path.join(root, "dashboard");
const badgesDir = path.join(dashboardDir, "badges");
const apiDir = path.join(dashboardDir, "api");
const proofLogosDir = path.join(dashboardDir, "proof-logos");

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

interface EvaluatedTechnology {
  name: string;
  logo: string;
  targetId: string;
  width: number;
  height: number;
  kind: "wordmark" | "icon";
}

interface EvaluatedTechnologyGroup {
  label: string;
  technologies: ReadonlyArray<EvaluatedTechnology>;
}

const EVALUATED_TECHNOLOGY_GROUPS: ReadonlyArray<EvaluatedTechnologyGroup> = [
  {
    label: "Build & cloud",
    technologies: [
      { name: "Microsoft", logo: "microsoft.svg", targetId: "clarity-server", width: 121, height: 26, kind: "wordmark" },
      { name: "Google", logo: "google.svg", targetId: "chrome-devtools-mcp-server", width: 79, height: 26, kind: "wordmark" },
      { name: "Cloudflare", logo: "cloudflare.svg", targetId: "cloudflare-server", width: 136, height: 26, kind: "wordmark" },
      { name: "GitHub", logo: "github.svg", targetId: "github-mcp-server", width: 38, height: 38, kind: "icon" },
      { name: "GitLab", logo: "gitlab.svg", targetId: "gitlab-server", width: 40, height: 40, kind: "icon" },
      { name: "Docker", logo: "docker.svg", targetId: "docker-server", width: 42, height: 42, kind: "icon" },
    ],
  },
  {
    label: "Data & infrastructure",
    technologies: [
      { name: "Kubernetes", logo: "kubernetes.svg", targetId: "kubernetes-server", width: 42, height: 42, kind: "icon" },
      { name: "MongoDB", logo: "mongodb.svg", targetId: "mongodb-server", width: 40, height: 40, kind: "icon" },
      { name: "Redis", logo: "redis.svg", targetId: "redis-server", width: 40, height: 40, kind: "icon" },
      { name: "PostgreSQL", logo: "postgresql.svg", targetId: "postgres-server", width: 40, height: 40, kind: "icon" },
      { name: "Supabase", logo: "supabase.svg", targetId: "supabase-server", width: 40, height: 40, kind: "icon" },
      { name: "Sentry", logo: "sentry.svg", targetId: "sentry-server", width: 40, height: 40, kind: "icon" },
    ],
  },
  {
    label: "Product platforms",
    technologies: [
      { name: "Stripe", logo: "stripe.svg", targetId: "stripe-server", width: 40, height: 40, kind: "icon" },
      { name: "Shopify", logo: "shopify.svg", targetId: "shopify-mcp-server", width: 40, height: 40, kind: "icon" },
      { name: "Notion", logo: "notion.svg", targetId: "notion-server", width: 40, height: 40, kind: "icon" },
      { name: "Figma", logo: "figma.svg", targetId: "figma-server", width: 40, height: 40, kind: "icon" },
      { name: "Linear", logo: "linear.svg", targetId: "linear-server", width: 40, height: 40, kind: "icon" },
      { name: "Coinbase", logo: "coinbase.svg", targetId: "coinbase-cds-server", width: 40, height: 40, kind: "icon" },
    ],
  },
];

const OBSERVED_ORGANIZATIONS = [
  { name: "Accenture", logo: "accenture.svg", width: 150, height: 40 },
  { name: "Cisco", logo: "cisco.svg", width: 112, height: 60 },
  { name: "Oracle", logo: "oracle.svg", width: 150, height: 28 },
] as const;

const SIMPLE_ICON_ASSETS: ReadonlyArray<{ file: string; icon: SimpleIcon }> = [
  { file: "github.svg", icon: siGithub },
  { file: "gitlab.svg", icon: siGitlab },
  { file: "docker.svg", icon: siDocker },
  { file: "kubernetes.svg", icon: siKubernetes },
  { file: "postgresql.svg", icon: siPostgresql },
  { file: "mongodb.svg", icon: siMongodb },
  { file: "redis.svg", icon: siRedis },
  { file: "supabase.svg", icon: siSupabase },
  { file: "sentry.svg", icon: siSentry },
  { file: "stripe.svg", icon: siStripe },
  { file: "notion.svg", icon: siNotion },
  { file: "figma.svg", icon: siFigma },
  { file: "linear.svg", icon: siLinear },
  { file: "shopify.svg", icon: siShopify },
  { file: "coinbase.svg", icon: siCoinbase },
];

const VERIFIED_PREVIEW_TARGETS = [
  "everything-server",
  "filesystem-server",
  "context7-server",
] as const;

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function coloredSimpleIcon(icon: SimpleIcon): string {
  return icon.svg.replace("<svg ", `<svg fill="#${icon.hex}" `);
}

function buildVerifiedPreview(current: MatrixSummaryEntry[], safetyTargets: SafetyTarget[]): string {
  const entriesById = new Map(current.map(entry => [entry.targetId, entry]));
  const targetsById = new Map(safetyTargets.map(target => [target.id, target]));
  const preferred = VERIFIED_PREVIEW_TARGETS.flatMap(targetId => {
    const entry = entriesById.get(targetId);
    return entry === undefined ? [] : [entry];
  });
  const preview = preferred.length === VERIFIED_PREVIEW_TARGETS.length ? preferred : current.slice(0, 3);

  return preview.map(entry => {
    const target = targetsById.get(entry.targetId);
    const name = target?.name ?? entry.packageName;
    const reason = target?.whyItMatters ?? entry.whyItMatters;
    const gateLabel = entry.gate === "pass" ? "Passed" : "Gated";
    return `<article class="verified-card">
      <div class="verified-card-head"><span class="status-chip ${entry.gate}">${gateLabel}</span><time datetime="${escapeHtml(entry.runDate)}">${formatDate(entry.runDate)}</time></div>
      <h3><a href="/safety-index/servers/${escapeHtml(entry.targetId)}.html">${escapeHtml(name)}</a></h3>
      <code>${escapeHtml(entry.packageName)}</code>
      <p>${escapeHtml(reason)}</p>
      <a class="text-link" href="/safety-index/servers/${escapeHtml(entry.targetId)}.html">Inspect the evidence <span aria-hidden="true">↗</span></a>
    </article>`;
  }).join("\n");
}

function buildHtml(current: MatrixSummaryEntry[], safetyTargets: SafetyTarget[]): string {
  const passCount = current.filter(entry => entry.gate === "pass").length;
  const failCount = current.filter(entry => entry.gate === "fail").length;
  const latestRecordedRun = current.reduce<string | undefined>((latest, entry) => {
    if (latest === undefined) return entry.runDate;
    return Date.parse(entry.runDate) > Date.parse(latest) ? entry.runDate : latest;
  }, undefined);
  const latestRecordedRunLabel = latestRecordedRun === undefined ? "not yet recorded" : formatDate(latestRecordedRun);
  const verifiedPreview = buildVerifiedPreview(current, safetyTargets);

  const targetById = new Map(safetyTargets.map(target => [target.id, target]));
  const evaluatedTechnologies = EVALUATED_TECHNOLOGY_GROUPS.flatMap(group => group.technologies);
  for (const technology of evaluatedTechnologies) {
    if (!targetById.has(technology.targetId)) {
      throw new Error(`Evaluated-technology logo ${technology.name} has no Safety Index target ${technology.targetId}`);
    }
  }
  const evaluatedTechnologyGroups = EVALUATED_TECHNOLOGY_GROUPS.map(group => {
    const cards = group.technologies.map(technology => {
      const target = targetById.get(technology.targetId);
      if (target === undefined) throw new Error(`Missing Safety Index target ${technology.targetId}`);
      const targetName = escapeHtml(target.name);
      return `<li><a class="technology-logo-card ${technology.kind}" href="/safety-index/servers/${escapeHtml(technology.targetId)}.html" aria-label="Inspect published evidence for ${targetName}"><span class="technology-logo-mark"><img src="/proof-logos/${escapeHtml(technology.logo)}" alt="" width="${technology.width}" height="${technology.height}" aria-hidden="true"></span><span class="technology-logo-copy"><strong>${escapeHtml(technology.name)}</strong><span title="${targetName}">${targetName}</span></span></a></li>`;
    }).join("");
    return `<section class="technology-logo-group"><h3>${escapeHtml(group.label)}</h3><ul class="technology-logo-grid">${cards}</ul></section>`;
  }).join("");
  const observedOrganizationLogos = OBSERVED_ORGANIZATIONS.map(organization =>
    `<li class="organization-logo"><img src="/proof-logos/${escapeHtml(organization.logo)}" alt="${escapeHtml(organization.name)}" width="${organization.width}" height="${organization.height}"></li>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f9fbfc">
  <meta name="description" content="Approve, gate, or defer MCP dependencies before production agents rely on them.">
  <meta property="og:title" content="MCP Observatory — Approve MCP servers before agents depend on them">
  <meta property="og:description" content="A release decision and CI evidence for platform and security teams adopting MCP.">
  <meta property="og:image" content="https://mcp-observatory.com/mcp-release-gate-og.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://mcp-observatory.com/mcp-release-gate-og.png">
  <link rel="canonical" href="https://mcp-observatory.com">
  <link rel="icon" href="/mcp-observatory-favicon-v2.png" type="image/png" sizes="1254x1254">
  <link rel="apple-touch-icon" href="/mcp-observatory-favicon-v2.png">
  <link rel="stylesheet" href="/m3.css?v=20260902">
  <title>MCP Observatory — MCP Release Gate</title>
</head>
<body class="marketing-theme">
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <div class="container">
    <nav class="nav" aria-label="Primary navigation"><a class="brand" href="/" aria-label="MCP Observatory home" aria-current="page"><img src="/mcp-observatory-logo-v2.png" alt="MCP Observatory" width="1536" height="329"></a><div class="navlinks"><a href="/safety-index/">Safety Index</a><a href="/release-gate-pilot/">Release Gate</a><a href="/partners/">Partners</a><a class="button" href="#get-started">Run free</a></div></nav>
    <main id="main-content" class="home-main">
      <section class="hero"><div class="hero-copy"><div class="eyebrow">THE MOMENT BEFORE TRUST</div><h1>Trust is a <span>production decision.</span></h1><p class="subtitle">MCP Observatory gives platform and security teams the evidence to approve, gate, or defer every MCP dependency—before agents build on it.</p><div class="command-panel" id="get-started"><div class="command-label">First: successful local scan · no account</div><div class="command-row"><code id="primary-scan-command">npx -y @kryptosai/mcp-observatory@latest</code><button class="button primary copy-command" type="button" data-copy-command="npx -y @kryptosai/mcp-observatory@latest" aria-describedby="command-copy-status">Copy command</button></div></div><div class="next-step"><div><span>After the scan</span><strong>Next: one hosted snapshot free.</strong><p>Sign in with GitHub through <code>cloud upload</code>. Checkout stays optional.</p></div><button class="button copy-command" type="button" data-copy-command="npx -y @kryptosai/mcp-observatory@latest cloud upload" aria-describedby="command-copy-status">Copy cloud upload</button></div><p class="copy-status" id="command-copy-status" role="status" aria-live="polite"></p></div><aside class="hero-product" aria-label="Published MCP Observatory decision example"><div class="product-windowbar"><span>MCP Observatory / Decision</span><span class="window-status">PUBLISHED EVIDENCE</span></div><div class="hero-product-heading"><div><span class="product-label">KUBERNETES MCP</span><strong>72</strong></div><span class="decision-badge blocked">BLOCKED</span></div><div class="decision-meter"><span></span></div><div class="decision-stats"><div><strong>0</strong><span>security /100</span></div><div><strong>3</strong><span>high-risk findings</span></div></div><div class="decision-checks"><div><span class="check-mark">✓</span> Tool permissions evaluated</div><div><span class="check-mark">✓</span> Schema drift checked</div><div><span class="check-mark">✓</span> CI release rule ready</div></div></aside></section>
      <section class="technology-evidence" aria-labelledby="technology-evidence-title"><div class="technology-evidence-inner"><div class="organization-proof"><p>Used by developers at</p><ul class="organization-logos" aria-label="Organizations represented in observed MCP Observatory usage">${observedOrganizationLogos}</ul></div><header class="technology-evidence-head"><div><div class="eyebrow">PUBLISHED TECHNOLOGY EVIDENCE</div><h2 id="technology-evidence-title">Recognizable systems. Inspectable evidence.</h2><p>Every mark below opens the exact MCP package, scope, score, and findings behind the evaluation.</p></div><div class="technology-evidence-metric" aria-label="${evaluatedTechnologies.length} recognizable technologies linked to published evidence"><strong>${evaluatedTechnologies.length}</strong><span>technology marks<br>linked to evidence</span></div></header><div class="technology-logo-groups">${evaluatedTechnologyGroups}</div><footer class="technology-evidence-footer"><a class="button" href="/safety-index/">Browse all ${safetyTargets.length} indexed servers</a></footer></div></section>
      <section class="case-study product-proof"><div class="case-copy"><div class="eyebrow">PRODUCT PROOF</div><h2>Evidence for every release decision.</h2><p>Every agent is only as trustworthy as the tools it can reach. Observatory turns a server connection into a visible approve, gate, or defer decision before production.</p><a class="button" href="/safety-index/servers/kubernetes-server.html">Inspect the Kubernetes evidence <span aria-hidden="true">↗</span></a></div><div class="result-card"><div class="result-head"><div><span class="eyebrow">Kubernetes MCP</span><div class="result-score">72<small>/100</small></div></div><span class="blocked">BLOCKED</span></div><div class="result-bar"><span></span></div><div class="finding-row"><span>Protocol compliance</span><b>100/100</b></div><div class="finding-row"><span>Security</span><b class="finding-fail">0/100</b></div><div class="finding-row"><span>High-risk findings</span><b>3</b></div><div class="finding-row"><span>Medium findings</span><b>3</b></div></div></section>
      <section class="product-intro"><div class="eyebrow centered">HOW IT WORKS</div><h2>Scan once. Enforce at runtime. Ship with confidence.</h2><p>One evidence loop for local development, CI, and production release review.</p></section>
      <section class="features"><article class="feature"><span class="feature-icon">01</span><h3>Scan</h3><p>Connect to an MCP server and enumerate tools, prompts, resources, schemas, and security boundaries.</p></article><article class="feature"><span class="feature-icon">02</span><h3>Evaluate</h3><p>Run deterministic behavioral, security, permission, and drift checks with receipts behind every finding.</p></article><article class="feature"><span class="feature-icon">03</span><h3>Enforce</h3><p>Write a deny-default Seatbelt policy from the findings and start the runtime proxy. Local scan stays free.</p></article><article class="feature"><span class="feature-icon">04</span><h3>Decide</h3><p>Approve, gate, or defer with a report, CI status, SARIF output, and an owner-ready next action.</p></article></section>
      <section class="team-section" id="teams"><div><div class="eyebrow">RELEASE-GATE WORKFLOW</div><h2>Don’t discover your security policy in production.</h2><p class="subtitle">Set the decision once, then keep it running in CI. The Release Gate Pilot gives platform and security teams private evidence, owner-ready remediation, and a durable rule for every critical MCP dependency.</p><div class="hero-actions"><a class="button primary" href="/release-gate-pilot/">Request a Release Gate Pilot <span aria-hidden="true">↗</span></a><a class="button" href="/partners/">Partner with us <span aria-hidden="true">↗</span></a></div></div><div class="team-points"><div><b>Approve.</b> Ship dependencies that meet the evidence threshold.</div><div><b>Gate.</b> Stop unsafe capability or permission drift before release.</div><div><b>Defer.</b> Keep unresolved findings visible with a clear owner and next action.</div></div></section>
      <section class="team-section" id="pricing"><div><div class="eyebrow">SELF-SERVE HOSTED</div><h2>See the hosted result before paying.</h2><p class="subtitle">Run locally, sign in with GitHub through <code>cloud upload</code>, and keep one latest snapshot free. Upgrade only when retained history and hosted CI become useful.</p><div class="hero-actions"><a class="button primary" href="https://app.mcp-observatory.com/pricing">Review Individual Pro · $29/mo <span aria-hidden="true">↗</span></a><a class="button" href="/terms/">Hosted terms <span aria-hidden="true">↗</span></a></div></div><div class="team-points"><div><b>Free hosted snapshot.</b> Sign in and upload one result before checkout.</div><div><b>Individual Pro · $29/month.</b> 90-day history, hosted CI ingestion, regression markers, and artifact downloads for one developer.</div><div><b>Need a scoped decision?</b> <a href="/release-gate-pilot/">Request the $15,000 Release Gate Pilot <span aria-hidden="true">↗</span></a></div></div></section>
      <section class="demo-section" id="demo"><div class="demo-copy"><div class="eyebrow">METHODOLOGY &amp; EVIDENCE</div><h2>Don’t trust a score you can’t inspect.</h2><p>Watch MCP Observatory connect to a server, enumerate its capabilities, run security checks, and produce the evidence behind the decision.</p><a class="button" href="https://www.npmjs.com/package/@kryptosai/mcp-observatory">View the open-source package <span aria-hidden="true">↗</span></a></div><div class="demo-frame"><img src="/demo.gif" alt="MCP Observatory running a real MCP server security scan" width="790" height="560" loading="lazy"></div></section>
      <section class="verified-preview" id="index"><div class="section-title"><div><div class="eyebrow">RECORDED VERIFICATION</div><h2>Current evidence, not a vanity count.</h2><p>${current.length} credential-free targets were verified on ${latestRecordedRunLabel}. The full Safety Index contains ${safetyTargets.length} indexed servers with scope and evidence labels.</p></div><a class="button" href="/safety-index/">Explore the full Safety Index <span aria-hidden="true">↗</span></a></div><div class="summary"><div class="stat pass"><div class="number">${passCount}</div><div class="label">Passing this run</div></div><div class="stat fail"><div class="number">${failCount}</div><div class="label">Gated this run</div></div><div class="stat"><div class="number">${current.length}</div><div class="label">Verified targets</div></div></div><div class="verified-grid">${verifiedPreview}</div></section>
      <section class="final-cta"><div><div class="eyebrow">EVIDENCE FOR EVERY RELEASE DECISION</div><h2>Know what your agents can reach before they reach it.</h2><p>Run the free scan locally, then use <code>cloud upload</code> to see one hosted snapshot before paying.</p></div><div class="final-cta-actions"><a class="button primary" href="#get-started">Back to the free scan</a><a class="button" href="https://app.mcp-observatory.com/pricing">Review Individual Pro <span aria-hidden="true">↗</span></a></div></section>
      <div class="footer">Powered by <a href="https://github.com/KryptosAI/mcp-observatory">MCP Observatory</a> · Verification date shown with every result</div>
    </main>
  </div>
  <script src="/site.js?v=20260902" defer></script>
</body>
</html>`;
}

async function main(): Promise<void> {
  await mkdir(badgesDir, { recursive: true });
  await mkdir(apiDir, { recursive: true });
  await mkdir(proofLogosDir, { recursive: true });
  await Promise.all(SIMPLE_ICON_ASSETS.map(asset =>
    writeFile(path.join(proofLogosDir, asset.file), coloredSimpleIcon(asset.icon), "utf8"),
  ));

  const current = JSON.parse(
    await readFile(matrixSummaryPath, "utf8"),
  ) as MatrixSummaryEntry[];
  const safetyTargets = JSON.parse(
    await readFile(safetyTargetsPath, "utf8"),
  ) as SafetyTarget[];

  await writeFile(path.join(dashboardDir, "index.html"), buildHtml(current, safetyTargets), "utf8");
  await copyFile(demoPath, path.join(dashboardDir, "demo.gif"));
  await copyFile(logoSvgPath, path.join(dashboardDir, "mcp-observatory-logo.svg"));
  await copyFile(logoPath, path.join(dashboardDir, "mcp-observatory-logo-v2.png"));
  await copyFile(faviconSvgPath, path.join(dashboardDir, "mcp-observatory-favicon.svg"));
  await copyFile(faviconPath, path.join(dashboardDir, "mcp-observatory-favicon-v2.png"));
  await writeFile(path.join(dashboardDir, "_headers"), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.hsforms.com; frame-ancestors 'none'; base-uri 'self'; form-action 'none'
`, "utf8");
  await writeFile(path.join(dashboardDir, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://mcp-observatory.com/sitemap.xml\n", "utf8");

  for (const entry of current) {
    const slug = entry.targetId.replace(/[^a-z0-9-]/gi, "-");
    await writeFile(path.join(badgesDir, `${slug}.svg`), badge(entry.targetId, entry.gate), "utf8");
  }

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
