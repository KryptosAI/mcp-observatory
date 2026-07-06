/**
 * Smithery Registry Integration
 *
 * Generates health-score submissions for the Smithery MCP server registry
 * and resolves Smithery server listings into Observatory target configs.
 */

import { generateBadgeSvg } from "../badge.js";
import { computeHealthScore } from "../score.js";
import type { HealthScore, RunArtifact, TargetConfig } from "../types.js";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SmitherySubmission {
  /** The server's qualified name on Smithery (e.g., "@anthropic/mcp-server-fetch") */
  qualifiedName: string;
  /** Observatory run artifact */
  artifact: RunArtifact;
  /** Health score */
  score: HealthScore;
  /** Badge SVG */
  badgeSvg: string;
  /** Timestamp */
  submittedAt: string;
}

export interface SmitheryConfig {
  /** Smithery API key (for future authenticated submissions) */
  apiKey?: string;
  /** Base URL override */
  baseUrl?: string;
}

/** Shape of a server entry returned by the Smithery registry API. */
export interface SmitheryServerEntry {
  qualifiedName: string;
  displayName?: string;
  description?: string;
  connections?: SmitheryConnection[];
  /** Any extra fields the API may return. */
  [key: string]: unknown;
}

export interface SmitheryConnection {
  type: string;
  url?: string;
  configSchema?: Record<string, unknown>;
  exampleConfig?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Paginated response from the Smithery servers list API. */
export interface SmitheryServerListResponse {
  servers: SmitheryServerEntry[];
  pageSize?: number;
  page?: number;
  [key: string]: unknown;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://registry.smithery.ai";
const REQUEST_TIMEOUT_MS = 15_000;
const RATE_LIMIT_DELAY_MS = 1_500;

// ── Helpers ─────────────────────────────────────────────────────────────────

function baseUrl(config?: SmitheryConfig): string {
  let value = config?.baseUrl ?? DEFAULT_BASE_URL;
  while (value.endsWith("/")) {
    value = value.slice(0, -1);
  }
  return value;
}

function buildHeaders(config?: SmitheryConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "mcp-observatory/smithery-integration",
  };
  if (config?.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }
  return headers;
}

async function fetchJson<T>(url: string, config?: SmitheryConfig): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: buildHeaders(config),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new SmitheryRateLimitError(
        "Smithery API rate limit exceeded. Please wait before retrying.",
      );
    }

    if (!response.ok) {
      throw new SmitheryApiError(
        `Smithery API returned ${response.status}: ${response.statusText}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Sleep helper for rate-limiting between batch requests. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Errors ──────────────────────────────────────────────────────────────────

export class SmitheryApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "SmitheryApiError";
  }
}

export class SmitheryRateLimitError extends SmitheryApiError {
  constructor(message: string) {
    super(message, 429);
    this.name = "SmitheryRateLimitError";
  }
}

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Generate a submission report for a server.
 * Creates a structured JSON report that could be submitted to Smithery's API
 * or included in a PR to their repository.
 */
export function generateSubmission(
  qualifiedName: string,
  artifact: RunArtifact,
): SmitherySubmission {
  const score =
    artifact.healthScore ?? computeHealthScore(artifact.checks, artifact.performanceMetrics);

  const badgeSvg = generateBadgeSvg({
    label: "MCP Health",
    score: score.overall,
    grade: score.grade,
  });

  return {
    qualifiedName,
    artifact,
    score,
    badgeSvg,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Render a submission as markdown suitable for a Smithery integration PR.
 */
export function renderSubmissionMarkdown(submission: SmitherySubmission): string {
  const { qualifiedName, artifact, score } = submission;
  const lines: string[] = [];

  lines.push(`# MCP Observatory Report: ${qualifiedName}`);
  lines.push("");
  lines.push(`> Scanned at ${artifact.createdAt} by MCP Observatory v${artifact.toolVersion}`);
  lines.push("");

  // Badge (data URI)
  const encodedSvg = Buffer.from(submission.badgeSvg).toString("base64");
  lines.push(`![MCP Health Score](data:image/svg+xml;base64,${encodedSvg})`);
  lines.push("");

  // Overall score
  lines.push("## Health Score");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Overall Score** | ${score.overall}/100 |`);
  lines.push(`| **Grade** | ${score.grade} |`);
  lines.push(`| **Gate** | ${artifact.gate} |`);
  lines.push("");

  // Dimensions
  lines.push("## Score Breakdown");
  lines.push("");
  lines.push("| Dimension | Weight | Score | Details |");
  lines.push("|-----------|--------|-------|---------|");
  for (const dim of score.dimensions) {
    const details = dim.details.join("; ");
    lines.push(
      `| ${dim.name} | ${Math.round(dim.weight * 100)}% | ${dim.score}/100 | ${details} |`,
    );
  }
  lines.push("");

  // Individual checks
  lines.push("## Check Results");
  lines.push("");
  lines.push("| Check | Status | Duration | Message |");
  lines.push("|-------|--------|----------|---------|");
  for (const check of artifact.checks) {
    const icon = check.status === "pass" ? "pass" : check.status === "fail" ? "FAIL" : check.status;
    lines.push(`| ${check.id} | ${icon} | ${check.durationMs}ms | ${check.message} |`);
  }
  lines.push("");

  // Performance metrics
  if (artifact.performanceMetrics) {
    const pm = artifact.performanceMetrics;
    lines.push("## Performance");
    lines.push("");
    lines.push(`- **Connect:** ${Math.round(pm.connectMs)}ms`);
    if (pm.toolsListMs !== undefined) lines.push(`- **tools/list:** ${Math.round(pm.toolsListMs)}ms`);
    if (pm.promptsListMs !== undefined) lines.push(`- **prompts/list:** ${Math.round(pm.promptsListMs)}ms`);
    if (pm.resourcesListMs !== undefined) lines.push(`- **resources/list:** ${Math.round(pm.resourcesListMs)}ms`);
    lines.push("");
  }

  // Server info
  lines.push("## Server Information");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **Target ID** | ${artifact.target.targetId} |`);
  lines.push(`| **Adapter** | ${artifact.target.adapter} |`);
  if (artifact.target.serverName) {
    lines.push(`| **Server Name** | ${artifact.target.serverName} |`);
  }
  if (artifact.target.serverVersion) {
    lines.push(`| **Server Version** | ${artifact.target.serverVersion} |`);
  }
  lines.push(`| **Platform** | ${artifact.environment.platform} |`);
  lines.push(`| **Node** | ${artifact.environment.nodeVersion} |`);
  lines.push("");

  // Fatal errors
  if (artifact.fatalError) {
    lines.push("## Fatal Error");
    lines.push("");
    lines.push("```");
    lines.push(artifact.fatalError);
    lines.push("```");
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "*Generated by [MCP Observatory](https://github.com/anthropics/mcp-observatory)*",
  );

  return lines.join("\n");
}

