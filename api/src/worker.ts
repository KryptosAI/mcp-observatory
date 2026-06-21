/**
 * MCP Observatory — Hosted Scan API
 *
 * Cloudflare Worker that exposes a simplified MCP health-check scanner
 * for HTTP-based MCP servers.  Local-process targets are rejected for
 * security reasons.
 */

// ---------------------------------------------------------------------------
// Environment bindings
// ---------------------------------------------------------------------------

export interface Env {
  SCAN_CACHE: KVNamespace;
  CLOUD_UPLOAD_TOKEN?: string;
  HOSTED_SCAN_TOKEN?: string;
}

// ---------------------------------------------------------------------------
// Types (copied from the main observatory — kept minimal for the Worker)
// ---------------------------------------------------------------------------

const SCHEMA_VERSION = "1.0.0" as const;

type Gate = "pass" | "fail";
type CheckStatus = "pass" | "fail" | "partial" | "unsupported" | "skipped" | "flaky";
type CheckId =
  | "tools"
  | "prompts"
  | "resources"
  | "tools-invoke"
  | "security"
  | "security-lite"
  | "conformance"
  | "schema-quality";

type HealthGrade = "A" | "B" | "C" | "D" | "F";

interface ScoreDimension {
  name: string;
  weight: number;
  score: number;
  details: string[];
}

interface HealthScore {
  overall: number;
  grade: HealthGrade;
  dimensions: ScoreDimension[];
}

interface PerformanceMetrics {
  connectMs: number;
  toolsListMs?: number;
  promptsListMs?: number;
  resourcesListMs?: number;
  toolInvokeMs?: Record<string, number>;
}

interface EvidenceSummary {
  endpoint: string;
  advertised: boolean;
  responded: boolean;
  minimalShapePresent: boolean;
  itemCount?: number;
  identifiers?: string[];
  diagnostics?: string[];
}

interface CheckResult {
  id: CheckId;
  capability: CheckId;
  status: CheckStatus;
  durationMs: number;
  message: string;
  evidence: EvidenceSummary[];
}

interface StatusCounts {
  total: number;
  pass: number;
  fail: number;
  partial: number;
  unsupported: number;
  flaky: number;
  skipped: number;
}

interface RunSummary extends StatusCounts {
  gate: Gate;
}

interface TargetSnapshot {
  targetId: string;
  adapter: "http" | "local-process";
  command: string;
  args: string[];
  url?: string;
  metadata?: Record<string, string>;
  serverVersion?: string;
  serverName?: string;
}

interface EnvironmentSnapshot {
  platform: string;
  nodeVersion: string;
}

interface RunArtifact {
  artifactType: "run";
  schemaVersion: typeof SCHEMA_VERSION;
  gate: Gate;
  runId: string;
  createdAt: string;
  toolVersion: string;
  target: TargetSnapshot;
  environment: EnvironmentSnapshot;
  summary: RunSummary;
  checks: CheckResult[];
  healthScore?: HealthScore;
  performanceMetrics?: PerformanceMetrics;
  fatalError?: string;
}

// ── Score computation (duplicated from src/score.ts) ────────────────────────
// IMPORTANT: This logic is duplicated from src/score.ts because the Worker
// can't import from the main package. Keep both files in sync when making changes.

const STATUS_SCORES: Record<string, number> = {
  pass: 100,
  partial: 60,
  flaky: 40,
  unsupported: 50,
  skipped: 50,
  fail: 0,
};

function scoreForStatus(status: string): number {
  return STATUS_SCORES[status] ?? 0;
}

function gradeFromScore(score: number): HealthGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function scoreDimension(
  name: string,
  weight: number,
  checks: CheckResult[],
  ids: string[],
): ScoreDimension {
  const matching = checks.filter((c) => ids.includes(c.id));
  if (matching.length === 0) {
    return { name, weight, score: 50, details: ["No matching checks ran."] };
  }
  const total = matching.reduce((sum, c) => sum + scoreForStatus(c.status), 0);
  const score = Math.round(total / matching.length);
  const details = matching.map(
    (c) => `${c.id}: ${c.status} (${scoreForStatus(c.status)}/100)`,
  );
  return { name, weight, score, details };
}

