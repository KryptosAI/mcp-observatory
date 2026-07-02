import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { isCI as _isCI, ciName as _ciName } from "./ci.js";
import { TOOL_VERSION } from "./version.js";

const execFileAsync = promisify(execFile);

// ── Types ────────────────────────────────────────────────────────────────────

export interface TelemetryConfig {
  telemetryEnabled: boolean;
  sessionId: string;
  noticeShown: boolean;
  statsToken?: string;
}

export interface TelemetryEnrichment {
  org?: string;
  contact?: string;
  campaign?: string;
  ciProvider?: string;
  serversScanned?: number;
  toolsFound?: number;
  promptsFound?: number;
  resourcesFound?: number;
  gateResult?: string;
  executionMs?: number;
  deepFlag?: boolean;
  securityFlag?: boolean;
  cloudUpload?: boolean;
  targetIds?: string[];
  installedServers?: string[];
  serverCommands?: string[];
  healthScore?: number;
  healthGrade?: string;
  securityFindingCount?: number;
  checkStatuses?: Record<string, string>;
  connectMs?: number;
  fatalError?: string;
  gitEmail?: string;
  gitRemoteUrl?: string;
  hostname?: string;
  suggestedServers?: string[];
  detectedLanguages?: string[];
  detectedFrameworks?: string[];
  // Trend tracking
  historyEntryCount?: number;
  trendDirection?: string;
  previousGrade?: string;
  // Lock files
  lockFileExists?: boolean;
  lockServerCount?: number;
  lockDriftDetected?: boolean;
  lockDriftCount?: number;
  // Matrix scanning
  matrixServerCount?: number;
  matrixFailCount?: number;
  matrixPassCount?: number;
  // Commit status
  commitStatusSet?: boolean;
  commitStatusState?: string;
  // CI adoption
  setupCiDoctor?: boolean;
  setupCiReady?: boolean;
  setupCiFailCount?: number;
  setupCiWarnCount?: number;
  setupCiConversionStatus?: string;
  setupCiPromptShown?: boolean;
  setupCiAutoRequested?: boolean;
  sampleReport?: boolean;
  // Nightly scans
  nightlyScan?: boolean;
  issueCreated?: boolean;
  issueNumber?: number;
  // GitHub Actions attribution
  githubRepository?: string;
  githubWorkflow?: string;
  githubRunId?: string;
  githubRunNumber?: string;
  githubEventName?: string;
  githubRef?: string;
  githubActor?: string;
  isFirstParty?: boolean;
  telemetrySource?: TelemetrySource;
}

export type TelemetrySource = "first_party_ci" | "external_ci" | "local" | "mcp" | "unknown";

export interface TelemetryEvent extends TelemetryEnrichment {
  event: string;
  version: string;
  command: string;
  os: string;
  arch: string;
  nodeVersion: string;
  isCI: boolean;
  ciName?: string | null;
  transport: "cli" | "mcp";
}

// ── Constants ────────────────────────────────────────────────────────────────

const CONFIG_DIR = path.join(os.homedir(), ".mcp-observatory");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const DEFAULT_ENDPOINT = "https://mcp-observatory-telemetry.kryptosai.workers.dev/v1/events";
const FIRST_PARTY_GITHUB_REPOSITORY = "kryptosai/mcp-observatory";
const CAMPAIGN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

// ── Config cache ─────────────────────────────────────────────────────────────

let _cachedConfig: TelemetryConfig | null = null;

export function configDir(): string {
  return CONFIG_DIR;
}

export async function loadTelemetryConfig(): Promise<TelemetryConfig> {
  if (_cachedConfig) return _cachedConfig;

  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<TelemetryConfig>;
    _cachedConfig = {
      telemetryEnabled: parsed.telemetryEnabled !== false,
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : randomUUID(),
      noticeShown: parsed.noticeShown === true,
      statsToken: typeof parsed.statsToken === "string" ? parsed.statsToken : undefined,
    };
  } catch {
    // First run or corrupted config — create defaults
    _cachedConfig = {
      telemetryEnabled: true,
      sessionId: randomUUID(),
      noticeShown: false,
    };
  }

  return _cachedConfig;
}

export async function saveTelemetryConfig(config: TelemetryConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
  _cachedConfig = config;
}

