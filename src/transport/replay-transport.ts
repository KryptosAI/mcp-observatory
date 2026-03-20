/**
 * ReplayTransport — Standalone Transport that replays from a cassette file.
 *
 * Inspired by VCR (Ruby) / Polly.js (Netflix) replay pattern.
 * No live server needed — responses come from the cassette.
 */
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import type { CassetteEntry } from "../cassette.js";

export class ReplayTransport implements Transport {
  private readonly responses: CassetteEntry[];
  /** Index tracking: for each method, how many responses we've consumed. */
  private readonly methodCursors = new Map<string, number>();

  constructor(entries: CassetteEntry[]) {
    // Only keep response entries — we'll match them to incoming requests
    this.responses = entries.filter((e) => e.direction === "response");
  }

  async start(): Promise<void> {
    // No-op — nothing to connect to
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(message: JSONRPCMessage): Promise<void> {
    const hasId = "id" in message;
    if (!hasId) {
      // Notification — no response expected
      return;
    }

    const method = (message as { method?: string }).method ?? "unknown";
    const requestId = (message as { id: string | number }).id;

    const match = this.findResponse(method);
    if (!match) {
      throw new Error(
        `ReplayTransport: no recorded response for method "${method}". ` +
        `The cassette may be incomplete or recorded against a different server version.`,
      );
    }

    // Build a JSON-RPC response with the original request's ID
    const response: Record<string, unknown> = {
      jsonrpc: "2.0",
      id: requestId,
    };

    if (match.error) {
      response["error"] = match.error;
    } else {
      response["result"] = match.result ?? {};
    }

    // Deliver asynchronously to match real transport behavior
    queueMicrotask(() => {
      this.onmessage?.(response as unknown as JSONRPCMessage);
    });
  }

  async close(): Promise<void> {
    // No-op
  }

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(message: T, extra?: unknown) => void;

  sessionId?: string;

  // ── Matching ───────────────────────────────────────────────────────────

  /**
   * Find the next unmatched response for the given method.
   * Uses a cursor per method to handle repeated calls (e.g., multiple tools/list).
   */
  private findResponse(method: string): CassetteEntry | undefined {
    const cursor = this.methodCursors.get(method) ?? 0;
    const methodResponses = this.responses.filter((r) => r.method === method);

    if (cursor >= methodResponses.length) {
      return undefined;
    }

    this.methodCursors.set(method, cursor + 1);
    return methodResponses[cursor];
  }
}
