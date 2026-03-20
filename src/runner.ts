import os from "node:os";

import { HttpAdapter } from "./adapters/http.js";
import { AdapterConnectError, LocalProcessAdapter } from "./adapters/local-process.js";
import type { AdapterConnectOptions, AdapterSession } from "./adapters/local-process.js";
import type { CassetteEntry } from "./cassette.js";
import { runPromptsCheck } from "./checks/prompts.js";
import { runResourcesCheck } from "./checks/resources.js";
import { runToolsCheck } from "./checks/tools.js";
import { runToolsInvokeCheck } from "./checks/tools-invoke.js";
import { RecordingTransport } from "./transport/recording-transport.js";
import type { CheckResult, Gate, RunArtifact, StatusCounts, TargetConfig } from "./types.js";
import { SCHEMA_VERSION } from "./types.js";
import { buildRunId } from "./utils/ids.js";
import { TOOL_VERSION } from "./version.js";

function createEmptyCounts(): StatusCounts {
  return {
    total: 0,
    pass: 0,
    fail: 0,
    partial: 0,
    unsupported: 0,
    flaky: 0,
    skipped: 0
  };
}

function buildSummary(checks: CheckResult[], fatalError?: string): RunArtifact["summary"] {
  const counts = createEmptyCounts();
  for (const check of checks) {
    counts.total += 1;
    counts[check.status] += 1;
  }
  const gate: Gate =
    fatalError !== undefined || counts.fail > 0 ? "fail" : "pass";
  return {
    ...counts,
    gate
  };
}

export interface RunOptions {
  invokeTools?: boolean;
  record?: boolean;
}

export interface RunResult {
  artifact: RunArtifact;
  cassetteEntries?: CassetteEntry[];
}

async function connectTarget(target: TargetConfig, adapterOptions?: AdapterConnectOptions): Promise<AdapterSession> {
  if (target.adapter === "http") {
    const adapter = new HttpAdapter();
    return adapter.connect(target, adapterOptions);
  }
  const adapter = new LocalProcessAdapter();
  return adapter.connect(target, adapterOptions);
}

/**
 * Run checks against a target and optionally record the session.
 * When `options.record` is true, returns a `RunResult` with both the artifact and cassette entries.
 * Otherwise returns just the `RunArtifact`.
 */
export async function runTarget(target: TargetConfig, options?: RunOptions): Promise<RunArtifact> {
  const result = await runTargetWithRecording(target, options);
  return result.artifact;
}

/**
 * Run checks against a target with recording support.
 * Always returns a `RunResult` containing the artifact and optional cassette entries.
 */
export async function runTargetRecording(target: TargetConfig, options?: RunOptions): Promise<RunResult> {
  return runTargetWithRecording(target, { ...options, record: true });
}

async function runTargetWithRecording(target: TargetConfig, options?: RunOptions): Promise<RunResult> {
  const runId = buildRunId();
  const createdAt = new Date().toISOString();

  let checks: CheckResult[] = [];
  let fatalError: string | undefined;
  let serverName: string | undefined;
  let serverVersion: string | undefined;

  let cassetteEntries: CassetteEntry[] | undefined;

  try {
    const session = await connectTarget(target, { record: options?.record });
    serverName = session.serverName;
    serverVersion = session.serverVersion;

    try {
      const checkContext = {
        client: session.client,
        serverCapabilities: session.serverCapabilities,
        target,
        timeoutMs: target.timeoutMs ?? 10_000,
        stderrLines: session.stderrLines
      };

      const toolsCheck = await runToolsCheck(checkContext);
      const promptsCheck = await runPromptsCheck(checkContext);
      const resourcesCheck = await runResourcesCheck(checkContext);

      checks = [
        toolsCheck.result,
        promptsCheck.result,
        resourcesCheck.result
      ];

      if (options?.invokeTools && !target.skipInvoke) {
        const invokeCheck = await runToolsInvokeCheck(checkContext);
        checks.push(invokeCheck.result);
      }
    } finally {
      // Extract cassette entries before closing
      if (options?.record && session.transport instanceof RecordingTransport) {
        cassetteEntries = session.transport.getEntries();
      }
      await session.close();
    }
  } catch (error) {
    fatalError = error instanceof Error ? error.message : String(error);
    const skippedMessage =
      error instanceof AdapterConnectError
        ? "Skipped because startup failed before the MCP session initialized. See the failure diagnosis."
        : "Skipped because the adapter never established a session.";
    checks = [
      {
        id: "tools",
        capability: "tools",
        status: "skipped",
        durationMs: 0,
        message: skippedMessage,
        evidence: []
      },
      {
        id: "prompts",
        capability: "prompts",
        status: "skipped",
        durationMs: 0,
        message: skippedMessage,
        evidence: []
      },
      {
        id: "resources",
        capability: "resources",
        status: "skipped",
        durationMs: 0,
        message: skippedMessage,
        evidence: []
      }
    ];
  }

  const summary = buildSummary(checks, fatalError);

  const artifact: RunArtifact = {
    artifactType: "run",
    schemaVersion: SCHEMA_VERSION,
    gate: summary.gate,
    runId,
    createdAt,
    toolVersion: TOOL_VERSION,
    target: {
      targetId: target.targetId,
      adapter: target.adapter,
      command: target.adapter === "http" ? target.url : target.command,
      args: target.adapter === "http" ? [] : target.args,
      url: target.adapter === "http" ? target.url : undefined,
      cwd: target.adapter === "http" ? undefined : target.cwd,
      metadata: target.metadata,
      serverName,
      serverVersion
    },
    environment: {
      platform: `${os.platform()} ${os.release()}`,
      nodeVersion: process.version
    },
    summary,
    checks,
    fatalError
  };

  return { artifact, cassetteEntries };
}
