import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { renderHtml } from "./reporters/html.js";
import { validateRunArtifact } from "./validate.js";
import { CLEARFRAME_DOWNLOAD_URL, clearframeTask } from "./clearframe.js";
import type { RunArtifact } from "./types.js";

function esc(value: unknown): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function listLocalRuns(directory: string): Promise<Array<{ file: string; artifact: RunArtifact }>> {
  let files;
  try { files = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const runs: Array<{ file: string; artifact: RunArtifact }> = [];
  for (const file of files.filter(f => f.isFile() && f.name.endsWith(".json")).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 2000)) {
    try {
      const absolute = path.join(directory, file.name);
      const info = await lstat(absolute);
      if (!info.isFile() || info.size > 5_000_000) continue;
      const artifact = validateRunArtifact(JSON.parse(await readFile(absolute, "utf8")));
      runs.push({ file: file.name, artifact });
    } catch { /* A corrupt receipt must not hide the other local evidence. */ }
  }
  return runs.sort((a, b) => b.artifact.createdAt.localeCompare(a.artifact.createdAt));
}

export async function startLocalDashboard(directory: string, port = 0) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid loopback port");
  let origin = "";
  const server = createServer((req, res) => { void (async () => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const send = (status: number, body: string, type = "text/plain; charset=utf-8") => {
      res.writeHead(status, { "Content-Type": type }); res.end(body);
    };
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) {
      send(403, "Only this loopback origin is allowed"); return;
    }
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); send(405, "Read-only dashboard"); return; }
    const url = new URL(req.url ?? "/", origin);
    if (!["/", "/report", "/artifact", "/clearframe-task"].includes(url.pathname)) { send(404, "Not found"); return; }
    const runs = await listLocalRuns(directory);
    if (url.pathname !== "/") {
      const run = runs.find(item => item.file === url.searchParams.get("file"));
      if (!run) { send(404, "Receipt not found"); return; }
      if (url.pathname === "/report") { send(200, renderHtml(run.artifact), "text/html; charset=utf-8"); return; }
      const task = url.pathname === "/clearframe-task";
      res.setHeader("Content-Disposition", `attachment; filename="${task ? "clearframe-task.txt" : "observatory-receipt.json"}"`);
      send(200, task ? clearframeTask(run.artifact) : JSON.stringify(run.artifact, null, 2), task ? "text/plain; charset=utf-8" : "application/json"); return;
    }
    const query = (url.searchParams.get("q") ?? "").slice(0, 200);
    const filtered = runs.filter(item => item.artifact.target.targetId.toLowerCase().includes(query.toLowerCase()));
    const rows = filtered.map(({ file, artifact }) => {
      const param = `?file=${encodeURIComponent(file)}`;
      return `<tr><td>${esc(artifact.target.targetId)}</td><td>${esc(artifact.createdAt)}</td><td>${esc(artifact.gate)}</td><td>${artifact.healthScore ? `${esc(artifact.healthScore.overall)} (${esc(artifact.healthScore.grade)})` : "—"}</td><td><a href="/report${param}">Report</a> · <a href="/artifact${param}" download>JSON</a> · <a href="/clearframe-task${param}" download>ClearFrame task</a></td></tr>`;
    }).join("");
    send(200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MCP Observatory · Local history</title><style>body{font:16px/1.6 system-ui;margin:2rem auto;padding:0 1rem;max-width:1100px;color:#182238;background:#f6f8fc}a{color:#244dcc}table{border-collapse:collapse;width:100%;background:white}td,th{text-align:left;padding:12px;border-bottom:1px solid #d9e0ed;overflow-wrap:anywhere}input,button{font:inherit;padding:8px}.scroll{overflow-x:auto}h1{margin-bottom:0}p{max-width:85ch}:focus-visible{outline:3px solid #244dcc;outline-offset:3px}</style></head><body><header><h1>MCP Observatory</h1><p>Free local scan history. No account, upload, subscription, or remote assets.</p></header><main><form method="get"><label for="q">Filter by server</label> <input id="q" name="q" value="${esc(query)}"><button type="submit">Filter</button></form><p>${filtered.length} receipts shown. Up to 2,000 recent receipt files are inspected per refresh; files stay on your disk until you delete them.</p><div class="scroll"><table><caption>Scans and health scores over time</caption><thead><tr><th>Server</th><th>Scanned</th><th>Gate</th><th>Score</th><th>Review</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No matching receipts. Run mcp-observatory demo or test in this project, then refresh.</td></tr>'}</tbody></table></div><h2>Continue in ClearFrame</h2><p>Download a task, review it, then paste it into a new ClearFrame Mac chat with this project open. For the CLI, run <code>mcp-observatory clearframe</code> to prepare the local file and command.</p><p><a href="${CLEARFRAME_DOWNLOAD_URL}" rel="noreferrer">Get the ClearFrame CLI or Mac app</a>. ClearFrame has its own account and usage terms. Observatory works independently.</p><p>Receipts may contain private evidence. Review JSON before sharing. ClearFrame tasks contain check statuses, with server commands, paths, URLs and response payloads omitted.</p></main></body></html>`, "text/html; charset=utf-8");
  })().catch(() => { if (!res.headersSent) res.writeHead(500); res.end("Could not read local receipts."); }); });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => { origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); });
  });
  return { url: origin, close: () => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeIdleConnections(); }) };
}
