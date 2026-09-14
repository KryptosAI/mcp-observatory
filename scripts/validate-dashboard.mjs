import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dashboard");
const failures = [];

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function count(source, pattern) {
  return (source.match(pattern) ?? []).length;
}

function cssBlock(source, selector) {
  const start = source.indexOf(`${selector}{`);
  if (start === -1) return "";
  const contentStart = start + selector.length + 1;
  const end = source.indexOf("}", contentStart);
  return end === -1 ? "" : source.slice(contentStart, end);
}

function hexToken(source, name) {
  return source.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => Number.parseInt(channel, 16) / 255);
  const linear = channels.map(channel => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function requireContrast(block, foregroundToken, backgroundToken, label) {
  const foreground = hexToken(block, foregroundToken);
  const background = hexToken(block, backgroundToken);
  if (foreground === undefined || background === undefined) {
    failures.push(`m3.css: missing ${label} color tokens`);
    return;
  }
  const ratio = contrastRatio(foreground, background);
  if (ratio < 4.5) failures.push(`m3.css: ${label} contrast is ${ratio.toFixed(2)}:1; expected at least 4.5:1`);
}

const css = await readFile(path.join(root, "m3.css"), "utf8");
const siteScript = await readFile(path.join(root, "site.js"), "utf8");
const safetyIndexScript = await readFile(path.join(root, "safety-index.js"), "utf8");
const headers = await readFile(path.join(root, "_headers"), "utf8");
if (!css.includes("focus-visible")) failures.push("m3.css is missing focus-visible states");
if (!css.includes("prefers-reduced-motion")) failures.push("m3.css is missing reduced-motion handling");
if (!css.includes("min-height:48px")) failures.push("m3.css is missing the 48px target baseline");
if (/font-size:\s*(?:[1-9]|10)px/.test(css)) failures.push("m3.css contains text below the 11px minimum");
if (/body::before\s*\{[^}]*display:none/.test(css) === false) failures.push("decorative grid suppression is missing");
if (!css.includes("m3.css owns all homepage layout and visual styling")) failures.push("m3.css is not marked as the canonical homepage style layer");
if (!siteScript.includes("[data-copy-command]")) failures.push("site.js is missing command-copy behavior");
if (!safetyIndexScript.includes("#categoryFilter") || !safetyIndexScript.includes("#resultCount")) failures.push("safety-index.js is missing index-filter behavior");
if (!headers.includes("script-src 'self'") || !headers.includes("style-src 'self'")) failures.push("_headers must restrict scripts and styles to same-origin assets");
if (!headers.includes("connect-src 'self' https://api.hsforms.com https://app.mcp-observatory.com")) failures.push("_headers must permit the privacy-preserving funnel endpoint and no other third-party connections");
if (headers.includes("'unsafe-inline'")) failures.push("_headers must not permit inline scripts or styles");
const publicColors = cssBlock(css, ":root");
requireContrast(publicColors, "md-sys-color-on-surface", "md-sys-color-surface", "public body text");
requireContrast(publicColors, "md-sys-color-on-surface-variant", "md-sys-color-surface", "public secondary text");
requireContrast(publicColors, "md-sys-color-on-primary", "md-sys-color-primary", "public primary button");
requireContrast(publicColors, "mcp-status-on-success", "mcp-status-success", "public success status");
requireContrast(publicColors, "mcp-status-on-warning", "mcp-status-warning", "public warning status");

const homepage = await readFile(path.join(root, "index.html"), "utf8");
const indexStart = homepage.indexOf('<section class="verified-preview" id="index">');
const homepageTop = homepage.slice(0, indexStart === -1 ? homepage.length : indexStart);
if (count(homepage, /<h1\b/g) !== 1) failures.push("homepage: expected exactly one main headline");
if (!homepage.includes("Find MCP problems before they break your agents.")) failures.push("homepage: missing the explicit product explanation headline");
if (!homepage.includes("Runs locally. No account required. Nothing uploaded unless you choose to share a snapshot.")) failures.push("homepage: missing the local-first trust statement");
if (!homepage.includes('class="scan-window"')) failures.push("homepage: missing the above-fold report example");
for (const label of ["Broken tools", "Permission risks", "Breaking changes", "Release regressions"]) {
  if (!homepage.includes(label)) failures.push(`homepage: missing ${label} explanation`);
}
const demoIndex = homepage.indexOf('id="demo"');
const installIndex = homepage.indexOf('id="install"');
const docsIndex = homepage.indexOf('class="docs-section"');
const hostedIndex = homepage.indexOf('class="hosted-section"');
if (demoIndex === -1 || installIndex === -1 || docsIndex === -1 || hostedIndex === -1 || !(demoIndex < installIndex && installIndex < docsIndex && docsIndex < hostedIndex)) {
  failures.push("homepage: must present demo, install, docs, then optional hosted history in that order");
}
if (!homepage.includes("Run a free sample scan.") || !homepage.includes("Copy demo command")) failures.push("homepage: missing a clearly labelled free demo");
if (!homepage.includes("demo --example") || !homepage.includes("does not access your own project")) failures.push("homepage: demo must state its exact sample-server behavior");
if (homepageTop.includes("cloud upload")) failures.push("homepage: must not prompt hosted upload before explaining the local product");
if (count(homepage, /data-copy-command=/g) < 4) failures.push("homepage: expected copy controls for the demo and all install methods");
if (!homepage.includes('id="command-copy-status" role="status" aria-live="polite"')) failures.push("homepage: missing accessible copy confirmation");
if (!homepage.includes("Published Safety Index evidence")) failures.push("homepage: missing the published-evidence section");
if (/Trusted by|customers include|customer logos|teams at|Used by developers at/i.test(homepage)) failures.push("homepage: contains unsupported customer-style proof language");
if (/pricing\?plan=team|Team · \$299|Start Team/i.test(homepage)) failures.push("homepage: contains a self-service Team claim");
if (/Daily verification|rerun every day|Live compatibility matrix/i.test(homepage)) failures.push("homepage: overstates the freshness of recorded verification data");
if (!homepage.includes("Individual Pro")) failures.push("homepage: missing Individual Pro as the optional hosted plan");
if (!homepage.includes("Local scanning and local CI remain free. Telemetry choice never changes access.")) failures.push("homepage: must preserve local and telemetry access assurances");
if (/Start \$29/i.test(homepage)) failures.push("homepage: starts paid checkout before the free hosted snapshot");
const verifiedCardCount = count(homepage, /class="verified-card"/g);
if (verifiedCardCount < 1 || verifiedCardCount > 3) failures.push(`homepage: expected 1-3 verified preview cards, found ${verifiedCardCount}`);
if (count(homepage, /<time datetime="[^"]+">/g) !== verifiedCardCount) failures.push("homepage: every verified preview card must show its recorded date");
if (/id="server-search"|id="category-filter"|id="show-more"/.test(homepage)) failures.push("homepage: embeds the full Safety Index directory instead of a verified preview");
if (!homepage.includes('href="/safety-index/">Browse the Safety Index')) failures.push("homepage: missing full Safety Index link from preview");
if (Buffer.byteLength(homepage, "utf8") > 75_000) failures.push("homepage: exceeds the 75 KB HTML budget");
if (/<style\b/i.test(homepage)) failures.push("homepage: contains an inline style layer instead of canonical m3.css");
if (count(homepage, /rel="stylesheet"/g) !== 1 || !homepage.includes('rel="stylesheet" href="/m3.css')) failures.push("homepage: m3.css must be the only stylesheet");
for (const match of homepage.matchAll(/src="\/(proof-logos\/[^"]+)"/g)) {
  try {
    await access(path.join(root, match[1]));
  } catch {
    failures.push(`homepage: missing local logo asset /${match[1]}`);
  }
}

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const url = new URL(match[1]);
  if (url.origin !== "https://mcp-observatory.com") continue;
  const relativePath = url.pathname === "/"
    ? "index.html"
    : url.pathname.endsWith("/")
      ? path.join(url.pathname.slice(1), "index.html")
      : url.pathname.slice(1);
  try {
    await access(path.join(root, relativePath));
  } catch {
    try {
      await access(path.join(root, `${relativePath}.html`));
    } catch {
      failures.push(`sitemap: ${url.pathname} does not resolve to a dashboard file`);
    }
  }
}

