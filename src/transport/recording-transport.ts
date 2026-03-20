/**
 * RecordingTransport — Transport decorator that records all JSON-RPC traffic.
 *
 * Inspired by the VCR (Ruby) / Polly.js (Netflix) record/replay pattern
 * and mcp-recorder for MCP-specific traffic capture.
 *
 * Wraps any MCP SDK Transport, intercepts send() and onmessage to log
 * every request, response, and notification without altering behavior.
 */
import { performance } from "node:perf_hooks";

import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { Transport, TransportSendOptions } from "@modelcontextprotocol/sdk/shared/transport.js";

import type { CassetteEntry } from "../cassette.js";

export class RecordingTransport implements Transport {
  private readonly inner: Transport;
  private readonly entries: CassetteEntry[] = [];
  private readonly startTime: number;
  /** Maps JSON-RPC request id → method name for response matching. */
  private readonly pendingRequests = new Map<string | number, string>();

  constructor(inner: Transport) {
    this.inner = inner;
    this.startTime = performance.now();
  }

  // ── Transport interface ────────────────────────────────────────────────

  async start(): Promise<void> {
    // Install our recording interceptor on the inner transport's onmessage
    this.inner.onmessage = (message, extra) => {
      this.recordIncoming(message);
      this.onmessage?.(message, extra);
    };

    this.inner.onclose = () => this.onclose?.();
    this.inner.onerror = (error) => this.onerror?.(error);

    await this.inner.start();
  }

  async send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    this.recordOutgoing(message);
    await this.inner.send(message, options);
  }

  async close(): Promise<void> {
    await this.inner.close();
  }

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(message: T, extra?: unknown) => void;

  get sessionId(): string | undefined {
    return this.inner.sessionId;
  }

  // ── Recording ──────────────────────────────────────────────────────────

  private recordOutgoing(message: JSONRPCMessage): void {
    const hasId = "id" in message;
    const method = (message as { method?: string }).method ?? "unknown";

    if (hasId) {
      const id = (message as { id: string | number }).id;
      this.pendingRequests.set(id, method);
    }

    this.entries.push({
      direction: hasId ? "request" : "notification",
      method,
      params: (message as { params?: unknown }).params,
      timestampMs: Math.round(performance.now() - this.startTime),
    });
  }

  private recordIncoming(message: JSONRPCMessage): void {
    const hasMethod = "method" in message;
    const hasId = "id" in message;

    if (!hasMethod && hasId) {
      // JSON-RPC response — match to pending request
      const id = (message as { id: string | number }).id;
      const method = this.pendingRequests.get(id) ?? "unknown";
      this.pendingRequests.delete(id);

      this.entries.push({
        direction: "response",
        method,
        result: (message as { result?: unknown }).result,
        error: (message as { error?: { code: number; message: string; data?: unknown } }).error,
        timestampMs: Math.round(performance.now() - this.startTime),
      });
    } else {
      // Server-initiated notification
      this.entries.push({
        direction: "notification",
        method: (message as { method?: string }).method ?? "unknown",
        params: (message as { params?: unknown }).params,
        timestampMs: Math.round(performance.now() - this.startTime),
      });
    }
  }

  /** Returns all recorded entries. Call after the session is complete. */
  getEntries(): CassetteEntry[] {
    return [...this.entries];
  }
}
