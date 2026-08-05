import { readdir, readFile } from "node:fs/promises";
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
const proofHeadline = "Used by engineers and security researchers.";
const proofQualifier = "Observed evaluations. No endorsement implied.";
if (count(homepage, new RegExp(proofHeadline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) !== 1) failures.push("homepage: expected exactly one proof headline");
if (count(homepage, new RegExp(proofQualifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) !== 1) failures.push("homepage: expected exactly one proof qualifier");
if (homepage.includes("<strong>Important:</strong>")) failures.push("homepage: proof qualifier still uses legal-warning label");

for (const file of await htmlFiles(root)) {
  const source = await readFile(file, "utf8");
  const rel = path.relative(process.cwd(), file);
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
