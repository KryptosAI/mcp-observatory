import os from "node:os";

import { AdapterConnectError, LocalProcessAdapter } from "../adapters/local-process.js";
import { runPromptsCheck } from "../checks/prompts.js";
import { runResourcesCheck } from "../checks/resources.js";
import { runSemanticsCheck } from "../checks/semantics.js";
import { runToolsCheck } from "../checks/tools.js";
import type { CheckResult, Gate, RunArtifact, StatusCounts, TargetConfig } from "../types.js";
import { SCHEMA_VERSION } from "../types.js";
import { buildRunId } from "../utils/ids.js";

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

export async function runTarget(target: TargetConfig): Promise<RunArtifact> {
  const adapter = new LocalProcessAdapter();
  const runId = buildRunId();
  const createdAt = new Date().toISOString();

  let checks: CheckResult[] = [];
  let fatalError: string | undefined;
  let serverName: string | undefined;
  let serverVersion: string | undefined;

  try {
    const session = await adapter.connect(target);
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
      const semanticsCheck = runSemanticsCheck(
        [toolsCheck.observation, promptsCheck.observation, resourcesCheck.observation].filter(
          (observation): observation is NonNullable<typeof observation> =>
            observation !== undefined,
        ),
        session.stderrLines,
      );

      checks = [
        toolsCheck.result,
        promptsCheck.result,
        resourcesCheck.result,
        semanticsCheck.result
      ];
    } finally {
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
      },
      {
        id: "semantics",
        capability: "semantics",
        status: "skipped",
        durationMs: 0,
        message: skippedMessage,
        evidence: []
      }
    ];
  }

  const summary = buildSummary(checks, fatalError);

  return {
    artifactType: "run",
    schemaVersion: SCHEMA_VERSION,
    gate: summary.gate,
    runId,
    createdAt,
    toolVersion: "0.1.0",
    target: {
      targetId: target.targetId,
      adapter: target.adapter,
      command: target.command,
      args: target.args,
      cwd: target.cwd,
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
}
