function textValue(value: unknown, fallback = ""): string { return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : fallback; }

/** MIT-licensed Observatory hosting. Extracted from the shared service on 2026-10-21.
 * ClearFrame account, inference and billing code is intentionally outside this service. */
import { isFirstPartyUser } from "./first-party.js";
import { createSessionToken, randomToken, signJson, verifyJson, verifySessionToken, type AuthClaims } from "./auth.js";
import { dashboardPage, deviceAuthPage, loginPage, privacyPage, reportPage, termsPage, type RiskSnapshot } from "./dashboard.js";
import {
  decideHostedScan,
  decideUpload,
  ensureEntitlement,
  getEntitlement,
  getObservatoryEntitlement,
  recordProductEvent,
  reserveTarget,
  reserveUsage,
  retentionDeadline,
  type AccessDecision,
  type EntitlementSnapshot,
} from "./entitlements.js";

// ---------------------------------------------------------------------------
// Environment bindings
// ---------------------------------------------------------------------------

export interface Env {
SCAN_CACHE: KVNamespace;
DB?: D1Database;
CLOUD_UPLOAD_TOKEN?: string;
HOSTED_SCAN_TOKEN?: string;
SESSION_SECRET?: string;
GITHUB_CLIENT_ID?: string;
GITHUB_CLIENT_SECRET?: string;
GITHUB_REDIRECT_URI?: string;
APP_BASE_URL?: string;
FIRST_PARTY_GITHUB_IDS?: string;
FIRST_PARTY_GITHUB_LOGINS?: string;
FIXTURE_GITHUB_IDS?: string;
FIXTURE_GITHUB_LOGINS?: string;
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
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;

class PayloadTooLargeError extends Error {}

async function readJsonWithLimit<T>(request: Request, maxBytes: number): Promise<T> {
  const declared = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadTooLargeError();
  if (!request.body) throw new SyntaxError("Missing request body");
  const reader = request.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function generateRunId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `run_${id}`;
}

function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    // Cloudflare injects its RUM beacon into every proxied HTML response. The
    // policy allowed scripts from this origin only, so the beacon was refused on
    // every page load: the browser logged a CSP violation and Lighthouse charged
    // the page two Best Practices audits for a script the origin never asked for.
    // Its script origin and its collector origin are named here instead.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  };
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-MCP-Observatory-Org, X-MCP-Observatory-CI",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...securityHeaders(),
      ...corsHeaders(),
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function productErrorResponse(
  code: "subscription_required" | "tenant_mismatch" | "quota_exceeded",
  message: string,
  status: 402 | 403 | 429,
  env: Env,
): Response {
  void env;
  return jsonResponse({
    error: code,
    code,
    message,
    }, status);
}

function accessErrorResponse(decision: AccessDecision, env: Env): Response {
  const code = decision.code ?? "subscription_required";
  return productErrorResponse(
    code,
    decision.message ?? "This action is not available for the current plan.",
    code === "quota_exceeded" ? 429 : 402,
    env,
  );
}

class ServiceUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("A required service dependency is unavailable.", { cause });
    this.name = "ServiceUnavailableError";
  }
}

function errorDetails(error: unknown): string {
  const details: string[] = [];
  let current: unknown = error;

  // Workerd and Wrangler can wrap a D1 error in one or more Error causes.
  // Inspect only for classification; these details must never be returned.
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof Error) {
      details.push(current.name, current.message);
      current = current.cause;
      continue;
    }
    if (typeof current === "object") {
      const record = current as Record<string, unknown>;
      if (typeof record["code"] === "string") details.push(record["code"]);
      if (typeof record["message"] === "string") details.push(record["message"]);
      current = record["cause"];
      continue;
    }
    details.push(textValue(current));
    break;
  }

  return details.join(" ");
}

function isD1QuotaOrLimitError(error: unknown): boolean {
  const details = errorDetails(error);
  const isD1 = /\bd1(?:_[a-z]+)?\b|cloudflare[^\n]{0,80}\bdatabase\b/i.test(details);
  const isCapacityFailure = /\b(?:quota|limit(?:ed)?|exceed(?:ed|s|ing)?|maximum|too many|capacity)\b/i.test(details);
  return isD1 && isCapacityFailure;
}

function internalErrorResponse(error: unknown): Response {
  if (error instanceof ServiceUnavailableError || isD1QuotaOrLimitError(error)) {
    return jsonResponse({
      error: "service_unavailable",
      code: "service_unavailable",
      message: "The hosted service is temporarily unavailable. Please try again later.",
    }, 503);
  }

  return jsonResponse({
    error: "internal_error",
    code: "internal_error",
    message: "An unexpected error occurred.",
  }, 500);
}

function isBlockedHostedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home") ||
    host.endsWith(".lan")
  ) {
    return true;
  }
  if (host.includes(":")) return !isPublicIpv6(host);
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !isPublicIpv4(host);
  return false;
}

function isPublicIpv4(address: string): boolean {
  const octets = address.split(".").map(value => Number(value));
  if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a, b, c] = octets as [number, number, number, number];
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (!/^[0-9a-f:]+$/.test(normalized) || !normalized.includes(":") || normalized.split("::").length > 2) return false;
  const halves = normalized.split("::");
  const groups = halves.flatMap(half => half ? half.split(":") : []);
  if (groups.some(group => group.length < 1 || group.length > 4) || (halves.length === 1 ? groups.length !== 8 : groups.length >= 8)) return false;
  const first = Number.parseInt(normalized.split(":", 1)[0] ?? "", 16);
  if (!Number.isFinite(first) || first < 0x2000 || first > 0x3fff) return false;
  const second = Number.parseInt(normalized.split(":")[1] || "0", 16);
  if (first === 0x2001 && (second <= 0x2f || second === 0xdb8)) return false;
  if (first === 0x2002 || first === 0x3fff) return false;
  return true;
}

interface DnsJsonResponse {
  Status?: number;
  Answer?: Array<{ type?: number; data?: string }>;
}

async function validateHostedDns(hostname: string): Promise<void> {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) return;
  const lookup = async (type: "A" | "AAAA"): Promise<DnsJsonResponse> => {
    const query = new URLSearchParams({ name: host, type });
    const response = await fetch(`https://cloudflare-dns.com/dns-query?${query.toString()}`, {
      headers: { Accept: "application/dns-json" },
      redirect: "manual",
    });
    if (!response.ok) throw new Error("Hosted target DNS could not be verified.");
    return response.json();
  };
  const responses = await Promise.all([lookup("A"), lookup("AAAA")]);
  const addresses = responses.flatMap(response => response.Answer ?? [])
    .filter(answer => answer.type === 1 || answer.type === 28)
    .map(answer => answer.data ?? "");
  if (addresses.length === 0) throw new Error("Hosted target did not resolve to a public address.");
  if (addresses.some(address => address.includes(":") ? !isPublicIpv6(address) : !isPublicIpv4(address))) {
    throw new Error("Hosted scans cannot target private, reserved, or local network addresses.");
  }
}

async function validateHostedTarget(url: URL): Promise<void> {
  if (url.username || url.password) throw new Error("Hosted target URLs cannot contain credentials.");
  if (isBlockedHostedHostname(url.hostname)) throw new Error("Hosted scans cannot target localhost or private network addresses.");
  await validateHostedDns(url.hostname);
}

function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

function cookieValue(request: Request, name: string): string | null {
  const cookies = request.headers.get("Cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.trim().split("=");
    if (key === name) return parts.join("=") || null;
  }
  return null;
}

function sessionClaims(request: Request, env: Env): Promise<AuthClaims | null> { return Promise.resolve().then(() => {
  const token = bearerToken(request) ?? cookieValue(request, "mcp_session");
  if (!token || !env.SESSION_SECRET) return null;
  return verifySessionToken(token, env.SESSION_SECRET);
}); }

async function requireUploadAuth(request: Request, env: Env): Promise<Response | null> {
  const token = bearerToken(request);
  if (!token) return errorResponse("Unauthorized", 401);

  // Legacy static token check
  if (env.CLOUD_UPLOAD_TOKEN && token === env.CLOUD_UPLOAD_TOKEN) return null;
  if (env.SESSION_SECRET && await verifySessionToken(token, env.SESSION_SECRET)) return null;
  return errorResponse("Unauthorized", 401);
}