/**
 * Resolve a Smithery server listing to an Observatory target config.
 * Fetches server metadata from Smithery and converts to TargetConfig.
 */
export async function resolveSmitheryTarget(
  qualifiedName: string,
  config?: SmitheryConfig,
): Promise<TargetConfig> {
  const url = `${baseUrl(config)}/api/servers/${encodeURIComponent(qualifiedName)}`;
  const entry = await fetchJson<SmitheryServerEntry>(url, config);

  return serverEntryToTarget(entry);
}

/**
 * Fetch a page of servers from the Smithery registry.
 */
export async function listSmitheryServers(
  config?: SmitheryConfig,
  options?: { page?: number; pageSize?: number },
): Promise<SmitheryServerListResponse> {
  const params = new URLSearchParams();
  if (options?.page !== undefined) params.set("page", String(options.page));
  if (options?.pageSize !== undefined) params.set("pageSize", String(options.pageSize));

  const qs = params.toString();
  const url = `${baseUrl(config)}/api/servers${qs ? `?${qs}` : ""}`;
  return fetchJson<SmitheryServerListResponse>(url, config);
}

/**
 * Batch-scan top N servers from the Smithery registry.
 * Returns an array of submission results (or errors for individual servers).
 */
export async function batchScanServers(
  runTargetFn: (target: TargetConfig) => Promise<RunArtifact>,
  config?: SmitheryConfig,
  options?: { top?: number },
): Promise<Array<{ qualifiedName: string; submission?: SmitherySubmission; error?: string }>> {
  const top = options?.top ?? 10;
  const listResponse = await listSmitheryServers(config, { pageSize: top });
  const servers = listResponse.servers.slice(0, top);

  const results: Array<{ qualifiedName: string; submission?: SmitherySubmission; error?: string }> =
    [];

  for (const server of servers) {
    try {
      const target = serverEntryToTarget(server);
      const artifact = await runTargetFn(target);
      const submission = generateSubmission(server.qualifiedName, artifact);
      results.push({ qualifiedName: server.qualifiedName, submission });
    } catch (err) {
      results.push({
        qualifiedName: server.qualifiedName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // Rate-limit between scans
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  return results;
}

/**
 * Render a batch scan report as markdown.
 */
export function renderBatchReportMarkdown(
  results: Array<{ qualifiedName: string; submission?: SmitherySubmission; error?: string }>,
): string {
  const lines: string[] = [];
  lines.push("# MCP Observatory — Smithery Batch Scan Report");
  lines.push("");
  lines.push(`> Scanned ${results.length} servers at ${new Date().toISOString()}`);
  lines.push("");

  // Summary table
  const successful = results.filter((r) => r.submission);
  const failed = results.filter((r) => r.error);

  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Scanned:** ${results.length}`);
  lines.push(`- **Successful:** ${successful.length}`);
  lines.push(`- **Failed:** ${failed.length}`);
  lines.push("");

  if (successful.length > 0) {
    // Leaderboard
    const sorted = successful
      .map((r) => ({
        name: r.qualifiedName,
        score: r.submission!.score.overall,
        grade: r.submission!.score.grade,
        gate: r.submission!.artifact.gate,
      }))
      .sort((a, b) => b.score - a.score);

    lines.push("## Leaderboard");
    lines.push("");
    lines.push("| Rank | Server | Score | Grade | Gate |");
    lines.push("|------|--------|-------|-------|------|");
    sorted.forEach((s, i) => {
      lines.push(`| ${i + 1} | ${s.name} | ${s.score}/100 | ${s.grade} | ${s.gate} |`);
    });
    lines.push("");
  }

  if (failed.length > 0) {
    lines.push("## Errors");
    lines.push("");
    for (const f of failed) {
      lines.push(`- **${f.qualifiedName}:** ${f.error}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "*Generated by [MCP Observatory](https://github.com/anthropics/mcp-observatory)*",
  );

  return lines.join("\n");
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function serverEntryToTarget(entry: SmitheryServerEntry): TargetConfig {
  // Check for HTTP/SSE connections first
  const httpConn = entry.connections?.find(
    (c) => c.type === "http" || c.type === "sse" || c.url,
  );

  if (httpConn?.url) {
    return {
      targetId: entry.qualifiedName,
      adapter: "http",
      url: httpConn.url,
      timeoutMs: 15_000,
      metadata: {
        smitheryName: entry.qualifiedName,
        ...(entry.displayName ? { displayName: entry.displayName } : {}),
      },
    };
  }

  // Fall back to npx-based local-process target using the qualified name.
  // Smithery packages typically run via `npx @scope/package-name`.
  return {
    targetId: entry.qualifiedName,
    adapter: "local-process",
    command: "npx",
    args: ["-y", entry.qualifiedName],
    timeoutMs: 30_000,
    metadata: {
      smitheryName: entry.qualifiedName,
      ...(entry.displayName ? { displayName: entry.displayName } : {}),
    },
  };
}
