import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { HttpTargetConfig } from "../types.js";
import { formatConnectionFailureDiagnosis } from "../utils/failure-diagnosis.js";
import { TOOL_VERSION } from "../version.js";
import type { AdapterSession } from "./local-process.js";

export class HttpAdapter {
  async connect(target: HttpTargetConfig): Promise<AdapterSession> {
    const headers: Record<string, string> = { ...(target.headers ?? {}) };
    if (target.authToken) {
      headers["Authorization"] = `Bearer ${target.authToken}`;
    }

    const client = new Client(
      { name: "mcp-observatory", version: TOOL_VERSION },
      { capabilities: {} },
    );

    const stderrLines: string[] = [];
    const url = new URL(target.url);
    const timeoutMs = target.timeoutMs ?? 15_000;

    // Try streamable-http first, fall back to SSE
    let connected = false;
    try {
      const transport = new StreamableHTTPClientTransport(url, { requestInit: { headers } });
      await client.connect(transport, { timeout: timeoutMs });
      connected = true;
    } catch {
      stderrLines.push("Streamable HTTP failed, falling back to SSE.");
    }

    if (!connected) {
      try {
        const transport = new SSEClientTransport(url, { requestInit: { headers } });
        await client.connect(transport, { timeout: timeoutMs });
        connected = true;
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        await client.close().catch(() => undefined);
        const msg = formatConnectionFailureDiagnosis(target, rawMessage, stderrLines);
        const err = new Error(msg);
        err.name = "AdapterConnectError";
        throw err;
      }
    }

    const serverVersion = client.getServerVersion();

    return {
      client,
      serverCapabilities: client.getServerCapabilities(),
      serverName: serverVersion?.name,
      serverVersion: serverVersion?.version,
      stderrLines,
      close: async () => {
        await client.close();
      },
    };
  }
}