async function requireHostedScanAuth(request: Request, env: Env): Promise<Response | null> {
  const auth = request.headers.get("Authorization") ?? "";
  if (env.HOSTED_SCAN_TOKEN && auth === `Bearer ${env.HOSTED_SCAN_TOKEN}`) return null;
  // Product access is checked from the server-side entitlement after session
  // authentication. Signed claims never decide the current paid plan.
  const token = bearerToken(request);
  if (token && env.SESSION_SECRET) {
    const user = await currentUserFromRequest(request, env);
    if (user) return null;
  }
  if (!env.HOSTED_SCAN_TOKEN && !env.SESSION_SECRET) {
    return errorResponse("Hosted scan is not configured.", 501);
  }
  return errorResponse("Unauthorized", 401);
}

function slugifyOrg(raw: string | null | undefined): string {
  const slug = (raw ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "unknown";
}

function accountSlug(userId: number): string {
  return `github-user-${userId}`;
}

async function recordUserProductEvent(env: Env, userId: number, eventName: string): Promise<void> {
  if (!env.DB) return;
  const firstParty = await isFirstPartyUser(env, userId);
  const fixture = await isFirstPartyUser({
    DB: env.DB,
    FIRST_PARTY_GITHUB_IDS: env.FIXTURE_GITHUB_IDS,
    FIRST_PARTY_GITHUB_LOGINS: env.FIXTURE_GITHUB_LOGINS,
  }, userId);
  if (eventName === "paid_usage") {
    const retained = await env.DB.prepare(`
      SELECT 1 AS found FROM product_events
      WHERE user_id = ? AND event_name = 'paid_usage'
        AND datetime(created_at) <= datetime('now', '-7 days')
      LIMIT 1
    `).bind(userId).first<{ found: number }>();
    if (retained) await recordProductEvent(env.DB, userId, "retained_paid_usage", { isFirstParty: firstParty, isFixture: fixture });
  }
  await recordProductEvent(env.DB, userId, eventName, { isFirstParty: firstParty, isFixture: fixture });
}

function appBaseUrl(env: Env): string {
  if (!env.APP_BASE_URL) throw new Error("Configure APP_BASE_URL for this deployment.");
  return env.APP_BASE_URL.replace(/\/$/, "");
}

function requestBaseUrl(request: Request, env: Env): string {
  const configured = env.APP_BASE_URL?.replace(/\/$/, "");
  return configured && configured !== "https://app.mcp-observatory.dev" ? configured : new URL(request.url).origin;
}

function htmlResponse(html: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...securityHeaders(), ...headers },
  });
}

function redirectResponse(location: string, headers: Record<string, string> = {}): Response {
  return new Response(null, { status: 302, headers: { Location: location, ...headers } });
}

function sessionCookie(token: string): string {
  return `mcp_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
}

interface GithubIdentity {
  id: number;
  login: string;
  email?: string;
  verifiedEmail?: string;
}

const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "mcp-observatory-cloud",
  "X-GitHub-Api-Version": "2022-11-28",
};

function githubHeaders(init?: RequestInit): Headers {
  const headers = new Headers(GITHUB_API_HEADERS);
  if (init?.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

async function githubJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: githubHeaders(init) });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}) for ${new URL(url).pathname}`);
  return response.json();
}

async function githubJsonOptional<T>(url: string, init: RequestInit, fallback: T): Promise<T> {
  try {
    return await githubJson<T>(url, init);
  } catch {
    return fallback;
  }
}

async function fetchGithubIdentity(code: string, env: Env): Promise<GithubIdentity> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) throw new Error("GitHub OAuth is not configured.");
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "mcp-observatory-cloud" },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_REDIRECT_URI ?? `${appBaseUrl(env)}/auth/callback`,
    }),
  });
  const tokenData = recordValue(await tokenResponse.json());
  if (!tokenResponse.ok || typeof tokenData.access_token !== "string" || !tokenData.access_token) throw new Error("GitHub OAuth exchange failed. Retry sign-in.");
  const authorization = { Authorization: `Bearer ${tokenData.access_token}` };
  const user = await githubJson<{ id: number; login: string; email?: string }>("https://api.github.com/user", { headers: authorization });
  const emails = await githubJsonOptional<Array<{ email: string; primary?: boolean; verified?: boolean }>>("https://api.github.com/user/emails", { headers: authorization }, []);
  const verifiedEmail = emails.find(email => email.primary && email.verified)?.email ?? emails.find(email => email.verified)?.email;
  return { id: user.id, login: user.login, email: verifiedEmail ?? user.email, verifiedEmail };
}

async function upsertGithubIdentity(identity: GithubIdentity, env: Env): Promise<AuthClaims> {
  if (!env.DB || !env.SESSION_SECRET) throw new Error("Cloud identity storage is not configured.");
  // Every GitHub identity owns one personal account. Email domains and GitHub
  // organization memberships are never used to infer shared tenancy.
  const domain = `github-user:${identity.id}`;
  await env.DB.prepare("INSERT INTO orgs (domain, github_org) VALUES (?, NULL) ON CONFLICT(domain) DO NOTHING").bind(domain).run();
  const org = await env.DB.prepare("SELECT id, domain, plan FROM orgs WHERE domain = ?").bind(domain).first<{ id: number; domain: string; plan: string }>();
  if (!org) throw new Error("Personal account could not be created.");
  await env.DB.prepare("INSERT INTO users (github_id, github_login, email, org_domains, org_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(github_id) DO UPDATE SET github_login = excluded.github_login, email = excluded.email, org_domains = excluded.org_domains, org_id = excluded.org_id").bind(String(identity.id), identity.login, identity.email ?? null, domain, org.id).run();
  const user = await env.DB.prepare("SELECT id FROM users WHERE github_id = ?").bind(String(identity.id)).first<{ id: number }>();
  if (!user) throw new Error("User could not be created.");
  await ensureEntitlement(env.DB, user.id);
  const entitlement = await getEntitlement(env.DB, user.id);
  const account = accountSlug(user.id);
  return { sub: `github:${identity.id}`, userId: user.id, email: identity.email, githubLogin: identity.login, org: account, orgId: org.id, orgDomain: account, plan: entitlement.plan };
}

async function handleGithubLogin(request: Request, env: Env, deviceCode?: string): Promise<Response> {
  if (!env.SESSION_SECRET || !env.GITHUB_CLIENT_ID) return errorResponse("GitHub authentication is not configured.", 501);
  const requestedReturnTo = new URL(request.url).searchParams.get("return_to") ?? "";
  const returnTo = !deviceCode && requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : undefined;
  const client = new URL(request.url).searchParams.get("client") === "clearframe" ? "clearframe" : undefined;
  const state = await signJson({ client, purpose: deviceCode ? "device_github" : "github_oauth", deviceCode, returnTo, exp: Math.floor(Date.now() / 1000) + 600 }, env.SESSION_SECRET);
  const redirectUri = env.GITHUB_REDIRECT_URI ?? `${requestBaseUrl(request, env)}/auth/callback`;
  const query = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: redirectUri, scope: "read:user user:email", state });
  return redirectResponse(`https://github.com/login/oauth/authorize?${query.toString()}`);
}

async function handleGithubCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!env.SESSION_SECRET) return errorResponse("Authentication is not configured.", 501);
  const state = await verifyJson<{ purpose?: string; deviceCode?: string; returnTo?: string; client?: string; exp?: number }>(url.searchParams.get("state") ?? "", env.SESSION_SECRET);
  if (!state || state.exp === undefined || state.exp < Math.floor(Date.now() / 1000)) return errorResponse("Invalid or expired authentication state.", 400);
  const identity = await fetchGithubIdentity(url.searchParams.get("code") ?? "", env);
  const claims = await upsertGithubIdentity(identity, env);
  if (env.DB && claims.userId) await recordUserProductEvent(env, claims.userId, "login");
  const token = await createSessionToken(claims, env.SESSION_SECRET);
  if (state.purpose === "device_github" && state.deviceCode && env.DB) {
    await env.DB.prepare("UPDATE device_codes SET user_id = ?, approved_at = datetime('now') WHERE device_code = ? AND expires_at > datetime('now')").bind(claims.userId, state.deviceCode).run();
    return htmlResponse(deviceAuthPage("connected"), 200, { "Set-Cookie": sessionCookie(token) });
  }
  const returnTo = state.returnTo?.startsWith("/") && !state.returnTo.startsWith("//") ? state.returnTo : "/dashboard";
  return redirectResponse(`${requestBaseUrl(request, env)}${returnTo}`, { "Set-Cookie": sessionCookie(token) });
}

