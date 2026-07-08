import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { LOGO } from "../src/commands/helpers.js";
import { writeTextFileAtomic } from "../src/utils/files.js";
import { TOOL_VERSION } from "../src/version.js";
import { classifyUsageRow, type TelemetryRow } from "./telemetry-company-intelligence.js";

const execFileAsync = promisify(execFile);

const GITHUB_REPO = "KryptosAI/mcp-observatory";
const NPM_PACKAGE = "@kryptosai/mcp-observatory";
const DEFAULT_ROOT = ".mcp-observatory-metrics";
const DAILY_HISTORY_DAYS = 90;
const TREND_WINDOW_DAYS = 62;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const INTERNAL_DOMAINS = new Set(["banksey.com", "example.com", "github:kryptosai", "kryptosai.com"]);
const FREE_EMAIL_DOMAINS = new Set([
  "aol.com",
  "duck.com",
  "fastmail.com",
  "gmail.com",
  "googlemail.com",
  "hey.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "mail.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "pm.me",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
]);

type SourceName = "telemetry" | "github" | "npm" | "dashboard";
type RunStatus = "success" | "partial" | "failed";

interface Paths {
  root: string;
  db: string;
  dashboardDir: string;
  dashboard: string;
  snapshotsDir: string;
  logsDir: string;
  lock: string;
}

interface RunRecord {
  id: string;
  source: SourceName;
  startedAt: string;
}

interface GitHubDailyItem {
  timestamp: string;
  count: number;
  uniques: number;
}

interface GitHubTrafficResponse {
  clones?: GitHubDailyItem[];
  views?: GitHubDailyItem[];
}

interface GitHubReferrer {
  referrer: string;
  count: number;
  uniques: number;
}

interface GitHubPath {
  path: string;
  title: string;
  count: number;
  uniques: number;
}

interface GitHubRepo {
  stargazers_count?: number;
  forks_count?: number;
  subscribers_count?: number;
  watchers_count?: number;
  default_branch?: string;
}

interface GitHubRelease {
  tag_name?: string;
  published_at?: string;
}

interface GitHubIssue {
  pull_request?: unknown;
}

interface GitHubWorkflowRun {
  id: number;
  name?: string;
  status?: string;
  conclusion?: string | null;
  event?: string;
  head_branch?: string;
  created_at?: string;
  updated_at?: string;
  html_url?: string;
}

interface GitHubWorkflowRunsResponse {
  workflow_runs?: GitHubWorkflowRun[];
}

interface NpmDownloadsResponse {
  downloads?: Array<{ day: string; downloads: number }>;
}

type TrendDirection = "up" | "down" | "flat";

interface DailyDirectionSignal {
  metric: string;
  current: number;
  previous: number;
  deltaLabel: string;
  direction: TrendDirection;
  context: string;
  nextAction: string;
}

interface FunnelConversion {
  name: string;
  numerator: number;
  denominator: number;
  rate: number;
  context: string;
}

interface VersionHealth {
  latestVersion: string;
  latestSessions: number;
  staleSessions: number;
  staleSessionShare: number;
  staleVersions: Array<{ version: string; sessions: number; events: number }>;
}

interface DataQualitySignal {
  label: string;
  status: "ok" | "warn" | "bad";
  detail: string;
}

interface TelemetrySummary {
  totalEvents: number;
  totalSessions: number;
  externalSessions: number;
  firstPartyCiSessions: number;
  latestExternalSeen: string;
  events7: number;
  eventsPrevious7: number;
  sessions7: number;
  sessionsPrevious7: number;
  sourceCounts: Array<{ source: string; events: number; sessions: number }>;
  marketEvents: number;
  marketSessions: number;
  dailyEvents: Array<{ day: string; events: number; sessions: number }>;
  dailyMarketEvents: Array<{ day: string; events: number; sessions: number }>;
  dailySourceMix: Array<{ day: string; events: number; localSessions: number; externalCiSessions: number; firstPartyCiSessions: number; mcpSessions: number }>;
  dailyMarketSourceMix: Array<{ day: string; events: number; localSessions: number; externalCiSessions: number; mcpSessions: number }>;
  topCommands: Array<{ command: string; events: number; sessions: number; uniqueDomains: number }>;
  topDomains: Array<{ domain: string; events: number; sessions: number }>;
  topDomainDetails: Array<{ domain: string; events: number; sessions: number; topCommand: string; latestSeen: string; firstSeen: string }>;
  versionAdoption: Array<{ version: string; events: number; sessions: number; sessionShare: number; isLatest: boolean }>;
  versionHealth: VersionHealth;
  dailyMarketVersionAdoption: Array<{ day: string; totalSessions: number; latestSessions: number; latestEvents: number; latestSessionShare: number; dominantVersion: string }>;
  commandFunnel: Array<{ stage: string; commands: string; events: number; sessions: number; recommendation: string }>;
  dailyMarketCommandFunnel: Array<{ day: string; agentInstallSessions: number; validationSessions: number; regressionSessions: number; ciSetupSessions: number; attackSimSessions: number; ciSarifSessions: number; receiptSessions: number; riskGraphSessions: number; paidIntentSessions: number }>;
  dailyDirectionSignals: DailyDirectionSignal[];
  funnelConversions: FunnelConversion[];
  dataQualitySignals: DataQualitySignal[];
}

interface GitHubSummary {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  openPullRequests: number;
  latestRelease: string;
  latestReleasePublishedAt: string;
  clones14: number;
  uniqueCloners14: number;
  views14: number;
  uniqueViewers14: number;
  clones7: number;
  clonesPrevious7: number;
  views7: number;
  viewsPrevious7: number;
  daily: Array<{ day: string; clones: number; uniqueCloners: number; views: number; uniqueViewers: number }>;
  referrers: Array<{ referrer: string; count: number; uniques: number }>;
  paths: Array<{ path: string; title: string; count: number; uniques: number }>;
  workflowRuns: Array<{ name: string; status: string; conclusion: string; updatedAt: string }>;
}

interface NpmSummary {
  downloads7: number;
  downloads14: number;
  downloads30: number;
  downloadsPrevious7: number;
  downloadsPrevious30: number;
  latestDay: string;
  daily: Array<{ day: string; downloads: number }>;
}

interface SourceRunSummary {
  source: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  rowsSeen: number;
  rowsInserted: number;
  error: string;
}

