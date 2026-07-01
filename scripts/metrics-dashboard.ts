import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
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
  topCommands: Array<{ command: string; events: number; sessions: number }>;
  topDomains: Array<{ domain: string; events: number; sessions: number }>;
  topDomainDetails: Array<{ domain: string; events: number; sessions: number; topCommand: string; latestSeen: string }>;
  versionAdoption: Array<{ version: string; events: number; sessions: number; sessionShare: number; isLatest: boolean }>;
  dailyMarketVersionAdoption: Array<{ day: string; totalSessions: number; latestSessions: number; latestEvents: number; latestSessionShare: number; dominantVersion: string }>;
  commandFunnel: Array<{ stage: string; commands: string; events: number; sessions: number; recommendation: string }>;
  dailyMarketCommandFunnel: Array<{ day: string; agentInstallSessions: number; validationSessions: number; regressionSessions: number; ciSetupSessions: number }>;
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
  const message = error instanceof Error ? error.message : unknownToString(error);
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
  const commands = new Map<string, { events: number; sessions: Set<string> }>();
  const domains = new Map<string, { events: number; sessions: Set<string> }>();
  const domainDetails = new Map<string, { events: number; sessions: Set<string>; commands: Map<string, number>; latestSeen: string }>();
  const versions = new Map<string, { events: number; sessions: Set<string> }>();
  const dailyMarketVersionStats = new Map<string, Map<string, { events: number; sessions: Set<string> }>>();
  const dailyMarketCommandFunnel = new Map<string, {
    agentInstallSessions: Set<string>;
    validationSessions: Set<string>;
    regressionSessions: Set<string>;
    ciSetupSessions: Set<string>;
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
            validationSessions: new Set<string>(),
            regressionSessions: new Set<string>(),
            ciSetupSessions: new Set<string>(),
          };
          if (row.command === "serve") commandBucket.agentInstallSessions.add(session);
          if (row.command === "test" || row.command === "scan" || row.command === "run") commandBucket.validationSessions.add(session);
          if (row.command === "diff" || row.command === "history" || row.command === "watch" || row.command === "lock") commandBucket.regressionSessions.add(session);
          if (row.command === "init-ci" || row.command === "setup-ci") commandBucket.ciSetupSessions.add(session);
          dailyMarketCommandFunnel.set(day, commandBucket);
        }
      }
      const command = row.command ?? "unknown";
      const commandBucket = commands.get(command) ?? { events: 0, sessions: new Set<string>() };
      commandBucket.events += 1;
      if (session) commandBucket.sessions.add(session);
      commands.set(command, commandBucket);
      for (const domain of rowDomains(row)) {
        if (INTERNAL_DOMAINS.has(domain)) continue;
        const domainBucket = domains.get(domain) ?? { events: 0, sessions: new Set<string>() };
        domainBucket.events += 1;
        if (session) domainBucket.sessions.add(session);
        domains.set(domain, domainBucket);

        const detailBucket = domainDetails.get(domain) ?? { events: 0, sessions: new Set<string>(), commands: new Map<string, number>(), latestSeen: "" };
        detailBucket.events += 1;
        if (session) detailBucket.sessions.add(session);
        const command = row.command ?? "unknown";
        detailBucket.commands.set(command, (detailBucket.commands.get(command) ?? 0) + 1);
        if (seen && seen > detailBucket.latestSeen) detailBucket.latestSeen = seen;
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
  const versionRows = [...versions.entries()]
    .map(([version, stats]) => ({ version, events: stats.events, sessions: stats.sessions.size }))
    .sort((a, b) => compareVersions(b.version, a.version));
  const latestVersion = versionRows[0]?.version ?? "";
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
      validationSessions: stats.validationSessions.size,
      regressionSessions: stats.regressionSessions.size,
      ciSetupSessions: stats.ciSetupSessions.size,
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
  ];
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
    topCommands: [...commands.entries()].map(([command, stats]) => ({ command, events: stats.events, sessions: stats.sessions.size })).sort((a, b) => b.events - a.events).slice(0, 12),
    topDomains: [...domains.entries()].map(([domain, stats]) => ({ domain, events: stats.events, sessions: stats.sessions.size })).sort((a, b) => b.events - a.events).slice(0, 12),
    topDomainDetails: [...domainDetails.entries()].map(([domain, stats]) => ({
      domain,
      events: stats.events,
      sessions: stats.sessions.size,
      topCommand: [...stats.commands.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown",
      latestSeen: stats.latestSeen,
    })).sort((a, b) => b.sessions - a.sessions).slice(0, 20),
    versionAdoption: versionRows.map((row) => ({
      ...row,
      sessionShare: totalSessions.size === 0 ? 0 : Math.round((row.sessions / totalSessions.size) * 1000) / 10,
      isLatest: row.version === latestVersion,
    })).slice(0, 20),
    dailyMarketVersionAdoption: sortedDailyMarketVersionAdoption.slice(-DAILY_HISTORY_DAYS).reverse(),
    commandFunnel,
    dailyMarketCommandFunnel: sortedDailyMarketCommandFunnel.slice(-DAILY_HISTORY_DAYS).reverse(),
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

function metric(label: string, value: string | number, note = ""): string {
  return `<div class="metric"><strong>${escapeHtml(typeof value === "number" ? formatNumber(value) : value)}</strong><span>${escapeHtml(label)}</span>${note ? `<em>${escapeHtml(note)}</em>` : ""}</div>`;
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
  validationSessions: number;
  regressionSessions: number;
  ciSetupSessions: number;
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
  npmDownloads: number;
  clones: number;
  views: number;
}

function dayToTimestamp(day: string): number | undefined {
  const [year, month, date] = day.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !date) return undefined;
  return Date.UTC(year, month - 1, date);
}

function timestampToDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function trendDelta(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "flat";
  if (previous === 0) return "new";
  const diff = current - previous;
  const percentChange = Math.round((diff / previous) * 100);
  return `${diff >= 0 ? "+" : ""}${formatNumber(diff)} (${percentChange >= 0 ? "+" : ""}${percentChange}%)`;
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
  const days = latestTimestamp === undefined
    ? []
    : Array.from({ length: limit }, (_, index) => timestampToDay(latestTimestamp - ((limit - index - 1) * MS_PER_DAY)));
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
      validationSessions: commandRow?.validationSessions ?? 0,
      regressionSessions: commandRow?.regressionSessions ?? 0,
      ciSetupSessions: commandRow?.ciSetupSessions ?? 0,
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
    npmDownloads: rows.reduce((sum, point) => sum + point.npmDownloads, 0),
    clones: rows.reduce((sum, point) => sum + point.clones, 0),
    views: rows.reduce((sum, point) => sum + point.views, 0),
  };
}

function kpiCards(points: UsageTrendPoint[]): string {
  if (points.length === 0) return "";
  const day = usagePeriodSummary(points, 1);
  const previousDay = usagePeriodSummary(points, 1, 1);
  const week = usagePeriodSummary(points, 7);
  const previousWeek = usagePeriodSummary(points, 7, 7);
  const month = usagePeriodSummary(points, 30);
  const previousMonth = usagePeriodSummary(points, 30, 30);
  const setupSignals = month.clones + month.npmDownloads;
  return [
    metric("Market day", `${formatNumber(day.sessions)} sessions`, `${trendDelta(day.sessions, previousDay.sessions)}; ${formatNumber(day.events)} events`),
    metric("Market week", `${formatNumber(week.sessions)} sessions`, `${trendDelta(week.sessions, previousWeek.sessions)}; ${formatNumber(week.events)} events`),
    metric("Market month", `${formatNumber(month.sessions)} sessions`, `${formatNumber(month.events)} events, ${formatNumber(month.excludedSessions)} internal excluded`),
    metric("Monthly change", percentChangeLabel(month.sessions, previousMonth.sessions), `${formatNumber(month.sessions)} vs ${formatNumber(previousMonth.sessions)} sessions`),
    metric("Setup conversion", conversionPercent(month.setupSessions, setupSignals), `${formatNumber(month.setupSessions)} setup / ${formatNumber(setupSignals)} clone+download signals`),
  ].join("");
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
  const latestVersion = model.telemetry.versionAdoption.find((row) => row.isLatest);
  const ciSetupStage = model.telemetry.commandFunnel.find((row) => row.stage === "CI setup");
  const cloneDownloadSignals = model.github.clones14 + model.npm.downloads14;

  add("KPI", "Market day", `${formatNumber(day.sessions)} sessions`, `${day.startDay}; ${formatNumber(day.events)} events; ${formatNumber(day.excludedSessions)} internal sessions excluded`);
  add("KPI", "Market week", `${formatNumber(week.sessions)} sessions`, `${week.startDay} to ${week.endDay}; ${delta(week.sessions, previousWeek.sessions)}`);
  add("KPI", "Market month", `${formatNumber(month.sessions)} sessions`, `${month.startDay} to ${month.endDay}; ${formatNumber(month.events)} events`);
  add("KPI", "Monthly change", percentChangeLabel(month.sessions, previousMonth.sessions), `${formatNumber(month.sessions)} current 30d sessions vs ${formatNumber(previousMonth.sessions)} prior 30d sessions`);
  add("KPI", "Setup conversion", conversionPercent(month.setupSessions, month.clones + month.npmDownloads), `${formatNumber(month.setupSessions)} setup sessions / ${formatNumber(month.clones + month.npmDownloads)} 30d clone+download signals`);
  add("Version", "Latest adoption", latestVersion ? `${percent(month.latestSessions, month.sessions)} 30d` : "n/a", latestVersion ? `${latestVersion.version}; ${formatNumber(month.latestSessions)} latest-version sessions / ${formatNumber(month.sessions)} market sessions` : "No version telemetry yet");
  add("Acquisition", "Clone/download to CI", conversionPercent(ciSetupStage?.sessions ?? 0, cloneDownloadSignals), `${formatNumber(ciSetupStage?.sessions ?? 0)} setup sessions / ${formatNumber(cloneDownloadSignals)} visible clone+download signals`);
  add("Usage", "Internal excluded", `${formatNumber(Math.max(model.telemetry.totalSessions - model.telemetry.marketSessions, 0))} sessions`, "First-party CI and internal repo activity are not counted in market KPIs");
  add("Usage", "Latest external activity", model.telemetry.latestExternalSeen || "n/a", `${formatNumber(model.telemetry.marketEvents)} market events across ${formatNumber(model.telemetry.marketSessions)} market sessions`);

  for (const point of [...points].reverse()) {
    add(
      "Daily market",
      point.day,
      `${formatNumber(point.sessions)} sessions`,
      `${formatNumber(point.events)} events; latest ${formatNumber(point.latestSessions)} (${point.latestSessionShare}%); setup ${formatNumber(point.ciSetupSessions)}; npm ${formatNumber(point.npmDownloads)}; clones ${formatNumber(point.clones)}; internal excluded ${formatNumber(point.excludedSessions)}`,
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

export function renderDashboardHtml(model: DashboardModel): string {
  const trendPoints = usageTrendPoints(model, TREND_WINDOW_DAYS);
  const cards = kpiCards(trendPoints);
  const searchRows = detailSearchRows(model, trendPoints);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MCP Observatory Local Metrics</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --ink:#152238; --muted:#647084; --line:#dce4ee; --panel:#fff; --bg:#f5f7fb; --accent:#0969da; --bad:#b42318; }
    body { margin:0; background:var(--bg); color:var(--ink); }
    main { max-width:1160px; margin:0 auto; padding:18px 14px 30px; }
    header { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; margin-bottom:10px; }
    .actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:6px; }
    button { border:1px solid #b8c7dc; background:#fff; color:var(--ink); border-radius:6px; padding:6px 9px; font:inherit; font-size:12px; cursor:pointer; }
    button:hover { border-color:var(--accent); color:var(--accent); }
    button:disabled { cursor:not-allowed; opacity:.62; }
    .refresh-status { color:var(--muted); font-size:12px; min-height:16px; }
    h1 { margin:0; font-size:24px; letter-spacing:0; }
    h2 { margin:0; padding:8px 10px; font-size:14px; letter-spacing:0; border-bottom:1px solid #edf1f6; background:#fbfcfe; }
    p { color:var(--muted); margin:3px 0 0; font-size:13px; line-height:1.35; max-width:820px; }
    .stamp { color:var(--muted); font-size:12px; text-align:right; line-height:1.35; }
    .kpi-grid { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:8px; align-items:stretch; margin-top:14px; }
    .metric, .panel { background:var(--panel); border:1px solid var(--line); border-radius:6px; box-shadow:0 1px 1px rgba(21,34,56,.03); }
    .metric { padding:11px 12px; min-height:86px; }
    .metric strong { display:block; font-size:24px; line-height:1.05; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .metric span { display:block; color:var(--muted); font-size:12px; line-height:1.2; margin-top:3px; }
    .metric em { display:block; color:var(--muted); font-size:11px; line-height:1.25; font-style:normal; margin-top:8px; }
    .search-shell { margin-top:12px; }
    .search-bar { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .search-bar input { width:100%; border:1px solid #b8c7dc; border-radius:6px; background:#fff; color:var(--ink); font:inherit; font-size:14px; padding:9px 10px; outline:none; }
    .search-bar input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(9,105,218,.12); }
    .search-count { color:var(--muted); font-size:12px; min-width:92px; text-align:right; }
    .panel { overflow:auto; max-height:430px; }
    .panel-inner { padding:8px 9px; }
    table { width:100%; border-collapse:collapse; font-size:13px; line-height:1.25; }
    th, td { padding:5px 7px; border-bottom:1px solid #edf1f6; text-align:left; vertical-align:top; }
    th { position:sticky; top:0; z-index:1; background:#eef3f8; color:#3d4d63; font-size:11px; text-transform:uppercase; }
    tr:last-child td { border-bottom:0; }
    tr[hidden] { display:none !important; }
    .empty-row td { color:var(--muted); padding:18px 10px; text-align:center; }
    .note { color:var(--muted); font-size:12px; line-height:1.35; margin-top:4px; }
    @media (max-width: 1120px) { .kpi-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 720px) { main { padding:12px 8px 24px; } header { display:block; } .stamp { text-align:left; margin-top:8px; } .kpi-grid { grid-template-columns:1fr; } .search-bar { display:block; } .search-count { display:block; min-width:0; margin-top:5px; text-align:left; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>MCP Observatory Local Metrics</h1>
        <p>Private laptop dashboard for telemetry, GitHub traffic, and npm downloads. Raw telemetry is stored locally; this view is sanitized.</p>
      </div>
      <div class="stamp">
        Generated ${escapeHtml(model.generatedAt)}<br>DB ${escapeHtml(model.dbPath)}
        <div class="actions">
          <button id="refresh-button" type="button">Update Data</button>
          <span id="refresh-status" class="refresh-status"></span>
        </div>
      </div>
    </header>
    <section class="kpi-grid" aria-label="Primary KPIs">
      ${cards || metric("Market telemetry", "n/a", "Refresh data to build KPI windows")}
    </section>

    <section class="search-shell" aria-label="Evidence search">
      <div class="search-bar">
        <input id="detail-search" type="search" placeholder="Search evidence" autocomplete="off">
        <span id="search-count" class="search-count">0 results</span>
      </div>
      <div class="panel">
        <table>
          <thead><tr><th>Area</th><th>Metric</th><th>Value</th><th>Context</th></tr></thead>
          <tbody id="detail-results">
            ${searchRows}
            <tr id="search-empty" class="empty-row"><td colspan="4">Search domains, commands, npm, GitHub, versions, setup, internal, failures, or dates.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
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
    const tmp = `${paths.dashboard}.tmp`;
    await mkdir(paths.dashboardDir, { recursive: true });
    await writeFile(tmp, html, "utf8");
    await rename(tmp, paths.dashboard);
    finishRun(db, run, "success", 1, 1);
    model = buildModel(db, paths);
    html = renderDashboardHtml(model);
    await writeFile(tmp, html, "utf8");
    await rename(tmp, paths.dashboard);
    await writeFile(path.join(paths.dashboardDir, "latest.json"), JSON.stringify(model, null, 2) + "\n", "utf8");
  } catch (error) {
    finishRun(db, run, "failed", 0, 0, error);
  }
}

async function acquireLock(paths: Paths): Promise<void> {
  if (existsSync(paths.lock)) {
    const content = await readFile(paths.lock, "utf8").catch(() => "");
    throw new Error(`Metrics refresh lock exists at ${paths.lock}${content ? ` (${content.trim()})` : ""}`);
  }
  await writeFile(paths.lock, `${process.pid} ${new Date().toISOString()} ${os.hostname()}\n`, { flag: "wx" });
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
      const message = error instanceof Error ? error.message : unknownToString(error);
      send(response, 500, message);
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
      const message = error instanceof Error ? error.message : unknownToString(error);
      send(response, 500, message);
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