async function handleDeviceStart(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return errorResponse("Device login storage is not configured.", 501);
  const deviceCode = randomToken(32);
  const userCode = randomToken(6).replace(/[^A-Z0-9]/gi, "A").toUpperCase().slice(0, 4) + "-" + randomToken(6).replace(/[^A-Z0-9]/gi, "B").toUpperCase().slice(0, 4);
  await env.DB.prepare("INSERT INTO device_codes (device_code, user_code, expires_at) VALUES (?, ?, datetime('now', '+15 minutes'))").bind(deviceCode, userCode).run();
  return jsonResponse({ device_code: deviceCode, user_code: userCode, verification_uri: `${requestBaseUrl(request, env)}/auth/device?user_code=${encodeURIComponent(userCode)}`, expires_in: 900, interval: 5 });
}

async function handleDevicePage(request: Request, env: Env): Promise<Response> {
  const page = deviceAuthPage;
  const code = new URL(request.url).searchParams.get("user_code") ?? "";
  if (!env.DB || !code) return htmlResponse(page("missing"));
  const device = await env.DB.prepare("SELECT user_id, approved_at, expires_at FROM device_codes WHERE user_code = ?").bind(code).first<{ user_id?: number; approved_at?: string; expires_at: string }>();
  if (!device) return htmlResponse(page("not-found"), 404);
  if (device.expires_at < new Date().toISOString().replace("T", " ").slice(0, 19)) return htmlResponse(page("expired"), 400);
  if (device.approved_at) return htmlResponse(page("approved"));
  return htmlResponse(page("ready", code));
}

async function handleDeviceToken(request: Request, env: Env): Promise<Response> {
  if (!env.DB || !env.SESSION_SECRET) return errorResponse("Device login is not configured.", 501);
  const body = await request.json().catch(() => ({})) as { device_code?: string };
  const device = await env.DB.prepare("SELECT device_code, user_id, expires_at FROM device_codes WHERE device_code = ?").bind(body.device_code ?? "").first<{ device_code: string; user_id?: number; expires_at: string }>();
  if (!device) return jsonResponse({ error: "invalid_device_code" }, 400);
  if (device.expires_at < new Date().toISOString().replace("T", " ").slice(0, 19)) return jsonResponse({ error: "expired_token" }, 400);
  if (!device.user_id) return jsonResponse({ error: "authorization_pending" }, 400);
  const row = await env.DB.prepare("SELECT u.id, u.github_id, u.email, u.github_login, o.id AS org_id FROM users u LEFT JOIN orgs o ON o.id = u.org_id WHERE u.id = ?").bind(device.user_id).first<{ id: number; github_id: string; email?: string; github_login?: string; org_id?: number }>();
  if (!row) return jsonResponse({ error: "invalid_grant" }, 400);
  await ensureEntitlement(env.DB, row.id);
  const entitlement = await getEntitlement(env.DB, row.id);
  const account = accountSlug(row.id);
  const claims: AuthClaims = { sub: `github:${row.github_id}`, userId: row.id, email: row.email, githubLogin: row.github_login, org: account, orgId: row.org_id, orgDomain: account, plan: entitlement.plan };
  const accessToken = await createSessionToken(claims, env.SESSION_SECRET);
  return jsonResponse({ access_token: accessToken, token_type: "Bearer", expires_in: 60 * 60 * 24 * 30, email: row.email, org: account });
}

interface CurrentUser {
  claims: AuthClaims;
  user: { id: number; githubLogin: string; stripeCustomerId?: string };
  org: { id: number; domain: string; plan: string } | null;
}

async function currentUserFromRequest(request: Request, env: Env): Promise<CurrentUser | null> {
  const claims = await sessionClaims(request, env);
  if (!claims || !env.DB || !claims.userId) return null;
  const row = await env.DB.prepare(`
    SELECT u.id, u.github_login, u.stripe_customer_id,
           o.id AS org_id, o.domain, o.plan
    FROM users u
    LEFT JOIN orgs o ON o.id = u.org_id
    WHERE u.id = ?
  `).bind(claims.userId).first<{
    id: number;
    github_login: string;
    stripe_customer_id?: string;
    org_id?: number;
    domain?: string;
    plan?: string;
  }>();
  if (!row) return null;
  let org: { id: number; domain: string; plan: string } | null = null;
  if (row.org_id && row.domain) org = { id: row.org_id, domain: row.domain, plan: row.plan ?? "free" };
  const account = accountSlug(row.id);
  return {
    claims: { ...claims, userId: row.id, githubLogin: row.github_login, org: account, orgDomain: account },
    user: { id: row.id, githubLogin: row.github_login, stripeCustomerId: row.stripe_customer_id },
    org,
  };
}

async function riskForUser(userId: number | undefined, env: Env): Promise<RiskSnapshot> {
  const empty: RiskSnapshot = { account: null, entitlement: null, fleetScore: 0, scannedServers: 0, passing: 0, failing: 0, scansThisWeek: 0, historyCount: 0, lockedHistoryCount: 0, servers: [], history: [] };
  if (!env.DB || !userId) return empty;
  const user = await env.DB.prepare("SELECT id, github_login, stripe_customer_id FROM users WHERE id = ?").bind(userId).first<{ id: number; github_login: string; stripe_customer_id?: string }>();
  if (!user) return empty;
  const entitlement = await getObservatoryEntitlement(env.DB, userId);
  const rows = await env.DB.prepare(`
    SELECT run_id, target_id, server_name, health_score, health_grade, gate,
           scanned_at, is_regression, source, is_ci
    FROM server_scans
    WHERE user_id = ? AND (retention_deadline IS NULL OR datetime(retention_deadline) > datetime('now'))
    ORDER BY scanned_at DESC, id DESC
  `).bind(userId).all<{ run_id: string; target_id: string; server_name?: string; health_score?: number; health_grade?: string; gate: string; scanned_at: string; is_regression?: number; source: string; is_ci?: number }>();
  const visibleRows = entitlement.plan === "free" && entitlement.freeTargetId
    ? (rows.results ?? []).filter(row => row.target_id === entitlement.freeTargetId)
    : rows.results ?? [];
  const latest = new Map<string, { targetId: string; name: string; score: number; grade: string; gate: string; scannedAt: string; regression: boolean; resultUrl: string }>();
  for (const row of visibleRows) if (!latest.has(row.target_id)) latest.set(row.target_id, { targetId: row.target_id, name: row.server_name ?? row.target_id, score: row.health_score ?? 0, grade: row.health_grade ?? "F", gate: row.gate, scannedAt: row.scanned_at, regression: row.is_regression === 1, resultUrl: `/results/${encodeURIComponent(row.run_id)}` });
  const servers = [...latest.values()];
  const fleetScore = servers.length ? Math.round(servers.reduce((sum, row) => sum + row.score, 0) / servers.length) : 0;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
  const weekly = await env.DB.prepare("SELECT COUNT(*) AS count FROM server_scans WHERE user_id = ? AND scanned_at >= ?").bind(userId, since).first<{ count: number }>();
  const history = entitlement.permissions.canViewHistory
    ? (rows.results ?? []).map(row => ({
      runId: row.run_id,
      targetId: row.target_id,
      score: row.health_score ?? 0,
      grade: row.health_grade ?? "F",
      gate: row.gate,
      scannedAt: row.scanned_at,
      source: row.source,
      isCi: row.is_ci === 1,
      regression: row.is_regression === 1,
      resultUrl: row.source === "hosted"
        ? `/api/v1/scan/${encodeURIComponent(row.run_id)}`
        : `/api/v1/artifacts/${encodeURIComponent(accountSlug(user.id))}/${encodeURIComponent(row.run_id)}`,
    }))
    : [];
  return {
    account: { id: user.id, label: user.github_login, plan: entitlement.plan, stripeCustomerId: user.stripe_customer_id },
    entitlement,
    billingStatus: entitlement.subscriptionStatus,
    fleetScore,
    scannedServers: servers.length,
    passing: servers.filter(row => row.gate === "pass").length,
    failing: servers.filter(row => row.gate !== "pass").length,
    scansThisWeek: weekly?.count ?? 0,
    historyCount: rows.results?.length ?? 0,
    lockedHistoryCount: entitlement.permissions.canViewHistory ? 0 : Math.max(0, (rows.results?.length ?? 0) - servers.length),
    servers,
    history,
  };
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
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      throw new Error("Hosted scans do not follow redirects; use the final public MCP endpoint URL.");
    }

    // Handle Streamable HTTP (JSON response)
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await res.json());
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

function isLegacyToken(request: Request, configured: string | undefined): boolean {
  const token = bearerToken(request);
  return Boolean(token && configured && token === configured);
}

