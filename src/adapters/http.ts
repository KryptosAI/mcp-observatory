import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import type { HttpTargetConfig } from "../types.js";
import { RecordingTransport } from "../transport/recording-transport.js";
import { TOOL_VERSION } from "../version.js";
import { AdapterConnectError } from "./local-process.js";
import type { AdapterConnectOptions, AdapterSession } from "./local-process.js";

export class HttpAdapter {
  async connect(target: HttpTargetConfig, options?: AdapterConnectOptions): Promise<AdapterSession> {
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
    let activeTransport: Transport | undefined;
    try {
      let transport: Transport = new StreamableHTTPClientTransport(url, { requestInit: { headers } });
      if (options?.record) transport = new RecordingTransport(transport);
      await client.connect(transport, { timeout: timeoutMs });
      activeTransport = transport;
      connected = true;
    } catch {
      stderrLines.push("Streamable HTTP failed, falling back to SSE.");
    }

    if (!connected) {
      try {
        let transport: Transport = new SSEClientTransport(url, { requestInit: { headers } });
        if (options?.record) transport = new RecordingTransport(transport);
        await client.connect(transport, { timeout: timeoutMs });
        activeTransport = transport;
        connected = true;
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        await client.close().catch(() => undefined);
        throw new AdapterConnectError(target, rawMessage, stderrLines);
      }
    }

    const serverVersion = client.getServerVersion();

    return {
      client,
      serverCapabilities: client.getServerCapabilities(),
      serverName: serverVersion?.name,
      serverVersion: serverVersion?.version,
      stderrLines,
      transport: options?.record ? activeTransport : undefined,
      close: async () => {
        await client.close();
      },
    };
  }
}