/** Reset cached config (for testing). */
export function _resetConfigCache(): void {
  _cachedConfig = null;
}

// ── Opt-out checks ───────────────────────────────────────────────────────────

export function isTelemetryEnabled(): boolean {
  if (process.env["DO_NOT_TRACK"] === "1") return false;
  if (process.env["MCP_OBSERVATORY_TELEMETRY_DISABLED"] === "1") return false;
  if (_cachedConfig && !_cachedConfig.telemetryEnabled) return false;
  return true;
}

// ── CI detection (via ci-info) ───────────────────────────────────────────────

export function detectCI(): { isCI: boolean; ciName: string | null } {
  return { isCI: _isCI, ciName: _ciName };
}

// ── First-run notice ─────────────────────────────────────────────────────────

export async function showFirstRunNotice(): Promise<void> {
  const config = await loadTelemetryConfig();
  if (config.noticeShown) return;

  // Print notice to stderr synchronously so it appears before any command output
  const notice = [
    "",
    "  ┌─────────────────────────────────────────────────────────────┐",
    "  │  MCP Observatory collects product usage telemetry.         │",
    "  │                                                            │",
    "  │  It may include command names, server IDs/commands, CI     │",
    "  │  info, git email/remote, hostname, and scan outcomes.      │",
    "  │  Set MCP_OBSERVATORY_ORG / CONTACT for account reports.    │",
    "  │  To opt out: mcp-observatory telemetry disable             │",
    "  │  Or set:     DO_NOT_TRACK=1                                │",
    "  └─────────────────────────────────────────────────────────────┘",
    "",
  ].join("\n");
  process.stderr.write(notice + "\n");

  config.noticeShown = true;
  try {
    await saveTelemetryConfig(config);
  } catch {
    // Don't crash on first run if config dir can't be created
  }
}

// ── Event recording ──────────────────────────────────────────────────────────

export function recordEvent(event: TelemetryEvent): void {
  if (!isTelemetryEnabled()) return;

  const debug = process.env["MCP_OBSERVATORY_TELEMETRY_DEBUG"] === "1";
  const endpoint = process.env["MCP_OBSERVATORY_TELEMETRY_URL"] ?? DEFAULT_ENDPOINT;

  const config = _cachedConfig;
  const body = JSON.stringify({
    ...event,
    sessionId: config?.sessionId ?? "unknown",
    timestamp: new Date().toISOString(),
  });

  if (debug) {
    process.stderr.write(`[telemetry] ${body}\n`);
    return;
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // 3s timeout — telemetry is fire-and-forget to avoid blocking user workflows
    signal: AbortSignal.timeout(3_000),
  }).catch(() => {
    // Silently ignore — telemetry must never block or fail visibly
  });
}

// ── CI provider detection ────────────────────────────────────────────────────

export function detectCiProvider(): string | undefined {
  if (process.env["GITHUB_ACTIONS"]) return "github-actions";
  if (process.env["GITLAB_CI"]) return "gitlab-ci";
  if (process.env["CIRCLECI"]) return "circleci";
  if (process.env["JENKINS_URL"]) return "jenkins";
  if (process.env["BUILDKITE"]) return "buildkite";
  if (process.env["TRAVIS"]) return "travis";
  if (process.env["CODEBUILD_BUILD_ID"]) return "aws-codebuild";
  if (process.env["TF_BUILD"]) return "azure-pipelines";
  return undefined;
}

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function normalizeCampaign(value: string | undefined): string | undefined {
  const campaign = value?.trim();
  if (!campaign) return undefined;
  if (!CAMPAIGN_PATTERN.test(campaign)) {
    throw new Error("Campaign must be a 2-64 character slug using letters, numbers, dot, underscore, or dash.");
  }
  return campaign;
}

export function campaignFromEnv(): string | undefined {
  return normalizeCampaign(envValue("MCP_OBSERVATORY_CAMPAIGN"));
}

export function collectGitHubActionsMetadata(): Pick<
  TelemetryEnrichment,
  "githubRepository" | "githubWorkflow" | "githubRunId" | "githubRunNumber" | "githubEventName" | "githubRef" | "githubActor"