async function targetState(
  db: D1Database,
  userId: number,
  targetId: string,
): Promise<{ count: number; exists: boolean }> {
  const row = await db.prepare(`
    SELECT COUNT(DISTINCT target_id) AS target_count,
           MAX(CASE WHEN target_id = ? THEN 1 ELSE 0 END) AS target_exists
    FROM server_scans
    WHERE user_id = ? AND (retention_deadline IS NULL OR datetime(retention_deadline) > datetime('now'))
  `).bind(targetId, userId).first<{ target_count?: number; target_exists?: number }>();
  return { count: Number(row?.target_count ?? 0), exists: Number(row?.target_exists ?? 0) === 1 };
}

function artifactIsCi(request: Request, artifact: RunArtifact): boolean {
  const metadata = artifact.target.metadata ?? {};
  return request.headers.get("X-MCP-Observatory-CI") === "true" ||
    metadata["ci"] === "true" ||
    Boolean(metadata["ciProvider"] || metadata["ci_provider"]);
}

async function persistUserScan(
  db: D1Database,
  options: {
    userId: number;
    orgId: number;
    artifact: RunArtifact;
    artifactKey: string;
    scannedAt: string;
    retentionDeadline: string;
    source: "upload" | "hosted";
    isCi: boolean;
  },
): Promise<void> {
  const previous = await db.prepare(`
    SELECT gate, health_score
    FROM server_scans
    WHERE user_id = ? AND target_id = ?
    ORDER BY scanned_at DESC
    LIMIT 1
  `).bind(options.userId, options.artifact.target.targetId).first<{ gate?: string; health_score?: number }>();
  const score = options.artifact.healthScore?.overall ?? 0;
  const regression = Boolean(previous && (
    (previous.gate === "pass" && options.artifact.gate === "fail") ||
    score < Number(previous.health_score ?? 0)
  ));

  const result = await db.prepare(`
    INSERT INTO server_scans (
      org_id, user_id, run_id, target_id, server_name, gate,
      health_score, health_grade, scanned_at, artifact_key,
      retention_deadline, source, is_ci, is_regression
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(run_id) DO UPDATE SET
      target_id = excluded.target_id,
      server_name = excluded.server_name,
      gate = excluded.gate,
      health_score = excluded.health_score,
      health_grade = excluded.health_grade,
      scanned_at = excluded.scanned_at,
      artifact_key = excluded.artifact_key,
      retention_deadline = excluded.retention_deadline,
      source = excluded.source,
      is_ci = excluded.is_ci,
      is_regression = excluded.is_regression
    WHERE server_scans.user_id = excluded.user_id
  `).bind(
    options.orgId,
    options.userId,
    options.artifact.runId,
    options.artifact.target.targetId,
    options.artifact.target.serverName ?? options.artifact.target.targetId,
    options.artifact.gate,
    score,
    options.artifact.healthScore?.grade ?? "F",
    options.scannedAt,
    options.artifactKey,
    options.retentionDeadline,
    options.source,
    options.isCi ? 1 : 0,
    regression ? 1 : 0,
  ).run();
  if (Number(result.meta.changes ?? 0) === 0) {
    throw new Error("A scan with that run ID belongs to another account.");
  }
}