function scorePerformance(
  weight: number,
  metrics?: PerformanceMetrics,
): ScoreDimension {
  if (!metrics) {
    return {
      name: "Performance",
      weight,
      score: 50,
      details: ["No performance data collected."],
    };
  }
  const latencies: number[] = [];
  if (metrics.toolsListMs !== undefined) latencies.push(metrics.toolsListMs);
  if (metrics.promptsListMs !== undefined)
    latencies.push(metrics.promptsListMs);
  if (metrics.resourcesListMs !== undefined)
    latencies.push(metrics.resourcesListMs);
  if (metrics.toolInvokeMs) {
    latencies.push(...Object.values(metrics.toolInvokeMs));
  }

  if (latencies.length === 0) {
    const connScore =
      metrics.connectMs < 1000 ? 100 : metrics.connectMs < 3000 ? 70 : 40;
    return {
      name: "Performance",
      weight,
      score: connScore,
      details: [`Connect: ${Math.round(metrics.connectMs)}ms`],
    };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.min(
    Math.ceil(sorted.length * 0.95) - 1,
    sorted.length - 1,
  );
  const p95 = sorted[p95Index] ?? 0;

  // p95 latency thresholds for performance scoring
  // <500ms = excellent (100), <1s = good (80), <2s = acceptable (60), <5s = slow (40), >5s = poor (20)
  let score: number;
  if (p95 < 500) score = 100;
  else if (p95 < 1000) score = 80;
  else if (p95 < 2000) score = 60;
  else if (p95 < 5000) score = 40;
  else score = 20;

  return {
    name: "Performance",
    weight,
    score,
    details: [
      `Connect: ${Math.round(metrics.connectMs)}ms`,
      `p95 latency: ${Math.round(p95)}ms (${latencies.length} operations)`,
    ],
  };
}

function computeHealthScore(
  checks: CheckResult[],
  performanceMetrics?: PerformanceMetrics,
): HealthScore {
  const w = {
    protocolCompliance: 0.3,  // Highest — spec compliance is foundational for interop
    schemaQuality: 0.2,       // Good schemas enable AI agents to use tools correctly
    security: 0.2,            // Parity with quality — both critical for production use
    reliability: 0.2,         // Tools/prompts/resources actually responding as expected
    performance: 0.1,         // Lowest — latency matters less than correctness
  };

  const dimensions: ScoreDimension[] = [
    scoreDimension("Protocol Compliance", w.protocolCompliance, checks, [
      "conformance",
    ]),
    scoreDimension("Schema Quality", w.schemaQuality, checks, [
      "schema-quality",
    ]),
    scoreDimension("Security", w.security, checks, ["security", "security-lite"]),
    scoreDimension("Reliability", w.reliability, checks, [
      "tools",
      "prompts",
      "resources",
      "tools-invoke",
    ]),
    scorePerformance(w.performance, performanceMetrics),
  ];

  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  return { overall, grade: gradeFromScore(overall), dimensions };
}

// ---------------------------------------------------------------------------
// Badge SVG (ported from src/badge.ts)
// ---------------------------------------------------------------------------

const GRADE_COLORS: Record<HealthGrade, string> = {
  A: "#4c1",
  B: "#97ca00",
  C: "#dfb317",
  D: "#fe7d37",
  F: "#e05d44",
};

function generateBadgeSvg(score: number, grade: HealthGrade): string {
  const label = "MCP Health";
  const value = `${score}/100`;
  const color = GRADE_COLORS[grade];

  const labelWidth = label.length * 7 + 10;
  const valueWidth = value.length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelWidth * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${label}</text>
    <text x="${labelWidth * 5}" y="140" transform="scale(.1)">${label}</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${value}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)">${value}</text>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOOL_VERSION = "0.23.0-hosted";
const KV_TTL_SECONDS = 86400; // 24 hours
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;

function generateRunId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `run_${id}`;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-MCP-Observatory-Org",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function isBlockedHostedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true;
  }
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = parts as [number, number, number, number];
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  return false;
}