> {
  return {
    githubRepository: envValue("GITHUB_REPOSITORY"),
    githubWorkflow: envValue("GITHUB_WORKFLOW"),
    githubRunId: envValue("GITHUB_RUN_ID"),
    githubRunNumber: envValue("GITHUB_RUN_NUMBER"),
    githubEventName: envValue("GITHUB_EVENT_NAME"),
    githubRef: envValue("GITHUB_REF"),
    githubActor: envValue("GITHUB_ACTOR"),
  };
}

export function isFirstPartyGitHubRepository(repository: string | undefined): boolean {
  return repository?.trim().toLowerCase() === FIRST_PARTY_GITHUB_REPOSITORY;
}

export function classifyTelemetrySource(options: {
  transport: "cli" | "mcp";
  isCI: boolean;
  ciProvider?: string;
  githubRepository?: string;
}): { isFirstParty: boolean; telemetrySource: TelemetrySource } {
  const isFirstParty = options.ciProvider === "github-actions" && isFirstPartyGitHubRepository(options.githubRepository);
  if (isFirstParty) return { isFirstParty, telemetrySource: "first_party_ci" };
  if (options.isCI || options.ciProvider) return { isFirstParty, telemetrySource: "external_ci" };
  if (options.transport === "mcp") return { isFirstParty, telemetrySource: "mcp" };
  if (options.transport === "cli") return { isFirstParty, telemetrySource: "local" };
  return { isFirstParty, telemetrySource: "unknown" };
}

// ── User identity collection ─────────────────────────────────────────────────

interface UserIdentity {
  gitEmail?: string;
  gitRemoteUrl?: string;
  hostname: string;
  org?: string;
  contact?: string;
}

let _cachedIdentity: UserIdentity | null = null;
let _identityPromise: Promise<UserIdentity> | null = null;

export function collectUserIdentity(): Promise<UserIdentity> {
  if (_cachedIdentity) return Promise.resolve(_cachedIdentity);
  if (_identityPromise) return _identityPromise;

  _identityPromise = (async () => {
    const identity: UserIdentity = { hostname: os.hostname() };
    const org = process.env["MCP_OBSERVATORY_ORG"]?.trim();
    const contact = process.env["MCP_OBSERVATORY_CONTACT"]?.trim();
    if (org) identity.org = org;
    if (contact) identity.contact = contact;

    try {
      const { stdout } = await execFileAsync("git", ["config", "user.email"], { timeout: 2000 });
      identity.gitEmail = stdout.trim() || undefined;
    } catch { /* not in a git repo or git not installed */ }

    try {
      const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], { timeout: 2000 });
      identity.gitRemoteUrl = stdout.trim() || undefined;
    } catch { /* no remote configured */ }

    _cachedIdentity = identity;
    return identity;
  })();

  return _identityPromise;
}

/** Reset identity cache (for testing). */
export function _resetIdentityCache(): void {
  _cachedIdentity = null;
  _identityPromise = null;
}

// ── Convenience: build event from current process state ──────────────────────

export function buildEvent(
  event: string,
  command: string,
  transport: "cli" | "mcp",
  enrichment?: TelemetryEnrichment,
): TelemetryEvent {
  const ci = detectCI();
  const identity = _cachedIdentity;
  const campaign = enrichment?.campaign ?? campaignFromEnv();
  const ciProvider = enrichment?.ciProvider ?? detectCiProvider();
  const github = ciProvider === "github-actions" ? collectGitHubActionsMetadata() : {};
  const githubRepository = enrichment?.githubRepository ?? github.githubRepository;
  const classification = classifyTelemetrySource({
    transport,
    isCI: ci.isCI,
    ciProvider,
    githubRepository,
  });
  return {
    event,
    version: TOOL_VERSION,
    command,
    os: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    isCI: ci.isCI,
    ciName: ci.ciName,
    transport,
    ciProvider,
    org: enrichment?.org ?? identity?.org,
    contact: enrichment?.contact ?? identity?.contact,
    gitEmail: identity?.gitEmail,
    gitRemoteUrl: identity?.gitRemoteUrl,
    hostname: identity?.hostname,
    ...github,
    githubRepository,
    isFirstParty: enrichment?.isFirstParty ?? classification.isFirstParty,
    telemetrySource: enrichment?.telemetrySource ?? classification.telemetrySource,
    ...enrichment,
    campaign,
  };
}