async function handlePostScan(
  request: Request,
  env: Env,
): Promise<Response> {
  const authError = await requireHostedScanAuth(request, env);
  if (authError) return authError;

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const allowed = await checkRateLimit(ip, env.SCAN_CACHE);
  if (!allowed) {
    return errorResponse(
      "Rate limit exceeded. Maximum 10 requests per minute.",
      429,
    );
  }

  const legacy = isLegacyToken(request, env.HOSTED_SCAN_TOKEN);
  const user = legacy ? null : await currentUserFromRequest(request, env);
  let entitlement: EntitlementSnapshot | null = null;
  if (!legacy) {
    if (!user || !env.DB || !user.org) return errorResponse("Unauthorized", 401);
    entitlement = await getObservatoryEntitlement(env.DB, user.user.id);
    const decision = decideHostedScan(entitlement);
    if (!decision.allowed) return accessErrorResponse(decision, env);
  }

  let body: ScanRequestBody;
  try {
    body = (await request.json());
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
  parsedUrl.hash = "";
  try {
    await validateHostedTarget(parsedUrl);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Hosted target could not be verified.", 400);
  }
  const targetUrl = parsedUrl.toString();

  if (!legacy) {
    if (!user || !env.DB || !user.org || !entitlement) return errorResponse("Unauthorized", 401);
    const targets = await targetState(env.DB, user.user.id, targetUrl);
    if (!targets.exists && targets.count >= entitlement.limits.targets) {
      return productErrorResponse("quota_exceeded", `Hosted capacity supports ${entitlement.limits.targets} targets. Local scans remain unlimited.`, 429, env);
    }
    if (!(await reserveTarget(env.DB, user.user.id, targetUrl, entitlement.limits.targets, entitlement.freeTargetId))) {
      return productErrorResponse("quota_exceeded", `Hosted capacity supports ${entitlement.limits.targets} targets. Local scans remain unlimited.`, 429, env);
    }
    if (!(await reserveUsage(env.DB, user.user.id, "hosted_scans", entitlement.limits.hostedScansPerMonth))) {
      return productErrorResponse("quota_exceeded", "The monthly hosted-scan quota has been reached.", 429, env);
    }
  }

  const artifact = await scanHttpTarget(targetUrl);

  const retentionDays = entitlement?.limits.retentionDays ?? 1;
  await env.SCAN_CACHE.put(
    `scan:${artifact.runId}`,
    JSON.stringify(artifact),
    { expirationTtl: KV_TTL_SECONDS * retentionDays },
  );

  if (user && env.DB && user.org && entitlement) {
    const scannedAt = new Date().toISOString();
    await persistUserScan(env.DB, {
      userId: user.user.id,
      orgId: user.org.id,
      artifact,
      artifactKey: `scan:${artifact.runId}`,
      scannedAt,
      retentionDeadline: retentionDeadline(entitlement.limits.retentionDays, new Date(scannedAt)),
      source: "hosted",
      isCi: false,
    });
    await recordUserProductEvent(env, user.user.id, "paid_usage");
  }

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
  const authError = await requireUploadAuth(request, env);
  if (authError) return authError;
  const legacy = isLegacyToken(request, env.CLOUD_UPLOAD_TOKEN);
  const user = legacy ? null : await currentUserFromRequest(request, env);
  if (!legacy && !user) return errorResponse("Unauthorized", 401);

  let artifact: RunArtifact & { org?: string };
  try {
    artifact = await readJsonWithLimit<RunArtifact & { org?: string }>(request, MAX_ARTIFACT_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return errorResponse("Artifact payload exceeds the 2 MiB hosted limit.", 413);
    return errorResponse("Invalid JSON body", 400);
  }

  if (artifact.artifactType !== "run" || typeof artifact.runId !== "string" || !artifact.target) {
    return errorResponse("Expected a MCP Observatory run artifact.", 400);
  }
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(artifact.runId) || typeof artifact.target.targetId !== "string" || artifact.target.targetId.length === 0 || artifact.target.targetId.length > 2_048) {
    return errorResponse("Artifact run and target identifiers are invalid.", 400);
  }

  if (user && env.DB) {
    const existingRun = await env.DB.prepare("SELECT user_id FROM server_scans WHERE run_id = ?")
      .bind(artifact.runId)
      .first<{ user_id?: number }>();
    if (existingRun && existingRun.user_id !== user.user.id) {
      return productErrorResponse("tenant_mismatch", "That run identifier belongs to another account.", 403, env);
    }
  }

  const org = user
    ? accountSlug(user.user.id)
    : slugifyOrg(
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
  const storedArtifact = JSON.stringify({ ...record, artifact });
  if (new TextEncoder().encode(storedArtifact).byteLength > MAX_ARTIFACT_BYTES) {
    return errorResponse("Artifact payload exceeds the 2 MiB hosted limit.", 413);
  }

  let entitlement: EntitlementSnapshot | null = null;
  const isCi = artifactIsCi(request, artifact);
  if (user) {
    if (!env.DB || !user.org) return errorResponse("Cloud account storage is not configured.", 501);
    entitlement = await getObservatoryEntitlement(env.DB, user.user.id);
    const targets = await targetState(env.DB, user.user.id, artifact.target.targetId);
    const decision = decideUpload(entitlement, {
      isCi,
      targetAlreadyExists: targets.exists,
      targetCount: targets.count,
      isSelectedTarget: !entitlement.freeTargetId || entitlement.freeTargetId === artifact.target.targetId,
    });
    if (!decision.allowed) return accessErrorResponse(decision, env);
    if (!(await reserveTarget(env.DB, user.user.id, artifact.target.targetId, entitlement.limits.targets, entitlement.freeTargetId))) {
      return productErrorResponse(
        "quota_exceeded",
        `Hosted capacity is limited to ${entitlement.limits.targets} targets. Local scans remain unlimited.`,
        429,
        env,
      );
    }
    if (!(await reserveUsage(env.DB, user.user.id, "uploads", entitlement.limits.uploadsPerMonth))) {
      return productErrorResponse("quota_exceeded", "The monthly upload quota has been reached.", 429, env);
    }
  }

  const retentionDays = entitlement?.limits.retentionDays ?? 30;
  await env.SCAN_CACHE.put(
    key,
    storedArtifact,
    { expirationTtl: KV_TTL_SECONDS * retentionDays },
  );

  const indexKey = `artifact-index:${org}`;
  const existing = await env.SCAN_CACHE.get(indexKey);
  const index = existing ? JSON.parse(existing) as ArtifactUploadRecord[] : [];
  const nextIndex = [record, ...index.filter((entry) => entry.runId !== artifact.runId)]
    .slice(0, 200);
  await env.SCAN_CACHE.put(indexKey, JSON.stringify(nextIndex), { expirationTtl: KV_TTL_SECONDS * retentionDays });

  if (env.DB) {
    if (user && user.org && entitlement) {
      await persistUserScan(env.DB, {
        userId: user.user.id,
        orgId: user.org.id,
        artifact,
        artifactKey: key,
        scannedAt: uploadedAt,
        retentionDeadline: retentionDeadline(entitlement.limits.retentionDays, new Date(uploadedAt)),
        source: "upload",
        isCi,
      });
      await recordUserProductEvent(env, user.user.id, entitlement.plan === "free" ? "free_snapshot" : "paid_usage");
    } else {
      const orgRow = await env.DB.prepare("SELECT id FROM orgs WHERE domain = ?").bind(org).first<{ id: number }>();
      if (orgRow?.id) {
        await env.DB.prepare("INSERT INTO server_scans (org_id, run_id, target_id, server_name, gate, health_score, health_grade, scanned_at, artifact_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO UPDATE SET health_score = excluded.health_score, health_grade = excluded.health_grade, gate = excluded.gate, scanned_at = excluded.scanned_at, artifact_key = excluded.artifact_key")
          .bind(orgRow.id, artifact.runId, artifact.target.targetId, artifact.target.serverName ?? artifact.target.targetId, artifact.gate, artifact.healthScore?.overall ?? 0, artifact.healthScore?.grade ?? "F", uploadedAt, key)
          .run();
      }
    }
  }

  return jsonResponse({
    ok: true,
    org,
    runId: artifact.runId,
    key,
    uploadedAt,
    entitlement,
  });
}

async function handleGetArtifacts(
  request: Request,
  env: Env,
  orgParam: string,
): Promise<Response> {
  const authError = await requireUploadAuth(request, env);
  if (authError) return authError;
  const requestedOrg = slugifyOrg(orgParam);
  if (isLegacyToken(request, env.CLOUD_UPLOAD_TOKEN)) {
    const raw = await env.SCAN_CACHE.get(`artifact-index:${requestedOrg}`);
    return jsonResponse({ org: requestedOrg, artifacts: raw ? JSON.parse(raw) as unknown : [] });
  }

  const user = await currentUserFromRequest(request, env);
  if (!user || !env.DB) return errorResponse("Unauthorized", 401);
  const ownOrg = accountSlug(user.user.id);
  if (requestedOrg !== ownOrg) {
    return productErrorResponse("tenant_mismatch", "The requested artifact account does not belong to the authenticated user.", 403, env);
  }
  const entitlement = await getObservatoryEntitlement(env.DB, user.user.id);
  const total = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM server_scans
    WHERE user_id = ? AND source = 'upload'
      AND (retention_deadline IS NULL OR datetime(retention_deadline) > datetime('now'))
  `).bind(user.user.id).first<{ count?: number }>();
  const query = entitlement.permissions.canViewHistory
    ? `SELECT run_id, target_id, gate, health_score, scanned_at, artifact_key
       FROM server_scans
       WHERE user_id = ? AND source = 'upload'
         AND (retention_deadline IS NULL OR datetime(retention_deadline) > datetime('now'))
       ORDER BY scanned_at DESC`
    : `SELECT run_id, target_id, gate, health_score, scanned_at, artifact_key
       FROM (
         SELECT run_id, target_id, gate, health_score, scanned_at, artifact_key,
                ROW_NUMBER() OVER (PARTITION BY target_id ORDER BY scanned_at DESC, run_id DESC) AS rank
         FROM server_scans
         WHERE user_id = ? AND source = 'upload'
           AND target_id = ?
           AND (retention_deadline IS NULL OR datetime(retention_deadline) > datetime('now'))
       ) WHERE rank = 1 ORDER BY datetime(scanned_at) DESC`;
  const rows = await env.DB.prepare(query).bind(
    user.user.id,
    ...(entitlement.permissions.canViewHistory ? [] : [entitlement.freeTargetId ?? ""]),
  ).all<{
    run_id: string;
    target_id: string;
    gate: Gate;
    health_score?: number;
    scanned_at: string;
    artifact_key: string;
  }>();
  const artifacts = (rows.results ?? []).map(row => ({
    org: ownOrg,
    runId: row.run_id,
    targetId: row.target_id,
    gate: row.gate,
    healthScore: row.health_score,
    uploadedAt: row.scanned_at,
    ...(entitlement.permissions.canDownloadArtifacts
      ? { downloadUrl: `/api/v1/artifacts/${encodeURIComponent(ownOrg)}/${encodeURIComponent(row.run_id)}` }
      : {}),
  }));
  return jsonResponse({
    org: ownOrg,
    artifacts,
    lockedHistoryCount: entitlement.permissions.canViewHistory
      ? 0
      : Math.max(0, Number(total?.count ?? 0) - artifacts.length),
    entitlement,
  });
}

async function handleResultPage(request: Request, env: Env, runId: string): Promise<Response> {
  const user = await currentUserFromRequest(request, env);
  if (!user || !env.DB) return redirectResponse(`${appBaseUrl(env)}/auth/login?return_to=${encodeURIComponent(`/results/${runId}`)}`);
  const row = await env.DB.prepare(`
    SELECT artifact_key, source, target_id, gate, health_score, health_grade, scanned_at FROM server_scans
    WHERE user_id = ? AND run_id = ? AND (retention_deadline IS NULL OR datetime(retention_deadline) > datetime('now'))
  `).bind(user.user.id, runId).first<{ artifact_key: string; source: string; target_id: string; gate: string; health_score: number; health_grade: string; scanned_at: string }>();
  if (!row) return errorResponse("Result not found or expired. Open your dashboard for current results.", 404);
  const risk = await riskForUser(user.user.id, env);
  const resultUrl = `/results/${encodeURIComponent(runId)}`;
  if (!risk.servers.some(server => server.resultUrl === resultUrl) && !risk.history.some(entry => entry.runId === runId)) {
    return productErrorResponse("subscription_required", "Free includes your latest snapshot. Open your dashboard for the current result, or choose Pro for retained history.", 402, env);
  }
  const raw = await env.SCAN_CACHE.get(row.artifact_key);
  if (!raw) return errorResponse("Result expired. Run a new scan and upload it from your project folder.", 404);
  const stored = JSON.parse(raw) as Record<string, unknown>;
  const artifact = (stored["artifact"] ?? stored) as { checks?: Array<{ id?: unknown; status?: unknown; message?: unknown }> };
  const checks = Array.isArray(artifact.checks) ? artifact.checks.slice(0, 200).map(check => ({
    id: textValue(check?.id, "Check"), status: textValue(check?.status, "unknown"), message: textValue(check?.message, "No detail recorded."),
  })) : [];
  await recordUserProductEvent(env, user.user.id, "report_view");
  return htmlResponse(reportPage({ runId, targetId: row.target_id, gate: row.gate, score: row.health_score, grade: row.health_grade, scannedAt: row.scanned_at, checks,
    downloadUrl: risk.entitlement?.permissions.canDownloadArtifacts
      ? row.source === "hosted" ? `/api/v1/scan/${encodeURIComponent(runId)}` : `/api/v1/artifacts/${accountSlug(user.user.id)}/${encodeURIComponent(runId)}`
      : undefined,
  }));
}

async function handleGetArtifact(
  request: Request,
  env: Env,
  orgParam: string,
  runId: string,
): Promise<Response> {
  const authError = await requireUploadAuth(request, env);
  if (authError) return authError;
  const requestedOrg = slugifyOrg(orgParam);
  if (isLegacyToken(request, env.CLOUD_UPLOAD_TOKEN)) {
    const raw = await env.SCAN_CACHE.get(`artifact:${requestedOrg}:${runId}`);
    return raw ? jsonResponse(JSON.parse(raw)) : errorResponse("Artifact not found or expired", 404);
  }
  const user = await currentUserFromRequest(request, env);
  if (!user || !env.DB) return errorResponse("Unauthorized", 401);
  const ownOrg = accountSlug(user.user.id);
  if (requestedOrg !== ownOrg) {
    return productErrorResponse("tenant_mismatch", "The requested artifact account does not belong to the authenticated user.", 403, env);
  }
  const entitlement = await getObservatoryEntitlement(env.DB, user.user.id);
  if (!entitlement.permissions.canDownloadArtifacts) {
    return productErrorResponse("subscription_required", "Artifact downloads require Individual Pro.", 402, env);
  }
  const row = await env.DB.prepare(`
    SELECT artifact_key FROM server_scans
    WHERE user_id = ? AND run_id = ? AND source = 'upload'
      AND (retention_deadline IS NULL OR datetime(retention_deadline) > datetime('now'))
  `).bind(user.user.id, runId).first<{ artifact_key?: string }>();
  if (!row?.artifact_key) return errorResponse("Artifact not found or expired", 404);
  const raw = await env.SCAN_CACHE.get(row.artifact_key);
  return raw ? jsonResponse(JSON.parse(raw)) : errorResponse("Artifact not found or expired", 404);
}

async function handleGetScan(
  request: Request,
  runId: string,
  env: Env,
): Promise<Response> {
  if (env.DB) {
    const row = await env.DB.prepare(`
      SELECT user_id, target_id FROM server_scans
      WHERE run_id = ? AND (retention_deadline IS NULL OR datetime(retention_deadline) > datetime('now'))
    `).bind(runId).first<{ user_id?: number; target_id?: string }>();
    if (row?.user_id) {
      const legacy = isLegacyToken(request, env.HOSTED_SCAN_TOKEN) || isLegacyToken(request, env.CLOUD_UPLOAD_TOKEN);
      if (!legacy) {
        const user = await currentUserFromRequest(request, env);
        if (!user) return errorResponse("Unauthorized", 401);
        if (user.user.id !== row.user_id) {
          return productErrorResponse("tenant_mismatch", "The requested scan belongs to another account.", 403, env);
        }
        const entitlement = await getObservatoryEntitlement(env.DB, user.user.id);
        if (!entitlement.permissions.canViewHistory && entitlement.freeTargetId && row.target_id !== entitlement.freeTargetId) {
          return productErrorResponse("subscription_required", "That target is locked on the Free plan.", 402, env);
        }
        if (!entitlement.permissions.canViewHistory && row.target_id) {
          const latest = await env.DB.prepare(`
            SELECT run_id FROM server_scans
            WHERE user_id = ? AND target_id = ? AND source = 'hosted'
              AND (retention_deadline IS NULL OR datetime(retention_deadline) > datetime('now'))
            ORDER BY datetime(scanned_at) DESC LIMIT 1
          `).bind(user.user.id, row.target_id).first<{ run_id?: string }>();
          if (latest?.run_id !== runId) {
            return productErrorResponse("subscription_required", "Historical hosted scan retrieval requires Individual Pro.", 402, env);
          }
        }
      }
    }
  }
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
        ...securityHeaders(),
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
      ...securityHeaders(),
      ...corsHeaders(),
    },
  });
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function handleHealth(): Response {
  return jsonResponse({
    status: "ok",
    version: TOOL_VERSION,
    timestamp: new Date().toISOString(),
  });
}

async function handleReadiness(env: Env): Promise<Response> {
  if (!env.DB) throw new ServiceUnavailableError();

  let probe: { name: string } | null;
  try {
    probe = await env.DB.prepare("SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1").first<{ name: string }>();
  } catch (error) {
    throw new ServiceUnavailableError(error);
  }
  if (typeof probe?.name !== "string" || probe.name.trim().length === 0) {
    throw new ServiceUnavailableError();
  }

  return jsonResponse({
    status: "ready",
    version: TOOL_VERSION,
    dependencies: { d1: "ready" },
    timestamp: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Safety Index API handlers
// ---------------------------------------------------------------------------

function intQueryParam(url: URL, name: string, fallback: number): number {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function safetyBadgeSvg(score: number, grade: HealthGrade, serverName: string): string {
  const label = "MCP Safety";
  const value = `${score}/100`;
  const color = GRADE_COLORS[grade];
  const labelWidth = label.length * 7 + 10;
  const valueWidth = value.length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${serverName}: ${label} ${value}</title>
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

// Safety Index data shape (cached in memory, fetched from Pages)
interface SafetyIndexEntry {
  id: string;
  name: string;
  packageName: string;
  category: string;
  riskClass: string;
  failureClass: string;
  healthScore?: number;
  grade?: string;
  gate?: string;
  toolCount: number;
  promptCount: number;
  resourceCount: number;
  lastScanned?: string;
  repo?: string;
  fatalError?: string;
}

interface SafetyIndexServer extends SafetyIndexEntry {
  whyItMatters: string;
  reproductionNotes: string;
  healthScoreDetail?: {
    overall: number;
    grade: string;
    dimensions: Array<{ name: string; weight: number; score: number }>;
  };
  checks: Array<{ id: string; status: string; message: string }>;
  summary: { total: number; pass: number; fail: number; partial: number; unsupported: number; skipped: number };
  findings?: Array<{ severity: string; rule?: string; message: string; cwe?: string }>;
  performanceMetrics?: { connectMs?: number };
}

interface SafetyIndexData {
  generatedAt: string;
  totalServers: number;
  categories: Array<{ name: string; count: number }>;
  servers: SafetyIndexEntry[];
  details: Record<string, SafetyIndexServer>;
  riskGraph?: {
    nodes: Array<{ id: string; name: string; source: string; capabilityBoundary: string; receiptState: string; recommendedAction: string; riskLevel: string }>;
    edges: Array<{ from: string; to: string; type: string; reason: string }>;
    summary: Record<string, unknown>;
  };
}

let _safetyIndexCache: SafetyIndexData | null = null;
let _safetyIndexFetchTs = 0;
const SAFETY_INDEX_TTL = 3600_000;

async function loadSafetyIndex(): Promise<SafetyIndexData | null> {
  if (_safetyIndexCache && Date.now() - _safetyIndexFetchTs < SAFETY_INDEX_TTL) {
    return _safetyIndexCache;
  }
  try {
    const res = await fetch("https://mcp-observatory.com/safety-index/api-data.json");
    if (!res.ok) return null;
    _safetyIndexCache = (await res.json());
    _safetyIndexFetchTs = Date.now();
    return _safetyIndexCache;
  } catch {
    return null;
  }
}

async function handleSafetyServers(request: Request, _env: Env): Promise<Response> {
    void _env;
  const data = await loadSafetyIndex();
  if (!data) return errorResponse("Safety index not available", 503);
  const url = new URL(request.url);

  const all = data.servers;
  let filtered = all;

  const category = url.searchParams.get("category");
  if (category) {
    filtered = filtered.filter((s) => s.category === category);
  }

  const search = url.searchParams.get("search");
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((s) =>
      s.name.toLowerCase().includes(q) || s.packageName.toLowerCase().includes(q),
    );
  }

  const page = intQueryParam(url, "page", 1);
  const perPage = Math.min(intQueryParam(url, "perPage", 20), 100);
  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const paged = filtered.slice(start, start + perPage);

  return jsonResponse({
    servers: paged,
    pagination: { page, perPage, total, totalPages },
  });
}

async function handleSafetyServerDetail(id: string, _env: Env): Promise<Response> {
    void _env;
  const data = await loadSafetyIndex();
  if (!data) return errorResponse("Safety index not available", 503);
  const server = data.details[id];
  if (!server) return errorResponse("Server not found", 404);
  return jsonResponse(server);
}

async function handleSafetySearch(request: Request, _env: Env): Promise<Response> {
    void _env;
  const data = await loadSafetyIndex();
  if (!data) return errorResponse("Safety index not available", 503);
  const url = new URL(request.url);

  let results = data.servers;

  const q = url.searchParams.get("q");
  if (q) {
    const lower = q.toLowerCase();
    results = results.filter((s) =>
      s.name.toLowerCase().includes(lower) || s.packageName.toLowerCase().includes(lower),
    );
  }

  const category = url.searchParams.get("category");
  if (category) {
    results = results.filter((s) => s.category === category);
  }

  const grade = url.searchParams.get("grade");
  if (grade) {
    results = results.filter((s) => s.grade === grade);
  }

  const riskClass = url.searchParams.get("riskClass");
  if (riskClass) {
    results = results.filter((s) => s.riskClass === riskClass);
  }

  return jsonResponse({ results, total: results.length });
}

async function handleSafetyRiskGraph(_env: Env): Promise<Response> {
    void _env;
  const data = await loadSafetyIndex();
  if (!data) return errorResponse("Safety index not available", 503);
  if (!data.riskGraph) return errorResponse("Risk graph not found", 404);
  return jsonResponse(data.riskGraph);
}

async function handleSafetyCategories(_env: Env): Promise<Response> {
    void _env;
  const data = await loadSafetyIndex();
  if (!data) return errorResponse("Safety index not available", 503);
  return jsonResponse(data.categories);
}

async function handleSafetyServerTools(id: string, _env: Env): Promise<Response> {
    void _env;
  const data = await loadSafetyIndex();
  if (!data) return errorResponse("Safety index not available", 503);
  const server = data.details[id];
  if (!server) return errorResponse("Server not found", 404);
  const toolsCheck = server.checks?.find((c) => c.id === "tools") as
    | { evidence?: Array<{ identifiers?: string[]; diagnostics?: string[] }> }
    | undefined;
  const tools = toolsCheck?.evidence?.flatMap((e) =>
    (e.identifiers ?? []).map((name) => ({
      name,
      description: e.diagnostics?.[0] ?? "",
      inputSchema: {},
    })),
  ) ?? [];
  return jsonResponse(tools);
}

async function handleSafetyServerSecurity(id: string, _env: Env): Promise<Response> {
    void _env;
  const data = await loadSafetyIndex();
  if (!data) return errorResponse("Safety index not available", 503);
  const server = data.details[id];
  if (!server) return errorResponse("Server not found", 404);
  const findings = server.findings ?? [];
  const result = findings.map((f) => ({
    severity: f.severity ?? "unknown",
    rule: f.rule ?? "",
    message: f.message ?? "",
    cwe: f.cwe ?? null,
  }));
  return jsonResponse(result);
}

async function handleSafetyServerBadge(id: string, _env: Env): Promise<Response> {
    void _env;
  const data = await loadSafetyIndex();
  const server = data?.details[id];
  if (!server) {
    const svg = safetyBadgeSvg(0, "F", id);
    return new Response(svg, {
      status: 404,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
        ...securityHeaders(),
        ...corsHeaders(),
      },
    });
  }
  const score = server.healthScoreDetail?.overall ?? server.healthScore ?? 0;
  const grade = (server.healthScoreDetail?.grade ?? server.grade ?? "F") as HealthGrade;
  const svg = safetyBadgeSvg(score, GRADE_COLORS[grade] ? grade : "F", server.name ?? id);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
      ...securityHeaders(),
      ...corsHeaders(),
    },
  });
}

const PUBLIC_FUNNEL_ORIGIN = "https://mcp-observatory.com";
const PUBLIC_FUNNEL_EVENTS = new Set(["profile_view", "scan_cta"]);
const PUBLIC_TARGET_ID = /^[a-z0-9][a-z0-9-]{0,127}$/;
const PUBLIC_EVENT_ID = /^[a-z0-9-]{16,128}$/i;

function publicFunnelHeaders(): Record<string, string> {
  return {
    ...securityHeaders(),
    "Access-Control-Allow-Origin": PUBLIC_FUNNEL_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function handlePublicFunnelEvent(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return errorResponse("Conversion measurement is not configured.", 503);
  if (request.headers.get("Origin") !== PUBLIC_FUNNEL_ORIGIN) return errorResponse("Invalid origin", 403);

  let payload: { eventId?: unknown; event?: unknown; targetId?: unknown };
  try {
    payload = await readJsonWithLimit<{ eventId?: unknown; event?: unknown; targetId?: unknown }>(request, 1_024);
  } catch (error) {
    return error instanceof PayloadTooLargeError
      ? errorResponse("Event payload exceeds 1 KiB.", 413)
      : errorResponse("Invalid event payload.", 400);
  }

  const eventId = typeof payload.eventId === "string" ? payload.eventId : "";
  const event = typeof payload.event === "string" ? payload.event : "";
  const targetId = typeof payload.targetId === "string" ? payload.targetId : "";
  if (!PUBLIC_EVENT_ID.test(eventId) || !PUBLIC_FUNNEL_EVENTS.has(event) || !PUBLIC_TARGET_ID.test(targetId)) {
    return errorResponse("Invalid conversion event.", 400);
  }

  await recordProductEvent(env.DB, null, event, {
    eventId,
    targetId,
    source: "public_site",
  });
  return new Response(null, { status: 204, headers: publicFunnelHeaders() });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function matchRoute(
  method: string,
  pathname: string,
): { handler: string; params: Record<string, string> } | null {
  if (method === "GET" && pathname === "/") return { handler: "home", params: {} };
  if (method === "GET" && pathname === "/pricing") return { handler: "pricing", params: {} };
  if (method === "GET" && pathname === "/terms") return { handler: "terms", params: {} };
  if (method === "GET" && pathname === "/privacy") return { handler: "privacy", params: {} };
  if (method === "GET" && pathname === "/dashboard") return { handler: "dashboard", params: {} };
  const resultMatch = pathname.match(/^\/results\/([a-zA-Z0-9_-]{1,128})$/);
  if (method === "GET" && resultMatch?.[1]) return { handler: "resultPage", params: { runId: resultMatch[1] } };
  if (method === "GET" && pathname === "/auth/login") return { handler: "authLogin", params: {} };
  if (method === "GET" && pathname === "/auth/callback") return { handler: "authCallback", params: {} };
  if (method === "GET" && pathname === "/auth/logout") return { handler: "authLogout", params: {} };
  if (method === "GET" && pathname === "/auth/device") return { handler: "devicePage", params: {} };
  if (method === "GET" && pathname === "/auth/device/login") return { handler: "deviceLogin", params: {} };
  if (method === "POST" && pathname === "/auth/device") return { handler: "deviceStart", params: {} };
  if (method === "POST" && pathname === "/auth/device/token") return { handler: "deviceToken", params: {} };
  if (method === "GET" && pathname === "/api/me") return { handler: "me", params: {} };
  if (method === "GET" && pathname === "/api/entitlements") return { handler: "entitlements", params: {} };
  if (method === "GET" && pathname === "/api/org/risk") return { handler: "orgRisk", params: {} };
  if (method === "POST" && pathname === "/api/v1/funnel") return { handler: "publicFunnel", params: {} };
  if (method === "GET" && pathname === "/api/v1/health") {
    return { handler: "health", params: {} };
  }
  if (method === "GET" && pathname === "/api/v1/readiness") {
    return { handler: "readiness", params: {} };
  }
  if (method === "POST" && pathname === "/api/v1/scan") {
    return { handler: "postScan", params: {} };
  }
  if (method === "POST" && pathname === "/api/v1/artifacts") {
    return { handler: "postArtifact", params: {} };
  }

  // GET /api/v1/artifacts/:account/:runId
  const artifactDownloadMatch = pathname.match(/^\/api\/v1\/artifacts\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9_-]+)$/);
  if (method === "GET" && artifactDownloadMatch?.[1] && artifactDownloadMatch[2]) {
    return { handler: "getArtifact", params: { org: artifactDownloadMatch[1], runId: artifactDownloadMatch[2] } };
  }

  // GET /api/v1/artifacts/:org
  const artifactMatch = pathname.match(/^\/api\/v1\/artifacts\/([a-zA-Z0-9._-]+)$/);
  if (method === "GET" && artifactMatch?.[1]) {
    return { handler: "getArtifacts", params: { org: artifactMatch[1] } };
  }

  // GET /api/v1/scan/:runId
  const scanMatch = pathname.match(/^\/api\/v1\/scan\/([a-zA-Z0-9_-]+)$/);
  if (method === "GET" && scanMatch?.[1]) {
    return { handler: "getScan", params: { runId: scanMatch[1] } };
  }

  // GET /api/v1/badge/:runId
  const badgeMatch = pathname.match(/^\/api\/v1\/badge\/([a-zA-Z0-9_-]+)$/);
  if (method === "GET" && badgeMatch?.[1]) {
    return { handler: "getBadge", params: { runId: badgeMatch[1] } };
  }

  // GET /api/v1/safety-index/servers
  if (method === "GET" && pathname === "/api/v1/safety-index/servers") {
    return { handler: "safetyServers", params: {} };
  }

  // GET /api/v1/safety-index/servers/:id/tools
  const serverToolsMatch = pathname.match(/^\/api\/v1\/safety-index\/servers\/([a-zA-Z0-9._-]+)\/tools$/);
  if (method === "GET" && serverToolsMatch?.[1]) {
    return { handler: "safetyServerTools", params: { id: serverToolsMatch[1] } };
  }

  // GET /api/v1/safety-index/servers/:id/security
  const serverSecurityMatch = pathname.match(/^\/api\/v1\/safety-index\/servers\/([a-zA-Z0-9._-]+)\/security$/);
  if (method === "GET" && serverSecurityMatch?.[1]) {
    return { handler: "safetyServerSecurity", params: { id: serverSecurityMatch[1] } };
  }

  // GET /api/v1/safety-index/servers/:id/badge
  const serverBadgeMatch = pathname.match(/^\/api\/v1\/safety-index\/servers\/([a-zA-Z0-9._-]+)\/badge$/);
  if (method === "GET" && serverBadgeMatch?.[1]) {
    return { handler: "safetyServerBadge", params: { id: serverBadgeMatch[1] } };
  }

  // GET /api/v1/safety-index/servers/:id
  const serverDetailMatch = pathname.match(/^\/api\/v1\/safety-index\/servers\/([a-zA-Z0-9._-]+)$/);
  if (method === "GET" && serverDetailMatch?.[1]) {
    return { handler: "safetyServerDetail", params: { id: serverDetailMatch[1] } };
  }

  // GET /api/v1/safety-index/search
  if (method === "GET" && pathname === "/api/v1/safety-index/search") {
    return { handler: "safetySearch", params: {} };
  }

  // GET /api/v1/safety-index/risk-graph
  if (method === "GET" && pathname === "/api/v1/safety-index/risk-graph") {
    return { handler: "safetyRiskGraph", params: {} };
  }

  // GET /api/v1/safety-index/categories
  if (method === "GET" && pathname === "/api/v1/safety-index/categories") {
    return { handler: "safetyCategories", params: {} };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export async function cleanupExpiredScans(
  env: Env,
  now = new Date(),
): Promise<{ scansDeleted: number; entitlementsExpired: number }> {
  if (!env.DB) return { scansDeleted: 0, entitlementsExpired: 0 };
  const cutoff = now.toISOString();
  let scansDeleted = 0;
  // Bound both D1 statements and KV concurrency. Any backlog continues on the
  // next nightly run, while KV TTL remains a second expiration boundary.
  for (let batch = 0; batch < 20; batch++) {
    const expired = await env.DB.prepare(`
      SELECT id, artifact_key FROM server_scans
      WHERE retention_deadline IS NOT NULL
        AND datetime(retention_deadline) <= datetime(?)
      ORDER BY id LIMIT 75
    `).bind(cutoff).all<{ id: number; artifact_key?: string }>();
    const rows = expired.results ?? [];
    if (rows.length === 0) break;
    const keys = [...new Set(rows.map(row => row.artifact_key).filter((key): key is string => Boolean(key)))];
    for (let offset = 0; offset < keys.length; offset += 25) {
      await Promise.allSettled(keys.slice(offset, offset + 25).map(key => env.SCAN_CACHE.delete(key)));
    }
    const ids = rows.map(row => row.id);
    const deleted = await env.DB.prepare(`DELETE FROM server_scans WHERE id IN (${ids.map(() => "?").join(",")})`)
      .bind(...ids)
      .run();
    scansDeleted += Number(deleted.meta.changes ?? 0);
    if (rows.length < 75) break;
  }
  await env.DB.prepare(`
    DELETE FROM account_targets
    WHERE NOT EXISTS (
      SELECT 1 FROM server_scans
      WHERE server_scans.user_id = account_targets.user_id
        AND server_scans.target_id = account_targets.target_id
        AND (server_scans.retention_deadline IS NULL OR datetime(server_scans.retention_deadline) > datetime(?))
    )
  `).bind(cutoff).run();
  return { scansDeleted, entitlementsExpired: 0 };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      if (url.pathname === "/api/v1/funnel") {
        return request.headers.get("Origin") === PUBLIC_FUNNEL_ORIGIN
          ? new Response(null, { status: 204, headers: publicFunnelHeaders() })
          : errorResponse("Invalid origin", 403);
      }
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const route = matchRoute(request.method, url.pathname);

    if (!route) {
      return errorResponse("Not found", 404);
    }

    try {
      switch (route.handler) {
        case "home": {
          const user = await currentUserFromRequest(request, env);
          return user ? redirectResponse(`${requestBaseUrl(request, env)}/dashboard`) : htmlResponse(loginPage(requestBaseUrl(request, env)));
        }
        case "pricing":
          return redirectResponse("https://clearframecode.com/observatory/#setup");
        case "terms":
          return htmlResponse(termsPage());
        case "privacy":
          return htmlResponse(privacyPage());
        case "authLogin":
          return await handleGithubLogin(request, env);
        case "authCallback":
          return await handleGithubCallback(request, env);
        case "authLogout":
          return redirectResponse(`${appBaseUrl(env)}/`, { "Set-Cookie": "mcp_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" });
        case "devicePage":
          return await handleDevicePage(request, env);
        case "deviceLogin": {
          const code = new URL(request.url).searchParams.get("user_code") ?? "";
          const device = env.DB ? await env.DB.prepare("SELECT device_code FROM device_codes WHERE user_code = ? AND expires_at > datetime('now')").bind(code).first<{ device_code: string }>() : null;
          return device ? await handleGithubLogin(request, env, device.device_code) : errorResponse("Invalid or expired device code.", 400);
        }
        case "deviceStart":
          return await handleDeviceStart(request, env);
        case "deviceToken":
          return await handleDeviceToken(request, env);
        case "me": {
          const user = await currentUserFromRequest(request, env);
          return user && env.DB
            ? jsonResponse({ user: user.claims, account: accountSlug(user.user.id), entitlement: await getObservatoryEntitlement(env.DB, user.user.id) })
            : errorResponse("Unauthorized", 401);
        }
        case "entitlements": {
          const user = await currentUserFromRequest(request, env);
          return user && env.DB
            ? jsonResponse({ account: accountSlug(user.user.id), ...(await getObservatoryEntitlement(env.DB, user.user.id)) })
            : errorResponse("Unauthorized", 401);
        }
        case "orgRisk": {
          const user = await currentUserFromRequest(request, env);
          return user ? jsonResponse(await riskForUser(user.user.id, env)) : errorResponse("Unauthorized", 401);
        }
        case "resultPage":
          return handleResultPage(request, env, route.params["runId"]!);
        case "dashboard": {
          const user = await currentUserFromRequest(request, env);

          if (!user) return redirectResponse(`${appBaseUrl(env)}/`);
          const risk = await riskForUser(user.user.id, env);
          await recordUserProductEvent(env, user.user.id, risk.scannedServers === 0 ? "onboarding_view" : "first_result_view");
          return htmlResponse(dashboardPage(user.claims, risk, url.searchParams.get("checkout") ?? undefined));
        }
        case "publicFunnel":
          return await handlePublicFunnelEvent(request, env);
        case "health":
          return handleHealth();
        case "readiness":
          return await handleReadiness(env);
        case "postScan":
          return await handlePostScan(request, env);
        case "postArtifact":
          return await handlePostArtifact(request, env);
        case "getArtifacts":
          return await handleGetArtifacts(request, env, route.params.org!);
        case "getArtifact":
          return await handleGetArtifact(request, env, route.params.org!, route.params.runId!);
        case "getScan":
          return await handleGetScan(request, route.params.runId!, env);
        case "getBadge":
          return await handleGetBadge(route.params.runId!, env);
        case "safetyServers":
          return await handleSafetyServers(request, env);
        case "safetyServerDetail":
          return await handleSafetyServerDetail(route.params.id!, env);
        case "safetySearch":
          return await handleSafetySearch(request, env);
        case "safetyRiskGraph":
          return await handleSafetyRiskGraph(env);
        case "safetyCategories":
          return await handleSafetyCategories(env);
        case "safetyServerTools":
          return await handleSafetyServerTools(route.params.id!, env);
        case "safetyServerSecurity":
          return await handleSafetyServerSecurity(route.params.id!, env);
        case "safetyServerBadge":
          return await handleSafetyServerBadge(route.params.id!, env);
        default:
          return errorResponse("Not found", 404);
      }
    } catch (err) {
      return internalErrorResponse(err);
    }
  },
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> { return Promise.resolve().then(() => {
      ctx.waitUntil(cleanupExpiredScans(env).then(result => {
        console.log("Nightly retention cleanup completed", result);
      }));
  }); },
} satisfies ExportedHandler<Env>;
