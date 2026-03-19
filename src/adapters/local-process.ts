import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import type { AdapterSession, TargetAdapter } from "./base.js";
import type { TargetConfig } from "../types.js";

export class LocalProcessAdapter implements TargetAdapter {
  async connect(target: TargetConfig): Promise<AdapterSession> {
    const transport = new StdioClientTransport({
      command: target.command,
      args: target.args,
      cwd: target.cwd,
      env: target.env,
      stderr: "pipe"
    });

    const stderrLines: string[] = [];
    transport.stderr?.on("data", (chunk: Buffer | string) => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          stderrLines.push(trimmed);
        }
      }
    });

    const client = new Client(
      {
        name: "mcp-observatory",
        version: "0.1.0"
      },
      {
        capabilities: {}
      },
    );

    await client.connect(transport, {
      timeout: target.timeoutMs ?? 10_000
    });

    const serverVersion = client.getServerVersion();

    return {
      client,
      serverCapabilities: client.getServerCapabilities(),
      serverName: serverVersion?.name,
      serverVersion: serverVersion?.version,
      stderrLines,
      close: async () => {
        await client.close();
      }
    };
  }
}
