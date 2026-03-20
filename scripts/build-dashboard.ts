import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const matrixSummaryPath = path.join(root, "examples", "matrix-summary.json");
const matrixHistoryPath = path.join(root, "examples", "matrix-history.json");
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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function buildHtml(current: MatrixSummaryEntry[], history: HistoryEntry[]): string {
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MCP Observatory Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: #0d1117; color: #c9d1d9; line-height: 1.5; }
    .container { max-width: 960px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #f0f6fc; }
    .subtitle { color: #8b949e; margin-bottom: 24px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px 24px; }
    .stat .number { font-size: 32px; font-weight: bold; }
    .stat .label { font-size: 13px; color: #8b949e; }
    .pass .number { color: #3fb950; }
    .fail .number { color: #f85149; }
    table { width: 100%; border-collapse: collapse; background: #161b22; border: 1px solid #30363d; border-radius: 6px; overflow: hidden; }
    th { text-align: left; padding: 12px 16px; background: #21262d; color: #8b949e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #30363d; }
    td { padding: 12px 16px; border-bottom: 1px solid #21262d; }
    tr:last-child td { border-bottom: none; }
    code { background: #21262d; padding: 2px 6px; border-radius: 3px; }
    .footer { margin-top: 32px; text-align: center; color: #8b949e; font-size: 13px; }
    .footer a { color: #58a6ff; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MCP Observatory Dashboard</h1>
    <p class="subtitle">Automated health checks for MCP servers</p>

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

    <table>
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
    </table>

    <div class="footer">
      Powered by <a href="https://github.com/KryptosAI/mcp-observatory">MCP Observatory</a>
      &middot; Updated ${formatDate(new Date().toISOString())}
    </div>
  </div>
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

  // Load or initialize history
  let history: HistoryEntry[] = [];
  try {
    history = JSON.parse(await readFile(matrixHistoryPath, "utf8")) as HistoryEntry[];
  } catch {
    // No history yet
  }

  // Generate dashboard HTML
  const html = buildHtml(current, history);
  await writeFile(path.join(dashboardDir, "index.html"), html, "utf8");

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