function requireUploadAuth(request: Request, env: Env): Response | null {
  if (!env.CLOUD_UPLOAD_TOKEN) {
    return errorResponse("Cloud artifact upload is not configured.", 501);
  }
  const expected = `Bearer ${env.CLOUD_UPLOAD_TOKEN}`;
  if (request.headers.get("Authorization") !== expected) {
    return errorResponse("Unauthorized", 401);
  }
  return null;
}

function requireHostedScanAuth(request: Request, env: Env): Response | null {
  if (!env.HOSTED_SCAN_TOKEN) {
    return errorResponse("Hosted scan is not configured.", 501);
  }
  const expected = `Bearer ${env.HOSTED_SCAN_TOKEN}`;
  if (request.headers.get("Authorization") !== expected) {
    return errorResponse("Unauthorized", 401);
  }
  return null;
}

function slugifyOrg(raw: string | null | undefined): string {
  const slug = (raw ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "unknown";
}

// ---------------------------------------------------------------------------
// Rate limiting via KV counters
// ---------------------------------------------------------------------------

async function checkRateLimit(ip: string, kv: KVNamespace): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // rate-limited
  }
  await kv.put(key, String(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
  });
  return true;
}

// ---------------------------------------------------------------------------
// MCP HTTP Scanner
// ---------------------------------------------------------------------------

interface McpJsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpJsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

async function mcpJsonRpcCall(
  url: string,
  method: string,
  params?: Record<string, unknown>,
  requestId = 1,
  timeoutMs = 15000,
): Promise<McpJsonRpcResponse> {
  const body: McpJsonRpcRequest = {
    jsonrpc: "2.0",
    id: requestId,
    method,
    params: params ?? {},
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    // Handle Streamable HTTP (JSON response)
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as McpJsonRpcResponse;
    }

    // Handle SSE response — extract first JSON-RPC response from the stream
    if (contentType.includes("text/event-stream")) {
      const text = await res.text();
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            return JSON.parse(line.slice(6)) as McpJsonRpcResponse;
          } catch {
            // skip non-JSON data lines
          }
        }
      }
      throw new Error("No valid JSON-RPC response in SSE stream");
    }

    throw new Error(`Unexpected content-type: ${contentType}`);
  } finally {
    clearTimeout(timeout);
  }
}

interface ListCheckResult {
  check: CheckResult;
  durationMs: number;
}

async function runListCheck(
  url: string,
  checkId: "tools" | "prompts" | "resources",
  method: string,
  requestId: number,
): Promise<ListCheckResult> {
  const start = Date.now();
  try {
    const response = await mcpJsonRpcCall(url, method, {}, requestId);
    const durationMs = Date.now() - start;

    if (response.error) {
      // Method not supported is not necessarily a failure
      const isUnsupported =
        response.error.code === -32601 ||
        response.error.message.toLowerCase().includes("not supported") ||
        response.error.message.toLowerCase().includes("method not found");

      return {
        durationMs,
        check: {
          id: checkId,
          capability: checkId,
          status: isUnsupported ? "unsupported" : "fail",
          durationMs,
          message: isUnsupported
            ? `${checkId} capability not supported by this server`
            : `${checkId} check failed: ${response.error.message}`,
          evidence: [
            {
              endpoint: method,
              advertised: true,
              responded: true,
              minimalShapePresent: false,
              diagnostics: [response.error.message],
            },
          ],
        },
      };
    }

    // Inspect result shape
    const result = response.result as Record<string, unknown> | undefined;
    const listKey =
      checkId === "tools"
        ? "tools"
        : checkId === "prompts"
          ? "prompts"
          : "resources";
    const items = Array.isArray(result?.[listKey]) ? (result[listKey] as unknown[]) : [];
    const hasMinimalShape = Array.isArray(result?.[listKey]);

    return {
      durationMs,
      check: {
        id: checkId,
        capability: checkId,
        status: hasMinimalShape ? "pass" : "partial",
        durationMs,
        message: hasMinimalShape
          ? `${checkId}/list returned ${items.length} item(s)`
          : `${checkId}/list responded but returned unexpected shape`,
        evidence: [
          {
            endpoint: method,
            advertised: true,
            responded: true,
            minimalShapePresent: hasMinimalShape,
            itemCount: items.length,
            identifiers: items
              .slice(0, 20)
              .map((item) => {
                const obj = item as Record<string, unknown>;
                return (obj.name as string) ?? (obj.uri as string) ?? "unknown";
              }),
          },
        ],
      },
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      durationMs,
      check: {
        id: checkId,
        capability: checkId,
        status: "fail",
        durationMs,
        message: `${checkId} check failed: ${message}`,
        evidence: [
          {
            endpoint: method,
            advertised: true,
            responded: false,
            minimalShapePresent: false,
            diagnostics: [message],
          },
        ],
      },
    };
  }
}