if (sitemap.includes("/safety-index/servers/") && sitemap.includes(".html</loc>")) {
  failures.push("sitemap: Safety Index profiles must use canonical extension-less URLs");
}

const notFound = await readFile(path.join(root, "404.html"), "utf8");
if (!notFound.includes('meta name="robots" content="noindex"')) failures.push("404 page must not be indexed");
if (!notFound.includes("That page is not part of MCP Observatory.")) failures.push("404 page must provide an intentional non-application response");
if (!notFound.includes('href="/start/"')) failures.push("404 page must provide a safe recovery path");

const funnel = await readFile(path.join(root, "funnel.js"), "utf8");
if (!funnel.includes('navigator.doNotTrack === "1"') || !funnel.includes("credentials: \"omit\"")) failures.push("funnel script must honor DNT and avoid browser credentials");
if (!funnel.includes("profile_view") || !funnel.includes("scan_cta")) failures.push("funnel script is missing profile and scan CTA events");

for (const file of await htmlFiles(root)) {
  const source = await readFile(file, "utf8");
  const rel = path.relative(process.cwd(), file);
  const commercialCssIndex = source.indexOf('href="/commercial.css');
  const m3CssIndex = source.indexOf('href="/m3.css');
  if (commercialCssIndex !== -1 && commercialCssIndex > m3CssIndex) failures.push(`${rel}: m3.css must load after commercial.css`);
  if (!source.includes('<meta name="theme-color" content="#f9fbfc">')) failures.push(`${rel}: public page must use the canonical light browser theme color`);
  if (/evidence-theme|color-scheme:\s*dark/.test(source)) failures.push(`${rel}: legacy dark evidence theme is not allowed`);
  if (/<style\b/i.test(source)) failures.push(`${rel}: page contains an inline style block instead of canonical m3.css`);
  if (/<script(?:\s[^>]*)?>/i.test(source.replace(/<script\s[^>]*\bsrc\s*=\s*(['"])[^'"]+\1[^>]*>/gi, ""))) failures.push(`${rel}: page contains an inline script that violates the production CSP`);
  if (!/href="\/m3\.css(?:\?[^"]*)?"/.test(source)) failures.push(`${rel}: missing shared m3.css`);
  if (count(source, /<main\b/gi) !== 1) failures.push(`${rel}: expected exactly one main landmark`);
  if (count(source, /<h1\b/gi) !== 1) failures.push(`${rel}: expected exactly one h1`);
  const headingLevels = [...source.matchAll(/<h([1-6])\b/gi)].map(match => Number(match[1]));
  if (headingLevels[0] !== 1) failures.push(`${rel}: h1 is not the first heading`);
  for (let i = 1; i < headingLevels.length; i += 1) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) failures.push(`${rel}: heading level skips from h${headingLevels[i - 1]} to h${headingLevels[i]}`);
  }
  for (const image of source.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt\s*=\s*(['"]).*?\1/i.test(image[0])) failures.push(`${rel}: image missing alt text`);
    if (!/\bwidth\s*=\s*(['"])\d+\1/i.test(image[0]) || !/\bheight\s*=\s*(['"])\d+\1/i.test(image[0])) failures.push(`${rel}: image missing explicit width and height`);
  }
  for (const control of source.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    if (/type\s*=\s*['"]hidden['"]/i.test(control[0])) continue;
    const index = control.index ?? 0;
    const prefix = source.slice(0, index);
    const labelStart = prefix.lastIndexOf("<label");
    const labelEnd = prefix.lastIndexOf("</label>");
    const wrappedByLabel = labelStart > labelEnd && index - labelStart < 800;
    if (!wrappedByLabel && !/aria-label\s*=|aria-labelledby\s*=|title\s*=/i.test(control[0])) failures.push(`${rel}: form control may lack an accessible name`);
  }
}

if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Dashboard validation passed for ${await htmlFiles(root).then(files => files.length)} HTML pages.`);
