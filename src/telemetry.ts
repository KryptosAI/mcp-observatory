import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { isCI as _isCI, ciName as _ciName } from "./ci.js";
import { requireHttpUrl } from "./utils/url.js";
import { TOOL_VERSION } from "./version.js";

const execFileAsync = promisify(execFile);

// ── Types ────────────────────────────────────────────────────────────────────

export interface TelemetryConfig {
  telemetryEnabled: boolean;
  sessionId: string;
  noticeShown: boolean;
  statsToken?: string;
  machineId?: string;
  createdAt?: string;
  featureChain?: string[];
  commandSequence?: string[];
  optedInEmail?: string;
  firstContactChannel?: string;
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
  sessionDurationMs?: number | null;
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
  setupCiSarif?: boolean;
  setupCiFixApplied?: boolean;
  sampleReport?: boolean;
  // Stage override
  stageOverride?: string;
  targetServer?: string | null;
  findingSeverityCounts?: string | null;
  auditProfile?: string;
  policyRuleCount?: number;
  scanCount?: number;
  featureChainOverride?: string[];
  // Receipts
  receiptGenerated?: boolean;
  receiptFormat?: string;
  receiptProfile?: string;
  receiptEnvironmentClass?: string;
  receiptTopFindings?: number;
  // Risk graph
  riskGraphGenerated?: boolean;
  riskGraphNodeCount?: number;
  riskGraphServerCount?: number;
  riskGraphBoundaryCount?: number;
  riskGraphHighestRisk?: string;
  riskGraphInputCount?: number;
  riskGraphOutputFormats?: string[];
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
  optedInEmail?: string;
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
  machineFingerprint?: string;
  sessionId?: string;
  featureChain?: string[] | null;
  commandSequence?: string[];
  stage?: string | null;
  targetServer?: string | null;
  findingSeverityCounts?: string | null;
  sessionDurationMs?: number | null;
  referrer?: string;
  optedInEmail?: string;
  targetServer?: string;
  findingSeverityCounts?: Record<string, number>;
  sessionDurationMs?: number;
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
      machineId: typeof parsed.machineId === "string" ? parsed.machineId : randomUUID(),
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
      featureChain: Array.isArray(parsed.featureChain) ? parsed.featureChain : [],
      commandSequence: Array.isArray(parsed.commandSequence) ? parsed.commandSequence : [],
      optedInEmail: typeof parsed.optedInEmail === "string" ? parsed.optedInEmail : undefined,
      firstContactChannel: typeof parsed.firstContactChannel === "string" ? parsed.firstContactChannel : undefined,
    };
  } catch {
    // First run or corrupted config — create defaults
    _cachedConfig = {
      telemetryEnabled: true,
      sessionId: randomUUID(),
      noticeShown: false,
      machineId: randomUUID(),
      createdAt: new Date().toISOString(),
      featureChain: [],
      commandSequence: [],
      firstContactChannel: detectReferrer(),
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

export function computeFingerprint(): string {
  const input = `${os.hostname()}:${os.userInfo().username}`;
  return createHash("sha256").update(input).digest("hex");
}

export function computeTelemetryFingerprint(): string {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  return createHash("sha256").update(`${hostname}:${username}`).digest("hex");
}

export async function updateFeatureChain(command: string): Promise<void> {
  const config = await loadTelemetryConfig();
  const chain = config.featureChain || [];
  if (!chain.includes(command)) {
    chain.push(command);
  }
  const seq = config.commandSequence || [];
  seq.push(command);
  if (seq.length > 5) seq.shift();
  await saveTelemetryConfig({
    ...config,
    featureChain: chain,
    commandSequence: seq,
  });
}

export function deriveStage(chain: string[]): string;
export function deriveStage(eventType: string, command: string): string | null;
export function deriveStage(arg1: string[] | string, arg2?: string): string | null {
  if (Array.isArray(arg1)) {
    if (!arg1 || arg1.length === 0) return "install";
    const has = (c: string) => arg1.some(x => x === c || x.includes(c));
    if (has("cloud") || has("receipt")) return "paid_intent";
    if (has("risk-graph") || has("attack-sim")) return "power_user";
    if (has("setup-ci") || has("ci-report")) return "ci_setup";
    if (arg1.length >= 3) return "recurring";
    if (has("scan") || has("test")) return "first_scan";
    return "install";
  }
  const cmd = (arg2 ?? arg1).toLowerCase();
  if (cmd.includes("scan")) return "discovery";
  if (cmd.includes("test")) return "validation";
  if (cmd.includes("score")) return "assessment";
  if (cmd.includes("enforce")) return "protection";
  if (cmd.includes("audit")) return "audit";
  return null;
}

function detectReferrer(): string | undefined {
  if (process.env.GITHUB_ACTIONS) return "github-ci";
  if (process.env.npm_config_user_agent) return "npm";
  if (process.env._ && process.env._.includes("node_modules/.bin")) return "npm-global";
  return undefined;
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
  const endpoint = requireHttpUrl(
    process.env["MCP_OBSERVATORY_TELEMETRY_URL"] ?? DEFAULT_ENDPOINT,
    "Telemetry endpoint",
  );

  const config = _cachedConfig;
  const machineId = config?.machineId || config?.sessionId;

  const rawJsonValue = (event as any).raw_json;
  if (rawJsonValue !== undefined && rawJsonValue !== null) {
    const rawJsonStr = typeof rawJsonValue === "string" ? rawJsonValue : JSON.stringify(rawJsonValue);
    if (rawJsonStr.length > 10240) {
      process.stderr.write(`[telemetry] WARNING: raw_json exceeds 10KB (${rawJsonStr.length} bytes), truncating\n`);
      (event as any).raw_json = JSON.stringify({ truncated: true, original_size: rawJsonStr.length });
    }
  }

  const body = JSON.stringify({
    ...event,
    sessionId: machineId,
    featureChain: Array.isArray(event.featureChain) ? JSON.stringify(event.featureChain) : event.featureChain,
    commandSequence: Array.isArray(event.commandSequence) ? JSON.stringify(event.commandSequence) : event.commandSequence,
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

export function generateSessionId(): string {
  return randomUUID();
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
  const config = _cachedConfig;
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
    machineFingerprint: computeFingerprint(),
    sessionId: config?.machineId || config?.sessionId,
    featureChain: enrichment?.featureChainOverride ?? config?.featureChain,
    commandSequence: config?.commandSequence,
    stage: enrichment?.stageOverride ?? deriveStage(config?.featureChain || []),
    referrer: config?.firstContactChannel,
    optedInEmail: config?.optedInEmail,
    targetServer: enrichment?.targetServer,
    findingSeverityCounts: enrichment?.findingSeverityCounts,
  };
}

// ── Session tracking ─────────────────────────────────────────────────────────

const _sessionTimestamps = new Map<string, number>();

export function recordSessionStart(sessionId: string): void {
  _sessionTimestamps.set(sessionId, Date.now());
}

export function recordSessionEnd(sessionId: string): void {
  const startedAt = _sessionTimestamps.get(sessionId);
  if (!startedAt) return;
  _sessionTimestamps.delete(sessionId);
  const sessionDurationMs = Date.now() - startedAt;
  recordEvent(buildEvent("session_end", "session", "cli", { sessionDurationMs }));
}

/** Reset session timestamps (for testing). */
export function _resetSessionTimestamps(): void {
  _sessionTimestamps.clear();
}

// ── Finding severity counting ────────────────────────────────────────────────

export function countFindingsBySeverity(findings: any[]): { high: number; medium: number; low: number } {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    const severity = (f?.severity || f?.level || "low").toLowerCase();
    if (severity === "high" || severity === "critical" || severity === "error") {
      counts.high++;
    } else if (severity === "medium" || severity === "warning" || severity === "moderate") {
      counts.medium++;
    } else {
      counts.low++;
    }
  }
  return counts;
}
