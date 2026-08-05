#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { TOOL_VERSION } from "./version.js";

import { ensureCommandContext } from "./tools/helpers.js";

import * as scanTool from "./tools/scan.js";
import * as checkServerTool from "./tools/check-server.js";
import * as scoreServerTool from "./tools/score-server.js";
import * as diffRunsTool from "./tools/diff-runs.js";
import * as getLastRunTool from "./tools/get-last-run.js";
import * as suggestServersTool from "./tools/suggest-servers.js";
import * as recordTool from "./tools/record.js";
import * as replayTool from "./tools/replay.js";
import * as verifyTool from "./tools/verify-tool.js";
import * as watchTool from "./tools/watch.js";
import * as lockVerifyTool from "./tools/lock-verify.js";
import * as getHistoryTool from "./tools/get-history.js";
import * as ciReportTool from "./tools/ci-report.js";

export { validateArgs, validateCommand, validatePath } from "./utils/security.js";

export async function startServer(): Promise<void> {
  ensureCommandContext();

  const server = new McpServer({
    name: "mcp-observatory",
    version: TOOL_VERSION,
  });

  server.tool(scanTool.name, scanTool.description, scanTool.schema, scanTool.handler);
  server.tool(checkServerTool.name, checkServerTool.description, checkServerTool.schema, checkServerTool.handler);
  server.tool(scoreServerTool.name, scoreServerTool.description, scoreServerTool.schema, scoreServerTool.handler);
  server.tool(diffRunsTool.name, diffRunsTool.description, diffRunsTool.schema, diffRunsTool.handler);
  server.tool(getLastRunTool.name, getLastRunTool.description, getLastRunTool.schema, getLastRunTool.handler);
  server.tool(suggestServersTool.name, suggestServersTool.description, suggestServersTool.schema, suggestServersTool.handler);
  server.tool(recordTool.name, recordTool.description, recordTool.schema, recordTool.handler);
  server.tool(replayTool.name, replayTool.description, replayTool.schema, replayTool.handler);
  server.tool(verifyTool.name, verifyTool.description, verifyTool.schema, verifyTool.handler);
  server.tool(watchTool.name, watchTool.description, watchTool.schema, watchTool.handler);
  server.tool(lockVerifyTool.name, lockVerifyTool.description, lockVerifyTool.schema, lockVerifyTool.handler);
  server.tool(getHistoryTool.name, getHistoryTool.description, getHistoryTool.schema, getHistoryTool.handler);
  server.tool(ciReportTool.name, ciReportTool.description, ciReportTool.schema, ciReportTool.handler);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
