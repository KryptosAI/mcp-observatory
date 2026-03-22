import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { isCI as _isCI, ciName as _ciName } from "./ci.js";
import { TOOL_VERSION } from "./version.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TelemetryConfig {
  telemetryEnabled: boolean;
  sessionId: string;
  noticeShown: boolean;
  statsToken?: string;
}

export interface TelemetryEvent {
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
    "  │  MCP Observatory collects anonymous usage telemetry.       │",
    "  │                                                            │",
    "  │  No personal data, file paths, or server content is sent.  │",
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
    signal: AbortSignal.timeout(3_000),
  }).catch(() => {
    // Silently ignore — telemetry must never block or fail visibly
  });
}

// ── Convenience: build event from current process state ──────────────────────

export function buildEvent(
  event: string,
  command: string,
  transport: "cli" | "mcp",
): TelemetryEvent {
  const ci = detectCI();
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
  };
}
