/**
 * Read-only traffic-quality regression probe for a local Pages preview or an
 * explicitly supplied staging URL. It never sends production data or changes
 * Cloudflare configuration. Defaulting to local keeps production verification
 * an intentional release step.
 */
const base = new URL(process.env.MCP_OBSERVATORY_PUBLIC_BASE_URL ?? "http://127.0.0.1:8788");
if (!["http:", "https:"].includes(base.protocol)) throw new Error("MCP_OBSERVATORY_PUBLIC_BASE_URL must use http or https.");

const request = async path => {
  // Assign pathname instead of resolving `new URL(path, base)`: a probe such
  // as `//xmlrpc.php` must remain a path on this host, not become a host name.
  const url = new URL(base);
  url.pathname = path;
  url.search = "";
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8_000) });
  return { path, response, body: await response.text() };
};

const validPaths = ["/", "/safety-index/", "/safety-index/servers/context7-server", "/safety-index/servers/postgres-server", "/safety-index/servers/kubernetes-server"];
const scannerPaths = ["/.env", "/.git/config", "/wp-admin/install.php", "//xmlrpc.php", "/%62ackend"];
const failures = [];
const results = [];

for (const path of validPaths) {
  const { response } = await request(path);
  results.push({ path, status: response.status, kind: "valid" });
  if (response.status < 200 || response.status >= 400) failures.push(`${path} returned ${response.status}; valid Pages must not return 4xx/5xx.`);
}

for (const path of scannerPaths) {
  const { response, body } = await request(path);
  results.push({ path, status: response.status, kind: "scanner" });
  if (![403, 404].includes(response.status)) failures.push(`${path} returned ${response.status}; scanner paths must return 403 or 404.`);
  if (body.includes("MCP Observatory Safety Index") || body.includes("Your safety report")) failures.push(`${path} returned the normal site HTML.`);
}

const legacy = await request("/safety-index/servers/context7-server.html");
results.push({ path: legacy.path, status: legacy.response.status, kind: "legacy_redirect", location: legacy.response.headers.get("location") });
const location = legacy.response.headers.get("location") ?? "";
if (![301, 308].includes(legacy.response.status) || !location.endsWith("/safety-index/servers/context7-server") || location.includes(".html")) {
  failures.push(`Legacy profile URL must issue exactly one canonical 301/308 redirect; got ${legacy.response.status} to ${location || "no location"}.`);
}

console.log(JSON.stringify({ base: base.origin, results }, null, 2));
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Traffic-quality smoke checks passed.");
