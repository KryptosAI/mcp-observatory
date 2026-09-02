import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { ciName, isCI } from "./ci.js";
import { requireHttpUrl } from "./utils/url.js";
import { TOOL_VERSION } from "./version.js";

const execFileAsync = promisify(execFile);

export type TelemetryPreference = "enabled" | "disabled" | "unset";
export type CollectionMode = "notice-and-opt-out" | "prior-consent";

export interface TelemetryConfig {
  telemetryPreference: TelemetryPreference;
  telemetryEnabled?: boolean;
  installationId: string;
  machineId: string;
  createdAt: string;
  noticeVersion?: string;
  policyMode?: CollectionMode;
  featureChain: string[];
  commandSequence: string[];
  optedInEmail?: string;
  contactChannel?: string;
  firstContactChannel?: string;
}

interface TelemetryPolicy {
  mode: CollectionMode;
  noticeVersion: string;
  schemaVersion: number;
}

interface UserIdentity {
  gitEmail?: string;
  gitRemoteUrl?: string;
  hostname: string;
  org?: string;
  gitRepoHost?: string;
  gitRepoOrg?: string;
  gitRepoName?: string;
  gitEmailDomain?: string;
  hostnameDomain?: string;
  isEnterprise: boolean;
}

const DEFAULT_BASE_URL = "https://mcp-observatory-telemetry.kryptosai.workers.dev";
const DEFAULT_EVENT_ENDPOINT = `${DEFAULT_BASE_URL}/v1/events`;
const DEFAULT_POLICY: TelemetryPolicy = {
  mode: "prior-consent",
  noticeVersion: "2026-09-01",
  schemaVersion: 2,
};
const CONFIG_FILE = "config.json";
const QUEUE_FILE = "telemetry-queue.json";
const MAX_QUEUE_EVENTS = 64;
const MAX_QUEUE_BYTES = 131_072;
const MAX_EVENT_BYTES = 65_536;
const POLICY_TIMEOUT_MS = 1_000;
const DELIVERY_TIMEOUT_MS = 3_000;
const CAMPAIGN_PATTERN = /^[A-Za-z0-9._-]{2,64}$/;
const FIRST_PARTY_REPOSITORY = "kryptosai/mcp-observatory";

const ALLOWED_ENRICHMENT_FIELDS = new Set([
  "auditProfile", "campaign", "checkStatuses", "ciProvider", "cloudUpload", "commitStatusSet",
  "commitStatusState", "connectMs", "contact", "deepFlag", "detectedFrameworks", "detectedLanguages",
  "executionMs", "fatalError", "findingSeverityCounts", "gateResult", "githubActor", "githubEventName",
  "githubRef", "githubRepository", "githubRunId", "githubRunNumber", "githubWorkflow", "healthGrade",
  "healthScore", "historyEntryCount", "installedServers", "isAutomation", "isFirstParty", "isFixture", "featureChainOverride",
  "issueCreated", "issueNumber", "lockDriftCount", "lockDriftDetected", "lockFileExists", "lockServerCount",
  "matrixFailCount", "matrixPassCount", "matrixServerCount", "nightlyScan", "org", "policyRuleCount",
  "previousGrade", "promptsFound", "receiptEnvironmentClass", "receiptFormat", "receiptGenerated",
  "receiptProfile", "receiptTopFindings", "resourcesFound", "riskGraphBoundaryCount", "riskGraphGenerated",
  "riskGraphHighestRisk", "riskGraphInputCount", "riskGraphNodeCount", "riskGraphOutputFormats",
  "riskGraphServerCount", "sampleReport", "scanCount", "securityFindingCount", "securityFlag", "serverCommands",
  "serversScanned", "sessionDurationMs", "setupCiAutoRequested", "setupCiConversionStatus", "setupCiDoctor",
  "setupCiFailCount", "setupCiFixApplied", "setupCiPromptShown", "setupCiReady", "setupCiSarif",
  "setupCiWarnCount", "stageOverride", "suggestedServers", "targetIds", "targetServer", "telemetrySource",
  "toolsFound", "trendDirection",
]);

