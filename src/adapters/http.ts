import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import type { HttpTargetConfig } from "../types.js";
import { RecordingTransport } from "../transport/recording-transport.js";
import { errorMessage } from "../utils/errors.js";
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
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`Unsupported protocol "${url.protocol}" — only http: and https: are allowed.`);
    }
    const timeoutMs = target.timeoutMs ?? 15_000;

    let activeTransport: Transport | undefined;
    try {
      let transport: Transport = new StreamableHTTPClientTransport(url, { requestInit: { headers } });
      if (options?.record) transport = new RecordingTransport(transport);
      await client.connect(transport, { timeout: timeoutMs });
      activeTransport = transport;
    } catch {
      stderrLines.push("Streamable HTTP failed, falling back to SSE.");
    }

    if (!activeTransport) {
      try {
        let transport: Transport = new SSEClientTransport(url, { requestInit: { headers } });
        if (options?.record) transport = new RecordingTransport(transport);
        await client.connect(transport, { timeout: timeoutMs });
        activeTransport = transport;
      } catch (error) {
        const rawMessage = errorMessage(error);
        await client.close().catch(() => undefined); // Cleanup errors are non-fatal
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
