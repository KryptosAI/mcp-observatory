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
if (/font-size:\s*10px/.test(css)) failures.push("m3.css contains deprecated 10px text");
if (/body::before\s*\{[^}]*display:none/.test(css) === false) failures.push("decorative grid suppression is missing");
if (!css.includes("m3.css owns all homepage layout and visual styling")) failures.push("m3.css is not marked as the canonical homepage style layer");
if (!siteScript.includes("[data-copy-command]")) failures.push("site.js is missing command-copy behavior");
if (!safetyIndexScript.includes("#categoryFilter") || !safetyIndexScript.includes("#resultCount")) failures.push("safety-index.js is missing index-filter behavior");
if (!headers.includes("script-src 'self'") || !headers.includes("style-src 'self'")) failures.push("_headers must restrict scripts and styles to same-origin assets");
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
if (count(homepage, /<h1>/g) !== 1) failures.push("homepage: expected exactly one main headline");
if (count(homepage, /THE MOMENT BEFORE TRUST/g) !== 1) failures.push("homepage: expected exactly one trust-led eyebrow");
if (!homepage.includes('class="technology-evidence"')) failures.push("homepage: missing full-width technology evidence section");
if (!homepage.includes("Used by developers at")) failures.push("homepage: missing observed-organization proof label");
if (count(homepage, /class="organization-logo"/g) !== 3) failures.push("homepage: expected three observed-organization logos");
if (count(homepage, /class="technology-logo-card /g) !== 18) failures.push("homepage: expected eighteen evidence-linked technology logos");
if (!homepage.includes('class="hero-product"')) failures.push("homepage: missing product decision visual");
if (!homepageTop.includes("@latest cloud upload") || !homepageTop.includes("one hosted snapshot free")) failures.push("homepage: missing free-snapshot onboarding step");
if (count(homepageTop, /id="primary-scan-command"/g) !== 1) failures.push("homepage: expected one primary scan command above the evidence preview");
if (count(homepage, /data-copy-command=/g) !== 2) failures.push("homepage: expected copy controls for the local scan and cloud upload");
if (!homepage.includes('id="command-copy-status" role="status" aria-live="polite"')) failures.push("homepage: missing accessible copy confirmation");
if (!homepage.includes("PUBLISHED EVIDENCE") || />\s*LIVE\s*</i.test(homepage)) failures.push("homepage: product proof must use published-evidence wording instead of LIVE");
if (/Trusted by|customers include|customer logos|teams at/i.test(homepageTop)) failures.push("homepage: contains unsupported customer-style proof language");
if (/pricing\?plan=team|Team · \$299|Start Team/i.test(homepage)) failures.push("homepage: contains a self-service Team claim");
if (/Daily verification|rerun every day|Live compatibility matrix/i.test(homepage)) failures.push("homepage: overstates the freshness of recorded verification data");
if (!homepage.includes("Individual Pro · $29/month")) failures.push("homepage: missing Individual Pro as the primary hosted plan");
if (!homepage.includes("use <code>cloud upload</code> to see one hosted snapshot before paying")) failures.push("homepage: final CTA bypasses the free hosted snapshot");
if (/Start \$29/i.test(homepage)) failures.push("homepage: starts paid checkout before the free hosted snapshot");
const verifiedCardCount = count(homepage, /class="verified-card"/g);
if (verifiedCardCount < 1 || verifiedCardCount > 3) failures.push(`homepage: expected 1-3 verified preview cards, found ${verifiedCardCount}`);
if (count(homepage, /<time datetime="[^"]+">/g) !== verifiedCardCount) failures.push("homepage: every verified preview card must show its recorded date");
if (/id="server-search"|id="category-filter"|id="show-more"/.test(homepage)) failures.push("homepage: embeds the full Safety Index directory instead of a verified preview");
if (!homepage.includes('href="/safety-index/">Explore the full Safety Index')) failures.push("homepage: missing full Safety Index link from preview");
if (Buffer.byteLength(homepage, "utf8") > 75_000) failures.push("homepage: exceeds the 75 KB HTML budget");
if (/<style\b/i.test(homepage)) failures.push("homepage: contains an inline style layer instead of canonical m3.css");
if (count(homepage, /rel="stylesheet"/g) !== 1 || !homepage.includes('rel="stylesheet" href="/m3.css')) failures.push("homepage: m3.css must be the only stylesheet");
for (const expectedTarget of [
  "clarity-server",
  "chrome-devtools-mcp-server",
  "cloudflare-server",
  "github-mcp-server",
  "gitlab-server",
  "docker-server",
  "kubernetes-server",
  "mongodb-server",
  "redis-server",
  "postgres-server",
  "supabase-server",
  "sentry-server",
  "stripe-server",
  "shopify-mcp-server",
  "notion-server",
  "figma-server",
  "linear-server",
  "coinbase-cds-server",
]) {
  if (!homepage.includes(`/safety-index/servers/${expectedTarget}.html`)) failures.push(`homepage: missing substantiated logo link for ${expectedTarget}`);
}
for (const organizationLogo of ["accenture.svg", "cisco.svg", "oracle.svg"]) {
  if (!homepage.includes(`/proof-logos/${organizationLogo}`)) failures.push(`homepage: missing observed-organization logo ${organizationLogo}`);
}
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
    failures.push(`sitemap: ${url.pathname} does not resolve to a dashboard file`);
  }
}

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
