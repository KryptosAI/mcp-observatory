import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";

import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import type { LocalProcessTargetConfig, TargetConfig } from "../types.js";
import { RecordingTransport } from "../transport/recording-transport.js";
import { formatConnectionFailureDiagnosis } from "../utils/failure-diagnosis.js";
import { errorMessage } from "../utils/errors.js";
import { TOOL_VERSION } from "../version.js";

// ── Security: Strip env vars that could hijack the child process ─────────
const DANGEROUS_ENV_VARS = new Set([
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "NODE_OPTIONS",
  "NODE_DEBUG",
  "ELECTRON_RUN_AS_NODE",
]);

function sanitizeEnv(env: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!env) return undefined;
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!DANGEROUS_ENV_VARS.has(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export interface AdapterConnectOptions {
  record?: boolean;
}

export interface AdapterSession {
  client: Client;
  serverCapabilities?: ServerCapabilities;
  serverName?: string;
  serverVersion?: string;
  stderrLines: string[];
  /** The transport used for the connection. Present when recording. */
  transport?: Transport;
  close(): Promise<void>;
}

export class AdapterConnectError extends Error {
  readonly rawMessage: string;
  readonly stderrLines: string[];

  constructor(target: TargetConfig, rawMessage: string, stderrLines: string[]) {
    super(formatConnectionFailureDiagnosis(target, rawMessage, stderrLines));
    this.name = "AdapterConnectError";
    this.rawMessage = rawMessage;
    this.stderrLines = stderrLines;
  }
}

export class LocalProcessAdapter {
  async connect(target: LocalProcessTargetConfig, options?: AdapterConnectOptions): Promise<AdapterSession> {
    const stdioTransport = new StdioClientTransport({
      command: target.command,
      args: target.args,
      cwd: target.cwd,
      env: sanitizeEnv(target.env),
      stderr: "pipe"
    });

    const MAX_STDERR_LINES = 500;
    const stderrLines: string[] = [];
    stdioTransport.stderr?.on("data", (chunk: Buffer | string) => {
      if (stderrLines.length >= MAX_STDERR_LINES) return;
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      for (const line of text.split(/\r?\n/)) {
        if (stderrLines.length >= MAX_STDERR_LINES) break;
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          stderrLines.push(trimmed);
        }
      }
    });

    // Optionally wrap in RecordingTransport
    const transport: Transport = options?.record
      ? new RecordingTransport(stdioTransport)
      : stdioTransport;

    const client = new Client(
      {
        name: "mcp-observatory",
        version: TOOL_VERSION
      },
      {
        capabilities: {}
      },
    );

    try {
      await client.connect(transport, {
        timeout: target.timeoutMs ?? 10_000
      });
    } catch (error) {
      const rawMessage = errorMessage(error);
      await client.close().catch(() => undefined); // Cleanup errors are non-fatal
      throw new AdapterConnectError(target, rawMessage, stderrLines);
    }

    const serverVersion = client.getServerVersion();

    return {
      client,
      serverCapabilities: client.getServerCapabilities(),
      serverName: serverVersion?.name,
      serverVersion: serverVersion?.version,
      stderrLines,
      transport: options?.record ? transport : undefined,
      close: async () => {
        await client.close();
      }
    };
  }
}
