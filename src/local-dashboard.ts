import { designAsset, designFontFile, designPage } from "../hosting/src/ui/shell.js";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { constants } from "node:fs";
import { readdir, open, lstat, readFile } from "node:fs/promises";
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
      const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
      const nonblock = typeof constants.O_NONBLOCK === "number" ? constants.O_NONBLOCK : 0;
      const handle = await open(absolute, constants.O_RDONLY | noFollow | nonblock);
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.size > 5_000_000) continue;
        // Windows has no O_NOFOLLOW. Reject reparse/symlink entries and require
        // the pathname to identify the same inode as the already-open handle.
        if (!noFollow) {
          const entry = await lstat(absolute, { bigint: true });
          const opened = await handle.stat({ bigint: true });
          if (!entry.isFile() || entry.isSymbolicLink() || entry.dev !== opened.dev || entry.ino !== opened.ino) continue;
        }
        // Read only through this descriptor and bound allocation even if a
        // different process grows or replaces the directory entry during read.
        const buffer = Buffer.alloc(info.size + 1);
        let size = 0;
        while (size < buffer.length) {
          const chunk = await handle.read(buffer, size, buffer.length - size, size);
          if (!chunk.bytesRead) break;
          size += chunk.bytesRead;
        }
        if (size !== info.size) continue;
        const artifact = validateRunArtifact(JSON.parse(buffer.subarray(0, size).toString("utf8")));
        runs.push({ file: file.name, artifact });
      } finally { await handle.close(); }
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
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const send = (status: number, body: string | Uint8Array, type = "text/plain; charset=utf-8") => {
      res.writeHead(status, { "Content-Type": type }); res.end(body);
    };
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) {
      send(403, "Only this loopback origin is allowed"); return;
    }
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); send(405, "Read-only dashboard"); return; }
    const url = new URL(req.url ?? "/", origin);
    const font = designFontFile(url.pathname);
    if (font) { send(200, await readFile(new URL(`../hosting/src/ui/fonts/${font}`, import.meta.url)), "font/woff2"); return; }
    const asset = designAsset(url.pathname);
    if (asset) { send(200, asset.body, asset.type); return; }
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
      return `<tr><td>${esc(artifact.target.targetId)}</td><td class="obs-number">${esc(artifact.createdAt)}</td><td><span class="cf-badge" data-state="${artifact.gate === "pass" ? "success" : artifact.gate === "fail" ? "error" : "neutral"}">${esc(artifact.gate)}</span></td><td class="obs-number">${artifact.healthScore ? `${esc(artifact.healthScore.overall)} (${esc(artifact.healthScore.grade)})` : "—"}</td><td><div class="obs-actions"><a class="cf-button" data-variant="quiet" href="/report${param}">Report</a><a class="cf-button" data-variant="quiet" href="/artifact${param}" download>JSON</a><a class="cf-button" data-variant="quiet" href="/clearframe-task${param}" download>ClearFrame task</a></div></td></tr>`;
    }).join("");
    const selectedTheme = url.searchParams.get("theme");
    const theme = selectedTheme === "light" || selectedTheme === "dark" ? selectedTheme : undefined;
    const themeLinks = `<a class="cf-button" data-variant="quiet" href="?q=${encodeURIComponent(query)}">System</a><a class="cf-button" data-variant="quiet" href="?q=${encodeURIComponent(query)}&amp;theme=light">Light</a><a class="cf-button" data-variant="quiet" href="?q=${encodeURIComponent(query)}&amp;theme=dark">Dark</a>`;
    const body = `<div class="obs-heading"><div><p class="cf-overline-s obs-muted">Local evidence</p><h1 class="cf-heading-2xl">Scan history</h1><p class="obs-muted">Free local scan history. No account, upload, subscription, or remote assets.</p></div><a class="cf-button" data-variant="primary" href="${CLEARFRAME_DOWNLOAD_URL}" rel="noreferrer">Get ClearFrame CLI or Mac</a></div>
    <form method="get" class="obs-search"><div><label class="cf-label" for="q">Filter by server</label><input class="cf-field" id="q" name="q" value="${esc(query)}" placeholder="Server name" aria-describedby="receipt-count"></div>${theme ? `<input type="hidden" name="theme" value="${theme}">` : ""}<button class="cf-button" type="submit">Filter</button></form>
    <p id="receipt-count" class="obs-muted">${filtered.length} ${filtered.length === 1 ? "receipt" : "receipts"} shown. Up to 2,000 recent receipt files are inspected per refresh; files stay on your disk until you delete them.</p>
    ${rows ? `<div class="obs-scroll" tabindex="0" role="region" aria-label="Local scan receipts"><table><caption>Scans and health scores over time</caption><thead><tr><th scope="col">Server</th><th scope="col">Scanned</th><th scope="col">Gate</th><th scope="col">Score</th><th scope="col">Review</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="cf-empty"><strong>No matching receipts</strong><p>Run <code>npx -y @kryptosai/mcp-observatory@latest demo --example</code> or test a server in this project, then refresh.</p><a class="cf-button" href="/">Show all local receipts</a></div>'}

    <section class="obs-next" aria-labelledby="clearframe-next"><h2 id="clearframe-next" class="cf-heading-l">Continue in ClearFrame</h2><p>Download a task, review it, then paste it into a new ClearFrame Mac chat with this project open. For the CLI, run <code>mcp-observatory clearframe</code> to prepare the local file and command.</p><p class="obs-muted">ClearFrame has its own account and usage terms. Observatory works independently.</p><p class="cf-hint">Receipts may contain private evidence. Review JSON before sharing. ClearFrame tasks contain check statuses, with server commands, paths, URLs and response payloads omitted.</p></section>`;
    send(200, designPage("Local history", body, themeLinks, theme), "text/html; charset=utf-8");
  })().catch(() => {
    if (res.headersSent) { res.end(); return; }
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(designPage("Could not read local receipts", '<div class="cf-empty"><h1 class="cf-heading-l">Could not read local receipts</h1><p>Check the receipt folder exists and you have permission to read it, then try again.</p><a class="cf-button" href="/">Try again</a></div>'));
  }); });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => { origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); });
  });
  return { url: origin, close: () => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeIdleConnections(); }) };
}