interface DashboardModel {
  generatedAt: string;
  dbPath: string;
  telemetry: TelemetrySummary;
  github: GitHubSummary;
  npm: NpmSummary;
  sourceRuns: SourceRunSummary[];
  recentFailures: SourceRunSummary[];
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function resolvePaths(): Paths {
  const root = path.resolve(argValue("--root") ?? process.env["MCP_OBSERVATORY_METRICS_ROOT"] ?? DEFAULT_ROOT);
  return {
    root,
    db: path.join(root, "observatory.sqlite"),
    dashboardDir: path.join(root, "dashboard"),
    dashboard: path.join(root, "dashboard", "index.html"),
    snapshotsDir: path.join(root, "snapshots"),
    logsDir: path.join(root, "logs"),
    lock: path.join(root, "refresh.lock"),
  };
}

async function ensureDirs(paths: Paths): Promise<void> {
  await mkdir(paths.root, { recursive: true });
  await mkdir(paths.dashboardDir, { recursive: true });
  await mkdir(paths.snapshotsDir, { recursive: true });
  await mkdir(paths.logsDir, { recursive: true });
}

export function openDatabase(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
CREATE TABLE IF NOT EXISTS collection_runs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  rows_seen INTEGER NOT NULL DEFAULT 0,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  metadata_json TEXT
);
CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  event TEXT,
  command TEXT,
  version TEXT,
  session_id TEXT,
  created_at TEXT,
  timestamp TEXT,
  telemetry_source TEXT,
  is_first_party INTEGER,
  is_ci INTEGER,
  ci_provider TEXT,
  transport TEXT,
  github_repository TEXT,
  github_workflow TEXT,
  github_actor TEXT,
  health_score REAL,
  health_grade TEXT,
  raw_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS github_daily_metrics (
  day TEXT PRIMARY KEY,
  clones INTEGER NOT NULL DEFAULT 0,
  unique_cloners INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  unique_viewers INTEGER NOT NULL DEFAULT 0,
  raw_json TEXT
);
CREATE TABLE IF NOT EXISTS github_referrers (
  captured_at TEXT NOT NULL,
  referrer TEXT NOT NULL,
  count INTEGER NOT NULL,
  uniques INTEGER NOT NULL,
  raw_json TEXT,
  PRIMARY KEY (captured_at, referrer)
);
CREATE TABLE IF NOT EXISTS github_paths (
  captured_at TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT,
  count INTEGER NOT NULL,
  uniques INTEGER NOT NULL,
  raw_json TEXT,
  PRIMARY KEY (captured_at, path)
);
CREATE TABLE IF NOT EXISTS github_repo_snapshots (
  captured_at TEXT PRIMARY KEY,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  watchers INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  open_pull_requests INTEGER NOT NULL DEFAULT 0,
  default_branch TEXT,
  latest_release TEXT,
  latest_release_published_at TEXT,
  raw_json TEXT
);
CREATE TABLE IF NOT EXISTS github_workflow_runs (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  conclusion TEXT,
  event TEXT,
  branch TEXT,
  created_at TEXT,
  updated_at TEXT,
  url TEXT,
  raw_json TEXT
);
CREATE TABLE IF NOT EXISTS npm_downloads (
  day TEXT PRIMARY KEY,
  downloads INTEGER NOT NULL,
  package TEXT NOT NULL,
  raw_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry_events(created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_session ON telemetry_events(session_id);
CREATE INDEX IF NOT EXISTS idx_collection_runs_source_started ON collection_runs(source, started_at);
`);
  return db;
}

function nowIso(): string {
  return new Date().toISOString();
}

function unknownToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function safeErrorMessage(error: unknown): string {
  if (!error) return "";
  const message = error instanceof Error ? error.message : unknownToString(error);
  return message
    .split("\n")[0]!
    .replaceAll(process.cwd(), "<workspace>")
    .replaceAll(os.homedir(), "<home>")
    .slice(0, 500);
}

function startRun(db: DatabaseSync, source: SourceName): RunRecord {
  const record = { id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, source, startedAt: nowIso() };
  db.prepare("INSERT INTO collection_runs (id, source, started_at, status) VALUES (?, ?, ?, ?)").run(
    record.id,
    source,
    record.startedAt,
    "partial",
  );
  return record;
}

function finishRun(
  db: DatabaseSync,
  run: RunRecord,
  status: RunStatus,
  rowsSeen: number,
  rowsInserted: number,
  error?: unknown,
  metadata?: unknown,
): void {
  const message = safeErrorMessage(error);
  db.prepare(`
UPDATE collection_runs
SET finished_at = ?, status = ?, rows_seen = ?, rows_inserted = ?, error = ?, metadata_json = ?
WHERE id = ?
`).run(nowIso(), status, rowsSeen, rowsInserted, message, metadata ? JSON.stringify(metadata) : null, run.id);
}

async function withRetries<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(750 * attempt);
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts`, { cause: lastError });
}

function stableId(prefix: string, value: unknown): string {
  return `${prefix}:${createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32)}`;
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function normalizeDomain(raw: string): string | undefined {
  const domain = raw.trim().toLowerCase().replace(/^www\./, "");
  if (!domain.includes(".")) return undefined;
  if (domain.split(".").every((part) => /^\d+$/.test(part))) return undefined;
  if (FREE_EMAIL_DOMAINS.has(domain)) return undefined;
  if (domain.endsWith(".local") || domain.endsWith(".localhost")) return undefined;
  return domain;
}

function emailDomain(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  const at = email.lastIndexOf("@");
  if (at === -1) return undefined;
  return normalizeDomain(email.slice(at + 1));
}

function remoteOrgOrDomain(remote: string | null | undefined): string | undefined {
  if (!remote) return undefined;
  const raw = remote.trim();
  try {
    const url = new URL(raw.replace(/^git@([^:]+):/, "ssh://git@$1/"));
    const host = normalizeDomain(url.hostname);
    const parts = url.pathname.split("/").filter(Boolean);
    if (host === "github.com" && parts[0]) return `github:${parts[0].toLowerCase()}`;
    return host;
  } catch {
    const match = raw.match(/git@([^:]+):([^/]+)\//);
    if (match?.[1] === "github.com" && match[2]) return `github:${match[2].toLowerCase()}`;
  }
  return undefined;
}

function hostnameDomain(hostname: string | null | undefined): string | undefined {
  if (!hostname) return undefined;
  const parts = hostname.toLowerCase().split(".").filter(Boolean);
  if (parts.length < 2) return undefined;
  return normalizeDomain(parts.slice(-2).join("."));
}

function rowDomains(row: TelemetryRow): string[] {
  return [
    emailDomain(row.git_email ?? row.gitEmail),
    emailDomain(row.contact),
    remoteOrgOrDomain(row.git_remote_url ?? row.gitRemoteUrl),
    hostnameDomain(row.hostname),
  ].filter((domain): domain is string => Boolean(domain));
}

function rowSession(row: TelemetryRow): string {
  return row.session_id ?? row.sessionId ?? "";
}

function rowCreatedAt(row: TelemetryRow): string {
  return row.created_at ?? row.timestamp ?? "";
}

function rowIsFirstParty(row: TelemetryRow): boolean {
  const repo = (row.github_repository ?? row.githubRepository ?? "").toLowerCase();
  return row.is_first_party === 1 || row.is_first_party === true || row.isFirstParty === true || repo === "kryptosai/mcp-observatory";
}

function isExternalRow(row: TelemetryRow): boolean {
  return classifyUsageRow(row) !== "first_party_ci" && !rowIsFirstParty(row) && !rowDomains(row).some((domain) => INTERNAL_DOMAINS.has(domain));
}

export function ingestTelemetryRows(db: DatabaseSync, rows: TelemetryRow[]): { rowsSeen: number; rowsInserted: number } {
  const existing = db.prepare("SELECT id FROM telemetry_events WHERE id = ?");
  const insert = db.prepare(`
INSERT INTO telemetry_events (
  id, source_id, event, command, version, session_id, created_at, timestamp,
  telemetry_source, is_first_party, is_ci, ci_provider, transport, github_repository,
  github_workflow, github_actor, health_score, health_grade, raw_json
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  source_id = excluded.source_id,
  event = excluded.event,
  command = excluded.command,
  version = excluded.version,
  session_id = excluded.session_id,
  created_at = excluded.created_at,
  timestamp = excluded.timestamp,
  telemetry_source = excluded.telemetry_source,
  is_first_party = excluded.is_first_party,
  is_ci = excluded.is_ci,
  ci_provider = excluded.ci_provider,
  transport = excluded.transport,
  github_repository = excluded.github_repository,
  github_workflow = excluded.github_workflow,
  github_actor = excluded.github_actor,
  health_score = excluded.health_score,
  health_grade = excluded.health_grade,
  raw_json = excluded.raw_json
`);
  let rowsInserted = 0;
  db.exec("BEGIN");
  try {
    for (const row of rows) {
      const raw = row as TelemetryRow & {
        id?: string | number;
        event?: string | null;
        version?: string | null;
        health_score?: number | null;
        health_grade?: string | null;
      };
      const id = raw.id === undefined || raw.id === null ? stableId("telemetry", row) : String(raw.id);
      if (!existing.get(id)) rowsInserted += 1;
      insert.run(
        id,
        raw.id === undefined || raw.id === null ? null : String(raw.id),
        raw.event ?? null,
        row.command ?? null,
        raw.version ?? null,
        rowSession(row) || null,
        row.created_at ?? null,
        row.timestamp ?? null,
        row.telemetry_source ?? row.telemetrySource ?? classifyUsageRow(row),
        rowIsFirstParty(row) ? 1 : 0,
        row.is_ci === 1 || row.is_ci === true || row.isCI === true ? 1 : 0,
        row.ci_provider ?? row.ciProvider ?? null,
        row.transport ?? null,
        row.github_repository ?? row.githubRepository ?? null,
        row.github_workflow ?? row.githubWorkflow ?? null,
        row.github_actor ?? row.githubActor ?? null,
        raw.health_score ?? null,
        raw.health_grade ?? null,
        JSON.stringify(row),
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { rowsSeen: rows.length, rowsInserted };
}

function parseTelemetryRows(raw: string): TelemetryRow[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) return JSON.parse(trimmed) as TelemetryRow[];
  return trimmed.split(/\r?\n/).map((line) => JSON.parse(line) as TelemetryRow);
}

async function collectTelemetry(db: DatabaseSync, paths: Paths): Promise<void> {
  const run = startRun(db, "telemetry");
  try {
    const output = argValue("--telemetry-output") ?? path.join(paths.snapshotsDir, "telemetry-events.json");
    const input = argValue("--telemetry-input");
    let telemetryPath = input;
    if (!telemetryPath) {
      try {
        await withRetries("telemetry export", async () => {
          await execFileAsync("npx", ["tsx", "scripts/export-telemetry-d1.ts", "--output", output], {
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024 * 64,
          });
        }, 2);
        telemetryPath = output;
      } catch (error) {
        const fallback = path.resolve("telemetry-exports/events-flat-full.json");
        if (!existsSync(fallback)) throw error;
        telemetryPath = fallback;
      }
    }
    const result = ingestTelemetryRows(db, parseTelemetryRows(await readFile(telemetryPath, "utf8")));
    finishRun(db, run, "success", result.rowsSeen, result.rowsInserted, undefined, { telemetryPath });
  } catch (error) {
    finishRun(db, run, "failed", 0, 0, error);
  }
}

async function githubToken(): Promise<string | undefined> {
  const envToken = process.env["GH_TOKEN"] ?? process.env["GITHUB_TOKEN"];
  if (envToken) return envToken;
  try {
    const { stdout } = await execFileAsync("gh", ["auth", "token"], { maxBuffer: 1024 * 1024 });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "accept": "application/vnd.github+json",
      "user-agent": "mcp-observatory-local-metrics",
      ...headers,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText} for ${url}${body ? `: ${body.slice(0, 500)}` : ""}`);
  }
  return response.json() as Promise<T>;
}

async function githubJson<T>(apiPath: string, token: string): Promise<T> {
  return fetchJson<T>(`https://api.github.com${apiPath}`, { authorization: `Bearer ${token}` });
}

async function collectGitHub(db: DatabaseSync): Promise<void> {
  const run = startRun(db, "github");
  let rowsSeen = 0;
  let rowsInserted = 0;
  try {
    const token = await githubToken();
    if (!token) throw new Error("GitHub auth unavailable. Run `gh auth login` or set GH_TOKEN.");
    const capturedAt = nowIso();
    const [repo, latestRelease, issues, workflowRuns, clones, views, referrers, popularPaths] = await Promise.all([
      withRetries("GitHub repo", () => githubJson<GitHubRepo>(`/repos/${GITHUB_REPO}`, token)),
      withRetries("GitHub latest release", () => githubJson<GitHubRelease>(`/repos/${GITHUB_REPO}/releases/latest`, token)).catch((): GitHubRelease => ({})),
      withRetries("GitHub issues", () => githubJson<GitHubIssue[]>(`/repos/${GITHUB_REPO}/issues?state=open&per_page=100`, token)),
      withRetries("GitHub workflow runs", () => githubJson<GitHubWorkflowRunsResponse>(`/repos/${GITHUB_REPO}/actions/runs?per_page=20`, token)),
      withRetries("GitHub clones", () => githubJson<GitHubTrafficResponse>(`/repos/${GITHUB_REPO}/traffic/clones`, token)),
      withRetries("GitHub views", () => githubJson<GitHubTrafficResponse>(`/repos/${GITHUB_REPO}/traffic/views`, token)),
      withRetries("GitHub referrers", () => githubJson<GitHubReferrer[]>(`/repos/${GITHUB_REPO}/traffic/popular/referrers`, token)),
      withRetries("GitHub paths", () => githubJson<GitHubPath[]>(`/repos/${GITHUB_REPO}/traffic/popular/paths`, token)),
    ]);

    const pullRequests = issues.filter((issue) => Boolean(issue.pull_request)).length;
    rowsSeen += 1;
    rowsInserted += 1;
    db.prepare(`
INSERT INTO github_repo_snapshots (
  captured_at, stars, forks, watchers, open_issues, open_pull_requests,
  default_branch, latest_release, latest_release_published_at, raw_json
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
      capturedAt,
      repo.stargazers_count ?? 0,
      repo.forks_count ?? 0,
      repo.subscribers_count ?? repo.watchers_count ?? 0,
      Math.max(issues.length - pullRequests, 0),
      pullRequests,
      repo.default_branch ?? null,
      latestRelease.tag_name ?? null,
      latestRelease.published_at ?? null,
      JSON.stringify({ repo, latestRelease, issuesCount: issues.length, pullRequests }),
    );

    const dayRows = new Map<string, { clones: number; uniqueCloners: number; views: number; uniqueViewers: number; raw: unknown[] }>();
    for (const item of clones.clones ?? []) {
      const day = item.timestamp.slice(0, 10);
      const bucket = dayRows.get(day) ?? { clones: 0, uniqueCloners: 0, views: 0, uniqueViewers: 0, raw: [] };
      bucket.clones = item.count;
      bucket.uniqueCloners = item.uniques;
      bucket.raw.push({ type: "clone", item });
      dayRows.set(day, bucket);
    }
    for (const item of views.views ?? []) {
      const day = item.timestamp.slice(0, 10);
      const bucket = dayRows.get(day) ?? { clones: 0, uniqueCloners: 0, views: 0, uniqueViewers: 0, raw: [] };
      bucket.views = item.count;
      bucket.uniqueViewers = item.uniques;
      bucket.raw.push({ type: "view", item });
      dayRows.set(day, bucket);
    }
    const upsertDaily = db.prepare(`
INSERT INTO github_daily_metrics (day, clones, unique_cloners, views, unique_viewers, raw_json)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(day) DO UPDATE SET
  clones = excluded.clones,
  unique_cloners = excluded.unique_cloners,
  views = excluded.views,
  unique_viewers = excluded.unique_viewers,
  raw_json = excluded.raw_json
`);
    for (const [day, bucket] of dayRows) {
      rowsSeen += 1;
      rowsInserted += 1;
      upsertDaily.run(day, bucket.clones, bucket.uniqueCloners, bucket.views, bucket.uniqueViewers, JSON.stringify(bucket.raw));
    }

    const insertReferrer = db.prepare("INSERT OR REPLACE INTO github_referrers (captured_at, referrer, count, uniques, raw_json) VALUES (?, ?, ?, ?, ?)");
    for (const item of referrers) {
      rowsSeen += 1;
      rowsInserted += 1;
      insertReferrer.run(capturedAt, item.referrer, item.count, item.uniques, JSON.stringify(item));
    }

    const insertPath = db.prepare("INSERT OR REPLACE INTO github_paths (captured_at, path, title, count, uniques, raw_json) VALUES (?, ?, ?, ?, ?, ?)");
    for (const item of popularPaths) {
      rowsSeen += 1;
      rowsInserted += 1;
      insertPath.run(capturedAt, item.path, item.title, item.count, item.uniques, JSON.stringify(item));
    }

    const upsertRun = db.prepare(`
INSERT INTO github_workflow_runs (id, name, status, conclusion, event, branch, created_at, updated_at, url, raw_json)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  status = excluded.status,
  conclusion = excluded.conclusion,
  event = excluded.event,
  branch = excluded.branch,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  url = excluded.url,
  raw_json = excluded.raw_json
`);
    for (const item of workflowRuns.workflow_runs ?? []) {
      rowsSeen += 1;
      rowsInserted += 1;
      upsertRun.run(
        String(item.id),
        item.name ?? null,
        item.status ?? null,
        item.conclusion ?? null,
        item.event ?? null,
        item.head_branch ?? null,
        item.created_at ?? null,
        item.updated_at ?? null,
        item.html_url ?? null,
        JSON.stringify(item),
      );
    }
    finishRun(db, run, "success", rowsSeen, rowsInserted);
  } catch (error) {
    finishRun(db, run, "failed", rowsSeen, rowsInserted, error);
  }
}

async function collectNpm(db: DatabaseSync): Promise<void> {
  const run = startRun(db, "npm");
  try {
    const days = Number(argValue("--npm-days") ?? "365");
    const end = dateDaysAgo(1);
    const start = dateDaysAgo(Math.max(days, 1));
    const url = `https://api.npmjs.org/downloads/range/${start}:${end}/${encodeURIComponent(NPM_PACKAGE)}`;
    const data = await withRetries("npm downloads", () => fetchJson<NpmDownloadsResponse>(url));
    const downloads = data.downloads ?? [];
    const upsert = db.prepare(`
INSERT INTO npm_downloads (day, downloads, package, raw_json)
VALUES (?, ?, ?, ?)
ON CONFLICT(day) DO UPDATE SET downloads = excluded.downloads, package = excluded.package, raw_json = excluded.raw_json
`);
    let inserted = 0;
    const existing = db.prepare("SELECT day FROM npm_downloads WHERE day = ?");
    db.exec("BEGIN");
    try {
      for (const item of downloads) {
        if (!existing.get(item.day)) inserted += 1;
        upsert.run(item.day, item.downloads, NPM_PACKAGE, JSON.stringify(item));
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    finishRun(db, run, "success", downloads.length, inserted, undefined, { start, end });
  } catch (error) {
    finishRun(db, run, "failed", 0, 0, error);
  }
}

function getNumber(row: unknown, key: string): number {
  const value = (row as Record<string, unknown> | undefined)?.[key];
  return typeof value === "number" ? value : Number(value ?? 0);
}

function getString(row: unknown, key: string): string {
  const value = (row as Record<string, unknown> | undefined)?.[key];
  return unknownToString(value);
}

function latestRunRows(db: DatabaseSync): SourceRunSummary[] {
  return db.prepare(`
SELECT cr.*
FROM collection_runs cr
JOIN (SELECT source, MAX(started_at) AS started_at FROM collection_runs GROUP BY source) latest
  ON latest.source = cr.source AND latest.started_at = cr.started_at
ORDER BY cr.source
`).all().map((row) => ({
    source: getString(row, "source"),
    status: getString(row, "status"),
    startedAt: getString(row, "started_at"),
    finishedAt: getString(row, "finished_at"),
    rowsSeen: getNumber(row, "rows_seen"),
    rowsInserted: getNumber(row, "rows_inserted"),
    error: getString(row, "error"),
  }));
}

function recentFailureRows(db: DatabaseSync): SourceRunSummary[] {
  return db.prepare("SELECT * FROM collection_runs WHERE status = 'failed' ORDER BY started_at DESC LIMIT 8").all().map((row) => ({
    source: getString(row, "source"),
    status: getString(row, "status"),
    startedAt: getString(row, "started_at"),
    finishedAt: getString(row, "finished_at"),
    rowsSeen: getNumber(row, "rows_seen"),
    rowsInserted: getNumber(row, "rows_inserted"),
    error: getString(row, "error"),
  }));
}

function telemetryRows(db: DatabaseSync): TelemetryRow[] {
  return db.prepare("SELECT raw_json FROM telemetry_events ORDER BY created_at ASC").all().map((row) => JSON.parse(getString(row, "raw_json")) as TelemetryRow);
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map((part) => Number.parseInt(part.replace(/\D.*$/, ""), 10) || 0);
  const partsB = b.split(".").map((part) => Number.parseInt(part.replace(/\D.*$/, ""), 10) || 0);
  const length = Math.max(partsA.length, partsB.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (partsA[index] ?? 0) - (partsB[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return a.localeCompare(b);
}

function numericRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const value of smaller) {
    if (larger.has(value)) count += 1;
  }
  return count;
}

function directionSignal(
  metric: string,
  current: number,
  previous: number,
  context: string,
  nextAction: string,
): DailyDirectionSignal {
  const trend = signedPercent(current, previous);
  return {
    metric,
    current,
    previous,
    deltaLabel: trend.label,
    direction: trend.direction,
    context,
    nextAction,
  };
}

function summarizeTelemetry(db: DatabaseSync): TelemetrySummary {
  const rows = telemetryRows(db);
  const totalSessions = new Set<string>();
  const externalSessions = new Set<string>();
  const firstPartySessions = new Set<string>();
  const sourceCounts = new Map<string, { events: number; sessions: Set<string> }>();
  const dailyEvents = new Map<string, { events: number; sessions: Set<string> }>();
  const dailyMarketEvents = new Map<string, { events: number; sessions: Set<string> }>();
  const dailySourceMix = new Map<string, {
    events: number;
    localSessions: Set<string>;
    externalCiSessions: Set<string>;
    firstPartyCiSessions: Set<string>;
    mcpSessions: Set<string>;
  }>();
  const dailyMarketSourceMix = new Map<string, {
    events: number;
    localSessions: Set<string>;
    externalCiSessions: Set<string>;
    mcpSessions: Set<string>;
  }>();
  const commands = new Map<string, { events: number; sessions: Set<string>; domains: Set<string> }>();
  const domains = new Map<string, { events: number; sessions: Set<string> }>();
  const domainDetails = new Map<string, { events: number; sessions: Set<string>; commands: Map<string, number>; latestSeen: string; firstSeen: string }>();
  const versions = new Map<string, { events: number; sessions: Set<string> }>();
  const latestVersionSessions = new Set<string>();
  const staleVersionSessions = new Set<string>();
  const dailyMarketVersionStats = new Map<string, Map<string, { events: number; sessions: Set<string> }>>();
  const receiptSessions = new Set<string>();
  const validationStageSessions = new Set<string>();
  const attackStageSessions = new Set<string>();
  const setupStageSessions = new Set<string>();
  const ciSarifStageSessions = new Set<string>();
  const paidStageSessions = new Set<string>();
  const riskGraphStageSessions = new Set<string>();
  let receiptEvents = 0;
  let riskGraphEvents = 0;
  const dailyMarketCommandFunnel = new Map<string, {
    agentInstallSessions: Set<string>;
    attackSimSessions: Set<string>;
    ciSarifSessions: Set<string>;
    receiptSessions: Set<string>;
    riskGraphSessions: Set<string>;
    validationSessions: Set<string>;
    regressionSessions: Set<string>;
    ciSetupSessions: Set<string>;
    paidIntentSessions: Set<string>;
  }>();
  let latestExternalSeen = "";

  for (const row of rows) {
    const session = rowSession(row);
    if (session) totalSessions.add(session);
    const category = classifyUsageRow(row);
    const sourceBucket = sourceCounts.get(category) ?? { events: 0, sessions: new Set<string>() };
    sourceBucket.events += 1;
    if (session) sourceBucket.sessions.add(session);
    sourceCounts.set(category, sourceBucket);
    if (category === "first_party_ci" && session) firstPartySessions.add(session);

    const rawVersion = (row as TelemetryRow & { version?: string | null }).version;
    if (rawVersion) {
      const versionBucket = versions.get(rawVersion) ?? { events: 0, sessions: new Set<string>() };
      versionBucket.events += 1;
      if (session) versionBucket.sessions.add(session);
      versions.set(rawVersion, versionBucket);
      if (session) {
        if (rawVersion === TOOL_VERSION) latestVersionSessions.add(session);
        else staleVersionSessions.add(session);
      }
    }

    const seen = rowCreatedAt(row);
    if (seen) {
      const day = seen.slice(0, 10);
      const dayBucket = dailyEvents.get(day) ?? { events: 0, sessions: new Set<string>() };
      dayBucket.events += 1;
      if (session) dayBucket.sessions.add(session);
      dailyEvents.set(day, dayBucket);

      const mixBucket = dailySourceMix.get(day) ?? {
        events: 0,
        localSessions: new Set<string>(),
        externalCiSessions: new Set<string>(),
        firstPartyCiSessions: new Set<string>(),
        mcpSessions: new Set<string>(),
      };
      mixBucket.events += 1;
      if (session) {
        if (category === "external_ci") mixBucket.externalCiSessions.add(session);
        else if (category === "first_party_ci") mixBucket.firstPartyCiSessions.add(session);
        else if (category === "mcp") mixBucket.mcpSessions.add(session);
        else mixBucket.localSessions.add(session);
      }
      dailySourceMix.set(day, mixBucket);
    }

    if (isExternalRow(row)) {
      if (session) externalSessions.add(session);
      if (seen && seen > latestExternalSeen) latestExternalSeen = seen;
      if (seen) {
        const day = seen.slice(0, 10);
        const marketDayBucket = dailyMarketEvents.get(day) ?? { events: 0, sessions: new Set<string>() };
        marketDayBucket.events += 1;
        if (session) marketDayBucket.sessions.add(session);
        dailyMarketEvents.set(day, marketDayBucket);

        const marketMixBucket = dailyMarketSourceMix.get(day) ?? {
          events: 0,
          localSessions: new Set<string>(),
          externalCiSessions: new Set<string>(),
          mcpSessions: new Set<string>(),
        };
        marketMixBucket.events += 1;
        if (session) {
          if (category === "external_ci") marketMixBucket.externalCiSessions.add(session);
          else if (category === "mcp") marketMixBucket.mcpSessions.add(session);
          else marketMixBucket.localSessions.add(session);
        }
        dailyMarketSourceMix.set(day, marketMixBucket);

        if (rawVersion) {
          const versionDay = dailyMarketVersionStats.get(day) ?? new Map<string, { events: number; sessions: Set<string> }>();
          const versionBucket = versionDay.get(rawVersion) ?? { events: 0, sessions: new Set<string>() };
          versionBucket.events += 1;
          if (session) versionBucket.sessions.add(session);
          versionDay.set(rawVersion, versionBucket);
          dailyMarketVersionStats.set(day, versionDay);
        }

        if (session) {
          const commandBucket = dailyMarketCommandFunnel.get(day) ?? {
            agentInstallSessions: new Set<string>(),
            attackSimSessions: new Set<string>(),
            ciSarifSessions: new Set<string>(),
            receiptSessions: new Set<string>(),
            riskGraphSessions: new Set<string>(),
            validationSessions: new Set<string>(),
            regressionSessions: new Set<string>(),
            ciSetupSessions: new Set<string>(),
            paidIntentSessions: new Set<string>(),
          };
          if (row.command === "serve") commandBucket.agentInstallSessions.add(session);
          if (row.command === "attack-sim") commandBucket.attackSimSessions.add(session);
          if (row.command === "test" || row.command === "scan" || row.command === "run") commandBucket.validationSessions.add(session);
          if (row.command === "diff" || row.command === "history" || row.command === "watch" || row.command === "lock") commandBucket.regressionSessions.add(session);
          if (row.command === "init-ci" || row.command === "setup-ci") commandBucket.ciSetupSessions.add(session);
          if ((row.command === "init-ci" || row.command === "setup-ci") && (row as TelemetryRow & { setupCiSarif?: boolean }).setupCiSarif === true) commandBucket.ciSarifSessions.add(session);
          if (row.command === "receipt" || (row as TelemetryRow & { receiptGenerated?: boolean }).receiptGenerated === true) commandBucket.receiptSessions.add(session);
          if (row.command === "risk-graph" || (row as TelemetryRow & { riskGraphGenerated?: boolean }).riskGraphGenerated === true) commandBucket.riskGraphSessions.add(session);
          if (row.command === "cloud" || row.command === "cloud-upload" || row.command === "enterprise-report") commandBucket.paidIntentSessions.add(session);
          dailyMarketCommandFunnel.set(day, commandBucket);
        }
      }
      const command = row.command ?? "unknown";
      const commandBucket = commands.get(command) ?? { events: 0, sessions: new Set<string>(), domains: new Set<string>() };
      commandBucket.events += 1;
      if (session) commandBucket.sessions.add(session);
      for (const domain of rowDomains(row)) {
        if (!INTERNAL_DOMAINS.has(domain)) commandBucket.domains.add(domain);
      }
      commands.set(command, commandBucket);
      if (session) {
        if (row.command === "attack-sim") attackStageSessions.add(session);
        if (row.command === "test" || row.command === "scan" || row.command === "run") validationStageSessions.add(session);
        if (row.command === "init-ci" || row.command === "setup-ci") setupStageSessions.add(session);
        if ((row.command === "init-ci" || row.command === "setup-ci") && (row as TelemetryRow & { setupCiSarif?: boolean }).setupCiSarif === true) ciSarifStageSessions.add(session);
        if (row.command === "risk-graph" || (row as TelemetryRow & { riskGraphGenerated?: boolean }).riskGraphGenerated === true) riskGraphStageSessions.add(session);
        if (row.command === "cloud" || row.command === "cloud-upload" || row.command === "enterprise-report") paidStageSessions.add(session);
      }
      if (row.command === "receipt" || (row as TelemetryRow & { receiptGenerated?: boolean }).receiptGenerated === true) {
        receiptEvents += 1;
        if (session) receiptSessions.add(session);
      }
      if (row.command === "risk-graph" || (row as TelemetryRow & { riskGraphGenerated?: boolean }).riskGraphGenerated === true) {
        riskGraphEvents += 1;
        if (session) riskGraphStageSessions.add(session);
      }
      for (const domain of rowDomains(row)) {
        if (INTERNAL_DOMAINS.has(domain)) continue;
        const domainBucket = domains.get(domain) ?? { events: 0, sessions: new Set<string>() };
        domainBucket.events += 1;
        if (session) domainBucket.sessions.add(session);
        domains.set(domain, domainBucket);

        const detailBucket = domainDetails.get(domain) ?? { events: 0, sessions: new Set<string>(), commands: new Map<string, number>(), latestSeen: "", firstSeen: "" };
        detailBucket.events += 1;
        if (session) detailBucket.sessions.add(session);
        const domainCommand = row.command ?? "unknown";
        detailBucket.commands.set(domainCommand, (detailBucket.commands.get(domainCommand) ?? 0) + 1);
        if (seen && seen > detailBucket.latestSeen) detailBucket.latestSeen = seen;
        if (seen && (!detailBucket.firstSeen || seen < detailBucket.firstSeen)) detailBucket.firstSeen = seen;
        domainDetails.set(domain, detailBucket);
      }
    }
  }

  const sortedDaily = [...dailyEvents.entries()]
    .map(([day, stats]) => ({ day, events: stats.events, sessions: stats.sessions.size }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const sortedMarketDaily = [...dailyMarketEvents.entries()]
    .map(([day, stats]) => ({ day, events: stats.events, sessions: stats.sessions.size }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const recent7 = sortedDaily.slice(-7);
  const previous7 = sortedDaily.slice(-14, -7);
  const sortedSourceMix = [...dailySourceMix.entries()]
    .map(([day, stats]) => ({
      day,
      events: stats.events,
      localSessions: stats.localSessions.size,
      externalCiSessions: stats.externalCiSessions.size,
      firstPartyCiSessions: stats.firstPartyCiSessions.size,
      mcpSessions: stats.mcpSessions.size,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const sortedMarketSourceMix = [...dailyMarketSourceMix.entries()]
    .map(([day, stats]) => ({
      day,
      events: stats.events,
      localSessions: stats.localSessions.size,
      externalCiSessions: stats.externalCiSessions.size,
      mcpSessions: stats.mcpSessions.size,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const observedVersionRows = [...versions.entries()]
    .map(([version, stats]) => ({ version, events: stats.events, sessions: stats.sessions.size }))
    .sort((a, b) => compareVersions(b.version, a.version));
  const latestStats = versions.get(TOOL_VERSION);
  const versionRows = [
    { version: TOOL_VERSION, events: latestStats?.events ?? 0, sessions: latestStats?.sessions.size ?? 0 },
    ...observedVersionRows.filter((row) => row.version !== TOOL_VERSION),
  ];
  const latestVersion = TOOL_VERSION;
  const sortedDailyMarketVersionAdoption = [...dailyMarketEvents.entries()]
    .map(([day, stats]) => {
      const versionStats = dailyMarketVersionStats.get(day) ?? new Map<string, { events: number; sessions: Set<string> }>();
      const latestStats = latestVersion ? versionStats.get(latestVersion) : undefined;
      const dominant = [...versionStats.entries()]
        .map(([version, row]) => ({ version, sessions: row.sessions.size, events: row.events }))
        .sort((a, b) => b.sessions - a.sessions || b.events - a.events || compareVersions(b.version, a.version))[0];
      const latestSessions = latestStats?.sessions.size ?? 0;
      return {
        day,
        totalSessions: stats.sessions.size,
        latestSessions,
        latestEvents: latestStats?.events ?? 0,
        latestSessionShare: stats.sessions.size === 0 ? 0 : Math.round((latestSessions / stats.sessions.size) * 1000) / 10,
        dominantVersion: dominant?.version ?? "n/a",
      };
    })
    .sort((a, b) => a.day.localeCompare(b.day));
  const sortedDailyMarketCommandFunnel = [...dailyMarketCommandFunnel.entries()]
    .map(([day, stats]) => ({
      day,
      agentInstallSessions: stats.agentInstallSessions.size,
      attackSimSessions: stats.attackSimSessions.size,
      ciSarifSessions: stats.ciSarifSessions.size,
      validationSessions: stats.validationSessions.size,
      regressionSessions: stats.regressionSessions.size,
      ciSetupSessions: stats.ciSetupSessions.size,
      paidIntentSessions: stats.paidIntentSessions.size,
      receiptSessions: stats.receiptSessions.size,
      riskGraphSessions: stats.riskGraphSessions.size,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const commandStats = (names: string[]): { events: number; sessions: number } => {
    const sessions = new Set<string>();
    let events = 0;
    for (const name of names) {
      const stats = commands.get(name);
      if (!stats) continue;
      events += stats.events;
      for (const session of stats.sessions) sessions.add(session);
    }
    return { events, sessions: sessions.size };
  };
  const latestVersionRow = versionRows[0];
  const staleVersions = versionRows.slice(1);
  const staleSessions = staleVersionSessions.size;
  const commandFunnel = [
    {
      stage: "Agent install",
      commands: "serve",
      ...commandStats(["serve"]),
      recommendation: "Scale agent setup docs and one-line install snippets.",
    },
    {
      stage: "Local validation",
      commands: "test, scan, run",
      ...commandStats(["test", "scan", "run"]),
      recommendation: "Keep quick checks prominent; they are the path into trust.",
    },
    {
      stage: "Regression workflow",
      commands: "diff, history, watch, lock",
      ...commandStats(["diff", "history", "watch", "lock"]),
      recommendation: "Package these as CI drift prevention, not separate utilities.",
    },
    {
      stage: "CI setup",
      commands: "init-ci, setup-ci",
      ...commandStats(["init-ci", "setup-ci"]),
      recommendation: "The setup command is the funnel leak; make it louder and friendlier.",
    },
    {
      stage: "Attack simulation",
      commands: "attack-sim",
      ...commandStats(["attack-sim"]),
      recommendation: "This is the demo wedge; convert every run into a receipt and CI gate.",
    },
    {
      stage: "Receipts",
      commands: "receipt, audit --receipt",
      events: receiptEvents,
      sessions: receiptSessions.size,
      recommendation: "Treat receipts as the portable artifact that can drive maintainer replies and paid pilots.",
    },
    {
      stage: "Risk graph",
      commands: "risk-graph",
      events: riskGraphEvents,
      sessions: riskGraphStageSessions.size,
      recommendation: "This is the Wiz-style surface; turn receipts into fleet and toolchain risk visibility.",
    },
    {
      stage: "Paid intent",
      commands: "cloud, cloud-upload, enterprise-report",
      ...commandStats(["cloud", "cloud-upload", "enterprise-report"]),
      recommendation: "Treat these sessions as design-partner and pilot leads.",
    },
  ];
  const latestMarketDay = sortedMarketDaily.at(-1);
  const previousMarketDay = sortedMarketDaily.at(-2);
  const latestCommandDay = sortedDailyMarketCommandFunnel.at(-1);
  const previousCommandDay = sortedDailyMarketCommandFunnel.at(-2);
  const latestVersionDay = sortedDailyMarketVersionAdoption.at(-1);
  const previousVersionDay = sortedDailyMarketVersionAdoption.at(-2);
  const validationToAttack = intersectionSize(validationStageSessions, attackStageSessions);
  const attackToReceipt = intersectionSize(attackStageSessions, receiptSessions);
  const receiptToRiskGraph = intersectionSize(receiptSessions, riskGraphStageSessions);
  const attackToSetup = intersectionSize(attackStageSessions, setupStageSessions);
  const setupToSarif = intersectionSize(setupStageSessions, ciSarifStageSessions);
  const lastSeenAgeHours = latestExternalSeen
    ? Math.max(0, Math.round((Date.now() - Date.parse(latestExternalSeen)) / (60 * 60 * 1000)))
    : Number.POSITIVE_INFINITY;
  const dataQualitySignals: DataQualitySignal[] = [
    {
      label: "Telemetry freshness",
      status: !latestExternalSeen ? "bad" : lastSeenAgeHours > 30 ? "warn" : "ok",
      detail: latestExternalSeen ? `Latest external event ${lastSeenAgeHours}h ago (${latestExternalSeen}).` : "No external telemetry has been collected.",
    },
    {
      label: "Market segmentation",
      status: totalSessions.size > 0 && externalSessions.size === 0 ? "warn" : "ok",
      detail: `${formatNumber(externalSessions.size)} market sessions, ${formatNumber(Math.max(totalSessions.size - externalSessions.size, 0))} internal or first-party sessions excluded.`,
    },
  ];
  const _versionHealthSignal: VersionHealth & { statusDetail: string } = {
    latestVersion: latestVersionRow?.version ?? "",
    latestSessions: latestVersionRow?.sessions ?? 0,
    staleSessions,
    staleSessionShare: totalSessions.size === 0 ? 0 : Math.round((staleSessions / totalSessions.size) * 1000) / 10,
    staleVersions: staleVersions.slice(0, 8).map((row) => ({ version: row.version, sessions: row.sessions, events: row.events })),
    statusDetail: latestVersionRow
      ? `${formatNumber(latestVersionRow.sessions)} sessions on ${latestVersionRow.version}; ${formatNumber(staleSessions)} sessions on older versions.`
      : "No version telemetry yet.",
  };
  return {
    totalEvents: rows.length,
    totalSessions: totalSessions.size,
    externalSessions: externalSessions.size,
    firstPartyCiSessions: firstPartySessions.size,
    latestExternalSeen,
    events7: recent7.reduce((sum, row) => sum + row.events, 0),
    eventsPrevious7: previous7.reduce((sum, row) => sum + row.events, 0),
    sessions7: recent7.reduce((sum, row) => sum + row.sessions, 0),
    sessionsPrevious7: previous7.reduce((sum, row) => sum + row.sessions, 0),
    sourceCounts: [...sourceCounts.entries()].map(([source, stats]) => ({ source, events: stats.events, sessions: stats.sessions.size })).sort((a, b) => b.events - a.events),
    marketEvents: sortedMarketDaily.reduce((sum, row) => sum + row.events, 0),
    marketSessions: externalSessions.size,
    dailyEvents: sortedDaily.slice(-DAILY_HISTORY_DAYS).reverse(),
    dailyMarketEvents: sortedMarketDaily.slice(-DAILY_HISTORY_DAYS).reverse(),
    dailySourceMix: sortedSourceMix.slice(-DAILY_HISTORY_DAYS).reverse(),
    dailyMarketSourceMix: sortedMarketSourceMix.slice(-DAILY_HISTORY_DAYS).reverse(),
    topCommands: [...commands.entries()].map(([command, stats]) => ({ command, events: stats.events, sessions: stats.sessions.size, uniqueDomains: stats.domains.size })).sort((a, b) => b.events - a.events).slice(0, 12),
    topDomains: [...domains.entries()].map(([domain, stats]) => ({ domain, events: stats.events, sessions: stats.sessions.size })).sort((a, b) => b.events - a.events).slice(0, 12),
    topDomainDetails: [...domainDetails.entries()].map(([domain, stats]) => ({
      domain,
      events: stats.events,
      sessions: stats.sessions.size,
      topCommand: [...stats.commands.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown",
      latestSeen: stats.latestSeen,
      firstSeen: stats.firstSeen,
    })).sort((a, b) => b.sessions - a.sessions).slice(0, 20),
    versionAdoption: versionRows.map((row) => ({
      ...row,
      sessionShare: totalSessions.size === 0 ? 0 : Math.round((row.sessions / totalSessions.size) * 1000) / 10,
      isLatest: row.version === latestVersion,
    })).slice(0, 20),
    versionHealth: {
      latestVersion: latestVersionRow?.version ?? "",
      latestSessions: latestVersionRow?.sessions ?? 0,
      staleSessions,
      staleSessionShare: totalSessions.size === 0 ? 0 : Math.round((staleSessions / totalSessions.size) * 1000) / 10,
      staleVersions: staleVersions.slice(0, 8).map((row) => ({ version: row.version, sessions: row.sessions, events: row.events })),
    },
    dailyMarketVersionAdoption: sortedDailyMarketVersionAdoption.slice(-DAILY_HISTORY_DAYS).reverse(),
    commandFunnel,
    dailyMarketCommandFunnel: sortedDailyMarketCommandFunnel.slice(-DAILY_HISTORY_DAYS).reverse(),
    dailyDirectionSignals: [
      directionSignal("Market sessions", latestMarketDay?.sessions ?? 0, previousMarketDay?.sessions ?? 0, latestMarketDay ? latestMarketDay.day : "No market day yet", "If this is up, amplify the source that changed; if down, post a fresh receipt/index proof."),
      directionSignal("Attack-sim sessions", latestCommandDay?.attackSimSessions ?? 0, previousCommandDay?.attackSimSessions ?? 0, latestCommandDay ? latestCommandDay.day : "No attack-sim day yet", "Make attack-sim the first demo and push receipts after every finding."),
      directionSignal("Receipt sessions", latestCommandDay?.receiptSessions ?? 0, previousCommandDay?.receiptSessions ?? 0, latestCommandDay ? latestCommandDay.day : "No receipt day yet", "Use generated receipts as the artifact for maintainer conversations and paid pilots."),
      directionSignal("Risk-graph sessions", latestCommandDay?.riskGraphSessions ?? 0, previousCommandDay?.riskGraphSessions ?? 0, latestCommandDay ? latestCommandDay.day : "No risk-graph day yet", "Turn receipts into the agent toolchain risk graph and route high-risk nodes to pilots."),
      directionSignal("CI setup sessions", latestCommandDay?.ciSetupSessions ?? 0, previousCommandDay?.ciSetupSessions ?? 0, latestCommandDay ? latestCommandDay.day : "No CI setup day yet", "Push setup-ci --all --sarif --schedule weekly after passing scans."),
      directionSignal("SARIF setup sessions", latestCommandDay?.ciSarifSessions ?? 0, previousCommandDay?.ciSarifSessions ?? 0, latestCommandDay ? latestCommandDay.day : "No SARIF setup day yet", "Make SARIF the default enterprise/security handoff path."),
      directionSignal("Paid-intent sessions", latestCommandDay?.paidIntentSessions ?? 0, previousCommandDay?.paidIntentSessions ?? 0, latestCommandDay ? latestCommandDay.day : "No paid-intent day yet", "Follow up on cloud/report sessions with the pilot offer."),
      directionSignal("Latest-version adoption", latestVersionDay?.latestSessionShare ?? 0, previousVersionDay?.latestSessionShare ?? 0, latestVersionDay ? `${latestVersionDay.day}; percent of market sessions` : "No version adoption day yet", "If this lags, strengthen @latest upgrade copy and release notes."),
    ],
    funnelConversions: [
      { name: "Validation to attack-sim", numerator: validationToAttack, denominator: validationStageSessions.size, rate: numericRate(validationToAttack, validationStageSessions.size), context: "Same-session progression from scan/test/run into the demo wedge." },
      { name: "Attack-sim to receipt", numerator: attackToReceipt, denominator: attackStageSessions.size, rate: numericRate(attackToReceipt, attackStageSessions.size), context: "Same-session progression from findings into portable proof." },
      { name: "Receipt to risk graph", numerator: receiptToRiskGraph, denominator: receiptSessions.size, rate: numericRate(receiptToRiskGraph, receiptSessions.size), context: "Same-session progression from portable proof into fleet/toolchain visibility." },
      { name: "Attack-sim to CI setup", numerator: attackToSetup, denominator: attackStageSessions.size, rate: numericRate(attackToSetup, attackStageSessions.size), context: "Same-session progression from attack evidence into a recurring gate." },
      { name: "CI setup to SARIF", numerator: setupToSarif, denominator: setupStageSessions.size, rate: numericRate(setupToSarif, setupStageSessions.size), context: "Same-session progression into the security-friendly CI path." },
      { name: "Market to paid intent", numerator: paidStageSessions.size, denominator: externalSessions.size, rate: numericRate(paidStageSessions.size, externalSessions.size), context: "Market sessions that reached cloud/report pilot intent." },
    ],
    dataQualitySignals,
  };
}

function summarizeGitHub(db: DatabaseSync): GitHubSummary {
  const latest = db.prepare("SELECT * FROM github_repo_snapshots ORDER BY captured_at DESC LIMIT 1").get();
  const daily = db.prepare("SELECT day, clones, unique_cloners, views, unique_viewers FROM github_daily_metrics ORDER BY day ASC").all().map((row) => ({
    day: getString(row, "day"),
    clones: getNumber(row, "clones"),
    uniqueCloners: getNumber(row, "unique_cloners"),
    views: getNumber(row, "views"),
    uniqueViewers: getNumber(row, "unique_viewers"),
  }));
  const last14 = daily.slice(-14);
  const last7 = daily.slice(-7);
  const previous7 = daily.slice(-14, -7);
  const newestCapture = getString(db.prepare("SELECT captured_at FROM github_referrers ORDER BY captured_at DESC LIMIT 1").get(), "captured_at");
  const referrers = newestCapture
    ? db.prepare("SELECT referrer, count, uniques FROM github_referrers WHERE captured_at = ? ORDER BY count DESC LIMIT 12").all(newestCapture)
      .map((row) => ({ referrer: getString(row, "referrer"), count: getNumber(row, "count"), uniques: getNumber(row, "uniques") }))
    : [];
  const paths = newestCapture
    ? db.prepare("SELECT path, title, count, uniques FROM github_paths WHERE captured_at = ? ORDER BY count DESC LIMIT 12").all(newestCapture)
      .map((row) => ({ path: getString(row, "path"), title: getString(row, "title"), count: getNumber(row, "count"), uniques: getNumber(row, "uniques") }))
    : [];
  const workflowRuns = db.prepare("SELECT name, status, conclusion, updated_at FROM github_workflow_runs ORDER BY updated_at DESC LIMIT 8").all().map((row) => ({
    name: getString(row, "name"),
    status: getString(row, "status"),
    conclusion: getString(row, "conclusion"),
    updatedAt: getString(row, "updated_at"),
  }));
  return {
    stars: getNumber(latest, "stars"),
    forks: getNumber(latest, "forks"),
    watchers: getNumber(latest, "watchers"),
    openIssues: getNumber(latest, "open_issues"),
    openPullRequests: getNumber(latest, "open_pull_requests"),
    latestRelease: getString(latest, "latest_release"),
    latestReleasePublishedAt: getString(latest, "latest_release_published_at"),
    clones14: last14.reduce((sum, row) => sum + row.clones, 0),
    uniqueCloners14: last14.reduce((sum, row) => sum + row.uniqueCloners, 0),
    views14: last14.reduce((sum, row) => sum + row.views, 0),
    uniqueViewers14: last14.reduce((sum, row) => sum + row.uniqueViewers, 0),
    clones7: last7.reduce((sum, row) => sum + row.clones, 0),
    clonesPrevious7: previous7.reduce((sum, row) => sum + row.clones, 0),
    views7: last7.reduce((sum, row) => sum + row.views, 0),
    viewsPrevious7: previous7.reduce((sum, row) => sum + row.views, 0),
    daily: daily.slice(-DAILY_HISTORY_DAYS).reverse(),
    referrers,
    paths,
    workflowRuns,
  };
}

function summarizeNpm(db: DatabaseSync): NpmSummary {
  const rows = db.prepare("SELECT day, downloads FROM npm_downloads ORDER BY day ASC").all().map((row) => ({
    day: getString(row, "day"),
    downloads: getNumber(row, "downloads"),
  }));
  const sumLast = (days: number): number => rows.slice(-days).reduce((sum, row) => sum + row.downloads, 0);
  return {
    downloads7: sumLast(7),
    downloads14: sumLast(14),
    downloads30: sumLast(30),
    downloadsPrevious7: rows.slice(-14, -7).reduce((sum, row) => sum + row.downloads, 0),
    downloadsPrevious30: rows.slice(-60, -30).reduce((sum, row) => sum + row.downloads, 0),
    latestDay: rows.at(-1)?.day ?? "",
    daily: rows.slice(-DAILY_HISTORY_DAYS).reverse(),
  };
}

function buildModel(db: DatabaseSync, paths: Paths): DashboardModel {
  return {
    generatedAt: nowIso(),
    dbPath: paths.db,
    telemetry: summarizeTelemetry(db),
    github: summarizeGitHub(db),
    npm: summarizeNpm(db),
    sourceRuns: latestRunRows(db),
    recentFailures: recentFailureRows(db),
  };
}

function escapeHtml(value: string | number): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function delta(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "no change";
  if (previous === 0) return "new activity";
  const percent = Math.round(((current - previous) / previous) * 100);
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent}% vs previous period`;
}

function percent(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function conversionPercent(part: number, whole: number): string {
  if (whole === 0) return "n/a";
  const value = (part / whole) * 100;
  if (value > 0 && value < 0.01) return "<0.01%";
  return `${Math.round(value * 100) / 100}%`;
}

function signedPercent(current: number, previous: number): { label: string; direction: "up" | "down" | "flat" } {
  if (previous === 0 && current === 0) return { label: "0%", direction: "flat" };
  if (previous === 0) return { label: "new", direction: "up" };
  const value = Math.round(((current - previous) / previous) * 100);
  return {
    label: `${value >= 0 ? "+" : ""}${value}%`,
    direction: value > 0 ? "up" : value < 0 ? "down" : "flat",
  };
}

function shortDate(day: string): string {
  const timestamp = dayToTimestamp(day);
  if (timestamp === undefined) return day;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(timestamp));
}

function trendClass(direction: "up" | "down" | "flat"): string {
  if (direction === "up") return "trend-up";
  if (direction === "down") return "trend-down";
  return "trend-flat";
}

function sparkline(values: number[], color: string): string {
  const width = 156;
  const height = 34;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values.length <= 1
    ? `0,${height - 2} ${width},${height - 2}`
    : values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 3 - (((value - min) / range) * (height - 8));
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
    }).join(" ");
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${points}"/></svg>`;
}


function linePath(values: number[], width: number, height: number, maxValue: number): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `M 0 ${height} L ${width} ${height}`;
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value / Math.max(maxValue, 1)) * (height - 12)) - 6;
    return `${index === 0 ? "M" : "L"} ${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
  }).join(" ");
}

function lineChart(points: UsageTrendPoint[]): string {
  const rows = points.slice(-30);
  const width = 640;
  const height = 210;
  const maxValue = Math.max(...rows.flatMap((point) => [point.sessions, point.npmDownloads, point.clones]), 1);
  const sessions = linePath(rows.map((point) => point.sessions), width, height, maxValue);
  const npm = linePath(rows.map((point) => point.npmDownloads), width, height, maxValue);
  const clones = linePath(rows.map((point) => point.clones), width, height, maxValue);
  const labels = rows.filter((_, index) => index % 6 === 0 || index === rows.length - 1);
  return `<svg class="line-chart" viewBox="0 0 ${width} ${height + 30}" role="img" aria-label="Usage over time">
    <defs>
      <linearGradient id="areaSessions" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#7c5cff" stop-opacity=".32"/><stop offset="100%" stop-color="#7c5cff" stop-opacity="0"/></linearGradient>
    </defs>
    ${[0, 1, 2, 3].map((row) => `<line x1="0" x2="${width}" y1="${Math.round((height / 4) * row)}" y2="${Math.round((height / 4) * row)}" class="grid-line"/>`).join("")}
    <path d="${sessions} L ${width} ${height} L 0 ${height} Z" fill="url(#areaSessions)"/>
    <path d="${npm}" class="line npm-line"/>
    <path d="${clones}" class="line clone-line"/>
    <path d="${sessions}" class="line session-line"/>
    ${labels.map((point, index) => {
      const sourceIndex = rows.findIndex((candidate) => candidate.day === point.day);
      const x = rows.length <= 1 ? 0 : (sourceIndex / (rows.length - 1)) * width;
      return `<text x="${Math.round(x)}" y="${height + 24}" class="axis-label" ${index === labels.length - 1 ? 'text-anchor="end"' : ""}>${escapeHtml(shortDate(point.day))}</text>`;
    }).join("")}
  </svg>`;
}

function stackedBarChart(points: UsageTrendPoint[]): string {
  const rows = points.slice(-30);
  const width = 640;
  const height = 210;
  const gap = 5;
  const barWidth = rows.length === 0 ? 0 : Math.max(5, (width - (gap * (rows.length - 1))) / rows.length);
  const maxValue = Math.max(...rows.map((point) => point.agentInstallSessions + point.validationSessions + point.regressionSessions + point.ciSetupSessions), 1);
  const bars = rows.map((point, index) => {
    const x = index * (barWidth + gap);
    let y = height;
    const segments = [
      { value: point.validationSessions, color: "#3b82f6", label: "validation" },
      { value: point.agentInstallSessions, color: "#8b5cf6", label: "agent installs" },
      { value: point.regressionSessions, color: "#f59e0b", label: "regression" },
      { value: point.ciSetupSessions, color: "#22c55e", label: "setup" },
    ];
    return segments.map((segment) => {
      const segmentHeight = (segment.value / maxValue) * (height - 12);
      y -= segmentHeight;
      if (segmentHeight <= 0) return "";
      return `<rect x="${Math.round(x * 10) / 10}" y="${Math.round(y * 10) / 10}" width="${Math.round(barWidth * 10) / 10}" height="${Math.max(1, Math.round(segmentHeight * 10) / 10)}" rx="2" fill="${segment.color}"><title>${escapeHtml(`${point.day}: ${segment.value} ${segment.label} sessions`)}</title></rect>`;
    }).join("");
  }).join("");
  const labels = rows.filter((_, index) => index % 6 === 0 || index === rows.length - 1);
  return `<svg class="bar-chart" viewBox="0 0 ${width} ${height + 30}" role="img" aria-label="Command funnel over time">
    ${[0, 1, 2, 3].map((row) => `<line x1="0" x2="${width}" y1="${Math.round((height / 4) * row)}" y2="${Math.round((height / 4) * row)}" class="grid-line"/>`).join("")}
    ${bars}
    ${labels.map((point, index) => {
      const sourceIndex = rows.findIndex((candidate) => candidate.day === point.day);
      const x = rows.length <= 1 ? 0 : (sourceIndex / (rows.length - 1)) * width;
      return `<text x="${Math.round(x)}" y="${height + 24}" class="axis-label" ${index === labels.length - 1 ? 'text-anchor="end"' : ""}>${escapeHtml(shortDate(point.day))}</text>`;
    }).join("")}
  </svg>`;
}

function donutChart(rows: Array<{ label: string; value: number; color: string }>): string {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const rings = rows.map((row) => {
    const dash = total === 0 ? 0 : (row.value / total) * circumference;
    const circle = `<circle r="${radius}" cx="64" cy="64" fill="none" stroke="${row.color}" stroke-width="20" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 64 64)"/>`;
    offset += dash;
    return circle;
  }).join("");
  return `<svg class="donut" viewBox="0 0 128 128" role="img" aria-label="Usage by source">
    <circle r="${radius}" cx="64" cy="64" fill="none" stroke="#172435" stroke-width="20"/>
    ${rings}
    <text x="64" y="61" text-anchor="middle" class="donut-value">${formatNumber(total)}</text>
    <text x="64" y="78" text-anchor="middle" class="donut-label">sessions</text>
  </svg>`;
}

function horizontalBars(rows: Array<{ label: string; value: number; color: string }>): string {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return rows.map((row) => `<div class="hbar-row"><span>${escapeHtml(row.label)}</span><div><i style="width:${Math.max(2, Math.round((row.value / max) * 100))}%;background:${row.color}"></i></div><em>${formatNumber(row.value)}</em></div>`).join("");
}

function navItem(label: string, active = false): string {
  return `<div class="nav-item${active ? " active" : ""}"><span class="nav-dot"></span>${escapeHtml(label)}</div>`;
}

function brandAsciiLogo(): string {
  return `<pre class="logo-pixel" aria-label="MCP Observatory ASCII art logo">${escapeHtml(LOGO.trim())}</pre>`;
}

interface UsageTrendPoint {
  day: string;
  events: number;
  sessions: number;
  excludedSessions: number;
  localSessions: number;
  externalCiSessions: number;
  mcpSessions: number;
  latestSessions: number;
  latestSessionShare: number;
  dominantVersion: string;
  agentInstallSessions: number;
  attackSimSessions: number;
  ciSarifSessions: number;
  receiptSessions: number;
  riskGraphSessions: number;
  validationSessions: number;
  regressionSessions: number;
  ciSetupSessions: number;
  paidIntentSessions: number;
  npmDownloads: number;
  clones: number;
  views: number;
}

interface UsagePeriodSummary {
  startDay: string;
  endDay: string;
  events: number;
  sessions: number;
  excludedSessions: number;
  latestSessions: number;
  setupSessions: number;
  attackSimSessions: number;
  ciSarifSessions: number;
  receiptSessions: number;
  riskGraphSessions: number;
  paidIntentSessions: number;
  npmDownloads: number;
  clones: number;
  views: number;
}

interface KpiMetric {
  allTimeLabel: string;
  color: string;
  current: number;
  displayValue: string | number;
  label: string;
  monthlyValues: number[];
  note: string;
  previous: number;
  trend: { label: string; direction: "up" | "down" | "flat" };
}

function dayToTimestamp(day: string): number | undefined {
  const [year, month, date] = day.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !date) return undefined;
  return Date.UTC(year, month - 1, date);
}

function timestampToDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function percentChangeLabel(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "0%";
  if (previous === 0) return "new";
  const percentChange = Math.round(((current - previous) / previous) * 100);
  return `${percentChange >= 0 ? "+" : ""}${percentChange}%`;
}

function usageTrendPoints(model: DashboardModel, limit = TREND_WINDOW_DAYS): UsageTrendPoint[] {
  const allEventsByDay = new Map(model.telemetry.dailyEvents.map((row) => [row.day, row]));
  const eventsByDay = new Map(model.telemetry.dailyMarketEvents.map((row) => [row.day, row]));
  const sourceByDay = new Map(model.telemetry.dailyMarketSourceMix.map((row) => [row.day, row]));
  const versionByDay = new Map(model.telemetry.dailyMarketVersionAdoption.map((row) => [row.day, row]));
  const commandByDay = new Map(model.telemetry.dailyMarketCommandFunnel.map((row) => [row.day, row]));
  const npmByDay = new Map(model.npm.daily.map((row) => [row.day, row]));
  const githubByDay = new Map(model.github.daily.map((row) => [row.day, row]));
  const knownDays = [...new Set([
    ...allEventsByDay.keys(),
    ...eventsByDay.keys(),
    ...sourceByDay.keys(),
    ...versionByDay.keys(),
    ...commandByDay.keys(),
    ...npmByDay.keys(),
    ...githubByDay.keys(),
  ])].sort();
  const latestTimestamp = dayToTimestamp(knownDays.at(-1) ?? "");
  const earliestTimestamp = dayToTimestamp(knownDays[0] ?? "");
  const dayCount = latestTimestamp === undefined
    ? 0
    : Number.isFinite(limit)
      ? Math.max(1, limit)
      : Math.max(1, Math.floor((latestTimestamp - (earliestTimestamp ?? latestTimestamp)) / MS_PER_DAY) + 1);
  const days = latestTimestamp === undefined
    ? []
    : Array.from({ length: dayCount }, (_, index) => timestampToDay(latestTimestamp - ((dayCount - index - 1) * MS_PER_DAY)));
  return days.map((day) => {
    const allEventRow = allEventsByDay.get(day);
    const eventRow = eventsByDay.get(day);
    const sourceRow = sourceByDay.get(day);
    const versionRow = versionByDay.get(day);
    const commandRow = commandByDay.get(day);
    const npmRow = npmByDay.get(day);
    const githubRow = githubByDay.get(day);
    return {
      day,
      events: eventRow?.events ?? 0,
      sessions: eventRow?.sessions ?? 0,
      excludedSessions: Math.max((allEventRow?.sessions ?? 0) - (eventRow?.sessions ?? 0), 0),
      localSessions: sourceRow?.localSessions ?? 0,
      externalCiSessions: sourceRow?.externalCiSessions ?? 0,
      mcpSessions: sourceRow?.mcpSessions ?? 0,
      latestSessions: versionRow?.latestSessions ?? 0,
      latestSessionShare: versionRow?.latestSessionShare ?? 0,
      dominantVersion: versionRow?.dominantVersion ?? "n/a",
      agentInstallSessions: commandRow?.agentInstallSessions ?? 0,
      attackSimSessions: commandRow?.attackSimSessions ?? 0,
      ciSarifSessions: commandRow?.ciSarifSessions ?? 0,
      receiptSessions: commandRow?.receiptSessions ?? 0,
      riskGraphSessions: commandRow?.riskGraphSessions ?? 0,
      validationSessions: commandRow?.validationSessions ?? 0,
      regressionSessions: commandRow?.regressionSessions ?? 0,
      ciSetupSessions: commandRow?.ciSetupSessions ?? 0,
      paidIntentSessions: commandRow?.paidIntentSessions ?? 0,
      npmDownloads: npmRow?.downloads ?? 0,
      clones: githubRow?.clones ?? 0,
      views: githubRow?.views ?? 0,
    };
  });
}

function usagePeriodSummary(points: UsageTrendPoint[], days: number, offset = 0): UsagePeriodSummary {
  const end = Math.max(points.length - offset, 0);
  const start = Math.max(end - days, 0);
  const rows = points.slice(start, end);
  return {
    startDay: rows[0]?.day ?? "n/a",
    endDay: rows.at(-1)?.day ?? "n/a",
    events: rows.reduce((sum, point) => sum + point.events, 0),
    sessions: rows.reduce((sum, point) => sum + point.sessions, 0),
    excludedSessions: rows.reduce((sum, point) => sum + point.excludedSessions, 0),
    latestSessions: rows.reduce((sum, point) => sum + point.latestSessions, 0),
    setupSessions: rows.reduce((sum, point) => sum + point.ciSetupSessions, 0),
    attackSimSessions: rows.reduce((sum, point) => sum + point.attackSimSessions, 0),
    ciSarifSessions: rows.reduce((sum, point) => sum + point.ciSarifSessions, 0),
    receiptSessions: rows.reduce((sum, point) => sum + point.receiptSessions, 0),
    riskGraphSessions: rows.reduce((sum, point) => sum + point.riskGraphSessions, 0),
    paidIntentSessions: rows.reduce((sum, point) => sum + point.paidIntentSessions, 0),
    npmDownloads: rows.reduce((sum, point) => sum + point.npmDownloads, 0),
    clones: rows.reduce((sum, point) => sum + point.clones, 0),
    views: rows.reduce((sum, point) => sum + point.views, 0),
  };
}

function sortKpisByMomentum(kpis: KpiMetric[]): KpiMetric[] {
  const score = (kpi: KpiMetric): number => {
    if (kpi.previous === 0 && kpi.current > 0) return 10_000 + kpi.current;
    if (kpi.previous === 0) return kpi.current > 0 ? 1 : 0;
    const change = ((kpi.current - kpi.previous) / kpi.previous) * 100;
    return change + Math.min(kpi.current / Math.max(kpi.previous, 1), 100);
  };

  return [...kpis].sort((a, b) => {
    const directionRank = { up: 0, flat: 1, down: 2 };
    const directionDiff = directionRank[a.trend.direction] - directionRank[b.trend.direction];
    if (directionDiff !== 0) return directionDiff;
    return score(b) - score(a);
  });
}

function allTimeCiSetupSessions(model: DashboardModel): number {
  const funnelSessions = model.telemetry.commandFunnel.find((row) => row.stage === "CI setup")?.sessions ?? 0;
  const dailySessions = model.telemetry.dailyMarketCommandFunnel.reduce((sum, point) => sum + point.ciSetupSessions, 0);
  return Math.max(funnelSessions, dailySessions);
}

function monthlyKpiMetrics(points: UsageTrendPoint[], model: DashboardModel): KpiMetric[] {
  const monthly = new Map<string, {
    ciSetupSessions: number;
    clones: number;
    events: number;
    latestSessions: number;
    npmDownloads: number;
    sessions: number;
  }>();
  for (const point of points) {
    const month = point.day.slice(0, 7);
    const bucket = monthly.get(month) ?? {
      ciSetupSessions: 0,
      clones: 0,
      events: 0,
      latestSessions: 0,
      npmDownloads: 0,
      sessions: 0,
    };
    bucket.ciSetupSessions += point.ciSetupSessions;
    bucket.clones += point.clones;
    bucket.events += point.events;
    bucket.latestSessions += point.latestSessions;
    bucket.npmDownloads += point.npmDownloads;
    bucket.sessions += point.sessions;
    monthly.set(month, bucket);
  }

  const months = [...monthly.keys()].sort();
  const currentPeriod = usagePeriodSummary(points, 30);
  const previousPeriod = usagePeriodSummary(points, 30, 30);
  type MonthlyBucket = NonNullable<ReturnType<typeof monthly.get>>;
  const latestVersion = model.telemetry.versionAdoption.find((row) => row.isLatest);
  const allTimeNpmDownloads = model.npm.daily.reduce((sum, point) => sum + point.downloads, 0);
  const allTimeClones = model.github.daily.reduce((sum, point) => sum + point.clones, 0);
  const allTimeSetupSessions = allTimeCiSetupSessions(model);
  const latestShare = (bucket: MonthlyBucket | undefined): number =>
    bucket && bucket.sessions > 0 ? Math.round((bucket.latestSessions / bucket.sessions) * 100) : 0;
  const periodLatestShare = (period: UsagePeriodSummary): number =>
    period.sessions > 0 ? Math.round((period.latestSessions / period.sessions) * 100) : 0;
  const monthlyValues = (selector: (bucket: MonthlyBucket) => number): number[] =>
    months.map((month) => selector(monthly.get(month) ?? {
      ciSetupSessions: 0,
      clones: 0,
      events: 0,
      latestSessions: 0,
      npmDownloads: 0,
      sessions: 0,
    }));

  return sortKpisByMomentum([
    {
      allTimeLabel: `${formatNumber(model.telemetry.marketSessions)} all-time`,
      color: "#8b5cf6",
      current: currentPeriod.sessions,
      displayValue: currentPeriod.sessions,
      label: "External Sessions",
      monthlyValues: monthlyValues((bucket) => bucket.sessions),
      note: "current 30d market sessions",
      previous: previousPeriod.sessions,
      trend: signedPercent(currentPeriod.sessions, previousPeriod.sessions),
    },
    {
      allTimeLabel: `${formatNumber(model.telemetry.marketEvents)} all-time`,
      color: "#3b82f6",
      current: currentPeriod.events,
      displayValue: currentPeriod.events,
      label: "Market Events",
      monthlyValues: monthlyValues((bucket) => bucket.events),
      note: "current 30d market events",
      previous: previousPeriod.events,
      trend: signedPercent(currentPeriod.events, previousPeriod.events),
    },
    {
      allTimeLabel: `${formatNumber(allTimeNpmDownloads)} all-time`,
      color: "#22d3ee",
      current: currentPeriod.npmDownloads,
      displayValue: currentPeriod.npmDownloads,
      label: "NPM Downloads",
      monthlyValues: monthlyValues((bucket) => bucket.npmDownloads),
      note: "current 30d npm downloads",
      previous: previousPeriod.npmDownloads,
      trend: signedPercent(currentPeriod.npmDownloads, previousPeriod.npmDownloads),
    },
    {
      allTimeLabel: `${formatNumber(allTimeClones)} all-time`,
      color: "#f97316",
      current: currentPeriod.clones,
      displayValue: currentPeriod.clones,
      label: "GitHub Clones",
      monthlyValues: monthlyValues((bucket) => bucket.clones),
      note: "current 30d GitHub clones",
      previous: previousPeriod.clones,
      trend: signedPercent(currentPeriod.clones, previousPeriod.clones),
    },
    {
      allTimeLabel: `${formatNumber(allTimeSetupSessions)} all-time`,
      color: "#22c55e",
      current: currentPeriod.setupSessions,
      displayValue: currentPeriod.setupSessions,
      label: "CI Setup Sessions",
      monthlyValues: monthlyValues((bucket) => bucket.ciSetupSessions),
      note: "current 30d setup sessions",
      previous: previousPeriod.setupSessions,
      trend: signedPercent(currentPeriod.setupSessions, previousPeriod.setupSessions),
    },
    {
      allTimeLabel: `${latestVersion ? `${latestVersion.sessionShare}% all-time` : "No version telemetry"}`,
      color: "#c084fc",
      current: periodLatestShare(currentPeriod),
      displayValue: `${periodLatestShare(currentPeriod)}%`,
      label: "Latest Version Adoption",
      monthlyValues: monthlyValues((bucket) => latestShare(bucket)),
      note: latestVersion ? `${latestVersion.version} latest release` : "No latest version yet",
      previous: periodLatestShare(previousPeriod),
      trend: signedPercent(periodLatestShare(currentPeriod), periodLatestShare(previousPeriod)),
    },
  ]);
}

function marketFunnelPanel(model: DashboardModel, points: UsageTrendPoint[]): string {
  const trend30 = points.slice(-30);
  const trendPrev30 = points.slice(-60, -30);
  const sumAgentInstall = (pts: UsageTrendPoint[]) => pts.reduce((sum, p) => sum + p.agentInstallSessions, 0);
  const month = usagePeriodSummary(points, 30);
  const previousMonth = usagePeriodSummary(points, 30, 30);
  const agentInstall30 = sumAgentInstall(trend30);
  const agentInstallPrev30 = sumAgentInstall(trendPrev30);
  const repeat30 = Math.max(0, month.sessions - agentInstall30);
  const repeatPrev30 = Math.max(0, previousMonth.sessions - agentInstallPrev30);
  const latestPct = month.sessions > 0 ? Math.round((month.latestSessions / month.sessions) * 100) : 0;
  const latestPctPrev = previousMonth.sessions > 0 ? Math.round((previousMonth.latestSessions / previousMonth.sessions) * 100) : 0;

  const stages: Array<{
    label: string;
    header: string;
    value: string;
    sub: string;
    trend: { label: string; direction: "up" | "down" | "flat" };
    color: string;
  }> = [
    {
      label: "GitHub Clones",
      header: "Discovery",
      value: formatNumber(month.clones),
      sub: `${previousMonth.clones > 0 ? formatNumber(previousMonth.clones) : "n/a"} prior`,
      trend: signedPercent(month.clones, previousMonth.clones),
      color: "#f97316",
    },
    {
      label: "NPM Downloads",
      header: "Install",
      value: formatNumber(month.npmDownloads),
      sub: `${previousMonth.npmDownloads > 0 ? formatNumber(previousMonth.npmDownloads) : "n/a"} prior`,
      trend: signedPercent(month.npmDownloads, previousMonth.npmDownloads),
      color: "#22d3ee",
    },
    {
      label: "First Run",
      header: "Usage",
      value: formatNumber(agentInstall30),
      sub: `${agentInstallPrev30 > 0 ? formatNumber(agentInstallPrev30) : "n/a"} prior`,
      trend: signedPercent(agentInstall30, agentInstallPrev30),
      color: "#8b5cf6",
    },
    {
      label: "Repeat Usage",
      header: "Retention",
      value: formatNumber(repeat30),
      sub: `${repeatPrev30 > 0 ? formatNumber(repeatPrev30) : "n/a"} prior`,
      trend: signedPercent(repeat30, repeatPrev30),
      color: "#3b82f6",
    },
    {
      label: "Latest Version",
      header: "Upgrade",
      value: `${latestPct}%`,
      sub: `${formatNumber(month.latestSessions)} sessions · ${model.telemetry.versionHealth.latestVersion}`,
      trend: signedPercent(latestPct, latestPctPrev),
      color: "#5ee85c",
    },
  ];

  const maxValue = Math.max(...stages.map((s) => {
    const parsed = parseFloat(s.value.replace(/,/g, "").replace("%", ""));
    return isNaN(parsed) ? 0 : parsed;
  }), 1);

  return `<article class="panel market-funnel-panel">
    <div class="panel-head"><h2>Market Funnel</h2><span class="panel-note">30-day cohort flow — bar width = relative volume</span></div>
    <div class="funnel-arrow-bar">
      ${stages.map((s) => s.header).join('<span class="funnel-delta arrow">→</span>')}
    </div>
    <div class="funnel-stages">
      ${stages.map((s) => {
        const parsed = parseFloat(s.value.replace(/,/g, "").replace("%", ""));
        const width = maxValue > 0 ? Math.max(4, Math.round((parsed / maxValue) * 100)) : 0;
        return `<div class="funnel-stage">
          <span class="funnel-metric" style="color:${s.color}">${escapeHtml(s.label)}</span>
          <div class="funnel-bar-row">
            <div class="funnel-bar" style="width:${width}%;background:${s.color}"></div>
            <strong class="funnel-value">${escapeHtml(s.value)}</strong>
          </div>
          <span class="funnel-sub">${escapeHtml(s.sub)}</span>
          <em class="funnel-delta ${trendClass(s.trend.direction)}">${s.trend.direction === "down" ? "↓" : s.trend.direction === "up" ? "↑" : "→"} ${escapeHtml(s.trend.label)}</em>
        </div>`;
      }).join("")}
    </div>
  </article>`;
}

function momentumTrendChart(points: UsageTrendPoint[]): string {
  const rows = points.slice(-30);
  if (rows.length === 0) return '<article class="panel momentum-chart-panel"><div class="panel-head"><h2>Momentum Trend</h2></div><div style="padding:16px;color:var(--muted)">No trend data available.</div></article>';

  const seriesDefs: Array<{ key: string; label: string; color: string; axis: "left" | "right"; selector: (p: UsageTrendPoint) => number }> = [
    { key: "sessions", label: "External Sessions", color: "#8b5cf6", axis: "left", selector: (p) => p.sessions },
    { key: "clones", label: "GitHub Clones", color: "#f97316", axis: "left", selector: (p) => p.clones },
    { key: "downloads", label: "NPM Downloads", color: "#22d3ee", axis: "left", selector: (p) => p.npmDownloads },
    { key: "installs", label: "Active Installs", color: "#3b82f6", axis: "left", selector: (p) => p.agentInstallSessions },
    { key: "versionAdoption", label: "Version Adoption %", color: "#5ee85c", axis: "right", selector: (p) => p.latestSessionShare },
  ];

  const padLeft = 56;
  const padRight = 44;
  const padTop = 14;
  const padBottom = 36;
  const svgWidth = 700;
  const svgHeight = 300;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const leftMax = Math.max(
    ...rows.map((p) => Math.max(p.sessions, p.clones, p.npmDownloads, p.agentInstallSessions)),
    1,
  );
  const rightMax = 100;

  const leftY = (value: number): number => padTop + plotHeight - (value / leftMax) * plotHeight;
  const rightY = (value: number): number => padTop + plotHeight - (value / rightMax) * plotHeight;

  const pathData = (values: number[], axisY: (v: number) => number): string => {
    if (values.length === 0) return "";
    if (values.length === 1) return `M ${padLeft} ${axisY(values[0]!)} L ${svgWidth - padRight} ${axisY(values[0]!)}`;
    return values
      .map((value, i) => {
        const x = padLeft + (i / (values.length - 1)) * plotWidth;
        const y = axisY(value);
        return `${i === 0 ? "M" : "L"} ${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
      })
      .join(" ");
  };

  const leftGridValues = [0, leftMax * 0.25, leftMax * 0.5, leftMax * 0.75, leftMax].map((v) => Math.round(v));
  const rightGridValues = [0, 25, 50, 75, 100];

  const gridLines = [...new Set([...leftGridValues.map((v) => leftY(v)), ...rightGridValues.map((v) => rightY(v))])]
    .sort((a, b) => a - b)
    .map((y) => `<line x1="${padLeft}" x2="${svgWidth - padRight}" y1="${Math.round(y)}" y2="${Math.round(y)}" class="chart-grid"/>`)
    .join("");

  const leftAxisLabels = leftGridValues
    .map((v) => `<text x="${padLeft - 6}" y="${leftY(v) + 4}" text-anchor="end" class="chart-label">${v >= 1000 ? Math.round(v / 1000) + "k" : v}</text>`)
    .join("");
  const rightAxisLabels = rightGridValues
    .map((v) => `<text x="${svgWidth - padRight + 6}" y="${rightY(v) + 4}" text-anchor="start" class="chart-label">${v}%</text>`)
    .join("");

  const seriesPaths = seriesDefs.map((def) => {
    const values = rows.map(def.selector);
    const d = def.axis === "left" ? pathData(values, leftY) : pathData(values, rightY);
    return `<path d="${d}" class="chart-line" data-series="${def.key}" stroke="${def.color}" fill="none"/>`;
  }).join("");

  const xLabels = rows
    .filter((_, i) => i % 6 === 0 || i === rows.length - 1)
    .map((point, filteredIdx) => {
      const sourceIndex = rows.indexOf(point);
      const x = padLeft + (rows.length <= 1 ? 0 : (sourceIndex / (rows.length - 1)) * plotWidth);
      const anchor = filteredIdx === 0 ? "start" : filteredIdx >= rows.filter((_, i) => i % 6 === 0 || i === rows.length - 1).length - 1 ? "end" : "middle";
      return `<text x="${Math.round(x)}" y="${svgHeight - 10}" text-anchor="${anchor}" class="chart-label">${escapeHtml(shortDate(point.day))}</text>`;
    }).join("");

  const seriesDataJson = JSON.stringify(
    seriesDefs.map((def) => ({
      key: def.key,
      label: def.label,
      color: def.color,
      axis: def.axis,
      values: rows.map(def.selector),
    })),
  );
  const dayLabelsJson = JSON.stringify(rows.map((p) => p.day));

  return `<article class="panel momentum-chart-panel">
    <div class="panel-head"><h2>Momentum Trend</h2><span class="panel-note">30-day market signals</span></div>
    <div class="momentum-toggles" id="momentum-toggles">
      ${seriesDefs.map((def) => `<button class="momentum-toggle active" data-series="${def.key}" type="button"><i></i>${escapeHtml(def.label)}</button>`).join("")}
    </div>
    <div class="momentum-chart-wrap" id="momentum-chart-wrap">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet" aria-label="Momentum trend chart">
        <rect x="${padLeft}" y="${padTop}" width="${plotWidth}" height="${plotHeight}" fill="none"/>
        ${gridLines}
        ${leftAxisLabels}
        ${rightAxisLabels}
        ${seriesPaths}
        ${xLabels}
        <rect id="momentum-hitarea" x="${padLeft}" y="${padTop}" width="${plotWidth}" height="${plotHeight}" fill="transparent" style="cursor:crosshair"/>
      </svg>
      <div class="chart-tooltip" id="momentum-tooltip"></div>
    </div>
    <script type="application/json" id="momentum-series-data">${seriesDataJson}</script>
    <script type="application/json" id="momentum-day-labels">${dayLabelsJson}</script>
  </article>`;
}

function adoptionPulseCards(points: UsageTrendPoint[]): string {
  if (points.length === 0) return "";

  const day = usagePeriodSummary(points, 1);
  const week = usagePeriodSummary(points, 7);
  const previousWeek = usagePeriodSummary(points, 7, 7);
  const month = usagePeriodSummary(points, 30);
  const previousMonth = usagePeriodSummary(points, 30, 30);

  const monthTrend = signedPercent(month.sessions, previousMonth.sessions);
  const sparklineValues = points.slice(-30).map((p) => p.sessions);

  const northStar = `<article class="north-star-card">
    <div class="ns-header">
      <span class="ns-icon">&#x1F9ED;</span>
      <span class="ns-label">External Adoption</span>
    </div>
    <div class="ns-stats">
      <div class="ns-stat"><strong>${formatNumber(day.sessions)}</strong><small>today</small></div>
      <div class="ns-stat"><strong>${formatNumber(week.sessions)}</strong><small>this week</small></div>
      <div class="ns-stat ${trendClass(monthTrend.direction)}"><strong>${escapeHtml(monthTrend.label)}</strong><small>vs 30d</small></div>
    </div>
    <small class="ns-note">Internal traffic excluded</small>
    <div class="ns-separator"></div>
    <div class="ns-sparkline">${sparkline(sparklineValues, "#8b5cf6")}</div>
  </article>`;

  const clonesTrend = signedPercent(week.clones, previousWeek.clones);
  const npmTrend = signedPercent(week.npmDownloads, previousWeek.npmDownloads);

  const currentVersionShare = month.sessions > 0 ? Math.round((month.latestSessions / month.sessions) * 100) : 0;
  const previousVersionShare = previousMonth.sessions > 0 ? Math.round((previousMonth.latestSessions / previousMonth.sessions) * 100) : 0;
  const versionTrend = signedPercent(currentVersionShare, previousVersionShare);

  const directionArrow = (d: "up" | "down" | "flat"): string => d === "up" ? "↗" : d === "down" ? "↘" : "→";

  const card = (
    label: string,
    value: string | number,
    periodLabel: string,
    previousLabel: string,
    trend: { label: string; direction: "up" | "down" | "flat" },
  ): string => `<article class="pulse-card">
    <span class="pulse-card-label">${escapeHtml(label)}</span>
    <strong class="pulse-card-value">${escapeHtml(typeof value === "number" ? formatNumber(value) : value)} <small>${escapeHtml(periodLabel)}</small></strong>
    <div class="pulse-card-delta">
      <em class="${trendClass(trend.direction)}">${escapeHtml(trend.label)} vs ${escapeHtml(previousLabel)}</em>
      <span class="pulse-card-arrow ${trendClass(trend.direction)}">${directionArrow(trend.direction)}</span>
    </div>
  </article>`;

  const pulseCards = [
    card("GitHub Clones", week.clones, "last 7 days", "prev 7 days", clonesTrend),
    card("NPM Downloads", week.npmDownloads, "last 7 days", "prev 7 days", npmTrend),
    card("Active Installs", month.sessions, "last 30 days", "prev 30 days", monthTrend),
    card("Latest Version (Market)", `${currentVersionShare}% adoption`, "market sessions", "prev 30 days", versionTrend),
  ].join("");

  return `<section class="adoption-pulse" aria-label="Adoption Pulse">
    ${northStar}
    <div class="pulse-grid">${pulseCards}</div>
  </section>`;
}

function kpiMomentumPanel(kpis: KpiMetric[]): string {
  if (kpis.length === 0) return "";
  return `<article class="panel">
    <div class="panel-head"><h2>KPI Momentum</h2><span class="panel-note">month over month · all time</span></div>
    <div class="momentum-grid">
      ${kpis.map((kpi) => `<article class="small-card momentum-card">
        <div>
          <span>${escapeHtml(kpi.label)}</span>
          <strong>${escapeHtml(typeof kpi.displayValue === "number" ? formatNumber(kpi.displayValue) : kpi.displayValue)}</strong>
          <small>${escapeHtml(kpi.allTimeLabel)}</small>
        </div>
        <div class="momentum-line">${sparkline(kpi.monthlyValues, kpi.color)}</div>
        <em class="${trendClass(kpi.trend.direction)}">${kpi.trend.direction === "down" ? "↓" : kpi.trend.direction === "up" ? "↑" : "→"} ${escapeHtml(kpi.trend.label)} MoM</em>
      </article>`).join("")}
    </div>
  </article>`;
}

function growthCommandCenterPanel(model: DashboardModel, points: UsageTrendPoint[]): string {
  const month = usagePeriodSummary(points, 30);
  const latestVersion = model.telemetry.versionAdoption.find((row) => row.isLatest);
  const attackStage = model.telemetry.commandFunnel.find((row) => row.stage === "Attack simulation");
  const setupStage = model.telemetry.commandFunnel.find((row) => row.stage === "CI setup");
  const paidStage = model.telemetry.commandFunnel.find((row) => row.stage === "Paid intent");
  const receiptStage = model.telemetry.commandFunnel.find((row) => row.stage === "Receipts");
  const riskGraphStage = model.telemetry.commandFunnel.find((row) => row.stage === "Risk graph");
  const externalCi = model.telemetry.sourceCounts.find((row) => row.source === "external_ci")?.sessions ?? 0;
  const latestShare = latestVersion?.sessionShare ?? 0;
  const nextAction = month.attackSimSessions === 0
    ? "Push attack-sim as the first demo after every scan."
    : month.receiptSessions === 0
      ? "Turn attack-sim results into portable MCP receipts."
    : month.riskGraphSessions === 0
      ? "Turn receipts into MCP risk graphs for agent toolchain visibility."
    : month.setupSessions === 0
      ? "Convert risk graph entries into setup-ci --sarif runs."
      : month.paidIntentSessions === 0
        ? "Route high-risk receipts to the paid pilot offer."
        : "Follow up with the highest-intent accounts from paid and CI sessions.";
  const rows = [
    { label: "Latest-version adoption", value: `${latestShare}%`, context: latestVersion ? `${formatNumber(latestVersion.sessions)} sessions on ${latestVersion.version}` : "No version telemetry", color: "#8b5cf6" },
    { label: "Attack-sim sessions", value: formatNumber(attackStage?.sessions ?? 0), context: `${formatNumber(month.attackSimSessions)} in current 30d`, color: "#ef4444" },
    { label: "Receipt sessions", value: formatNumber(receiptStage?.sessions ?? 0), context: `${formatNumber(month.receiptSessions)} in current 30d`, color: "#c084fc" },
    { label: "Risk-graph sessions", value: formatNumber(riskGraphStage?.sessions ?? 0), context: `${formatNumber(month.riskGraphSessions)} in current 30d`, color: "#14b8a6" },
    { label: "CI setup sessions", value: formatNumber(setupStage?.sessions ?? 0), context: `${formatNumber(month.ciSarifSessions)} SARIF setup sessions in current 30d`, color: "#22c55e" },
    { label: "External CI", value: formatNumber(externalCi), context: "market CI sessions", color: "#3b82f6" },
    { label: "Paid intent", value: formatNumber(paidStage?.sessions ?? 0), context: `${formatNumber(month.paidIntentSessions)} cloud/report sessions in current 30d`, color: "#f97316" },
  ];
  return `<article class="panel">
    <div class="panel-head"><h2>Growth Command Center</h2><span class="panel-note">private operator view</span></div>
    <div class="momentum-grid">
      ${rows.map((row) => `<article class="small-card">
        <span>${escapeHtml(row.label)}</span>
        <strong style="color:${row.color}">${escapeHtml(row.value)}</strong>
        <small>${escapeHtml(row.context)}</small>
      </article>`).join("")}
      <article class="small-card">
        <span>Next best action</span>
        <strong style="font-size:17px;line-height:1.18">${escapeHtml(nextAction)}</strong>
        <small>Optimize for latest attack-sim, receipts, risk graphs, and setup-ci --sarif sessions.</small>
      </article>
    </div>
  </article>`;
}

function dailyDirectionPanel(model: DashboardModel): string {
  return `<article class="panel">
    <div class="panel-head"><h2>What Changed Today</h2><span class="panel-note">latest market day vs prior market day</span></div>
    <div class="direction-grid">
      ${model.telemetry.dailyDirectionSignals.map((signal) => `<article class="direction-card">
        <div><span>${escapeHtml(signal.metric)}</span><em class="${trendClass(signal.direction)}">${signal.direction === "down" ? "↓" : signal.direction === "up" ? "↑" : "→"} ${escapeHtml(signal.deltaLabel)}</em></div>
        <strong>${formatNumber(signal.current)}</strong>
        <small>${escapeHtml(`${signal.context}; previous ${formatNumber(signal.previous)}. ${signal.nextAction}`)}</small>
      </article>`).join("")}
    </div>
  </article>`;
}

function conversionPanel(model: DashboardModel): string {
  return `<article class="panel">
    <div class="panel-head"><h2>Conversion Readiness</h2><span class="panel-note">market usage to receipts, CI, paid intent</span></div>
    <div class="conversion-list">
      ${model.telemetry.funnelConversions.map((row) => {
        const zeroHelp = row.numerator === 0 && row.name.toLowerCase().includes("receipt")
          ? `<span class="zero-tip" title="No active tracking">&#x1F6A7; Run \`observatory receipt\` to generate portable proof</span>`
          : row.numerator === 0 && row.name.toLowerCase().includes("risk")
          ? `<span class="zero-tip" title="No active tracking">&#x1F6A7; Run \`observatory risk-graph\` for fleet visibility</span>`
          : row.numerator === 0
          ? `<span class="zero-tip" title="No active tracking">&#x2139;&#xFE0F; No activity yet</span>`
          : "";
        return `<div class="conversion-row">
          <span><b>${escapeHtml(row.name)}</b><small>${escapeHtml(row.context)}</small></span>
          <strong>${escapeHtml(`${row.rate}%`)}</strong>
          <em>${formatNumber(row.numerator)} / ${formatNumber(row.denominator)} ${zeroHelp}</em>
        </div>`;
      }).join("")}
    </div>
  </article>`;
}

function dataQualityPanel(model: DashboardModel): string {
  return `<article class="panel">
    <div class="panel-head"><h2>Data Quality</h2><span class="panel-note">pipeline &amp; collector health</span></div>
    <ul class="quality-list">
      ${model.telemetry.dataQualitySignals.map((signal) => `<li><span class="status ${signal.status === "ok" ? "ok" : signal.status === "bad" ? "bad" : "warn"}">${escapeHtml(signal.status)}</span><div><b>${escapeHtml(signal.label)}</b><small>${escapeHtml(signal.detail)}</small></div></li>`).join("")}
      ${model.sourceRuns.map((run) => `<li><span class="status ${run.status === "success" ? "ok" : run.status === "failed" ? "bad" : "warn"}">${escapeHtml(run.status)}</span><div><b>${escapeHtml(`${run.source} collector`)}</b><small>${escapeHtml(`${run.finishedAt || run.startedAt}; ${formatNumber(run.rowsSeen)} rows seen; ${run.error || "no error"}`)}</small></div></li>`).join("")}
    </ul>
  </article>`;
}

function productHealthPanel(model: DashboardModel): string {
  const vh = model.telemetry.versionHealth;
  const latest = model.telemetry.versionAdoption.find((row) => row.isLatest);
  const statusClass = vh.staleSessions > vh.latestSessions ? "warn" : "ok";
  const statusLabel = vh.staleSessions > vh.latestSessions ? "\u26A0\uFE0F Update lag" : "\u2705 On latest";
  return `<article class="panel">
    <div class="panel-head"><h2>Product Health</h2><span class="panel-note">user behavior alerts</span></div>
    <ul class="quality-list">
      <li><span class="status ${statusClass}">${statusLabel}</span><div>
        <b>Version adoption</b>
        <small>${vh.latestVersion ? `${formatNumber(vh.latestSessions)} active sessions on ${vh.latestVersion} (${latest ? latest.sessionShare : 0}% of fleet); ${formatNumber(vh.staleSessions)} on older versions.` : "No version telemetry yet."}</small>
      </div></li>
      ${vh.staleVersions.length > 0 ? `<li><span class="status warn">\u2139\uFE0F</span><div><b>Stale versions in use</b><small>${vh.staleVersions.map((v) => `${v.version} (${v.sessions} sessions)`).join(", ")}</small></div></li>` : ""}
    </ul>
  </article>`;
}

function detailRow(category: string, metricName: string, value: string | number, context: string): string {
  const search = `${category} ${metricName} ${value} ${context}`.toLowerCase();
  return `<tr data-search-row data-search="${escapeHtml(search)}" hidden><td>${escapeHtml(category)}</td><td>${escapeHtml(metricName)}</td><td>${escapeHtml(value)}</td><td>${escapeHtml(context)}</td></tr>`;
}

function detailSearchRows(model: DashboardModel, points: UsageTrendPoint[]): string {
  const rows: string[] = [];
  const add = (category: string, metricName: string, value: string | number, context: string): void => {
    rows.push(detailRow(category, metricName, value, context));
  };
  const day = usagePeriodSummary(points, 1);
  const week = usagePeriodSummary(points, 7);
  const previousWeek = usagePeriodSummary(points, 7, 7);
  const month = usagePeriodSummary(points, 30);
  const previousMonth = usagePeriodSummary(points, 30, 30);
  const kpiMomentum = monthlyKpiMetrics(usageTrendPoints(model, Number.POSITIVE_INFINITY), model);
  const latestVersion = model.telemetry.versionAdoption.find((row) => row.isLatest);
  const ciSetupStage = model.telemetry.commandFunnel.find((row) => row.stage === "CI setup");
  const cloneDownloadSignals = model.github.clones14 + model.npm.downloads14;

  add("KPI", "Market day", `${formatNumber(day.sessions)} sessions`, `${day.startDay}; ${formatNumber(day.events)} events; ${formatNumber(day.excludedSessions)} internal sessions excluded`);
  add("KPI", "Market week", `${formatNumber(week.sessions)} sessions`, `${week.startDay} to ${week.endDay}; ${delta(week.sessions, previousWeek.sessions)}`);
  add("KPI", "Market month", `${formatNumber(month.sessions)} sessions`, `${month.startDay} to ${month.endDay}; ${formatNumber(month.events)} events`);
  add("KPI", "Monthly change", percentChangeLabel(month.sessions, previousMonth.sessions), `${formatNumber(month.sessions)} current 30d sessions vs ${formatNumber(previousMonth.sessions)} prior 30d sessions`);
  add("KPI", "Setup conversion", conversionPercent(month.setupSessions, month.clones + month.npmDownloads), `${formatNumber(month.setupSessions)} setup sessions / ${formatNumber(month.clones + month.npmDownloads)} 30d clone+download signals`);
  add("Growth", "Attack-sim conversion", `${formatNumber(month.attackSimSessions)} sessions`, "Current 30d sessions for the public demo wedge");
  add("Growth", "Receipt conversion", `${formatNumber(month.receiptSessions)} sessions`, "Current 30d sessions that generated MCP receipts");
  add("Growth", "Risk graph conversion", `${formatNumber(month.riskGraphSessions)} sessions`, "Current 30d sessions that mapped receipts/artifacts into MCP risk graphs");
  add("Growth", "SARIF setup", `${formatNumber(month.ciSarifSessions)} sessions`, "Current 30d setup-ci/init-ci sessions that requested SARIF");
  add("Growth", "Paid intent", `${formatNumber(month.paidIntentSessions)} sessions`, "Current 30d cloud, cloud-upload, and enterprise-report sessions");
  for (const signal of model.telemetry.dailyDirectionSignals) {
    add("Daily direction", signal.metric, `${formatNumber(signal.current)} current`, `${signal.deltaLabel}; previous ${formatNumber(signal.previous)}; ${signal.context}; ${signal.nextAction}`);
  }
  for (const conversion of model.telemetry.funnelConversions) {
    add("Conversion", conversion.name, `${conversion.rate}%`, `${formatNumber(conversion.numerator)} / ${formatNumber(conversion.denominator)}; ${conversion.context}`);
  }
  add("Version", "Stale sessions", `${formatNumber(model.telemetry.versionHealth.staleSessions)} sessions`, `${model.telemetry.versionHealth.staleSessionShare}% all-time share outside ${model.telemetry.versionHealth.latestVersion || "latest"}`);
  for (const stale of model.telemetry.versionHealth.staleVersions) {
    add("Version stale", stale.version, `${formatNumber(stale.sessions)} sessions`, `${formatNumber(stale.events)} events`);
  }
  for (const signal of model.telemetry.dataQualitySignals) {
    add("Data quality", signal.label, signal.status, signal.detail);
  }
  for (const kpi of kpiMomentum) {
    add("KPI momentum", kpi.label, typeof kpi.displayValue === "number" ? formatNumber(kpi.displayValue) : kpi.displayValue, `${kpi.trend.label} month over month; ${kpi.allTimeLabel}`);
  }
  add("Version", "Latest adoption", latestVersion ? `${percent(month.latestSessions, month.sessions)} 30d` : "n/a", latestVersion ? `${latestVersion.version}; ${formatNumber(month.latestSessions)} latest-version sessions / ${formatNumber(month.sessions)} market sessions` : "No version telemetry yet");
  add("Acquisition", "Clone/download to CI", conversionPercent(ciSetupStage?.sessions ?? 0, cloneDownloadSignals), `${formatNumber(ciSetupStage?.sessions ?? 0)} setup sessions / ${formatNumber(cloneDownloadSignals)} visible clone+download signals`);
  add("Usage", "Internal excluded", `${formatNumber(Math.max(model.telemetry.totalSessions - model.telemetry.marketSessions, 0))} sessions`, "First-party CI and internal repo activity are not counted in market KPIs");
  add("Usage", "Latest external activity", model.telemetry.latestExternalSeen || "n/a", `${formatNumber(model.telemetry.marketEvents)} market events across ${formatNumber(model.telemetry.marketSessions)} market sessions`);

  for (const point of [...points].reverse()) {
    add(
      "Daily market",
      point.day,
      `${formatNumber(point.sessions)} sessions`,
      `${formatNumber(point.events)} events; latest ${formatNumber(point.latestSessions)} (${point.latestSessionShare}%); attack-sim ${formatNumber(point.attackSimSessions)}; receipts ${formatNumber(point.receiptSessions)}; setup ${formatNumber(point.ciSetupSessions)}; SARIF setup ${formatNumber(point.ciSarifSessions)}; paid intent ${formatNumber(point.paidIntentSessions)}; npm ${formatNumber(point.npmDownloads)}; clones ${formatNumber(point.clones)}; internal excluded ${formatNumber(point.excludedSessions)}`,
    );
  }
  for (const row of model.telemetry.commandFunnel) {
    add("Command funnel", row.stage, `${formatNumber(row.sessions)} sessions`, `${row.commands}; ${formatNumber(row.events)} events; ${row.recommendation}`);
  }
  for (const row of model.telemetry.versionAdoption) {
    add("Version", row.version, `${formatNumber(row.sessions)} sessions`, `${formatNumber(row.events)} events; ${row.sessionShare}% share${row.isLatest ? "; latest" : ""}`);
  }
  for (const row of model.telemetry.sourceCounts) {
    add("Telemetry source", row.source, `${formatNumber(row.sessions)} sessions`, `${formatNumber(row.events)} events`);
  }
  for (const row of model.telemetry.topDomainDetails) {
    add("Account", row.domain, `${formatNumber(row.sessions)} sessions`, `${formatNumber(row.events)} events; top command ${row.topCommand}; latest ${row.latestSeen}`);
  }
  for (const row of model.telemetry.topCommands) {
    add("Command", row.command, `${formatNumber(row.sessions)} sessions`, `${formatNumber(row.events)} events`);
  }
  for (const row of model.github.referrers) {
    add("GitHub referrer", row.referrer, `${formatNumber(row.count)} views`, `${formatNumber(row.uniques)} uniques`);
  }
  for (const row of model.github.paths) {
    add("GitHub path", row.path, `${formatNumber(row.count)} views`, `${row.title}; ${formatNumber(row.uniques)} uniques`);
  }
  add("GitHub", "Clones last 7 visible days", model.github.clones7, delta(model.github.clones7, model.github.clonesPrevious7));
  add("GitHub", "Views last 7 visible days", model.github.views7, delta(model.github.views7, model.github.viewsPrevious7));
  for (const row of model.github.daily) {
    add("GitHub daily", row.day, `${formatNumber(row.clones)} clones`, `${formatNumber(row.uniqueCloners)} unique cloners; ${formatNumber(row.views)} views; ${formatNumber(row.uniqueViewers)} unique viewers`);
  }
  add("npm", "Downloads last 7 days", model.npm.downloads7, delta(model.npm.downloads7, model.npm.downloadsPrevious7));
  add("npm", "Downloads last 30 days", model.npm.downloads30, delta(model.npm.downloads30, model.npm.downloadsPrevious30));
  for (const row of model.npm.daily) {
    add("npm daily", row.day, `${formatNumber(row.downloads)} downloads`, row.day === model.npm.latestDay ? "latest npm day" : "");
  }
  for (const run of model.sourceRuns) {
    add("Collection run", run.source, run.status, `${run.finishedAt || run.startedAt}; ${formatNumber(run.rowsSeen)} rows seen; ${formatNumber(run.rowsInserted)} inserted; ${run.error}`);
  }
  for (const run of model.recentFailures) {
    add("Collection failure", run.source, run.startedAt, run.error);
  }
  for (const run of model.github.workflowRuns) {
    add("Workflow", run.name, run.conclusion || run.status, run.updatedAt);
  }

  return rows.join("");
}

function classifyAccountType(domain: string): string {
  if (domain.startsWith("github:")) return "GitHub Actions";
  if (/^(\d{1,3}\.){2,3}/.test(domain)) return "Unknown";
  if (FREE_EMAIL_DOMAINS.has(domain)) return "Individual";
  if (/\.(local|localhost|internal|corp|lan|test|dev)$/.test(domain)) return "Internal";
  if (/ci|pipeline|runner|agent|bot|build/i.test(domain)) return "CI Bot";
  return "Company";
}

function classifyConfidence(domain: string): "High" | "Medium" | "Low" {
  if (domain.startsWith("github:")) return "High";
  if (/^(\d{1,3}\.){2,3}/.test(domain)) return "Low";
  if (FREE_EMAIL_DOMAINS.has(domain)) return "Medium";
  if (/\.(local|localhost|internal|corp|lan|test|dev)$/.test(domain)) return "Low";
  if (domain.includes(".") && /\.(com|io|co|org|net|dev|ai|app)$/.test(domain)) return "High";
  return "Medium";
}

function growthBadge(sessions: number, totalSessions: number, firstSeen: string, latestSeen: string): { label: string; direction: "up" | "down" | "flat" | "new" } {
  if (!firstSeen) return { label: "N/A", direction: "flat" };
  const firstTime = new Date(firstSeen).getTime();
  const lastTime = new Date(latestSeen || firstSeen).getTime();
  const daysActive = Math.max(1, Math.round((lastTime - firstTime) / MS_PER_DAY));
  const sessionsPerDay = sessions / daysActive;
  const overallAvg = totalSessions / Math.max(1, daysActive);
  const share = overallAvg > 0 ? Math.round(((sessionsPerDay - overallAvg) / overallAvg) * 100) : 0;
  if (daysActive <= 2 && sessions <= 12) return { label: "New", direction: "new" };
  if (sessionsPerDay >= overallAvg * 1.5) return { label: `↗ +${share}%`, direction: "up" };
  if (sessionsPerDay <= overallAvg * 0.5) return { label: `↘ ${share}%`, direction: "down" };
  return { label: "→ 0%", direction: "flat" };
}

function formatShortDate(iso: string): string {
  if (!iso) return "n/a";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function commandTrendArrow(commandSummary: { command: string; events: number; sessions: number; uniqueDomains: number }, topCommands: Array<{ command: string; events: number; sessions: number; uniqueDomains: number }>, externalSessions: number): string {
  const share = externalSessions > 0 ? commandSummary.sessions / externalSessions : 0;
  if (share >= 0.4) return "↗";
  if (share <= 0.08) return "↘";
  if (share <= 0.03) return "↘";
  const rank = topCommands.findIndex((cmd) => cmd.command === commandSummary.command);
  if (rank <= 1) return "↗";
  if (rank >= topCommands.length - 2) return "↘";
  return "→";
}

function minutesAgo(from: string, to: string): string {
  if (!from) return "unknown";
  const fromMs = new Date(from).getTime();
  const toMs = to ? new Date(to).getTime() : Date.now();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return "unknown";
  const diff = Math.max(0, Math.round((toMs - fromMs) / (60 * 1000)));
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} min ago`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dataTrustStatusStrip(model: DashboardModel): string {
  const latestFinished = model.sourceRuns
    .map((run) => run.finishedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? "";
  const freshness = latestFinished ? minutesAgo(latestFinished, model.generatedAt) : "unknown";
  const freshnessStatus = freshness.includes("d") || freshness === "unknown" ? "warn" : "ok";
  const totalSignals = model.telemetry.dataQualitySignals.length;
  const okSignals = model.telemetry.dataQualitySignals.filter((s) => s.status === "ok").length;
  const completeness = totalSignals > 0 ? Math.round((okSignals / totalSignals) * 100) : 0;
  const completenessStatus = completeness >= 80 ? "ok" : completeness >= 50 ? "warn" : "bad";

  return `<div class="trust-strip">
    <div class="trust-strip-inner">
      <span class="trust-item trust-${freshnessStatus}">Data freshness: updated ${escapeHtml(freshness)}</span>
      <span class="trust-separator">|</span>
      <span class="trust-item trust-ok">Internal filters: active</span>
      <span class="trust-separator">|</span>
      <span class="trust-item trust-ok">Bot filtering: active</span>
      <span class="trust-separator">|</span>
      <span class="trust-item trust-ok">PII masking: active</span>
      <span class="trust-separator">|</span>
      <span class="trust-item trust-${completenessStatus}">Data completeness: ${completeness}%</span>
    </div>
  </div>`;
}

function anomaliesPanel(model: DashboardModel): string {
  const threshold = 10;
  const cards: string[] = [];

  const npmTrend = signedPercent(model.npm.downloads7, model.npm.downloadsPrevious7);
  if (npmTrend.direction !== "flat" && npmTrend.label !== "new") {
    const npmDelta = model.npm.downloadsPrevious7 > 0
      ? Math.round(((model.npm.downloads7 - model.npm.downloadsPrevious7) / model.npm.downloadsPrevious7) * 100)
      : 0;
    if (Math.abs(npmDelta) >= threshold) {
      const icon = npmDelta > 0 ? "\u{1F4C8}" : "\u{1F4C9}";
      const change = npmDelta > 0 ? `up ${npmDelta}%` : `down ${Math.abs(npmDelta)}%`;
      cards.push(`<article class="anomaly-card">
        <div class="anomaly-icon">${icon}</div>
        <strong>NPM downloads ${escapeHtml(change)}</strong>
        <p>Check package release cadence, registry lag, or weekday seasonality. Compare against GitHub clone trend.</p>
      </article>`);
    }
  }

  const cloneTrend = signedPercent(model.github.clones7, model.github.clonesPrevious7);
  if (cloneTrend.direction !== "flat" && cloneTrend.label !== "new") {
    const cloneDelta = model.github.clonesPrevious7 > 0
      ? Math.round(((model.github.clones7 - model.github.clonesPrevious7) / model.github.clonesPrevious7) * 100)
      : 0;
    if (Math.abs(cloneDelta) >= threshold) {
      const icon = cloneDelta > 0 ? "\u{1F4C8}" : "\u{1F4C9}";
      const change = cloneDelta > 0 ? `up ${cloneDelta}%` : `down ${Math.abs(cloneDelta)}%`;
      const topReferrer = model.github.referrers.slice().sort((a, b) => b.uniques - a.uniques)[0];
      let body = `Identify source repos/referrers. Did installs follow?`;
      if (topReferrer) {
        body += `<br>Top referrer: ${escapeHtml(topReferrer.referrer)} (${topReferrer.uniques} uniques)`;
      }
      cards.push(`<article class="anomaly-card">
        <div class="anomaly-icon">${icon}</div>
        <strong>GitHub clones ${escapeHtml(change)}</strong>
        <p>${body}</p>
      </article>`);
    }
  }

  const latestVersion = model.telemetry.versionAdoption.find((row) => row.isLatest);
  if (latestVersion && latestVersion.sessionShare < 10) {
    cards.push(`<article class="anomaly-card">
      <div class="anomaly-icon">\u26A0\uFE0F</div>
      <strong>Latest version adoption only ${latestVersion.sessionShare}%</strong>
      <p>${formatNumber(latestVersion.sessions)} of ${formatNumber(model.telemetry.totalSessions)} sessions on current version. Consider upgrade prompt, compatibility check, or migration guide.</p>
    </article>`);
  }

  if (cards.length === 0) return "";

  return `<article class="panel">
    <div class="panel-head"><h2>Anomalies &amp; Opportunities</h2><span class="panel-note">surfacing judgment from data</span></div>
    <div class="anomalies-grid">${cards.join("\n")}</div>
  </article>`;
}

function autoGeneratedSummary(model: DashboardModel, points: UsageTrendPoint[]): string {
  const month = usagePeriodSummary(points, 30);
  const previousMonth = usagePeriodSummary(points, 30, 30);
  const monthChangeValue = previousMonth.sessions > 0
    ? Math.round(((month.sessions - previousMonth.sessions) / previousMonth.sessions) * 100)
    : month.sessions > 0 ? 999 : 0;

  const channels: Array<{ name: string; delta: number }> = [
    { name: "external sessions", delta: monthChangeValue },
    {
      name: "GitHub clones",
      delta: previousMonth.clones > 0 ? Math.round(((month.clones - previousMonth.clones) / previousMonth.clones) * 100) : 0,
    },
    {
      name: "NPM downloads",
      delta: previousMonth.npmDownloads > 0 ? Math.round(((month.npmDownloads - previousMonth.npmDownloads) / previousMonth.npmDownloads) * 100) : 0,
    },
  ];

  const topDriver = [...channels].sort((a, b) => b.delta - a.delta)[0];
  const topConcern = channels.filter((ch) => ch.delta < 0).sort((a, b) => a.delta - b.delta)[0];

  const latestVersion = model.telemetry.versionAdoption.find((row) => row.isLatest);
  const versionStatus = latestVersion
    ? latestVersion.sessionShare < 10
      ? `Latest version adoption at ${latestVersion.sessionShare}% — upgrade conversion is bottleneck.`
      : `Latest version adoption at ${latestVersion.sessionShare}%.`
    : "No version telemetry available yet.";

  let summary = "External adoption ";
  if (monthChangeValue === 999) {
    summary += "new activity MoM";
  } else if (monthChangeValue > 0) {
    summary += `\u2191 ${monthChangeValue}% MoM`;
  } else if (monthChangeValue < 0) {
    summary += `\u2193 ${Math.abs(monthChangeValue)}% MoM`;
  } else {
    summary += "flat MoM";
  }

  if (topDriver && topDriver.delta > 0 && topDriver.name !== "external sessions") {
    summary += `, driven by ${topDriver.name}`;
  }

  const agentInstall = model.telemetry.commandFunnel.find((row) => row.stage === "Agent install");
  if (agentInstall && agentInstall.sessions > 0 && monthChangeValue > 0) {
    summary += " and serve command usage";
  }
  summary += ". ";

  const npm7Trend = signedPercent(model.npm.downloads7, model.npm.downloadsPrevious7);
  if (npm7Trend.direction === "down") {
    const npm7Delta = model.npm.downloadsPrevious7 > 0
      ? Math.round(Math.abs(((model.npm.downloads7 - model.npm.downloadsPrevious7) / model.npm.downloadsPrevious7) * 100))
      : 0;
    summary += `NPM downloads \u2193 ${npm7Delta}% (7 days). `;
  }

  if (topConcern) {
    summary += `${escapeHtml(topConcern.name)} \u2193 ${Math.abs(topConcern.delta)}% — needs attention. `;
  }

  summary += versionStatus;

  return `<div class="summary-bar">
    <span class="summary-icon">\u{1F4CB}</span>
    <div>
      <strong>What Changed</strong>
      <p>${escapeHtml(summary)}</p>
    </div>
  </div>`;
}

export function renderDashboardHtml(model: DashboardModel): string {
  const trendPoints = usageTrendPoints(model, TREND_WINDOW_DAYS);
  const allTrendPoints = usageTrendPoints(model, Number.POSITIVE_INFINITY);
  const kpiMomentum = monthlyKpiMetrics(allTrendPoints, model);
  const adoptionPulse = adoptionPulseCards(trendPoints);
  const momentumPanel = kpiMomentumPanel(kpiMomentum);
  const marketFunnel = marketFunnelPanel(model, trendPoints);
  const growthCommandCenter = growthCommandCenterPanel(model, trendPoints);
  const dailyDirection = dailyDirectionPanel(model);
  const conversions = conversionPanel(model);
  const dataQuality = dataQualityPanel(model);
  const productHealth = productHealthPanel(model);
  const searchRows = detailSearchRows(model, trendPoints);
  const summaryBar = autoGeneratedSummary(model, trendPoints);
  const trustStrip = dataTrustStatusStrip(model);
  const anomaliesHtml = anomaliesPanel(model);
  const day = usagePeriodSummary(trendPoints, 1);
  const month = usagePeriodSummary(trendPoints, 30);
  const previousMonth = usagePeriodSummary(trendPoints, 30, 30);
  const sourceRows = [
    { label: "Local", value: model.telemetry.sourceCounts.find((row) => row.source === "local")?.sessions ?? 0, color: "#8b5cf6" },
    { label: "External CI", value: model.telemetry.sourceCounts.find((row) => row.source === "external_ci")?.sessions ?? 0, color: "#3b82f6" },
    { label: "MCP", value: model.telemetry.sourceCounts.find((row) => row.source === "mcp")?.sessions ?? 0, color: "#22d3ee" },
    { label: "Internal Excluded", value: model.telemetry.firstPartyCiSessions, color: "#64748b" },
  ];
  const topCategories = [
    { label: "Agent installs", value: model.telemetry.commandFunnel.find((row) => row.stage === "Agent install")?.sessions ?? 0, color: "#8b5cf6" },
    { label: "Validation", value: model.telemetry.commandFunnel.find((row) => row.stage === "Local validation")?.sessions ?? 0, color: "#3b82f6" },
    { label: "Regression", value: model.telemetry.commandFunnel.find((row) => row.stage === "Regression workflow")?.sessions ?? 0, color: "#f59e0b" },
    { label: "CI setup", value: model.telemetry.commandFunnel.find((row) => row.stage === "CI setup")?.sessions ?? 0, color: "#22c55e" },
    { label: "Attack sim", value: model.telemetry.commandFunnel.find((row) => row.stage === "Attack simulation")?.sessions ?? 0, color: "#ef4444" },
    { label: "Paid intent", value: model.telemetry.commandFunnel.find((row) => row.stage === "Paid intent")?.sessions ?? 0, color: "#f97316" },
  ];
  const rightAccounts = model.telemetry.topDomainDetails.slice(0, 5);
  const allTopCommands = model.telemetry.topCommands.slice(0, 6);
  const totalExternalSessions = model.telemetry.externalSessions;
  const latestVersion = model.telemetry.versionAdoption.find((row) => row.isLatest);
  const collectionRows = model.sourceRuns.map((run) => `<tr><td>${escapeHtml(run.source)}</td><td><span class="status ${run.status === "success" ? "ok" : run.status === "failed" ? "bad" : "warn"}">${escapeHtml(run.status)}</span></td><td>${escapeHtml(run.finishedAt || run.startedAt)}</td></tr>`).join("");
  const workflowRows = model.github.workflowRuns.slice(0, 5).map((run) => `<tr><td>${escapeHtml(run.name)}</td><td><span class="status ${run.conclusion === "success" ? "ok" : run.conclusion ? "bad" : "warn"}">${escapeHtml(run.conclusion || run.status)}</span></td><td>${escapeHtml(run.updatedAt)}</td></tr>`).join("");

  const accountsRows = rightAccounts.map((row) => {
    const accountType = classifyAccountType(row.domain);
    const confidence = classifyConfidence(row.domain);
    const growth = growthBadge(row.sessions, totalExternalSessions, row.firstSeen, row.latestSeen);
    const growthClass = growth.direction === "up" ? "trend-up" : growth.direction === "down" ? "trend-down" : growth.direction === "new" ? "trend-up" : "trend-flat";
    return `<div class="account-row">
      <div class="account-head"><b>${escapeHtml(row.domain)}</b><span class="type-badge type-${accountType.toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(accountType)}</span></div>
      <div class="account-meta">
        <span>First: ${formatShortDate(row.firstSeen)}</span>
        <span>Last: ${formatShortDate(row.latestSeen)}</span>
        <span>${formatNumber(row.sessions)} sessions</span>
        <span class="${growthClass}">Growth: ${escapeHtml(growth.label)}</span>
        <span class="conf-${confidence.toLowerCase()}">Confidence: ${escapeHtml(confidence)}</span>
      </div>
    </div>`;
  }).join("");

  const commandsRows = allTopCommands.map((row) => {
    const share = totalExternalSessions > 0 ? Math.round((row.sessions / totalExternalSessions) * 100) : 0;
    const barWidth = Math.max(2, share);
    const trend = commandTrendArrow(row, allTopCommands, totalExternalSessions);
    return `<div class="command-row">
      <div class="command-head"><span class="cmd-name">${escapeHtml(row.command)}</span><span class="cmd-bar" style="width:${barWidth}%"></span><span class="cmd-share">${share}%</span><em class="cmd-arrow">${trend}</em></div>
      <div class="command-sub">${formatNumber(row.sessions)} sessions<span class="cmd-sep">·</span>${formatNumber(row.uniqueDomains)} unique accounts</div>
    </div>`;
  }).join("");
  const releaseLabel = model.github.latestRelease ? `${model.github.latestRelease} · ${model.github.latestReleasePublishedAt.slice(0, 10)}` : "No release seen";
  const visibleRange = `${shortDate(trendPoints[0]?.day ?? "")} - ${shortDate(trendPoints.at(-1)?.day ?? "")}`;
  const monthChange = signedPercent(month.sessions, previousMonth.sessions);
  const hasSuccessfulWorkflow = model.github.workflowRuns.some((run) => run.conclusion === "success");
  const safetyIndex = Math.min(100, Math.max(0, Math.round(
    62 +
    (month.setupSessions > 0 ? 8 : 0) +
    (latestVersion ? Math.min(12, latestVersion.sessionShare / 2) : 0) +
    (hasSuccessfulWorkflow ? 8 : 0) +
    (model.recentFailures.length === 0 ? 5 : 0),
  )));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MCP Observatory Local Metrics</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --bg:#050b13; --rail:#07111d; --panel:#0b1724; --panel-2:#0e1d2c; --line:#203143; --soft:#132437; --ink:#f5f7fb; --muted:#94a3b8; --dim:#64748b; --purple:#8b5cf6; --blue:#3b82f6; --cyan:#22d3ee; --green:#5ee85c; --orange:#f97316; --red:#ef4444; --yellow:#facc15; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; background:radial-gradient(circle at 70% -10%, rgba(59,130,246,.18), transparent 36%), linear-gradient(180deg, #07111d 0%, var(--bg) 45%, #03070c 100%); color:var(--ink); }
    .app-shell { display:grid; grid-template-columns:244px minmax(0, 1fr); min-height:100vh; }
    .sidebar { border-right:1px solid var(--line); background:linear-gradient(180deg, rgba(10,20,33,.96), rgba(4,10,17,.98)); padding:22px 12px; position:sticky; top:0; height:100vh; overflow:auto; }
    .brand { display:flex; align-items:center; margin:0 8px 28px; min-height:56px; }
    .logo { display:block; max-width:100%; }
    .logo-pixel { color:#cfd8ff; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size:6.25px; font-weight:800; letter-spacing:0; line-height:1.08; margin:0; text-shadow:0 0 8px rgba(139,92,246,.65), 0 0 13px rgba(34,211,238,.18); white-space:pre; }
    .brand-name { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; }
    .nav-section { margin:18px 0 8px; padding:0 10px; color:var(--muted); font-size:11px; letter-spacing:.08em; text-transform:uppercase; }
    .nav-item { display:flex; align-items:center; gap:10px; height:34px; padding:0 10px; margin:3px 0; border-radius:7px; color:#cbd5e1; font-size:13px; }
    .nav-item.active { background:linear-gradient(90deg, rgba(139,92,246,.33), rgba(59,130,246,.08)); color:#fff; box-shadow:inset 3px 0 0 var(--purple); }
    .nav-dot { width:15px; height:15px; border-radius:5px; border:1px solid #718096; display:inline-block; position:relative; }
    .nav-item.active .nav-dot { border-color:var(--purple); background:rgba(139,92,246,.18); }
    .index-card { margin:22px 10px; padding:14px; border:1px solid var(--line); border-radius:8px; background:linear-gradient(180deg, rgba(15,29,45,.92), rgba(8,17,28,.92)); }
    .index-card h3 { margin:0 0 8px; font-size:14px; }
    .index-score { font-size:28px; font-weight:760; }
    .index-score span { font-size:13px; color:var(--muted); font-weight:500; }
    .mini-line { margin-top:12px; height:34px; }
    .sidebar-foot { margin:22px 10px 0; padding-top:18px; border-top:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; color:#cbd5e1; font-size:13px; }
    .pro { background:linear-gradient(135deg, #4f46e5, #7c3aed); padding:4px 9px; border-radius:6px; font-size:12px; }
    main { min-width:0; padding:22px 24px 34px; }
    header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:18px; }
    h1 { margin:0; font-size:20px; line-height:1.15; letter-spacing:0; }
    p { color:#c6d0dd; margin:6px 0 0; font-size:13px; line-height:1.35; }
    .actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
    button, .range-pill { border:1px solid #33465b; background:#07111d; color:#e5edf7; border-radius:8px; padding:9px 12px; font:inherit; font-size:12px; cursor:pointer; min-height:36px; }
    button.primary { background:linear-gradient(135deg, #4f46e5, #7c3aed); border-color:#6047f5; font-weight:650; }
    button:hover { border-color:#7c5cff; }
    button:disabled { opacity:.62; cursor:not-allowed; }
    .refresh-status { color:var(--muted); font-size:12px; min-width:100px; }
    .adoption-pulse { margin-bottom:16px; }
    .north-star-card { background:linear-gradient(180deg, rgba(14,29,44,.94), rgba(8,18,30,.96)); border:1px solid var(--line); border-radius:10px; box-shadow:0 16px 38px rgba(0,0,0,.22); padding:18px 22px 14px; }
    .ns-header { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
    .ns-icon { font-size:18px; line-height:1; }
    .ns-label { color:#e5edf7; font-size:15px; font-weight:650; }
    .ns-stats { display:flex; align-items:baseline; gap:40px; flex-wrap:wrap; margin:8px 0 4px; }
    .ns-stat strong { display:block; font-size:28px; line-height:1; }
    .ns-stat small { display:block; color:var(--muted); font-size:12px; margin-top:3px; }
    .ns-note { display:block; color:var(--dim); font-size:11px; margin-bottom:2px; }
    .ns-separator { height:1px; background:var(--line); margin:6px 0 8px; }
    .ns-sparkline .sparkline { height:40px; }
    .pulse-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; margin-top:12px; }
    .pulse-card { background:linear-gradient(180deg, rgba(14,29,44,.94), rgba(8,18,30,.96)); border:1px solid var(--line); border-radius:8px; box-shadow:0 16px 38px rgba(0,0,0,.22); padding:14px 16px; min-height:112px; display:flex; flex-direction:column; justify-content:space-between; }
    .pulse-card-label { display:block; color:#cbd5e1; font-size:12px; }
    .pulse-card-value { display:block; font-size:23px; margin-top:5px; line-height:1.15; }
    .pulse-card-value small { color:var(--dim); font-size:11px; font-weight:400; }
    .pulse-card-delta { display:flex; align-items:center; justify-content:space-between; margin-top:6px; }
    .pulse-card-delta em { font-style:normal; font-size:12px; color:var(--dim); }
    .pulse-card-arrow { font-size:17px; line-height:1; }
    .kpi-card, .panel, .small-card { background:linear-gradient(180deg, rgba(14,29,44,.94), rgba(8,18,30,.96)); border:1px solid var(--line); border-radius:8px; box-shadow:0 16px 38px rgba(0,0,0,.22); }
    .kpi-card { min-height:132px; padding:15px 16px 12px; overflow:hidden; }
    .kpi-top { display:flex; align-items:center; justify-content:space-between; gap:8px; color:#dbe5f1; font-size:13px; }
    .kpi-top em { font-style:normal; font-size:12px; white-space:nowrap; }
    .trend-up { color:var(--green); } .trend-down { color:#ff5c57; } .trend-flat { color:var(--muted); }
    .kpi-card strong { display:block; margin-top:8px; font-size:27px; line-height:1; letter-spacing:0; }
    .kpi-card small { display:block; color:#c4cfdb; font-size:12px; margin-top:8px; }
    .sparkline { width:100%; height:34px; margin-top:10px; overflow:visible; }
    .dashboard-grid { display:grid; grid-template-columns:minmax(0, 1fr) 390px; gap:16px; align-items:start; }
    .main-grid { display:grid; gap:16px; min-width:0; }
    .right-rail { display:grid; gap:16px; min-width:0; }
    .two-col { display:grid; grid-template-columns:minmax(0, 1.2fr) minmax(320px, .8fr); gap:16px; }
    .signal-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; }
    .panel { overflow:hidden; }
    .panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:15px 17px 8px; }
    .panel h2 { margin:0; font-size:15px; letter-spacing:0; }
    .panel-note { color:var(--muted); font-size:12px; }
    .legend { display:flex; align-items:center; gap:14px; flex-wrap:wrap; color:#cbd5e1; font-size:12px; }
    .legend i { display:inline-block; width:12px; height:8px; border-radius:2px; margin-right:5px; }
    .chart-pad { padding:4px 16px 16px; }
    .line-chart, .bar-chart { width:100%; height:auto; display:block; }
    .grid-line { stroke:#1d2d3f; stroke-width:1; }
    .line { fill:none; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; }
    .session-line { stroke:var(--purple); } .npm-line { stroke:var(--cyan); } .clone-line { stroke:var(--orange); }
    .axis-label { fill:#8fa0b4; font-size:11px; }
    .donut-wrap { display:grid; grid-template-columns:150px minmax(0, 1fr); gap:14px; align-items:center; padding:4px 18px 18px; }
    .donut { width:150px; height:150px; }
    .donut-value { fill:#fff; font-size:18px; font-weight:760; }
    .donut-label { fill:#94a3b8; font-size:10px; }
    .hbar-row { display:grid; grid-template-columns:110px minmax(0, 1fr) 44px; gap:9px; align-items:center; margin:10px 0; font-size:12px; color:#dbe5f1; }
    .hbar-row div { height:8px; background:#172435; border-radius:20px; overflow:hidden; }
    .hbar-row i { display:block; height:100%; border-radius:20px; }
    .hbar-row em { color:#cbd5e1; font-style:normal; text-align:right; }
    .small-card { padding:14px 15px; min-height:104px; }
    .small-card span { color:#cbd5e1; font-size:12px; }
    .small-card strong { display:block; font-size:25px; margin-top:10px; }
    .small-card small { color:var(--muted); font-size:12px; }
    .direction-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:10px; padding:4px 16px 16px; }
    .direction-card { border:1px solid rgba(51,70,91,.7); border-radius:8px; background:#091522; padding:12px; min-height:112px; }
    .direction-card div { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .direction-card span { color:#cbd5e1; font-size:12px; }
    .direction-card em { font-style:normal; font-size:12px; white-space:nowrap; }
    .direction-card strong { display:block; margin-top:9px; font-size:24px; }
    .direction-card small { display:block; margin-top:6px; color:var(--muted); font-size:11px; line-height:1.35; }
    .conversion-list, .quality-list { padding:2px 16px 16px; margin:0; }
    .conversion-row { display:grid; grid-template-columns:minmax(0, 1fr) 74px 92px; gap:12px; align-items:center; padding:11px 0; border-bottom:1px solid rgba(51,70,91,.55); }
    .conversion-row:last-child { border-bottom:0; }
    .conversion-row b, .quality-list b { display:block; font-size:12px; color:#e5edf7; }
    .conversion-row small, .quality-list small { display:block; margin-top:3px; color:var(--muted); font-size:11px; line-height:1.35; }
    .conversion-row strong { color:var(--green); font-size:18px; text-align:right; }
    .conversion-row em { color:#cbd5e1; font-style:normal; font-size:12px; text-align:right; }
    .quality-list { list-style:none; display:grid; gap:9px; }
    .quality-list li { display:grid; grid-template-columns:54px minmax(0, 1fr); gap:10px; align-items:start; border:1px solid rgba(51,70,91,.55); border-radius:8px; padding:10px; background:#091522; }
    .momentum-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; padding:4px 16px 16px; }
    .momentum-card { display:grid; grid-template-columns:minmax(0, .95fr) minmax(92px, .8fr) auto; gap:12px; align-items:center; min-height:112px; }
    .momentum-card strong { font-size:22px; }
    .momentum-card em { justify-self:end; font-style:normal; font-size:12px; white-space:nowrap; }
    .momentum-line .sparkline { margin-top:0; height:38px; }
    .list { list-style:none; padding:0 16px 14px; margin:0; }
    .list li { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid rgba(51,70,91,.55); }
    .list li:last-child { border-bottom:0; }
    .list b { display:block; font-size:13px; font-weight:620; color:#e5edf7; }
    .list small { display:block; margin-top:3px; color:#94a3b8; font-size:11px; }
    .list em { font-style:normal; color:#e5edf7; font-size:13px; }
    .filter-chip { cursor:pointer; padding:3px 9px; border:1px solid rgba(51,70,91,.65); border-radius:6px; font-size:11px; background:#071628; }
    .filter-chip:hover { border-color:#7c5cff; }
    .account-list, .command-list { padding:4px 0 4px; }
    .account-row { padding:12px 17px; border-bottom:1px solid rgba(51,70,91,.55); }
    .account-row:last-child { border-bottom:0; }
    .account-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
    .account-head b { font-size:13px; font-weight:620; color:#e5edf7; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .account-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:11px; color:var(--muted); }
    .account-meta span:not(:first-child)::before { content:"·"; margin-right:10px; color:#3a5068; }
    .type-badge { display:inline-flex; align-items:center; padding:2px 7px; border-radius:5px; font-size:10.5px; font-weight:580; white-space:nowrap; }
    .type-company { background:rgba(34,211,238,.14); color:#67e8f9; border:1px solid rgba(34,211,238,.28); }
    .type-ci-bot { background:rgba(59,130,246,.14); color:#93c5fd; border:1px solid rgba(59,130,246,.28); }
    .type-github-actions { background:rgba(139,92,246,.14); color:#c4b5fd; border:1px solid rgba(139,92,246,.28); }
    .type-unknown { background:rgba(100,116,139,.14); color:#94a3b8; border:1px solid rgba(100,116,139,.28); }
    .type-individual { background:rgba(249,115,22,.14); color:#fdba74; border:1px solid rgba(249,115,22,.28); }
    .type-internal { background:rgba(239,68,68,.14); color:#fca5a5; border:1px solid rgba(239,68,68,.28); }
    .conf-high { color:var(--green); }
    .conf-medium { color:var(--yellow); }
    .conf-low { color:#ff5c57; }
    .command-row { padding:14px 17px 11px; border-bottom:1px solid rgba(51,70,91,.55); }
    .command-row:last-child { border-bottom:0; }
    .command-head { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
    .cmd-name { font-size:13px; font-weight:620; color:#e5edf7; min-width:72px; }
    .cmd-bar { display:inline-block; height:7px; background:linear-gradient(90deg, #7c5cff, #a78bfa); border-radius:20px; min-width:4px; }
    .cmd-share { font-size:12px; color:var(--muted); min-width:36px; text-align:right; white-space:nowrap; }
    .cmd-arrow { font-style:normal; font-size:13px; color:var(--green); white-space:nowrap; }
    .command-sub { font-size:11px; color:var(--muted); padding-left:80px; }
    .cmd-sep { margin:0 6px; color:#3a5068; }
    .table-panel { padding-bottom:6px; }
    table { width:100%; border-collapse:collapse; font-size:12px; line-height:1.25; }
    th, td { padding:9px 14px; border-bottom:1px solid rgba(51,70,91,.55); text-align:left; vertical-align:top; }
    th { color:#90a4ba; font-size:11px; font-weight:600; }
    tr:last-child td { border-bottom:0; }
    tr[hidden] { display:none !important; }
    .status { display:inline-flex; align-items:center; gap:5px; font-size:12px; }
    .status.ok { color:var(--green); } .status.bad { color:#ff5c57; } .status.warn { color:var(--yellow); }
    .search-shell { padding:15px 16px 16px; }
    .search-bar { display:flex; align-items:center; gap:9px; margin-bottom:10px; }
    .search-bar input { width:100%; min-width:0; border:1px solid #33465b; border-radius:8px; background:#07111d; color:#f8fafc; font:inherit; font-size:13px; padding:10px 11px; outline:none; }
    .search-bar input:focus { border-color:#7c5cff; box-shadow:0 0 0 3px rgba(124,92,255,.18); }
    .search-count { color:var(--muted); font-size:12px; min-width:110px; text-align:right; }
    .search-results { max-height:340px; overflow:auto; border:1px solid rgba(51,70,91,.65); border-radius:8px; }
    .empty-row td { color:var(--muted); padding:22px 10px; text-align:center; }
    /* Market Funnel */
    .market-funnel-panel { margin-bottom:16px; }
    .funnel-stages { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:0; padding:4px 0 16px; align-items:start; position:relative; }
    .funnel-stage { text-align:center; padding:12px 8px; position:relative; }
    .funnel-stage:not(:last-child)::after { content:""; position:absolute; right:-1px; top:14px; bottom:14px; width:1px; background:linear-gradient(180deg, transparent, #33465b 30%, #33465b 70%, transparent); }
    .funnel-arrow-bar { display:flex; align-items:center; justify-content:center; padding:0 12px 6px; color:#33465b; font-size:15px; letter-spacing:1px; }
    .funnel-label { display:block; font-size:11px; color:#90a4ba; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; }
    .funnel-metric { display:block; font-size:13px; color:#cbd5e1; margin-bottom:2px; }
    .funnel-value { display:block; font-size:26px; font-weight:690; line-height:1.1; margin:4px 0; }
    .funnel-sub { display:block; font-size:11px; color:#90a4ba; }
    .funnel-delta { display:inline-flex; align-items:center; gap:3px; font-size:12px; font-style:normal; margin-top:4px; }
    .funnel-delta.arrow { margin-top:0; padding:0 4px; }
    .funnel-connector { display:flex; align-items:center; justify-content:center; }
    .funnel-connector svg { opacity:.45; }
    .funnel-bar-row { display:flex; align-items:center; gap:6px; margin:4px 0; }
    .funnel-bar { height:18px; border-radius:3px; min-width:2px; transition:width .3s ease; }
    .funnel-bar-row .funnel-value { font-size:18px; margin:0; }
    .zero-tip { display:inline-block; color:#f59e0b; font-size:9px; margin-left:4px; cursor:help; }
    /* Momentum Trend Chart */
    .momentum-chart-panel { margin-bottom:16px; }
    .momentum-toggles { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:8px 16px 2px; }
    .momentum-toggle { display:flex; align-items:center; gap:5px; font-size:11px; color:#90a4ba; cursor:pointer; padding:4px 10px; border:1px solid rgba(51,70,91,.7); border-radius:12px; background:transparent; font-family:inherit; }
    .momentum-toggle.active { color:#e5edf7; border-color:var(--purple); background:rgba(139,92,246,.12); }
    .momentum-toggle i { display:inline-block; width:9px; height:9px; border-radius:3px; }
    .momentum-toggle[data-series="sessions"] i { background:#8b5cf6; }
    .momentum-toggle[data-series="clones"] i { background:#f97316; }
    .momentum-toggle[data-series="downloads"] i { background:#22d3ee; }
    .momentum-toggle[data-series="installs"] i { background:#3b82f6; }
    .momentum-toggle[data-series="versionAdoption"] i { background:#5ee85c; }
    .momentum-chart-wrap { position:relative; padding:0 16px 16px; }
    .momentum-chart-wrap svg { width:100%; height:auto; display:block; }
    .momentum-chart-wrap .chart-line { fill:none; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; transition:opacity .15s; }
    .momentum-chart-wrap .chart-line.hidden { opacity:0; }
    .chart-tooltip { position:absolute; pointer-events:none; background:rgba(8,18,30,.96); border:1px solid #33465b; border-radius:7px; padding:8px 10px; font-size:11px; color:#e5edf7; white-space:nowrap; box-shadow:0 8px 24px rgba(0,0,0,.4); z-index:2; display:none; }
    .chart-tooltip b { display:block; font-size:11px; margin-bottom:2px; color:var(--muted); }
    .chart-tooltip .tip-item { display:flex; align-items:center; gap:5px; padding:1px 0; font-size:12px; }
    .chart-tooltip .tip-dot { width:8px; height:8px; border-radius:3px; flex-shrink:0; }
    .chart-tooltip .tip-val { margin-left:8px; color:#cbd5e1; }
    .chart-axis-left, .chart-axis-right { fill:#7b8ea3; font-size:10px; }
    .momentum-chart-wrap .chart-grid { stroke:#1d2d3f; stroke-width:1; }
    .momentum-chart-wrap .chart-label { fill:#7b8ea3; font-size:10px; }
    .integration-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:9px; padding:0 16px 16px; }
    .integration { border:1px solid rgba(51,70,91,.7); border-radius:8px; padding:11px 8px; text-align:center; background:#091522; }
    .integration b { display:block; font-size:12px; margin-top:7px; }
    .integration span { color:var(--green); font-size:11px; }
    .icon { font-size:21px; line-height:1; }
    @media (max-width: 1320px) { .app-shell { grid-template-columns:210px minmax(0, 1fr); } .pulse-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); } .dashboard-grid { grid-template-columns:1fr; } .right-rail { grid-template-columns:repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 1100px) { .momentum-grid, .direction-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); } }
    .trust-strip { border:1px solid var(--line); border-radius:8px; background:linear-gradient(90deg, rgba(14,29,44,.92), rgba(11,23,36,.92)); margin-bottom:16px; overflow:hidden; }
    .trust-strip-inner { display:flex; align-items:center; gap:10px; padding:9px 16px; font-size:12px; color:var(--muted); flex-wrap:wrap; }
    .trust-item { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; }
    .trust-item::before { content:""; width:8px; height:8px; border-radius:50%; display:inline-block; flex-shrink:0; }
    .trust-ok::before { background:var(--green); box-shadow:0 0 6px rgba(94,232,92,.45); }
    .trust-warn::before { background:var(--yellow); box-shadow:0 0 6px rgba(250,204,21,.45); }
    .trust-bad::before { background:var(--red); box-shadow:0 0 6px rgba(239,68,68,.45); }
    .trust-separator { color:#33465b; flex-shrink:0; }
    .summary-bar { border:1px solid rgba(79,70,229,.4); border-radius:8px; background:linear-gradient(90deg, rgba(79,70,229,.18), rgba(14,29,44,.88)); padding:16px 18px; margin-bottom:16px; display:flex; align-items:flex-start; gap:14px; }
    .summary-bar .summary-icon { font-size:20px; line-height:1.3; flex-shrink:0; }
    .summary-bar strong { display:block; font-size:14px; margin-bottom:5px; }
    .summary-bar p { margin:0; font-size:13px; color:#c6d0dd; line-height:1.4; }
    .anomalies-grid { padding:4px 16px 16px; display:flex; flex-direction:column; gap:10px; }
    .anomaly-card { border:1px solid rgba(51,70,91,.7); border-radius:8px; background:#091522; padding:14px 15px; }
    .anomaly-card .anomaly-icon { font-size:18px; margin-bottom:6px; }
    .anomaly-card strong { display:block; font-size:16px; margin-bottom:6px; }
    .anomaly-card p { margin:0; font-size:12px; color:#94a3b8; line-height:1.4; }
    @media (max-width: 900px) { .app-shell { display:block; } .sidebar { position:relative; height:auto; padding:10px 12px; } .brand { margin:0; min-height:36px; } .logo-pixel { font-size:4.35px; line-height:1.04; } .sidebar .nav-section, .sidebar .nav-item, .index-card, .sidebar-foot { display:none; } main { padding:16px 12px 28px; } header { display:block; } .actions { justify-content:flex-start; margin-top:12px; } .pulse-grid, .two-col, .signal-grid, .right-rail, .integration-grid, .momentum-grid, .direction-grid { grid-template-columns:1fr; } .momentum-card, .conversion-row { grid-template-columns:minmax(0, 1fr); } .momentum-card em { justify-self:start; } .conversion-row strong, .conversion-row em { text-align:left; } .donut-wrap { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><span class="logo">${brandAsciiLogo()}</span><span class="brand-name">MCP Observatory</span></div>
      ${navItem("Overview", true)}
      <div class="nav-section">Usage</div>
      ${navItem("Adoption")}${navItem("Repositories")}${navItem("Active Installs")}${navItem("Geography")}
      <div class="nav-section">Quality & Security</div>
      ${navItem("Findings")}${navItem("SARIF Alerts")}${navItem("Fixed Issues")}${navItem("Regressions")}${navItem("Schema Drift")}
      <div class="nav-section">CI / Workflows</div>
      ${navItem("Workflow Runs")}${navItem("PR Insights")}${navItem("Release Gates")}
      <div class="index-card">
        <h3>MCP Safety Index</h3>
        <div class="index-score">${safetyIndex}<span>/100</span></div>
        <p><span class="${trendClass(monthChange.direction)}">${monthChange.label}</span> latest-version adoption</p>
        <div class="mini-line">${sparkline(trendPoints.slice(-18).map((point) => point.latestSessions), "#8b5cf6")}</div>
      </div>
      <div class="sidebar-foot"><span>KryptosAI</span><span class="pro">Pro</span></div>
    </aside>
    <main>
      <header>
        <div>
          <h1>Overview</h1>
          <p>Real-time insights into MCP server adoption, release health, and ecosystem pull. Internal activity is separated from market usage.</p>
        </div>
        <div class="actions">
          <span class="range-pill">${escapeHtml(visibleRange)}</span>
          <button id="refresh-button" type="button">Update Data</button>
          <button type="button">Share</button>
          <button class="primary" type="button">Export</button>
          <span id="refresh-status" class="refresh-status"></span>
        </div>
      </header>
      ${summaryBar}
      ${trustStrip}
      ${anomaliesHtml}
      ${adoptionPulse || `<section class="adoption-pulse" aria-label="Adoption Pulse"><article class="north-star-card"><div class="ns-header"><span class="ns-icon">&#x1F9ED;</span><span class="ns-label">External Adoption</span></div><div class="ns-stats"><div class="ns-stat"><strong>0</strong><small>today</small></div><div class="ns-stat"><strong>0</strong><small>this week</small></div><div class="ns-stat trend-flat"><strong>0%</strong><small>vs 30d</small></div></div><small class="ns-note">Refresh data to build adoption windows</small></article></section>`}
      ${momentumTrendChart(trendPoints)}
      <section class="dashboard-grid">
        <div class="main-grid">
          ${momentumPanel}
          ${growthCommandCenter}
          ${dailyDirection}
          ${marketFunnel}
          <section class="two-col">
            <article class="panel">
              <div class="panel-head">
                <h2>Usage Over Time</h2>
                <div class="legend"><span><i style="background:var(--purple)"></i>Sessions</span><span><i style="background:var(--cyan)"></i>NPM</span><span><i style="background:var(--orange)"></i>Clones</span></div>
              </div>
              <div class="chart-pad">${lineChart(trendPoints)}</div>
            </article>
            <article class="panel">
              <div class="panel-head"><h2>Usage by Source</h2><span class="panel-note">${formatNumber(model.telemetry.marketSessions)} external sessions</span></div>
              <div class="donut-wrap">
                ${donutChart(sourceRows)}
                <div>${horizontalBars(sourceRows)}</div>
              </div>
            </article>
          </section>
          <section class="signal-grid">
            <div class="small-card"><span>Latest external</span><strong>${formatNumber(day.sessions)}</strong><small>${escapeHtml(model.telemetry.latestExternalSeen || "n/a")}</small></div>
            <div class="small-card"><span>Setup conversion</span><strong>${escapeHtml(conversionPercent(month.setupSessions, month.clones + month.npmDownloads))}</strong><small>${formatNumber(month.setupSessions)} setup / ${formatNumber(month.clones + month.npmDownloads)} signals</small></div>
            <div class="small-card"><span>Latest version</span><strong>${escapeHtml(latestVersion?.version ?? "n/a")}</strong><small>${latestVersion ? `${latestVersion.sessionShare}% all sessions` : "No version telemetry"}</small></div>
            <div class="small-card"><span>Release</span><strong>${escapeHtml(model.github.latestRelease || "n/a")}</strong><small>${escapeHtml(releaseLabel)}</small></div>
          </section>
          <section class="two-col">
            <article class="panel">
              <div class="panel-head">
                <h2>Command Funnel Over Time</h2>
                <div class="legend"><span><i style="background:#3b82f6"></i>Validation</span><span><i style="background:#8b5cf6"></i>Install</span><span><i style="background:#22c55e"></i>Setup</span></div>
              </div>
              <div class="chart-pad">${stackedBarChart(trendPoints)}</div>
            </article>
            <article class="panel">
              <div class="panel-head"><h2>Top Finding Categories</h2><span class="panel-note">by command stage</span></div>
              <div style="padding:0 16px 16px">${horizontalBars(topCategories)}</div>
            </article>
          </section>
          <section class="two-col">
            ${conversions}
            ${productHealth}
          </section>
          <section class="two-col" style="margin-top:0">
            ${dataQuality}
          </section>
          <section class="panel table-panel">
            <div class="panel-head"><h2>Recent Workflow Runs</h2><span class="panel-note">GitHub Actions</span></div>
            <table><thead><tr><th>Workflow</th><th>Status</th><th>Updated</th></tr></thead><tbody>${workflowRows || '<tr class="empty-row"><td colspan="3">No workflow runs collected.</td></tr>'}</tbody></table>
          </section>
        </div>
        <aside class="right-rail">
          <section class="panel right-account-panel">
            <div class="panel-head"><h2>Top Accounts</h2><span class="panel-note filter-chip">Filter ▾</span></div>
            <div class="account-list">${accountsRows || '<div class="account-row"><div class="account-head"><b>No accounts yet</b></div><div class="account-meta"><span>Search telemetry after refresh</span></div></div>'}</div>
          </section>
          <section class="panel right-command-panel">
            <div class="panel-head"><h2>Top Commands</h2><span class="panel-note">share · sessions · accounts</span></div>
            <div class="command-list">${commandsRows || '<div class="command-row"><div class="command-head"><span class="cmd-name">No commands yet</span></div></div>'}</div>
          </section>
          <section class="panel table-panel">
            <div class="panel-head"><h2>Collection Health</h2><span class="panel-note">${escapeHtml(model.generatedAt)}</span></div>
            <table><thead><tr><th>Source</th><th>Status</th><th>Finished</th></tr></thead><tbody>${collectionRows}</tbody></table>
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Integrations</h2><span class="panel-note">connected</span></div>
            <div class="integration-grid">
              <div class="integration"><div class="icon">GH</div><b>GitHub</b><span>${formatNumber(model.github.clones7)} clones</span></div>
              <div class="integration"><div class="icon">CI</div><b>Actions</b><span>${formatNumber(model.github.workflowRuns.length)} runs</span></div>
              <div class="integration"><div class="icon">npm</div><b>NPM</b><span>${formatNumber(model.npm.downloads7)} downloads</span></div>
              <div class="integration"><div class="icon">OT</div><b>Telemetry</b><span>${formatNumber(model.telemetry.marketSessions)} sessions</span></div>
            </div>
          </section>
          <section class="panel search-shell" aria-label="Evidence search">
            <div class="panel-head" style="padding:0 0 12px"><h2>Search evidence</h2><span id="search-count" class="search-count">0 results</span></div>
            <div class="search-bar"><input id="detail-search" type="search" placeholder="Search domains, commands, npm, GitHub, versions, setup, internal, failures, or dates" autocomplete="off"></div>
            <div class="search-results">
              <table>
                <thead><tr><th>Area</th><th>Metric</th><th>Value</th><th>Context</th></tr></thead>
                <tbody id="detail-results">
                  ${searchRows}
                  <tr id="search-empty" class="empty-row"><td colspan="4">Type to reveal detailed evidence.</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </aside>
      </section>
    </main>
  </div>
  <script>
    const button = document.getElementById("refresh-button");
    const status = document.getElementById("refresh-status");
    const setStatus = (text) => { if (status) status.textContent = text; };
    if (location.protocol === "file:") {
      if (button) button.disabled = true;
      setStatus("Run npm run metrics:serve to enable updates");
    } else if (button) {
      button.addEventListener("click", async () => {
        button.disabled = true;
        setStatus("Updating...");
        try {
          const response = await fetch("/api/refresh", { method: "POST" });
          if (!response.ok) throw new Error(await response.text());
          setStatus("Updated. Reloading...");
          location.reload();
        } catch (error) {
          setStatus(error instanceof Error ? error.message : String(error));
          button.disabled = false;
        }
      });
    }
    const detailSearch = document.getElementById("detail-search");
    const searchCount = document.getElementById("search-count");
    const searchEmpty = document.getElementById("search-empty");
    const detailRows = Array.from(document.querySelectorAll("[data-search-row]"));
    const setSearchCount = (text) => { if (searchCount) searchCount.textContent = text; };
    const applyDetailSearch = () => {
      const query = detailSearch && "value" in detailSearch ? String(detailSearch.value).trim().toLowerCase() : "";
      let matches = 0;
      let visible = 0;
      for (const row of detailRows) {
        const haystack = row instanceof HTMLElement ? row.dataset.search || "" : "";
        const hit = query.length > 0 && haystack.includes(query);
        if (hit) matches += 1;
        const show = hit && visible < 80;
        if (show) visible += 1;
        if (row instanceof HTMLElement) row.hidden = !show;
      }
      if (searchEmpty instanceof HTMLElement) searchEmpty.hidden = query.length > 0 && matches > 0;
      if (query.length === 0) setSearchCount("0 results");
      else setSearchCount(matches > 80 ? String(matches) + " results, showing 80" : String(matches) + " result" + (matches === 1 ? "" : "s"));
    };
    if (detailSearch) detailSearch.addEventListener("input", applyDetailSearch);
    applyDetailSearch();
    // --- Momentum Trend Chart interactivity ---
    (function() {
      const seriesEl = document.getElementById("momentum-series-data");
      const daysEl = document.getElementById("momentum-day-labels");
      const togglesContainer = document.getElementById("momentum-toggles");
      const chartWrap = document.getElementById("momentum-chart-wrap");
      const tooltip = document.getElementById("momentum-tooltip");
      const hitArea = document.getElementById("momentum-hitarea");
      if (!seriesEl || !daysEl || !togglesContainer || !chartWrap || !tooltip || !hitArea) return;

      let seriesData = [];
      let dayLabels = [];
      try { seriesData = JSON.parse(seriesEl.textContent || "[]"); } catch(e) {}
      try { dayLabels = JSON.parse(daysEl.textContent || "[]"); } catch(e) {}

      const padLeft = 56;
      const padRight = 44;
      const padTop = 14;
      const padBottom = 36;
      const svgW = 700;
      const svgH = 300;
      const plotW = svgW - padLeft - padRight;
      const plotH = svgH - padTop - padBottom;

      let activeSeries = new Set(seriesData.map(function(s) { return s.key; }));

      const pathEls = chartWrap.querySelectorAll(".chart-line");
      const leftLabels = chartWrap.querySelectorAll("text[text-anchor='end'].chart-label");
      const rightLabels = chartWrap.querySelectorAll("text[text-anchor='start'].chart-label");

      function updateVisibility() {
        pathEls.forEach(function(el) {
          var k = el.getAttribute("data-series");
          el.classList.toggle("hidden", !activeSeries.has(k));
        });
        updateAxes();
      }

      function leftMax() {
        var m = 1;
        seriesData.forEach(function(s) {
          if (!activeSeries.has(s.key) || s.axis !== "left") return;
          s.values.forEach(function(v) { if (v > m) m = v; });
        });
        return m;
      }

      function updateAxes() {
        var lMax = leftMax();
        var gridVals = [0, Math.round(lMax * 0.25), Math.round(lMax * 0.5), Math.round(lMax * 0.75), Math.round(lMax)];
        var rGridVals = [0, 25, 50, 75, 100];

        function toY(v, max, isPct) {
          if (isPct) return padTop + plotH - (v / 100) * plotH;
          return padTop + plotH - (v / max) * plotH;
        }

        var allLabels = chartWrap.querySelectorAll("text.chart-label");
        allLabels.forEach(function(t) { t.remove(); });

        var svg = chartWrap.querySelector("svg");
        if (!svg) return;

        // left axis
        gridVals.forEach(function(v) {
          var y = toY(v, lMax, false);
          var txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
          txt.setAttribute("x", String(padLeft - 6));
          txt.setAttribute("y", String(y + 4));
          txt.setAttribute("text-anchor", "end");
          txt.setAttribute("class", "chart-label");
          txt.setAttribute("fill", "#7b8ea3");
          txt.setAttribute("font-size", "10");
          txt.textContent = v >= 1000 ? String(Math.round(v / 1000)) + "k" : String(v);
          svg.appendChild(txt);
        });

        // right axis
        rGridVals.forEach(function(v) {
          var y = toY(v, 100, true);
          var txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
          txt.setAttribute("x", String(svgW - padRight + 6));
          txt.setAttribute("y", String(y + 4));
          txt.setAttribute("text-anchor", "start");
          txt.setAttribute("class", "chart-label");
          txt.setAttribute("fill", "#7b8ea3");
          txt.setAttribute("font-size", "10");
          txt.textContent = String(v) + "%";
          svg.appendChild(txt);
        });

        // update grid lines
        var existingGrids = chartWrap.querySelectorAll(".chart-grid");
        existingGrids.forEach(function(g) { g.remove(); });
        var allY = new Set();
        gridVals.forEach(function(v) { allY.add(Math.round(toY(v, lMax, false))); });
        rGridVals.forEach(function(v) { allY.add(Math.round(toY(v, 100, true))); });
        allY.forEach(function(y) {
          var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", String(padLeft));
          line.setAttribute("x2", String(svgW - padRight));
          line.setAttribute("y1", String(y));
          line.setAttribute("y2", String(y));
          line.setAttribute("class", "chart-grid");
          line.setAttribute("stroke", "#1d2d3f");
          line.setAttribute("stroke-width", "1");
          svg.insertBefore(line, hitArea);
        });
      }

      togglesContainer.addEventListener("click", function(e) {
        var btn = e.target.closest(".momentum-toggle");
        if (!btn) return;
        var k = btn.getAttribute("data-series");
        if (activeSeries.has(k)) activeSeries.delete(k);
        else activeSeries.add(k);
        btn.classList.toggle("active", activeSeries.has(k));
        updateVisibility();
      });

      function findDataPoint(mouseX) {
        var rect = hitArea.getBoundingClientRect();
        var svgRect = hitArea.closest("svg").getBoundingClientRect();
        var scaleX = svgW / svgRect.width;
        var svgX = (mouseX - svgRect.left) * scaleX;
        var frac = (svgX - padLeft) / plotW;
        var idx = Math.round(frac * (dayLabels.length - 1));
        idx = Math.max(0, Math.min(dayLabels.length - 1, idx));
        return { idx: idx, day: dayLabels[idx] || "" };
      }

      hitArea.addEventListener("mousemove", function(e) {
        var pt = findDataPoint(e.clientX);
        tooltip.style.display = "block";
        var items = "";
        seriesData.forEach(function(s) {
          if (!activeSeries.has(s.key)) return;
          var val = s.values[pt.idx] !== undefined ? s.values[pt.idx] : 0;
          var suffix = s.axis === "right" ? "%" : "";
          items += "<div class='tip-item'><span class='tip-dot' style='background:" + s.color + "'></span>" + s.label + "<span class='tip-val'>" + String(val) + suffix + "</span></div>";
        });
        tooltip.innerHTML = "<b>" + pt.day + "</b>" + items;
        var wrapRect = chartWrap.getBoundingClientRect();
        var left = e.clientX - wrapRect.left + 14;
        var top = e.clientY - wrapRect.top - 10;
        if (left + 180 > wrapRect.width) left = e.clientX - wrapRect.left - 190;
        if (top < 0) top = e.clientY - wrapRect.top + 14;
        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
      });

      hitArea.addEventListener("mouseleave", function() {
        tooltip.style.display = "none";
      });

      updateVisibility();
    })();
  </script>
</body>
</html>
`;
}

async function buildDashboard(db: DatabaseSync, paths: Paths): Promise<void> {
  const run = startRun(db, "dashboard");
  try {
    let model = buildModel(db, paths);
    let html = renderDashboardHtml(model);
    await mkdir(paths.dashboardDir, { recursive: true });
    await writeTextFileAtomic(paths.dashboard, html);
    finishRun(db, run, "success", 1, 1);
    model = buildModel(db, paths);
    html = renderDashboardHtml(model);
    await writeTextFileAtomic(paths.dashboard, html);
    await writeTextFileAtomic(path.join(paths.dashboardDir, "latest.json"), JSON.stringify(model, null, 2) + "\n");
  } catch (error) {
    finishRun(db, run, "failed", 0, 0, error);
  }
}

async function acquireLock(paths: Paths): Promise<void> {
  try {
    await writeFile(paths.lock, `${process.pid} ${new Date().toISOString()} ${os.hostname()}\n`, { flag: "wx" });
  } catch (error) {
    const content = await readFile(paths.lock, "utf8").catch(() => "");
    throw new Error(`Metrics refresh lock exists at ${paths.lock}${content ? ` (${content.trim()})` : ""}`, { cause: error });
  }
}

async function releaseLock(paths: Paths): Promise<void> {
  await rm(paths.lock, { force: true });
}

async function collectAll(db: DatabaseSync, paths: Paths): Promise<void> {
  await collectTelemetry(db, paths);
  await collectGitHub(db);
  await collectNpm(db);
}

async function openDashboard(paths: Paths): Promise<void> {
  if (!existsSync(paths.dashboard)) throw new Error(`Dashboard does not exist yet. Run npm run metrics:refresh first. Expected ${paths.dashboard}`);
  await execFileAsync("open", [paths.dashboard]);
}

export function browserSecurityHeaders(contentType: string): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (contentType.startsWith("text/html")) {
    headers["Content-Security-Policy"] = [
      "default-src 'none'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "img-src 'self' data:",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; ");
  }
  return headers;
}

function send(response: ServerResponse, status: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    ...browserSecurityHeaders(contentType),
  });
  response.end(body);
}

async function refreshDashboard(paths: Paths): Promise<void> {
  const db = openDatabase(paths.db);
  try {
    await acquireLock(paths);
    try {
      await collectAll(db, paths);
      await buildDashboard(db, paths);
    } finally {
      await releaseLock(paths);
    }
  } finally {
    db.close();
  }
}

async function serveRequest(request: IncomingMessage, response: ServerResponse, paths: Paths): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/favicon.ico") {
    response.writeHead(204, { "cache-control": "no-store" });
    response.end();
    return;
  }
  if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/" || url.pathname === "/index.html")) {
    if (!existsSync(paths.dashboard)) await refreshDashboard(paths);
    send(response, 200, await readFile(paths.dashboard, "utf8"), "text/html; charset=utf-8");
    return;
  }
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/latest.json") {
    const latestPath = path.join(paths.dashboardDir, "latest.json");
    if (!existsSync(latestPath)) await refreshDashboard(paths);
    send(response, 200, await readFile(latestPath, "utf8"), "application/json; charset=utf-8");
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/refresh") {
    try {
      await refreshDashboard(paths);
      send(response, 200, JSON.stringify({ ok: true, refreshedAt: nowIso() }) + "\n", "application/json; charset=utf-8");
    } catch (error) {
      send(response, 500, safeErrorMessage(error));
    }
    return;
  }
  send(response, 404, "Not found");
}

async function serveDashboard(paths: Paths): Promise<void> {
  const port = Number(argValue("--port") ?? process.env["MCP_OBSERVATORY_METRICS_PORT"] ?? "8787");
  if (!existsSync(paths.dashboard)) await refreshDashboard(paths);
  const server = createServer((request, response) => {
    void serveRequest(request, response, paths).catch((error: unknown) => {
      send(response, 500, safeErrorMessage(error));
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  const url = `http://127.0.0.1:${port}/`;
  process.stdout.write(`MCP Observatory metrics dashboard: ${url}\n`);
  process.stdout.write("Click Update Data in the browser to refresh telemetry, GitHub, and npm data.\n");
  if (!hasFlag("--no-open")) await execFileAsync("open", [url]);
}

async function writeScheduler(paths: Paths): Promise<void> {
  const scriptPath = path.join(paths.root, "refresh-hourly.sh");
  const logPath = path.join(paths.logsDir, "refresh.log");
  const script = `#!/usr/bin/env bash
set -u
cd "${process.cwd().replaceAll("\"", "\\\"")}"
{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] metrics refresh start"
  npm run metrics:refresh
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] metrics refresh end"
} >> "${logPath.replaceAll("\"", "\\\"")}" 2>&1
`;
  await writeFile(scriptPath, script, { mode: 0o755 });
  process.stdout.write(`Wrote optional hourly refresh wrapper: ${scriptPath}\nLog path: ${logPath}\n`);
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "refresh";
  const paths = resolvePaths();
  await ensureDirs(paths);
  const db = openDatabase(paths.db);
  let dbClosed = false;
  try {
    if (command === "collect") {
      await acquireLock(paths);
      try {
        await collectAll(db, paths);
      } finally {
        await releaseLock(paths);
      }
    } else if (command === "build") {
      await buildDashboard(db, paths);
    } else if (command === "refresh") {
      await acquireLock(paths);
      try {
        await collectAll(db, paths);
        await buildDashboard(db, paths);
      } finally {
        await releaseLock(paths);
      }
    } else if (command === "open") {
      await openDashboard(paths);
    } else if (command === "serve") {
      db.close();
      dbClosed = true;
      await serveDashboard(paths);
      return;
    } else if (command === "scheduler") {
      await writeScheduler(paths);
    } else {
      throw new Error(`Unknown metrics-dashboard command: ${command}`);
    }
    if (!hasFlag("--quiet")) {
      process.stdout.write(`Metrics database: ${paths.db}\n`);
      if (existsSync(paths.dashboard)) process.stdout.write(`Dashboard: ${paths.dashboard}\n`);
    }
  } finally {
    if (!dbClosed) db.close();
  }
}

const entrypoint = process.argv[1] ? path.basename(process.argv[1]) : "";
if (entrypoint === "metrics-dashboard.ts" || entrypoint === "metrics-dashboard.js") {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
