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

const css = await readFile(path.join(root, "m3.css"), "utf8");
if (!css.includes("focus-visible")) failures.push("m3.css is missing focus-visible states");
if (!css.includes("prefers-reduced-motion")) failures.push("m3.css is missing reduced-motion handling");
if (!css.includes("min-height:48px")) failures.push("m3.css is missing the 48px target baseline");
if (/font-size:\s*10px/.test(css)) failures.push("m3.css contains deprecated 10px text");
if (/body::before\s*\{[^}]*display:none/.test(css) === false) failures.push("decorative grid suppression is missing");

const homepage = await readFile(path.join(root, "index.html"), "utf8");
const homepageTop = homepage.slice(0, homepage.indexOf('<div class="section-title" id="index">'));
if (count(homepage, /Is this agent <span>safe to ship\?<\/span>/g) !== 1) failures.push("homepage: expected exactly one plain-language hero headline");
if (count(homepage, /AGENT WORKFLOW SAFETY/g) !== 1) failures.push("homepage: expected exactly one workflow-safety eyebrow");
if (!homepage.includes("MCP is just the name of the plug.")) failures.push("homepage: missing plain-language MCP definition");
if (!homepage.includes("See a scored tool")) failures.push("homepage: missing non-CLI primary CTA");
if (!homepage.includes('class="logo-strip"')) failures.push("homepage: missing full-width company logo strip");
if (!homepage.includes("Evaluated technologies, not MCP Observatory customers, endorsements, or partnerships.")) failures.push("homepage: missing evaluated-technologies disclaimer");
if (!homepage.includes('class="hero-product"')) failures.push("homepage: missing product decision visual");
if (!homepageTop.includes("@latest cloud upload") || !homepageTop.includes("one hosted snapshot free")) failures.push("homepage: missing free-snapshot onboarding step");
if (/Used by|Trusted by|teams at/i.test(homepageTop)) failures.push("homepage: contains unsupported customer-style proof language");
if (/pricing\?plan=team|Team · \$299|Start Team/i.test(homepage)) failures.push("homepage: contains a self-service Team claim");
if (/Daily verification|rerun every day|Live compatibility matrix/i.test(homepage)) failures.push("homepage: overstates the freshness of recorded verification data");
if (!homepage.includes("Individual Pro · $29/month")) failures.push("homepage: missing Individual Pro as the primary hosted plan");
if (!homepage.includes("use <code>cloud upload</code> to see one hosted snapshot before paying")) failures.push("homepage: final CTA bypasses the free hosted snapshot");
if (/Start \$29/i.test(homepage)) failures.push("homepage: starts paid checkout before the free hosted snapshot");
for (const expectedTarget of ["playwright-mcp-server", "google-drive-server", "cloudflare-server"]) {
  if (!homepage.includes(`/safety-index/servers/${expectedTarget}.html`)) failures.push(`homepage: missing substantiated logo link for ${expectedTarget}`);
}
if (/proof-logos\/(?:oracle|cisco|accenture)\.svg/i.test(homepage)) failures.push("homepage: contains an unsupported evaluated-technology logo");

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
  if (!/href="\/m3\.css(?:\?[^"]*)?"/.test(source)) failures.push(`${rel}: missing shared m3.css`);
  if (count(source, /<main\b/gi) !== 1) failures.push(`${rel}: expected exactly one main landmark");
  if (count(source, /<h1\b/gi) !== 1) failures.push(`${rel}: expected exactly one h1`);
  const headingLevels = [...source.matchAll(/<h([1-6])\b/gi)].map(match => Number(match[1]));
  if (headingLevels[0] !== 1) failures.push(`${rel}: h1 is not the first heading`);
  for (let i = 1; i < headingLevels.length; i += 1) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) failures.push(`${rel}: heading level skips from h${headingLevels[i - 1]} to h${headingLevels[i]}`);
  }
  for (const image of source.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt\s*=\s*(['"]).*?\1/i.test(image[0])) failures.push(`${rel}: image missing alt text`);
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