let cachedConfig: TelemetryConfig | null = null;
let cachedIdentity: UserIdentity | null = null;
let identityPromise: Promise<UserIdentity> | null = null;
let initializationPromise: Promise<boolean> | null = null;
let runtimeEnabled = false;
let activePolicy: TelemetryPolicy = DEFAULT_POLICY;
let deliveryChain: Promise<void> = Promise.resolve();
const processSessionId = randomUUID();
const processRunId = randomUUID();
const sessionTimestamps = new Map<string, number>();

export function configDir(): string {
  return process.env["MCP_OBSERVATORY_CONFIG_DIR"]?.trim() || path.join(os.homedir(), ".mcp-observatory");
}

function configPath(): string {
  return path.join(configDir(), CONFIG_FILE);
}

function queuePath(): string {
  return path.join(configDir(), QUEUE_FILE);
}

function defaultConfig(): TelemetryConfig {
  return {
    telemetryPreference: "unset",
    installationId: randomUUID(),
    machineId: randomUUID(),
    createdAt: new Date().toISOString(),
    featureChain: [],
    commandSequence: [],
    firstContactChannel: detectDistributionChannel(),
  };
}

export async function loadTelemetryConfig(): Promise<TelemetryConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const parsed = JSON.parse(await readFile(configPath(), "utf8")) as Partial<TelemetryConfig>;
    const legacyPreference: TelemetryPreference = parsed.telemetryEnabled === false ? "disabled" : "unset";
    cachedConfig = {
      telemetryPreference: parsed.telemetryPreference === "enabled" || parsed.telemetryPreference === "disabled"
        ? parsed.telemetryPreference
        : legacyPreference,
      installationId: typeof parsed.installationId === "string" ? parsed.installationId : randomUUID(),
      machineId: typeof parsed.machineId === "string" ? parsed.machineId : randomUUID(),
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
      noticeVersion: typeof parsed.noticeVersion === "string" ? parsed.noticeVersion : undefined,
      policyMode: parsed.policyMode === "notice-and-opt-out" || parsed.policyMode === "prior-consent" ? parsed.policyMode : undefined,
      featureChain: Array.isArray(parsed.featureChain) ? parsed.featureChain.filter((item): item is string => typeof item === "string").slice(-64) : [],
      commandSequence: Array.isArray(parsed.commandSequence) ? parsed.commandSequence.filter((item): item is string => typeof item === "string").slice(-16) : [],
      optedInEmail: typeof parsed.optedInEmail === "string" ? parsed.optedInEmail : undefined,
      contactChannel: typeof parsed.contactChannel === "string" ? parsed.contactChannel : undefined,
      firstContactChannel: typeof parsed.firstContactChannel === "string" ? parsed.firstContactChannel : detectDistributionChannel(),
    };
  } catch {
    cachedConfig = defaultConfig();
    await saveTelemetryConfig(cachedConfig).catch(() => undefined);
  }
  return cachedConfig;
}

