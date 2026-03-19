import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";

import type { TargetConfig } from "../types.js";

export interface AdapterSession {
  client: Client;
  serverCapabilities?: ServerCapabilities;
  serverName?: string;
  serverVersion?: string;
  stderrLines: string[];
  close(): Promise<void>;
}

export interface TargetAdapter {
  connect(target: TargetConfig): Promise<AdapterSession>;
}