async function scanHttpTarget(url: string): Promise<RunArtifact> {
  const runId = generateRunId();
  const createdAt = new Date().toISOString();
  const connectStart = Date.now();

  // First, try an initialize handshake to see if the server is reachable
  let connectMs: number;
  let serverName: string | undefined;
  let serverVersion: string | undefined;
  let fatalError: string | undefined;

  try {
    const initResponse = await mcpJsonRpcCall(url, "initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "mcp-observatory-hosted", version: TOOL_VERSION },
    });
    connectMs = Date.now() - connectStart;

    if (initResponse.result) {
      const result = initResponse.result as Record<string, unknown>;
      const info = result.serverInfo as Record<string, unknown> | undefined;
      serverName = info?.name as string | undefined;
      serverVersion = info?.version as string | undefined;
    }

    // Send initialized notification (fire and forget via POST)
    mcpJsonRpcCall(url, "notifications/initialized", {}).catch(() => {});
  } catch (err) {
    connectMs = Date.now() - connectStart;
    fatalError = `Connection failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  if (fatalError) {
    const artifact: RunArtifact = {
      artifactType: "run",
      schemaVersion: SCHEMA_VERSION,
      gate: "fail",
      runId,
      createdAt,
      toolVersion: TOOL_VERSION,
      target: {
        targetId: url,
        adapter: "http",
        command: "",
        args: [],
        url,
        serverName,
        serverVersion,
      },
      environment: { platform: "cloudflare-workers", nodeVersion: "n/a" },
      summary: {
        gate: "fail",
        total: 0,
        pass: 0,
        fail: 0,
        partial: 0,
        unsupported: 0,
        flaky: 0,
        skipped: 0,
      },
      checks: [],
      performanceMetrics: { connectMs },
      fatalError,
    };
    artifact.healthScore = computeHealthScore(artifact.checks, artifact.performanceMetrics);
    return artifact;
  }

  // Run the three list checks in parallel
  const [toolsResult, promptsResult, resourcesResult] = await Promise.all([
    runListCheck(url, "tools", "tools/list", 2),
    runListCheck(url, "prompts", "prompts/list", 3),
    runListCheck(url, "resources", "resources/list", 4),
  ]);

  const checks: CheckResult[] = [
    toolsResult.check,
    promptsResult.check,
    resourcesResult.check,
  ];

  const performanceMetrics: PerformanceMetrics = {
    connectMs,
    toolsListMs: toolsResult.durationMs,
    promptsListMs: promptsResult.durationMs,
    resourcesListMs: resourcesResult.durationMs,
  };

  // Compute summary
  const counts: StatusCounts = {
    total: checks.length,
    pass: checks.filter((c) => c.status === "pass").length,
    fail: checks.filter((c) => c.status === "fail").length,
    partial: checks.filter((c) => c.status === "partial").length,
    unsupported: checks.filter((c) => c.status === "unsupported").length,
    flaky: checks.filter((c) => c.status === "flaky").length,
    skipped: checks.filter((c) => c.status === "skipped").length,
  };

  const gate: Gate = counts.fail > 0 ? "fail" : "pass";

  const artifact: RunArtifact = {
    artifactType: "run",
    schemaVersion: SCHEMA_VERSION,
    gate,
    runId,
    createdAt,
    toolVersion: TOOL_VERSION,
    target: {
      targetId: url,
      adapter: "http",
      command: "",
      args: [],
      url,
      serverName,
      serverVersion,
    },
    environment: { platform: "cloudflare-workers", nodeVersion: "n/a" },
    summary: { ...counts, gate },
    checks,
    performanceMetrics,
  };

  artifact.healthScore = computeHealthScore(checks, performanceMetrics);

  return artifact;
}

// ---------------------------------------------------------------------------
// Request routing
// ---------------------------------------------------------------------------

interface ScanRequestBody {
  url?: string;
  command?: string;
  args?: string[];
  options?: Record<string, unknown>;
}

async function handlePostScan(
  request: Request,
  env: Env,
): Promise<Response> {
  const authError = requireHostedScanAuth(request, env);
  if (authError) return authError;

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const allowed = await checkRateLimit(ip, env.SCAN_CACHE);
  if (!allowed) {
    return errorResponse(
      "Rate limit exceeded. Maximum 10 requests per minute.",
      429,
    );
  }

  let body: ScanRequestBody;
  try {
    body = (await request.json()) as ScanRequestBody;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // Reject local-process targets
  if (body.command) {
    return errorResponse(
      "Local process targets are not supported in hosted mode. Use HTTP targets or run the CLI locally.",
      400,
    );
  }

  if (!body.url || typeof body.url !== "string") {
    return errorResponse(
      'Missing required field "url". Provide an HTTP URL to an MCP server.',
      400,
    );
  }

  // Basic URL validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
  } catch {
    return errorResponse("Invalid URL format", 400);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return errorResponse("Only http:// and https:// URLs are supported", 400);
  }
  if (isBlockedHostedHostname(parsedUrl.hostname)) {
    return errorResponse(
      "Hosted scans cannot target localhost or private network addresses. Run the CLI locally for internal MCP servers.",
      400,
    );
  }

  const artifact = await scanHttpTarget(body.url);

  // Cache in KV
  await env.SCAN_CACHE.put(
    `scan:${artifact.runId}`,
    JSON.stringify(artifact),
    { expirationTtl: KV_TTL_SECONDS },
  );

  return jsonResponse(artifact);
}

interface ArtifactUploadRecord {
  org: string;
  runId: string;
  uploadedAt: string;
  targetId?: string;
  gate?: Gate;
  healthScore?: number;
}

async function handlePostArtifact(
  request: Request,
  env: Env,
): Promise<Response> {
  const authError = requireUploadAuth(request, env);
  if (authError) return authError;

  let artifact: RunArtifact & { org?: string };
  try {
    artifact = (await request.json()) as RunArtifact & { org?: string };
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (artifact.artifactType !== "run" || typeof artifact.runId !== "string" || !artifact.target) {
    return errorResponse("Expected a MCP Observatory run artifact.", 400);
  }

  const org = slugifyOrg(
    request.headers.get("X-MCP-Observatory-Org") ??
    artifact.org ??
    artifact.target.metadata?.["org"] ??
    artifact.target.metadata?.["company"],
  );
  const uploadedAt = new Date().toISOString();
  const key = `artifact:${org}:${artifact.runId}`;
  const record: ArtifactUploadRecord = {
    org,
    runId: artifact.runId,
    uploadedAt,
    targetId: artifact.target.targetId,
    gate: artifact.gate,
    healthScore: artifact.healthScore?.overall,
  };

  await env.SCAN_CACHE.put(
    key,
    JSON.stringify({ ...record, artifact }),
    { expirationTtl: KV_TTL_SECONDS * 30 },
  );

  const indexKey = `artifact-index:${org}`;
  const existing = await env.SCAN_CACHE.get(indexKey);
  const index = existing ? JSON.parse(existing) as ArtifactUploadRecord[] : [];
  const nextIndex = [record, ...index.filter((entry) => entry.runId !== artifact.runId)].slice(0, 200);
  await env.SCAN_CACHE.put(indexKey, JSON.stringify(nextIndex), { expirationTtl: KV_TTL_SECONDS * 30 });

  return jsonResponse({
    ok: true,
    org,
    runId: artifact.runId,
    key,
    uploadedAt,
  });
}

async function handleGetArtifacts(
  request: Request,
  env: Env,
  orgParam: string,
): Promise<Response> {
  const authError = requireUploadAuth(request, env);
  if (authError) return authError;
  const org = slugifyOrg(orgParam);
  const raw = await env.SCAN_CACHE.get(`artifact-index:${org}`);
  return jsonResponse({
    org,
    artifacts: raw ? JSON.parse(raw) : [],
  });
}

async function handleGetScan(
  runId: string,
  env: Env,
): Promise<Response> {
  const raw = await env.SCAN_CACHE.get(`scan:${runId}`);
  if (!raw) {
    return errorResponse("Scan result not found or expired", 404);
  }
  return jsonResponse(JSON.parse(raw));
}

async function handleGetBadge(
  runId: string,
  env: Env,
): Promise<Response> {
  const raw = await env.SCAN_CACHE.get(`scan:${runId}`);
  if (!raw) {
    // Return a "not found" badge
    const svg = generateBadgeSvg(0, "F");
    return new Response(svg, {
      status: 404,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
        ...corsHeaders(),
      },
    });
  }

  const artifact = JSON.parse(raw) as RunArtifact;
  const score = artifact.healthScore?.overall ?? 0;
  const grade = artifact.healthScore?.grade ?? "F";
  const svg = generateBadgeSvg(score, grade);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
      ...corsHeaders(),
    },
  });
}

function handleHealth(): Response {
  return jsonResponse({
    status: "ok",
    version: TOOL_VERSION,
    timestamp: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function matchRoute(
  method: string,
  pathname: string,
): { handler: string; params: Record<string, string> } | null {
  if (method === "GET" && pathname === "/api/v1/health") {
    return { handler: "health", params: {} };
  }
  if (method === "POST" && pathname === "/api/v1/scan") {
    return { handler: "postScan", params: {} };
  }
  if (method === "POST" && pathname === "/api/v1/artifacts") {
    return { handler: "postArtifact", params: {} };
  }

  // GET /api/v1/artifacts/:org
  const artifactMatch = pathname.match(/^\/api\/v1\/artifacts\/([a-zA-Z0-9._-]+)$/);
  if (method === "GET" && artifactMatch?.[1]) {
    return { handler: "getArtifacts", params: { org: artifactMatch[1] } };
  }

  // GET /api/v1/scan/:runId
  const scanMatch = pathname.match(/^\/api\/v1\/scan\/([a-z0-9_]+)$/);
  if (method === "GET" && scanMatch?.[1]) {
    return { handler: "getScan", params: { runId: scanMatch[1] } };
  }

  // GET /api/v1/badge/:runId
  const badgeMatch = pathname.match(/^\/api\/v1\/badge\/([a-z0-9_]+)$/);
  if (method === "GET" && badgeMatch?.[1]) {
    return { handler: "getBadge", params: { runId: badgeMatch[1] } };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const route = matchRoute(request.method, url.pathname);

    if (!route) {
      return errorResponse("Not found", 404);
    }

    try {
      switch (route.handler) {
        case "health":
          return handleHealth();
        case "postScan":
          return await handlePostScan(request, env);
        case "postArtifact":
          return await handlePostArtifact(request, env);
        case "getArtifacts":
          return await handleGetArtifacts(request, env, route.params.org!);
        case "getScan":
          return await handleGetScan(route.params.runId!, env);
        case "getBadge":
          return await handleGetBadge(route.params.runId!, env);
        default:
          return errorResponse("Not found", 404);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(`Internal error: ${message}`, 500);
    }
  },
} satisfies ExportedHandler<Env>;