export async function saveTelemetryConfig(config: TelemetryConfig): Promise<void> {
  const directory = configDir();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700).catch(() => undefined);
  const temporary = path.join(directory, `.config-${process.pid}-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(config, null, 2) + "\n", { encoding: "utf8", flag: "wx", mode: 0o600 });
  await rename(temporary, configPath());
  await chmod(configPath(), 0o600).catch(() => undefined);
  cachedConfig = config;
}

export function _resetTelemetryForTests(): void {
  cachedConfig = null;
  cachedIdentity = null;
  identityPromise = null;
  initializationPromise = null;
  runtimeEnabled = false;
  activePolicy = DEFAULT_POLICY;
  deliveryChain = Promise.resolve();
  sessionTimestamps.clear();
}

function explicitEnvironmentPreference(): TelemetryPreference | null {
  if (process.env["DO_NOT_TRACK"] === "1" ||
      process.env["MCP_OBSERVATORY_TELEMETRY"] === "0" ||
      process.env["MCP_OBSERVATORY_TELEMETRY_DISABLED"] === "1") return "disabled";
  if (process.env["MCP_OBSERVATORY_TELEMETRY"] === "1") return "enabled";
  if (process.env["NODE_ENV"] === "test") return "disabled";
  return null;
}

export function isTelemetryEnabled(): boolean {
  const explicit = explicitEnvironmentPreference();
  if (explicit) return explicit === "enabled";
  return runtimeEnabled;
}

function endpointFromEnvironment(): string {
  return requireTelemetryUrl(process.env["MCP_OBSERVATORY_TELEMETRY_URL"] ?? DEFAULT_EVENT_ENDPOINT, "Telemetry endpoint");
}

function policyEndpoint(): string {
  const override = process.env["MCP_OBSERVATORY_TELEMETRY_POLICY_URL"];
  if (override) return requireTelemetryUrl(override, "Telemetry policy endpoint");
  return new URL("/v1/policy", endpointFromEnvironment()).toString();
}

function requireTelemetryUrl(value: string, label: string): string {
  const normalized = requireHttpUrl(value, label);
  const url = new URL(normalized);
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !loopback) throw new Error(`${label} must use https outside loopback development.`);
  return url.toString();
}

async function fetchPolicy(): Promise<TelemetryPolicy> {
  try {
    const response = await fetch(policyEndpoint(), { signal: AbortSignal.timeout(POLICY_TIMEOUT_MS) });
    if (!response.ok) return DEFAULT_POLICY;
    const value = await response.json() as Partial<TelemetryPolicy>;
    if ((value.mode !== "notice-and-opt-out" && value.mode !== "prior-consent") ||
        typeof value.noticeVersion !== "string" || typeof value.schemaVersion !== "number") return DEFAULT_POLICY;
    return {
      mode: value.mode,
      noticeVersion: value.noticeVersion.slice(0, 32),
      schemaVersion: Math.max(1, Math.min(2, Math.trunc(value.schemaVersion))),
    };
  } catch {
    return DEFAULT_POLICY;
  }
}

function notice(policy: TelemetryPolicy, requiresConsent: boolean): string {
  const action = requiresConsent
    ? "Telemetry is off. Enable it with: mcp-observatory telemetry enable"
    : "Telemetry is on. Disable it with: mcp-observatory telemetry disable";
  return [
    "",
    "  MCP Observatory telemetry notice",
    "  Collects persistent machine/install IDs, hostname and Git attribution,",
    "  repository/CI identity, commands, server IDs, scan outcomes, and timing.",
    "  It never intentionally sends secrets, source/files, environment values,",
    "  or raw MCP messages. Full fields: https://github.com/KryptosAI/mcp-observatory/blob/main/PRIVACY.md",
    `  ${action}`,
    "",
  ].join("\n");
}

export async function initializeTelemetry(options: { showNotice?: boolean } = {}): Promise<boolean> {
  if (initializationPromise) return initializationPromise;
  initializationPromise = (async () => {
    const config = await loadTelemetryConfig();
    const explicit = explicitEnvironmentPreference();
    if (explicit === "disabled") {
      runtimeEnabled = false;
      await clearTelemetryQueue();
      return false;
    }
    activePolicy = await fetchPolicy();
    const noticeChanged = config.noticeVersion !== activePolicy.noticeVersion;
    let preference = explicit ?? config.telemetryPreference;
    if (noticeChanged && activePolicy.mode === "prior-consent" && explicit !== "enabled") preference = "unset";
    if (preference === "unset" && activePolicy.mode === "notice-and-opt-out") preference = "enabled";
    runtimeEnabled = preference === "enabled";
    if (options.showNotice !== false && (noticeChanged || config.telemetryPreference === "unset")) {
      process.stderr.write(notice(activePolicy, !runtimeEnabled));
    }
    await saveTelemetryConfig({
      ...config,
      telemetryPreference: explicit ? config.telemetryPreference : preference,
      noticeVersion: activePolicy.noticeVersion,
      policyMode: activePolicy.mode,
    }).catch(() => undefined);
    await collectUserIdentity();
    if (runtimeEnabled) await flushTelemetryQueue();
    else await clearTelemetryQueue();
    return runtimeEnabled;
  })();
  return initializationPromise;
}

export async function setTelemetryPreference(preference: "enabled" | "disabled"): Promise<TelemetryConfig> {
  const config = await loadTelemetryConfig();
  activePolicy = await fetchPolicy();
  const updated = {
    ...config,
    telemetryPreference: preference,
    noticeVersion: activePolicy.noticeVersion,
    policyMode: activePolicy.mode,
  } satisfies TelemetryConfig;
  await saveTelemetryConfig(updated);
  runtimeEnabled = preference === "enabled";
  initializationPromise = Promise.resolve(runtimeEnabled);
  if (!runtimeEnabled) await clearTelemetryQueue();
  return updated;
}

export async function telemetryStatus(): Promise<{ config: TelemetryConfig; policy: TelemetryPolicy; enabled: boolean; override?: string }> {
  const config = await loadTelemetryConfig();
  activePolicy = await fetchPolicy();
  const explicit = explicitEnvironmentPreference();
  return {
    config,
    policy: activePolicy,
    enabled: explicit ? explicit === "enabled" : config.telemetryPreference === "enabled" ||
      (config.telemetryPreference === "unset" && activePolicy.mode === "notice-and-opt-out"),
    override: explicit ?? undefined,
  };
}

function redactSecrets(value: string): string {
  return value
    .replace(/(^|\s)(bearer\s+)[^\s,;]+/gi, "$1$2[redacted]")
    .replace(/((?:api[_-]?key|token|secret|password|authorization)\s*[=:]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/((?:--)?(?:api[_-]?key|token|secret|password|authorization)\s+)(?:"[^"]*"|'[^']*'|\S+)/gi, "$1[redacted]")
    .replace(/\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{10,}\b/g, "[redacted-token]")
    .replace(/\bAKIA[A-Z0-9]{16}\b/g, "[redacted-aws-key]")
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[redacted-private-key]");
}

function scrubRemoteUrl(value: string): string {
  return redactSecrets(value)
    .replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]*:[^/@]*@/i, "$1")
    .slice(0, 2048);
}

function sanitizeEnrichment(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_ENRICHMENT_FIELDS.has(key) || value === undefined || value === null) continue;
    if (typeof value === "boolean") output[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
    else if (typeof value === "string") output[key] = redactSecrets(value.slice(0, 4096));
    else if (Array.isArray(value)) {
      output[key] = value.slice(0, 100)
        .filter((item): item is string => typeof item === "string")
        .map((item) => redactSecrets(item.slice(0, 512)));
    } else if (key === "checkStatuses" && typeof value === "object") {
      output[key] = Object.fromEntries(Object.entries(value).slice(0, 100).flatMap(([statusKey, statusValue]) =>
        typeof statusValue === "string" ? [[statusKey.slice(0, 128), statusValue.slice(0, 64)]] : []));
    }
  }
  return output;
}

export function computeTelemetryFingerprint(): string {
  return createHash("sha256").update(`${os.hostname()}:${os.userInfo().username}`).digest("hex");
}

function domainFromEmail(email?: string): string | undefined {
  return email?.split("@")[1]?.trim().toLowerCase() || undefined;
}

function parseRepository(remote?: string): Pick<UserIdentity, "gitRepoHost" | "gitRepoOrg" | "gitRepoName"> {
  if (!remote) return {};
  const match = remote.match(/^(?:[^@/]+@)?([^:/]+):([^/]+)\/(.+?)(?:\.git)?$/i) ??
    remote.match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\/([^/]+)\/(.+?)(?:\.git)?$/i);
  if (!match) return {};
  return {
    gitRepoHost: match[1]?.toLowerCase(),
    gitRepoOrg: match[2],
    gitRepoName: match[3]?.replace(/\.git$/i, ""),
  };
}

export function collectUserIdentity(): Promise<UserIdentity> {
  if (cachedIdentity) return Promise.resolve(cachedIdentity);
  if (identityPromise) return identityPromise;
  identityPromise = (async () => {
    const hostname = os.hostname().slice(0, 255);
    const identity: UserIdentity = {
      hostname,
      hostnameDomain: hostname.includes(".") ? hostname.split(".").slice(1).join(".").toLowerCase() : undefined,
      org: process.env["MCP_OBSERVATORY_ORG"]?.trim().slice(0, 256),
      isEnterprise: false,
    };
    try {
      const { stdout } = await execFileAsync("git", ["config", "user.email"], { timeout: 2_000 });
      identity.gitEmail = stdout.trim().slice(0, 320) || undefined;
      identity.gitEmailDomain = domainFromEmail(identity.gitEmail);
    } catch { /* Git identity is optional. */ }
    try {
      const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], { timeout: 2_000 });
      identity.gitRemoteUrl = stdout.trim() ? scrubRemoteUrl(stdout.trim()) : undefined;
      Object.assign(identity, parseRepository(identity.gitRemoteUrl));
    } catch { /* Repository identity is optional. */ }
    const personalDomains = new Set(["gmail.com", "googlemail.com", "icloud.com", "outlook.com", "hotmail.com", "yahoo.com", "proton.me", "protonmail.com"]);
    identity.isEnterprise = Boolean(identity.org || (identity.gitEmailDomain && !personalDomains.has(identity.gitEmailDomain)));
    cachedIdentity = identity;
    return identity;
  })();
  return identityPromise;
}

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

function detectDistributionChannel(): string {
  const userAgent = process.env["npm_config_user_agent"] ?? "";
  if (process.env["npm_execpath"] && process.env["npm_command"] === "exec") return "npx";
  if (userAgent.includes("npm/")) return "npm";
  if (userAgent.includes("pnpm/")) return "pnpm";
  if (userAgent.includes("yarn/")) return "yarn";
  return "source-or-binary";
}

function environmentValue(name: string, max = 512): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value.slice(0, max) : undefined;
}

function githubMetadata(): Record<string, string | undefined> {
  return {
    githubRepository: environmentValue("GITHUB_REPOSITORY"),
    githubWorkflow: environmentValue("GITHUB_WORKFLOW"),
    githubRunId: environmentValue("GITHUB_RUN_ID", 128),
    githubRunNumber: environmentValue("GITHUB_RUN_NUMBER", 128),
    githubEventName: environmentValue("GITHUB_EVENT_NAME", 128),
    githubRef: environmentValue("GITHUB_REF"),
    githubActor: environmentValue("GITHUB_ACTOR", 256),
  };
}

export function normalizeCampaign(value: string | undefined): string | undefined {
  const campaign = value?.trim();
  if (!campaign) return undefined;
  if (!CAMPAIGN_PATTERN.test(campaign)) throw new Error("Campaign must be a 2-64 character slug using letters, numbers, dot, underscore, or dash.");
  return campaign;
}

function currentCampaign(enrichment: Record<string, unknown>): string | undefined {
  return normalizeCampaign(typeof enrichment.campaign === "string" ? enrichment.campaign : process.env["MCP_OBSERVATORY_CAMPAIGN"]);
}

function classifyFirstParty(identity: UserIdentity | null, githubRepository?: string): boolean {
  return githubRepository?.toLowerCase() === FIRST_PARTY_REPOSITORY ||
    identity?.gitRemoteUrl?.toLowerCase().includes("kryptosai/mcp-observatory") === true;
}

function deriveStage(chain: string[]): string {
  const has = (command: string): boolean => chain.some((item) => item === command || item.includes(command));
  if (has("cloud") || has("receipt")) return "paid_intent";
  if (has("risk-graph") || has("attack-sim")) return "power_user";
  if (has("setup-ci") || has("ci-report")) return "ci_setup";
  if (chain.length >= 3) return "recurring";
  if (has("scan") || has("test") || has("demo")) return "first_scan";
  return "install";
}

export function buildEvent(
  event: string,
  command: string,
  transport: "cli" | "mcp",
  enrichment: Record<string, unknown> = {},
): Record<string, unknown> {
  const config = cachedConfig ?? defaultConfig();
  const identity = cachedIdentity;
  const sanitized = sanitizeEnrichment(enrichment);
  const eventEnrichment = { ...sanitized };
  delete eventEnrichment.featureChainOverride;
  delete eventEnrichment.stageOverride;
  const github = githubMetadata();
  const githubRepository = typeof sanitized.githubRepository === "string" ? sanitized.githubRepository : github.githubRepository;
  const ciProvider = typeof sanitized.ciProvider === "string" ? sanitized.ciProvider : detectCiProvider();
  const firstParty = typeof sanitized.isFirstParty === "boolean" ? sanitized.isFirstParty : classifyFirstParty(identity, githubRepository);
  const environmentKind = isCI ? "ci" : transport === "mcp" ? "mcp" : "local";
  const featureChainOverride = sanitized.featureChainOverride;
  const featureChain = Array.isArray(featureChainOverride)
    ? featureChainOverride.filter((item): item is string => typeof item === "string")
    : config.featureChain;
  return {
    ...github,
    ...eventEnrichment,
    event,
    eventId: randomUUID(),
    schemaVersion: activePolicy.schemaVersion,
    noticeVersion: activePolicy.noticeVersion,
    version: TOOL_VERSION,
    command: redactSecrets(command.slice(0, 128)),
    os: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    isCI,
    ciName,
    ciProvider,
    transport,
    sessionId: processSessionId,
    installationId: config.installationId,
    machineId: config.machineId,
    runId: processRunId,
    machineFingerprint: computeTelemetryFingerprint(),
    environmentKind,
    distributionChannel: detectDistributionChannel(),
    isAutomation: isCI,
    isFixture: sanitized.isFixture === true || /(?:tests?\/fixtures?|insecure-mcp-server|fixture-server)/i.test(
      JSON.stringify([sanitized.targetIds, sanitized.serverCommands, command, process.cwd()]),
    ),
    isFirstParty: firstParty,
    telemetrySource: firstParty ? "first_party" : isCI ? "external_ci" : transport === "mcp" ? "mcp" : "local",
    timestamp: new Date().toISOString(),
    campaign: currentCampaign(sanitized),
    featureChain,
    commandSequence: config.commandSequence,
    stage: typeof sanitized.stageOverride === "string" ? sanitized.stageOverride : deriveStage(featureChain),
    referrer: config.firstContactChannel,
    optedInEmail: config.optedInEmail,
    firstContactChannel: config.contactChannel,
    org: typeof sanitized.org === "string" ? sanitized.org : identity?.org,
    contact: typeof sanitized.contact === "string" ? sanitized.contact : undefined,
    gitEmail: identity?.gitEmail,
    gitRemoteUrl: identity?.gitRemoteUrl,
    hostname: identity?.hostname,
    gitRepoHost: identity?.gitRepoHost,
    gitRepoOrg: identity?.gitRepoOrg,
    gitRepoName: identity?.gitRepoName,
    gitEmailDomain: identity?.gitEmailDomain,
    hostnameDomain: identity?.hostnameDomain,
    isEnterprise: identity?.isEnterprise ?? false,
  };
}

async function readQueue(): Promise<Record<string, unknown>[]> {
  try {
    const parsed = JSON.parse(await readFile(queuePath(), "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)).slice(-MAX_QUEUE_EVENTS) : [];
  } catch {
    return [];
  }
}

async function writeQueue(events: Record<string, unknown>[]): Promise<void> {
  const directory = configDir();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const bounded: Record<string, unknown>[] = [];
  let bytes = 2;
  for (const event of events.slice(-MAX_QUEUE_EVENTS).reverse()) {
    const size = JSON.stringify(event).length + 1;
    if (bytes + size > MAX_QUEUE_BYTES) break;
    bounded.unshift(event);
    bytes += size;
  }
  const temporary = path.join(directory, `.queue-${process.pid}-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(bounded), { encoding: "utf8", flag: "wx", mode: 0o600 });
  await rename(temporary, queuePath());
  await chmod(queuePath(), 0o600).catch(() => undefined);
}

