import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const prohibitedPaths = [
  "api",
  "scripts/build-fleet-monitor.sh",
  "scripts/export-telemetry-d1.ts",
  "scripts/metrics-dashboard.ts",
  "scripts/telemetry-company-intelligence.ts",
  "src/telemetry.ts",
  "src/commands/telemetry.ts",
  "docs/compliance",
  "docs/fleet-monitor.html",
  "docs/fleet-monitor-data.json",
  "docs/metrics-dashboard.md",
  "docs/private-mcp-fleet-risk-graph.md",
  "docs/sample-private-fleet-risk-graph.md",
];

const failures = [];
for (const relative of prohibitedPaths) {
  try {
    await access(path.join(root, relative));
    failures.push("Prohibited path exists: " + relative);
  } catch {
    // Expected: private or hosted implementation is absent.
  }
}

const sourceFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "dashboard"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (/\.(cjs|js|mjs|ts|json|md|yml|yaml)$/.test(entry.name)) sourceFiles.push(absolute);
  }
}
await walk(root);

const prohibitedReferences = [
  /from ["'][^"']*telemetry\.js["']/,
  /scripts\/(?:export-telemetry-d1|metrics-dashboard|telemetry-company-intelligence)/,
  /npm run (?:metrics|telemetry|intel):/,
  /CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][^$]/,
];
for (const file of sourceFiles) {
  if (path.basename(file) === "check-repository-boundary.mjs") continue;
  const source = await readFile(file, "utf8");
  for (const pattern of prohibitedReferences) {
    if (pattern.test(source)) failures.push("Prohibited reference in " + path.relative(root, file) + ": " + pattern);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Repository boundary passed: " + sourceFiles.length + " public files checked.");