export async function clearTelemetryQueue(): Promise<void> {
  await unlink(queuePath()).catch(() => undefined);
}

async function queueEvent(event: Record<string, unknown>): Promise<void> {
  const existing = await readQueue();
  existing.push(event);
  await writeQueue(existing).catch(() => undefined);
}

async function sendEvent(event: Record<string, unknown>): Promise<boolean> {
  const body = JSON.stringify(event);
  if (body.length > MAX_EVENT_BYTES) return false;
  if (process.env["MCP_OBSERVATORY_TELEMETRY_DEBUG"] === "1") {
    process.stderr.write(`[telemetry] ${body}\n`);
    return true;
  }
  try {
    const response = await fetch(endpointFromEnvironment(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function flushTelemetryQueue(): Promise<void> {
  const queued = await readQueue();
  if (!queued.length) return;
  const attempted = queued.slice(0, 8);
  const results = await Promise.all(attempted.map(sendEvent));
  const failed = attempted.filter((_, index) => !results[index]);
  await writeQueue([...failed, ...queued.slice(attempted.length)]);
}

async function deliverEvent(event: Record<string, unknown>): Promise<void> {
  if (!(await initializeTelemetry({ showNotice: false }))) return;
  const config = await loadTelemetryConfig();
  const complete = {
    ...event,
    schemaVersion: activePolicy.schemaVersion,
    noticeVersion: activePolicy.noticeVersion,
    installationId: config.installationId,
    machineId: config.machineId,
  };
  if (!(await sendEvent(complete))) await queueEvent(complete);
}

export function recordEvent(event: Record<string, unknown>): void {
  deliveryChain = deliveryChain.then(() => deliverEvent(event)).catch(() => undefined);
}

export async function _flushTelemetryForTests(): Promise<void> {
  await deliveryChain;
}

export async function updateFeatureChain(command: string): Promise<void> {
  const config = await loadTelemetryConfig();
  const featureChain = config.featureChain.includes(command) ? config.featureChain : [...config.featureChain, command].slice(-64);
  const commandSequence = [...config.commandSequence, command].slice(-16);
  await saveTelemetryConfig({ ...config, featureChain, commandSequence });
}

export function generateSessionId(): string {
  return randomUUID();
}

export function recordSessionStart(sessionId: string): void {
  sessionTimestamps.set(sessionId, Date.now());
}

export function recordSessionEnd(sessionId: string): void {
  const startedAt = sessionTimestamps.get(sessionId);
  if (startedAt === undefined) return;
  sessionTimestamps.delete(sessionId);
  recordEvent(buildEvent("session_end", "session", "cli", { sessionDurationMs: Date.now() - startedAt }));
}

export async function telemetryPreview(): Promise<Record<string, unknown>> {
  await loadTelemetryConfig();
  await collectUserIdentity();
  activePolicy = await fetchPolicy();
  return buildEvent("command_run", "preview", "cli");
}

export async function identifyTelemetry(email: string, channel?: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Enter a valid email address.");
  const normalizedChannel = channel?.trim().toLowerCase();
  if (normalizedChannel && !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(normalizedChannel)) {
    throw new Error("Contact channel must be a 1-64 character slug using letters, numbers, dot, underscore, or dash.");
  }
  const config = await setTelemetryPreference("enabled");
  await saveTelemetryConfig({ ...config, optedInEmail: normalized, contactChannel: normalizedChannel });
  await collectUserIdentity();
  recordEvent(buildEvent("identity_exchange", "telemetry", "cli", { contact: normalized }));
  await deliveryChain;
}
